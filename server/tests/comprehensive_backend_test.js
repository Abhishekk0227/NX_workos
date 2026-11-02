import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

function recordTest(suite, name, passed, details = null) {
  results.total++;
  if (passed) {
    results.passed++;
    console.log(`  [PASS] ${name}`);
  } else {
    results.failed++;
    console.error(`  [FAIL] ${name} ->`, details);
  }
  results.tests.push({ suite, name, passed, details });
}

async function runComprehensiveBackendAudit() {
  console.log('====================================================');
  console.log('STARTING COMPREHENSIVE BACKEND & BUSINESS LOGIC TEST');
  console.log(`Target: ${BASE_URL}`);
  console.log('====================================================\n');

  let empToken = '';
  let empUser = null;
  let hrToken = '';
  let hrUser = null;

  // ----------------------------------------------------
  // SUITE 1: AUTHENTICATION & IDENTITY (DUAL IDENTIFIERS)
  // ----------------------------------------------------
  console.log('--- SUITE 1: Auth, Identity & Dual Identifiers ---');
  try {
    // 1.1 Login with Employee Email
    const resEmpEmail = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'rahul@nxworkos.com',
      password: 'Employee@123'
    });
    empToken = resEmpEmail.data?.token;
    empUser = resEmpEmail.data?.user;
    recordTest('Auth', 'Login with Employee Email (rahul@nxworkos.com)', resEmpEmail.status === 200 && empUser?.role === 'Employee');

    // 1.2 Login with Employee ID (Exact Case)
    const resEmpId = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'NX001',
      password: 'Employee@123'
    });
    recordTest('Auth', 'Login with Employee ID exact (NX001)', resEmpId.status === 200 && resEmpId.data?.user?.email === 'rahul@nxworkos.com');

    // 1.3 Login with Employee ID (Lower Case)
    const resEmpIdLower = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'nx001',
      password: 'Employee@123'
    });
    recordTest('Auth', 'Login with Employee ID case-insensitive (nx001)', resEmpIdLower.status === 200);

    // 1.4 Login with TEST_EMP_80
    const resTest80 = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'TEST_EMP_80',
      password: 'Employee@123'
    });
    recordTest('Auth', 'Login with custom ID (TEST_EMP_80)', resTest80.status === 200);

    // 1.5 Login with HR Email
    const resHR = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'hr@nxworkos.com',
      password: 'Admin@NX2026'
    });
    hrToken = resHR.data?.token;
    hrUser = resHR.data?.user;
    recordTest('Auth', 'Login with HR Email (hr@nxworkos.com)', resHR.status === 200 && hrUser?.role === 'HR');

    // 1.6 Login with Admin Email
    const resAdmin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@nxworkos.com',
      password: 'Admin@NX2026'
    });
    recordTest('Auth', 'Login with Admin Email (admin@nxworkos.com)', resAdmin.status === 200 && resAdmin.data?.user?.role === 'HR');

    // 1.7 Invalid Password Check
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: 'rahul@nxworkos.com',
        password: 'WrongPassword999'
      });
      recordTest('Auth', 'Reject invalid password', false, 'Expected 401 but received 200');
    } catch (err) {
      recordTest('Auth', 'Reject invalid password with 401', err.response?.status === 401);
    }

    // 1.8 Verify /auth/me for logged-in user
    const resMe = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${empToken}` }
    });
    recordTest('Auth', 'Token verification via GET /api/auth/me', resMe.status === 200 && resMe.data?.user?.email === 'rahul@nxworkos.com');

  } catch (err) {
    recordTest('Auth', 'Suite execution fatal error', false, err.message);
  }

  const empHeaders = { headers: { Authorization: `Bearer ${empToken}` } };
  const hrHeaders = { headers: { Authorization: `Bearer ${hrToken}` } };

  // ----------------------------------------------------
  // SUITE 2: RBAC (ROLE-BASED ACCESS CONTROL)
  // ----------------------------------------------------
  console.log('\n--- SUITE 2: RBAC (Role-Based Access Control) ---');
  try {
    // 2.1 Employee denied HR route (/api/audit-logs)
    try {
      await axios.get(`${BASE_URL}/audit-logs`, empHeaders);
      recordTest('RBAC', 'Deny Employee from HR audit logs', false, 'Expected 403');
    } catch (err) {
      recordTest('RBAC', 'Deny Employee from HR audit logs (403)', err.response?.status === 403);
    }

    // 2.2 Employee denied HR payroll preview
    try {
      await axios.get(`${BASE_URL}/payroll/preview?month=2026-11`, empHeaders);
      recordTest('RBAC', 'Deny Employee from HR payroll preview', false, 'Expected 403');
    } catch (err) {
      recordTest('RBAC', 'Deny Employee from HR payroll preview (403)', err.response?.status === 403);
    }

    // 2.3 Employee denied creating broadcasts
    try {
      await axios.post(`${BASE_URL}/broadcasts`, { title: 'Hack', message: 'Not allowed' }, empHeaders);
      recordTest('RBAC', 'Deny Employee from creating broadcasts', false, 'Expected 403');
    } catch (err) {
      recordTest('RBAC', 'Deny Employee from creating broadcasts (403)', err.response?.status === 403);
    }

    // 2.4 Unauthenticated request denied
    try {
      await axios.get(`${BASE_URL}/tasks/my`);
      recordTest('RBAC', 'Deny unauthenticated request', false, 'Expected 401');
    } catch (err) {
      recordTest('RBAC', 'Deny unauthenticated request (401)', err.response?.status === 401);
    }

    // 2.5 HR allowed to view audit logs
    const resHrAudit = await axios.get(`${BASE_URL}/audit-logs`, hrHeaders);
    recordTest('RBAC', 'Allow HR to access audit logs (200)', resHrAudit.status === 200 && Array.isArray(resHrAudit.data?.logs));

  } catch (err) {
    recordTest('RBAC', 'Suite execution fatal error', false, err.message);
  }

  // ----------------------------------------------------
  // SUITE 3: ATTENDANCE & PUNCH LIFECYCLE
  // ----------------------------------------------------
  console.log('\n--- SUITE 3: Attendance & Punch Lifecycle ---');
  try {
    // 3.1 Check today's attendance status
    const resToday = await axios.get(`${BASE_URL}/attendance/today`, empHeaders);
    recordTest('Attendance', 'Get today attendance session', resToday.status === 200 && resToday.data?.success === true);

    // 3.2 Punch in with mismatch ID should fail
    try {
      await axios.post(`${BASE_URL}/attendance/punch-in`, { employeeIdInput: 'WRONG_ID_999' }, empHeaders);
      recordTest('Attendance', 'Reject punch-in with mismatched Employee ID', false, 'Expected 400');
    } catch (err) {
      recordTest('Attendance', 'Reject punch-in with mismatched Employee ID (400)', err.response?.status === 400);
    }

    // 3.3 Punch in with valid Employee ID (or verify existing active session check)
    try {
      const resPunchIn = await axios.post(`${BASE_URL}/attendance/punch-in`, { employeeIdInput: 'NX001' }, empHeaders);
      recordTest('Attendance', 'Punch In with verified Employee ID (201/200)', resPunchIn.status === 201 || resPunchIn.status === 200);
    } catch (err) {
      const msg = err.response?.data?.message || '';
      const isExpected = err.response?.status === 400 && (
        msg.includes('already have an active attendance session') ||
        msg.includes('already completed your attendance session') ||
        msg.includes('already marked')
      );
      recordTest('Attendance', 'Punch In active-session duplicate prevention (400)', isExpected, msg);
    }

    // 3.4 Punch out without daily report should be rejected
    try {
      await axios.post(`${BASE_URL}/attendance/punch-out`, { summaryBullets: [] }, empHeaders);
      recordTest('Attendance', 'Reject punch-out without daily work report bullets', false, 'Expected 400');
    } catch (err) {
      recordTest('Attendance', 'Reject punch-out without daily report (400)', err.response?.status === 400);
    }

    // 3.5 Attendance history
    const resHist = await axios.get(`${BASE_URL}/attendance/my-history`, empHeaders);
    recordTest('Attendance', 'Fetch employee attendance history (/my-history)', resHist.status === 200 && Array.isArray(resHist.data?.history));

    // 3.6 HR view all attendance records
    const resSummary = await axios.get(`${BASE_URL}/attendance/all`, hrHeaders);
    recordTest('Attendance', 'HR view live attendance directory (/all)', resSummary.status === 200 && Array.isArray(resSummary.data?.records));

  } catch (err) {
    recordTest('Attendance', 'Suite execution fatal error', false, err.message);
  }

  // ----------------------------------------------------
  // SUITE 4: TASK WORKFLOW & LIFECYCLE
  // ----------------------------------------------------
  console.log('\n--- SUITE 4: Task Workflow & Lifecycle ---');
  let createdTaskId = null;
  let hrAssignedTaskId = null;
  try {
    // 4.1 Employee fetch tasks
    const resMyTasks = await axios.get(`${BASE_URL}/tasks/my`, empHeaders);
    recordTest('Tasks', 'Fetch personal & HR assigned tasks', resMyTasks.status === 200 && Array.isArray(resMyTasks.data?.personalTasks));

    // 4.2 Employee create personal task
    const resCreateTask = await axios.post(`${BASE_URL}/tasks/personal`, {
      title: 'Automated Test Task 1',
      description: 'Testing task creation flow',
      priority: 'High',
      dueDate: new Date().toISOString()
    }, empHeaders);
    createdTaskId = resCreateTask.data?.task?._id;
    recordTest('Tasks', 'Employee create personal task', resCreateTask.status === 201 && createdTaskId);

    // 4.3 Update task status to In Progress
    const resStatus1 = await axios.patch(`${BASE_URL}/tasks/${createdTaskId}/status`, {
      status: 'In Progress'
    }, empHeaders);
    recordTest('Tasks', 'Update task status -> In Progress', resStatus1.status === 200 && resStatus1.data?.task?.status === 'In Progress');

    // 4.4 Update task status to Completed
    const resStatus2 = await axios.patch(`${BASE_URL}/tasks/${createdTaskId}/status`, {
      status: 'Completed'
    }, empHeaders);
    recordTest('Tasks', 'Update task status -> Completed', resStatus2.status === 200 && resStatus2.data?.task?.status === 'Completed');

    // 4.5 HR assign task to Employee
    const resHrAssign = await axios.post(`${BASE_URL}/tasks/assign`, {
      title: 'HR Assigned Security Review',
      description: 'Please review security credentials',
      employeeId: empUser?.employee?._id,
      priority: 'High',
      dueDate: new Date().toISOString()
    }, hrHeaders);
    hrAssignedTaskId = resHrAssign.data?.task?._id;
    recordTest('Tasks', 'HR assign task to Employee', resHrAssign.status === 201 && hrAssignedTaskId);

    // 4.6 Employee trying to delete HR assigned task must be rejected
    try {
      await axios.delete(`${BASE_URL}/tasks/${hrAssignedTaskId}`, empHeaders);
      recordTest('Tasks', 'Employee cannot delete HR assigned task', false, 'Expected 403');
    } catch (err) {
      recordTest('Tasks', 'Employee cannot delete HR assigned task (403)', err.response?.status === 403);
    }

    // 4.7 Employee can delete own personal task
    const resDelOwn = await axios.delete(`${BASE_URL}/tasks/${createdTaskId}`, empHeaders);
    recordTest('Tasks', 'Employee delete own personal task', resDelOwn.status === 200);

    // Clean up HR assigned task by HR
    if (hrAssignedTaskId) {
      await axios.delete(`${BASE_URL}/tasks/${hrAssignedTaskId}`, hrHeaders).catch(() => {});
    }

  } catch (err) {
    recordTest('Tasks', 'Suite execution fatal error', false, err.message);
  }

  // ----------------------------------------------------
  // SUITE 5: LEAVE MANAGEMENT & APPROVAL LIFECYCLE
  // ----------------------------------------------------
  console.log('\n--- SUITE 5: Leave Management & Approval Lifecycle ---');
  let testLeaveRequestId = null;
  try {
    // 5.1 Fetch leave policies
    const resPolicies = await axios.get(`${BASE_URL}/leaves/policies`, empHeaders);
    recordTest('Leave', 'Fetch leave policies', resPolicies.status === 200 && Array.isArray(resPolicies.data?.policies));

    // 5.2 Fetch employee leave balance
    const resBalance = await axios.get(`${BASE_URL}/leaves/balance`, empHeaders);
    recordTest('Leave', 'Fetch employee leave balance', resBalance.status === 200 && resBalance.data?.balances !== undefined);

    // 5.3 Apply for future leave
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 35 + Math.floor(Math.random() * 40));
    const dateStr = futureDate.toISOString().slice(0, 10);

    const resApply = await axios.post(`${BASE_URL}/leaves/apply`, {
      startDate: dateStr,
      endDate: dateStr,
      isHalfDay: false,
      reasonCategory: 'Personal',
      reasonDetails: 'Family function automated test leave'
    }, empHeaders);
    testLeaveRequestId = resApply.data?.leaveRequest?._id;
    recordTest('Leave', 'Apply for leave request', resApply.status === 201 && testLeaveRequestId);

    // 5.4 HR list all leave requests
    const resAllLeaves = await axios.get(`${BASE_URL}/leaves/all`, hrHeaders);
    recordTest('Leave', 'HR list all leave requests (/leaves/all)', resAllLeaves.status === 200 && Array.isArray(resAllLeaves.data?.requests));

    // 5.5 HR review leave request (Reject to clean up)
    if (testLeaveRequestId) {
      const resReview = await axios.patch(`${BASE_URL}/leaves/${testLeaveRequestId}/review`, {
        status: 'Rejected',
        reviewRemarks: 'Automated test verification clean-up'
      }, hrHeaders);
      recordTest('Leave', 'HR review leave request (Reject/Approve)', resReview.status === 200 && (resReview.data?.leave?.status === 'Rejected' || resReview.data?.leaveRequest?.status === 'Rejected'));
    }

  } catch (err) {
    recordTest('Leave', 'Suite execution fatal error', false, err.message);
  }

  // ----------------------------------------------------
  // SUITE 6: BROADCASTS & NOTICES
  // ----------------------------------------------------
  console.log('\n--- SUITE 6: Broadcasts & Notices ---');
  let broadcastId = null;
  try {
    // 6.1 HR create broadcast notice
    const resCreateBroadcast = await axios.post(`${BASE_URL}/broadcasts`, {
      title: 'Automated Test Announcement',
      message: 'All systems are operating at optimal performance.',
      priority: 'Normal',
      targetType: 'ALL',
      category: 'General',
      isPinnedBanner: false,
      sendPush: false
    }, hrHeaders);
    broadcastId = resCreateBroadcast.data?.broadcast?._id;
    recordTest('Broadcast', 'HR create broadcast announcement', resCreateBroadcast.status === 201 && broadcastId);

    // 6.2 Employee fetch active notices
    const resNotices = await axios.get(`${BASE_URL}/broadcasts/active`, empHeaders);
    const noticeFound = resNotices.data?.broadcasts?.some(b => b.title === 'Automated Test Announcement');
    recordTest('Broadcast', 'Employee fetch notice board includes new broadcast', resNotices.status === 200 && noticeFound);

    // Clean up broadcast
    if (broadcastId) {
      await axios.delete(`${BASE_URL}/broadcasts/${broadcastId}`, hrHeaders).catch(() => {});
    }

  } catch (err) {
    recordTest('Broadcast', 'Suite execution fatal error', false, err.message);
  }

  // ----------------------------------------------------
  // SUITE 7: EMPLOYEE DIRECTORY & PROFILE
  // ----------------------------------------------------
  console.log('\n--- SUITE 7: Employee Directory & Profile ---');
  try {
    // 7.1 HR list employees
    const resEmpList = await axios.get(`${BASE_URL}/employees`, hrHeaders);
    recordTest('Employee Directory', 'HR list all employees', resEmpList.status === 200 && Array.isArray(resEmpList.data?.employees));

    // 7.2 HR get specific employee detail
    const firstEmp = resEmpList.data?.employees?.[0];
    if (firstEmp?._id) {
      const resDetail = await axios.get(`${BASE_URL}/employees/${firstEmp._id}`, hrHeaders);
      recordTest('Employee Directory', 'HR get employee detail by ID', resDetail.status === 200 && resDetail.data?.employee?.fullName !== undefined);
    }

    // 7.3 Employee change profile picture
    const samplePreset = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80';
    const resPic = await axios.put(`${BASE_URL}/auth/profile-picture`, {
      profilePicture: samplePreset
    }, empHeaders);
    recordTest('Employee Directory', 'Employee update profile picture (/auth/profile-picture)', resPic.status === 200 && resPic.data?.success === true);

  } catch (err) {
    recordTest('Employee Directory', 'Suite execution fatal error', false, err.message);
  }

  // ----------------------------------------------------
  // SUITE 8: PAYROLL ENGINE
  // ----------------------------------------------------
  console.log('\n--- SUITE 8: Payroll Engine ---');
  try {
    // 8.1 HR preview payroll for 2026-11
    const resPayroll = await axios.get(`${BASE_URL}/payroll/preview?month=2026-11`, hrHeaders);
    recordTest('Payroll', 'HR preview monthly payroll (2026-11)', resPayroll.status === 200 && Array.isArray(resPayroll.data?.previews));

    if (resPayroll.data?.previews?.length > 0) {
      const sample = resPayroll.data.previews[0];
      const validStructure = sample.calendarDays === 30 && sample.payableDays !== undefined && sample.netPayable !== undefined && sample.grossSalary > 0;
      recordTest('Payroll', 'Payroll calculations structure validation (calendarDays, netPayable, deductions)', validStructure);
    }

  } catch (err) {
    recordTest('Payroll', 'Suite execution fatal error', false, err.message);
  }

  // ----------------------------------------------------
  // SUITE 9: SHIFTS & SETTINGS
  // ----------------------------------------------------
  console.log('\n--- SUITE 9: Shifts & Settings ---');
  try {
    // 9.1 Fetch shifts
    const resShifts = await axios.get(`${BASE_URL}/shifts`, empHeaders);
    recordTest('Shifts', 'Fetch shift templates', resShifts.status === 200 && Array.isArray(resShifts.data?.shifts));

    // 9.2 Fetch system settings
    const resSettings = await axios.get(`${BASE_URL}/settings`, empHeaders);
    recordTest('Settings', 'Fetch system settings', resSettings.status === 200 && resSettings.data?.settings !== undefined);

  } catch (err) {
    recordTest('Shifts & Settings', 'Suite execution fatal error', false, err.message);
  }

  // ----------------------------------------------------
  // SUITE 10: NOTIFICATIONS & AUDIT TRAILS
  // ----------------------------------------------------
  console.log('\n--- SUITE 10: Notifications & Audit Trails ---');
  try {
    // 10.1 Fetch notifications
    const resNotifs = await axios.get(`${BASE_URL}/notifications`, empHeaders);
    recordTest('Notifications', 'Fetch user notifications', resNotifs.status === 200 && Array.isArray(resNotifs.data?.notifications));

    // 10.2 Mark notifications as read
    const resMarkAll = await axios.patch(`${BASE_URL}/notifications/read-all`, {}, empHeaders);
    recordTest('Notifications', 'Mark all notifications as read', resMarkAll.status === 200);

    // 10.3 HR audit logs
    const resAudit = await axios.get(`${BASE_URL}/audit-logs?limit=10`, hrHeaders);
    recordTest('Audit', 'HR query operational audit logs', resAudit.status === 200 && resAudit.data?.logs?.length > 0);

  } catch (err) {
    recordTest('Notifications & Audit', 'Suite execution fatal error', false, err.message);
  }

  console.log('\n====================================================');
  console.log('BACKEND AUDIT SUMMARY');
  console.log('====================================================');
  console.log(`Total Checks Executed: ${results.total}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success Rate: ${Math.round((results.passed / results.total) * 100)}%`);
  console.log('====================================================\n');

  if (results.failed > 0) {
    console.error('Failed Tests:');
    results.tests.filter(t => !t.passed).forEach(t => console.error(` - [${t.suite}] ${t.name}: ${t.details}`));
  }
}

runComprehensiveBackendAudit().then(() => {
  process.exit(results.failed > 0 ? 1 : 0);
}).catch(err => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
