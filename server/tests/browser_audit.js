import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SHOTS_DIR = 'C:\\Users\\rajat\\.gemini\\antigravity\\brain\\672fd12e-84af-410a-b337-87b3412c2e49\\browser_test_shots';

if (!fs.existsSync(SHOTS_DIR)) {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
}

const auditResults = {
  testedPages: 0,
  pageErrors: [],
  consoleErrors: [],
  failedRequests: [],
  overflowPages: [],
  screenshots: []
};

async function runBrowserAudit() {
  console.log('[Browser Audit] Starting automated browser test...');
  console.log('[Browser Audit] Chrome path:', CHROME_PATH);
  console.log('[Browser Audit] Target Base URL: http://localhost:5173');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800']
  });

  const page = await browser.newPage();

  // Listen for unhandled runtime JS errors
  page.on('pageerror', (err) => {
    console.error(`[PAGE ERROR] on ${page.url()}:`, err.message);
    auditResults.pageErrors.push({ url: page.url(), error: err.message });
  });

  // Listen for console.error messages
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore harmless notifications or local worker notes in headless mode
      if (text.includes('favicon.ico') || text.includes('Notification') || text.includes('serviceWorker') || text.includes('Registration failed')) {
        return;
      }
      console.warn(`[CONSOLE ERROR] on ${page.url()}:`, text);
      auditResults.consoleErrors.push({ url: page.url(), message: text });
    }
  });

  // Listen for failed network responses
  page.on('response', (res) => {
    const status = res.status();
    const url = res.url();
    if (status >= 400 && !url.includes('favicon.ico')) {
      console.warn(`[HTTP ${status}] ${url}`);
      auditResults.failedRequests.push({ url, status });
    }
  });

  async function checkLayoutAndCapture(name, viewport) {
    auditResults.testedPages++;
    await page.setViewport(viewport);
    await new Promise(r => setTimeout(r, 600));

    // Check for horizontal overflow (causes mobile UI to "fatna" / horizontal scroll blowout)
    const overflowInfo = await page.evaluate(() => {
      const doc = document.documentElement;
      const scrollWidth = doc.scrollWidth;
      const clientWidth = doc.clientWidth;
      const hasHorizontalScroll = scrollWidth > clientWidth + 2;

      let offenders = [];
      if (hasHorizontalScroll) {
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
          const rect = el.getBoundingClientRect();
          if (rect.width > clientWidth + 5) {
            offenders.push({
              tag: el.tagName,
              className: el.className?.toString?.() || '',
              width: Math.round(rect.width)
            });
          }
        }
      }

      return {
        scrollWidth,
        clientWidth,
        hasHorizontalScroll,
        offenders: offenders.slice(0, 3)
      };
    });

    if (overflowInfo.hasHorizontalScroll) {
      console.error(`[OVERFLOW DETECTED] ${name}: scrollWidth=${overflowInfo.scrollWidth} > clientWidth=${overflowInfo.clientWidth}`, overflowInfo.offenders);
      auditResults.overflowPages.push({ name, ...overflowInfo });
    } else {
      console.log(`[PASS LAYOUT] ${name} (${viewport.width}x${viewport.height}) - No overflow (scrollWidth=${overflowInfo.scrollWidth}, clientWidth=${overflowInfo.clientWidth})`);
    }

    const shotPath = path.join(SHOTS_DIR, `${name}.png`);
    await page.screenshot({ path: shotPath, fullPage: false });
    auditResults.screenshots.push({ name, path: shotPath });
  }

  const mobileViewport = { width: 390, height: 844, isMobile: true, hasTouch: true };
  const desktopViewport = { width: 1280, height: 800, isMobile: false, hasTouch: false };

  try {
    // ==========================================
    // 1. TEST LOGIN FLOW (Mobile View)
    // ==========================================
    console.log('\n--- 1. Testing Login Page & Form Submission ---');
    await page.setViewport(mobileViewport);
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await checkLayoutAndCapture('01_login_mobile', mobileViewport);

    // Type credentials into the inputs
    await page.waitForSelector('input[type="text"]');
    await page.type('input[type="text"]', 'rahul@nxworkos.com');
    await page.type('input[type="password"]', 'Employee@123');
    await page.click('button[type="submit"]');

    // Wait for SPA client navigation to /employee
    await page.waitForFunction(() => window.location.pathname.startsWith('/employee'), { timeout: 10000 });
    console.log('[LOGIN PASS] Successfully logged in as rahul@nxworkos.com!');
    await new Promise(r => setTimeout(r, 1000));

    // ==========================================
    // 2. TEST EMPLOYEE MOBILE PAGES
    // ==========================================
    console.log('\n--- 2. Testing Employee Mobile Flow ---');

    // 2.1 Employee Home (Verify avatar card does NOT blow out)
    console.log('Testing Employee Home...');
    await page.goto('http://localhost:5173/employee', { waitUntil: 'networkidle2' });
    await checkLayoutAndCapture('02_employee_home_mobile', mobileViewport);

    // 2.2 Employee Tasks
    console.log('Testing Employee Tasks...');
    await page.goto('http://localhost:5173/employee/tasks', { waitUntil: 'networkidle2' });
    await checkLayoutAndCapture('03_employee_tasks_mobile', mobileViewport);

    // Verify "subtask" is NOT in the DOM
    const subtaskFound = await page.evaluate(() => {
      return document.body.innerText.toLowerCase().includes('subtask');
    });
    if (subtaskFound) {
      console.error('[SUBTASK CHECK] Warning: "subtask" string found on tasks page!');
    } else {
      console.log('[SUBTASK CHECK PASS] No "subtask" text found on tasks page!');
    }

    // Click "Add Task" button and test modal
    const addTaskBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent.includes('Add Task'));
    });
    if (addTaskBtn && addTaskBtn.click) {
      await addTaskBtn.click().catch(() => {});
      await new Promise(r => setTimeout(r, 600));
      await checkLayoutAndCapture('04_employee_tasks_modal_mobile', mobileViewport);

      // Close modal
      const cancelBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find(b => b.textContent.includes('Cancel') || b.textContent.includes('CANCEL'));
      });
      if (cancelBtn && cancelBtn.click) {
        await cancelBtn.click().catch(() => {});
        await new Promise(r => setTimeout(r, 300));
      }
    }

    // 2.3 Employee Attendance
    console.log('Testing Employee Attendance...');
    await page.goto('http://localhost:5173/employee/attendance', { waitUntil: 'networkidle2' });
    await checkLayoutAndCapture('05_employee_attendance_mobile', mobileViewport);

    // 2.4 Employee Leave
    console.log('Testing Employee Leave...');
    await page.goto('http://localhost:5173/employee/leave', { waitUntil: 'networkidle2' });
    await checkLayoutAndCapture('06_employee_leave_mobile', mobileViewport);

    // 2.5 Employee Notices
    console.log('Testing Employee Notices...');
    await page.goto('http://localhost:5173/employee/notices', { waitUntil: 'networkidle2' });
    await checkLayoutAndCapture('07_employee_notices_mobile', mobileViewport);

    // 2.6 Employee Profile
    console.log('Testing Employee Profile...');
    await page.goto('http://localhost:5173/employee/profile', { waitUntil: 'networkidle2' });
    await checkLayoutAndCapture('08_employee_profile_mobile', mobileViewport);

    // Open photo edit modal to verify preview does not explode
    const pencilBtn = await page.$('button[title="Update Profile Photo"]');
    if (pencilBtn) {
      await pencilBtn.click();
      await new Promise(r => setTimeout(r, 500));
      await checkLayoutAndCapture('09_employee_profile_photo_modal_mobile', mobileViewport);

      const closePhotoBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find(b => b.textContent.includes('CANCEL'));
      });
      if (closePhotoBtn && closePhotoBtn.click) {
        await closePhotoBtn.click().catch(() => {});
        await new Promise(r => setTimeout(r, 300));
      }
    }

    // ==========================================
    // 3. TEST EMPLOYEE DESKTOP VIEW
    // ==========================================
    console.log('\n--- 3. Testing Employee Desktop Flow ---');
    await page.goto('http://localhost:5173/employee', { waitUntil: 'networkidle2' });
    await checkLayoutAndCapture('10_employee_home_desktop', desktopViewport);

    await page.goto('http://localhost:5173/employee/tasks', { waitUntil: 'networkidle2' });
    await checkLayoutAndCapture('11_employee_tasks_desktop', desktopViewport);

    await page.goto('http://localhost:5173/employee/profile', { waitUntil: 'networkidle2' });
    await checkLayoutAndCapture('12_employee_profile_desktop', desktopViewport);

    // ==========================================
    // 4. TEST HR FLOW (Mobile & Desktop)
    // ==========================================
    console.log('\n--- 4. Testing HR Flow ---');

    // Logout
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Login as HR using HR credentials
    await page.setViewport(mobileViewport);
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type="text"]');
    await page.type('input[type="text"]', 'hr@nxworkos.com');
    await page.type('input[type="password"]', 'Admin@NX2026');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname.startsWith('/hr'), { timeout: 10000 });
    console.log('[LOGIN PASS] Successfully logged in as hr@nxworkos.com!');
    await new Promise(r => setTimeout(r, 1000));

    // 4.1 HR Dashboard Mobile
    console.log('Testing HR Dashboard Mobile...');
    await page.goto('http://localhost:5173/hr', { waitUntil: 'networkidle2' });
    await checkLayoutAndCapture('13_hr_dashboard_mobile', mobileViewport);

    // 4.2 HR Employees Directory Mobile
    console.log('Testing HR Employees Mobile...');
    await page.goto('http://localhost:5173/hr/employees', { waitUntil: 'networkidle2' });
    await checkLayoutAndCapture('14_hr_employees_mobile', mobileViewport);

    // Open an employee detail modal
    const employeeRow = await page.$('div[class*="cursor-pointer"]');
    if (employeeRow) {
      await employeeRow.click().catch(() => {});
      await new Promise(r => setTimeout(r, 600));
      await checkLayoutAndCapture('15_hr_employee_detail_modal_mobile', mobileViewport);

      // Close modal
      const closeBtn = await page.$('button[class*="rounded-full"]');
      if (closeBtn) {
        await closeBtn.click().catch(() => {});
        await new Promise(r => setTimeout(r, 300));
      }
    }

    // 4.3 HR Attendance Mobile
    console.log('Testing HR Attendance Mobile...');
    await page.goto('http://localhost:5173/hr/attendance', { waitUntil: 'networkidle2' });
    await checkLayoutAndCapture('16_hr_attendance_mobile', mobileViewport);

    // 4.4 HR Leave Mobile
    console.log('Testing HR Leave Mobile...');
    await page.goto('http://localhost:5173/hr/leave', { waitUntil: 'networkidle2' });
    await checkLayoutAndCapture('17_hr_leave_mobile', mobileViewport);

    // 4.5 HR Tasks Reports Mobile
    console.log('Testing HR Tasks Reports Mobile...');
    await page.goto('http://localhost:5173/hr/tasks', { waitUntil: 'networkidle2' });
    await checkLayoutAndCapture('18_hr_tasks_mobile', mobileViewport);

    // 4.6 HR Payroll Mobile
    console.log('Testing HR Payroll Mobile...');
    await page.goto('http://localhost:5173/hr/payroll', { waitUntil: 'networkidle2' });
    await checkLayoutAndCapture('19_hr_payroll_mobile', mobileViewport);

    // 4.7 HR Broadcast Mobile
    console.log('Testing HR Broadcast Mobile...');
    await page.goto('http://localhost:5173/hr/broadcast', { waitUntil: 'networkidle2' });
    await checkLayoutAndCapture('20_hr_broadcast_mobile', mobileViewport);

    // 4.8 HR Settings Mobile
    console.log('Testing HR Settings Mobile...');
    await page.goto('http://localhost:5173/hr/settings', { waitUntil: 'networkidle2' });
    await checkLayoutAndCapture('21_hr_settings_mobile', mobileViewport);

    // 4.9 HR More Menu Mobile
    console.log('Testing HR More Menu Mobile...');
    await page.goto('http://localhost:5173/hr/more', { waitUntil: 'networkidle2' });
    await checkLayoutAndCapture('22_hr_more_menu_mobile', mobileViewport);

    // 4.10 HR Desktop Views
    console.log('Testing HR Desktop Views...');
    await page.goto('http://localhost:5173/hr', { waitUntil: 'networkidle2' });
    await checkLayoutAndCapture('23_hr_dashboard_desktop', desktopViewport);

    await page.goto('http://localhost:5173/hr/employees', { waitUntil: 'networkidle2' });
    await checkLayoutAndCapture('24_hr_employees_desktop', desktopViewport);

  } catch (err) {
    console.error('[BROWSER AUDIT CRITICAL ERROR]:', err);
    auditResults.fatalError = err.message;
  } finally {
    await browser.close();
    console.log('\n==========================================');
    console.log('BROWSER AUDIT SUMMARY');
    console.log('==========================================');
    console.log(`Total Pages/Views Tested: ${auditResults.testedPages}`);
    console.log(`Page Errors (Runtime Crashes): ${auditResults.pageErrors.length}`);
    console.log(`Console Errors: ${auditResults.consoleErrors.length}`);
    console.log(`Failed HTTP Requests (4xx/5xx): ${auditResults.failedRequests.length}`);
    console.log(`Horizontal Layout Overflows: ${auditResults.overflowPages.length}`);
    console.log(`Screenshots Captured: ${auditResults.screenshots.length}`);
    console.log('==========================================\n');

    fs.writeFileSync(
      path.join(SHOTS_DIR, 'audit_report.json'),
      JSON.stringify(auditResults, null, 2)
    );
  }
}

runBrowserAudit().then(() => {
  console.log('[Browser Audit] Complete!');
  process.exit(0);
}).catch((e) => {
  console.error('[Browser Audit] Failed with error:', e);
  process.exit(1);
});
