const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const DailyReport = require('../models/DailyReport');
const Task = require('../models/Task');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveLedger = require('../models/LeaveLedger');
const SalaryProfile = require('../models/SalaryProfile');
const PayrollRecord = require('../models/PayrollRecord');
const Broadcast = require('../models/Broadcast');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const ShiftTemplate = require('../models/ShiftTemplate');
const LeavePolicy = require('../models/LeavePolicy');
const SystemSetting = require('../models/SystemSetting');

dotenv.config();

const clearAllEmployeeData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nx_work_os';
    await mongoose.connect(mongoUri);
    console.log('[Clear] Connected to MongoDB');

    // 1. Delete all employee records and associated operational data
    const empResult = await Employee.deleteMany({});
    console.log(`[Clear] Deleted ${empResult.deletedCount} employee records.`);

    // 2. Delete non-HR users
    const userResult = await User.deleteMany({ role: { $ne: 'HR' } });
    console.log(`[Clear] Deleted ${userResult.deletedCount} employee user accounts.`);

    // 3. Clear operational collections
    const [attRes, repRes, taskRes, leaveRes, ledgerRes, salaryRes, payrollRes, broadRes, notifRes, auditRes] = await Promise.all([
      Attendance.deleteMany({}),
      DailyReport.deleteMany({}),
      Task.deleteMany({}),
      LeaveRequest.deleteMany({}),
      LeaveLedger.deleteMany({}),
      SalaryProfile.deleteMany({}),
      PayrollRecord.deleteMany({}),
      Broadcast.deleteMany({}),
      Notification.deleteMany({}),
      AuditLog.deleteMany({})
    ]);

    console.log(`[Clear] Operational data wiped:`);
    console.log(` - Attendance: ${attRes.deletedCount}`);
    console.log(` - Daily Reports: ${repRes.deletedCount}`);
    console.log(` - Tasks: ${taskRes.deletedCount}`);
    console.log(` - Leave Requests: ${leaveRes.deletedCount}`);
    console.log(` - Leave Ledger: ${ledgerRes.deletedCount}`);
    console.log(` - Salary Profiles: ${salaryRes.deletedCount}`);
    console.log(` - Payroll Records: ${payrollRes.deletedCount}`);
    console.log(` - Broadcasts: ${broadRes.deletedCount}`);
    console.log(` - Notifications: ${notifRes.deletedCount}`);
    console.log(` - Audit Logs: ${auditRes.deletedCount}`);

    // 4. Ensure HR Admin user exists
    const hrEmail = (process.env.INITIAL_HR_EMAIL || 'hr@nxworkos.com').toLowerCase();
    const hrPassword = process.env.INITIAL_HR_PASSWORD || 'Admin@NX2026';
    let hrUser = await User.findOne({ role: 'HR' });
    if (!hrUser) {
      hrUser = await User.create({
        email: hrEmail,
        password: hrPassword,
        role: 'HR',
        isActive: true
      });
      console.log(`[Clear] Recreated HR Admin: ${hrEmail}`);
    } else {
      console.log(`[Clear] HR Admin user retained: ${hrUser.email}`);
    }

    // 5. Ensure Default ShiftTemplate exists
    let defaultShift = await ShiftTemplate.findOne({ isDefault: true });
    if (!defaultShift) {
      defaultShift = await ShiftTemplate.create({
        name: 'General Shift (10:00 AM - 6:00 PM)',
        startTime: '10:00',
        endTime: '18:00',
        requiredHours: 8,
        breakDurationMinutes: 60,
        gracePeriodMinutes: 10,
        isDefault: true,
        description: 'Standard 8-hour shift with 10-minute grace time'
      });
      console.log('[Clear] Ensured default ShiftTemplate exists');
    }

    // 6. Ensure Default LeavePolicy exists
    let defaultPolicy = await LeavePolicy.findOne({ isDefault: true });
    if (!defaultPolicy) {
      defaultPolicy = await LeavePolicy.create({
        name: 'Standard Corporate Policy',
        clAnnualQuota: 12,
        slAnnualQuota: 10,
        allocationFrequency: 'Annual',
        carryForwardLimit: 5,
        applicationCutOffHours: 1,
        allowHalfDay: true,
        classificationPriority: 'CL_First',
        fallbackPolicy: 'LWP',
        lateLeavePolicy: 'Flag_For_Review',
        isDefault: true
      });
      console.log('[Clear] Ensured default LeavePolicy exists');
    }

    // 7. Ensure SystemSetting exists
    let settings = await SystemSetting.findOne();
    if (!settings) {
      await SystemSetting.create({
        companyName: 'NX Work OS Technologies',
        companyTimezone: 'Asia/Kolkata',
        departments: ['Development', 'Design', 'Testing', 'Human Resources', 'Support', 'Operations'],
        designations: ['Developer', 'Designer', 'Tester', 'HR Executive', 'Intern', 'Support Specialist'],
        gracePeriodMinutes: 10,
        defaultRequiredHours: 8,
        dailyRateBasis: 'CalendarDays'
      });
      console.log('[Clear] Ensured default SystemSetting exists');
    }

    console.log('[Clear] Successfully wiped all employees and dummy data. System is clean and ready.');
    process.exit(0);
  } catch (err) {
    console.error('[Clear Error]:', err);
    process.exit(1);
  }
};

clearAllEmployeeData();

