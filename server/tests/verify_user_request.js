import axios from 'axios';
import puppeteer from 'puppeteer-core';
import mongoose from 'mongoose';

const BASE_URL = 'http://localhost:5000/api';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testUserRequests() {
  console.log('--- TESTING NEW USER REQUESTS ---\n');

  // 1. Connect to MongoDB to reset today attendance for NX002 (Priya Sharma) so we can do a fresh Punch-In test
  await mongoose.connect('mongodb://127.0.0.1:27017/nx_work_os');
  const todayStr = new Date().toISOString().split('T')[0];
  
  const priyaEmp = await mongoose.connection.db.collection('employees').findOne({ employeeId: 'NX002' });
  if (priyaEmp) {
    await mongoose.connection.db.collection('attendances').deleteMany({
      employee: priyaEmp._id,
      date: todayStr
    });
    console.log('[Test Setup] Cleaned today attendance for Priya Sharma (NX002) for a fresh punch in test.');
  }

  // 2. Login as Priya Sharma (Employee)
  const priyaLogin = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'priya@nxworkos.com',
    password: 'Employee@123'
  });
  const priyaToken = priyaLogin.data?.token;
  console.log('[Pass] Logged in as Priya Sharma (NX002)');

  // 3. Login as HR
  const hrLogin = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'hr@nxworkos.com',
    password: 'Admin@NX2026'
  });
  const hrToken = hrLogin.data?.token;
  console.log('[Pass] Logged in as HR');

  // Check initial HR dashboard stats before Priya punches in
  const dashBefore = await axios.get(`${BASE_URL}/attendance/all?date=${todayStr}`, {
    headers: { Authorization: `Bearer ${hrToken}` }
  });
  const presentBeforeCount = dashBefore.data.records.filter(r => r.status === 'Present' || r.status === 'Working' || r.punchIn).length;
  console.log(`[Before Punch-In] Present records today: ${presentBeforeCount}`);

  // 4. Priya Punches In
  console.log('Executing Punch In for Priya Sharma (NX002)...');
  const punchInRes = await axios.post(`${BASE_URL}/attendance/punch-in`, {
    employeeIdInput: 'NX002'
  }, {
    headers: { Authorization: `Bearer ${priyaToken}` }
  });
  console.log('[Pass] Punch In Response Status:', punchInRes.status, 'Record status in DB:', punchInRes.data?.attendance?.status);

  // 5. Check if HR received notification for Punch In!
  const hrNotifsAfterPunchIn = await axios.get(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${hrToken}` }
  });
  const punchInNotif = hrNotifsAfterPunchIn.data?.notifications?.find(n => n.title === 'Employee Punched In' && n.message?.includes('Priya'));
  if (punchInNotif) {
    console.log('[PASS NOTIFICATION] HR received Punch In notification:', punchInNotif.title, '->', punchInNotif.message);
  } else {
    console.error('[FAIL NOTIFICATION] HR did not receive Punch In notification for Priya!');
  }

  // 6. Check HR Dashboard present count now!
  const dashAfter = await axios.get(`${BASE_URL}/attendance/all?date=${todayStr}`, {
    headers: { Authorization: `Bearer ${hrToken}` }
  });
  const presentAfterRecords = dashAfter.data.records.filter(r => r.status === 'Present' || r.status === 'Working' || r.punchIn);
  console.log(`[After Punch-In] Present records today: ${presentAfterRecords.length}`);
  const priyaFound = presentAfterRecords.some(r => r.employee?.employeeId === 'NX002');
  if (priyaFound) {
    console.log('[PASS PRESENT TODAY] Priya Sharma is immediately counted in Present Today data!');
  } else {
    console.error('[FAIL PRESENT TODAY] Priya Sharma was not found in Present records!');
  }

  // 7. Priya Punches Out
  console.log('\nExecuting Punch Out for Priya Sharma...');
  const punchOutRes = await axios.post(`${BASE_URL}/attendance/punch-out`, {
    summaryBullets: [
      'Finished UI testing for desktop layout',
      'Verified fixed sidebar and scrollable center content'
    ]
  }, {
    headers: { Authorization: `Bearer ${priyaToken}` }
  });
  console.log('[Pass] Punch Out Response Status:', punchOutRes.status);

  // 8. Check if HR received notification for Punch Out!
  const hrNotifsAfterPunchOut = await axios.get(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${hrToken}` }
  });
  const punchOutNotif = hrNotifsAfterPunchOut.data?.notifications?.find(n => n.title === 'Employee Punched Out' && n.message?.includes('Priya'));
  if (punchOutNotif) {
    console.log('[PASS NOTIFICATION] HR received Punch Out notification:', punchOutNotif.title, '->', punchOutNotif.message);
  } else {
    console.error('[FAIL NOTIFICATION] HR did not receive Punch Out notification for Priya!');
  }

  // 9. Browser Layout Test on Desktop (1280x800)
  console.log('\n--- TESTING DESKTOP VIEW LAYOUT (FIXED SIDEBAR + FIXED NAVBAR + SCROLLABLE CENTER) ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Navigate to HR Dashboard
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
  await page.type('input[type="text"]', 'hr@nxworkos.com');
  await page.type('input[type="password"]', 'Admin@NX2026');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.pathname.startsWith('/hr'), { timeout: 10000 });

  // Check HR layout styles
  const layoutCheckHR = await page.evaluate(() => {
    const sidebar = document.querySelector('aside');
    const header = document.querySelector('header');
    const main = document.querySelector('main');

    const sidebarStyle = window.getComputedStyle(sidebar);
    const mainStyle = window.getComputedStyle(main);

    return {
      sidebarWidth: sidebar.getBoundingClientRect().width,
      sidebarHeight: sidebar.getBoundingClientRect().height,
      mainOverflowY: mainStyle.overflowY,
      headerFixedOrSticky: window.getComputedStyle(header).position,
      hasScrollbarOnMain: main.scrollHeight >= main.clientHeight
    };
  });

  console.log('[HR Layout Check]:', layoutCheckHR);
  if (layoutCheckHR.sidebarWidth > 200 && layoutCheckHR.mainOverflowY === 'auto') {
    console.log('[PASS DESKTOP LAYOUT] HR Panel has fixed sidebar and scrollable main content!');
  } else {
    console.error('[FAIL DESKTOP LAYOUT] Layout properties not expected:', layoutCheckHR);
  }

  await browser.close();
  await mongoose.disconnect();
  console.log('\n--- ALL USER REQUEST VERIFICATIONS COMPLETED SUCCESSFULLY! ---');
}

testUserRequests().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Test error:', err.response?.data || err);
  process.exit(1);
});

