const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require('dns');

// Public DNS resolver to prevent Windows/ISP SRV query ECONNREFUSED
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // ignore
}

dotenv.config();

const User = require('../models/User');
const Employee = require('../models/Employee');
const ShiftTemplate = require('../models/ShiftTemplate');
const LeavePolicy = require('../models/LeavePolicy');
const SalaryProfile = require('../models/SalaryProfile');
const LeaveLedger = require('../models/LeaveLedger');
const SystemSetting = require('../models/SystemSetting');
const Task = require('../models/Task');
const Attendance = require('../models/Attendance');
const DailyReport = require('../models/DailyReport');
const LeaveRequest = require('../models/LeaveRequest');
const Notification = require('../models/Notification');
const PayrollRecord = require('../models/PayrollRecord');
const Broadcast = require('../models/Broadcast');
const AuditLog = require('../models/AuditLog');

const resetAndSeedDummy = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nx_work_os';
  console.log('[NX Work OS] Connecting to MongoDB...');
  
  try {
    await mongoose.connect(mongoUri);
    console.log(`[MongoDB] Connected successfully to: ${mongoose.connection.host}/${mongoose.connection.name}`);

    // 1. CLEAR ALL EXISTING DATA ("data hata dena sara")
    console.log('[Clear] Removing all existing data from database...');
    await Promise.all([
      User.deleteMany({}),
      Employee.deleteMany({}),
      ShiftTemplate.deleteMany({}),
      LeavePolicy.deleteMany({}),
      SalaryProfile.deleteMany({}),
      LeaveLedger.deleteMany({}),
      SystemSetting.deleteMany({}),
      Task.deleteMany({}),
      Attendance.deleteMany({}),
      DailyReport.deleteMany({}),
      LeaveRequest.deleteMany({}),
      Notification.deleteMany({}),
      PayrollRecord.deleteMany({}),
      Broadcast.deleteMany({}),
      AuditLog.deleteMany({})
    ]);
    console.log('[Clear] All existing collections have been cleared.');

    // 2. CREATE SYSTEM BASELINE CONFIGURATION
    console.log('[Setup] Creating default System Settings, Shift Template, and Leave Policy...');
    await SystemSetting.create({
      companyName: 'NX Work OS Technologies',
      companyTimezone: process.env.COMPANY_TIMEZONE || 'Asia/Kolkata',
      departments: ['Development', 'Design', 'Testing', 'Human Resources', 'Support', 'Operations'],
      designations: ['Developer', 'Designer', 'Tester', 'HR Executive', 'Intern', 'Support Specialist'],
      gracePeriodMinutes: 10,
      defaultRequiredHours: 8,
      dailyRateBasis: 'CalendarDays'
    });

    const shift = await ShiftTemplate.create({
      name: 'General Shift (10:00 AM - 6:00 PM)',
      startTime: '10:00',
      endTime: '18:00',
      requiredHours: 8,
      breakDurationMinutes: 60,
      gracePeriodMinutes: 10,
      isDefault: true,
      description: 'Standard 8-hour shift with 10-minute grace time'
    });

    const leavePolicy = await LeavePolicy.create({
      name: 'Standard Corporate Policy (All Leaves Unpaid / LWP)',
      clAnnualQuota: 0,
      slAnnualQuota: 0,
      allocationFrequency: 'Annual',
      carryForwardLimit: 0,
      applicationCutOffHours: 1,
      allowHalfDay: true,
      classificationPriority: 'CL_First',
      fallbackPolicy: 'LWP',
      lateLeavePolicy: 'Flag_For_Review',
      isDefault: true
    });

    // 3. CREATE HR ADMIN USER
    const hrEmail = (process.env.INITIAL_HR_EMAIL || 'hr@nxworkos.com').toLowerCase();
    const hrPassword = process.env.INITIAL_HR_PASSWORD || 'ChangeThisPassword123!';

    const hrUser = await User.create({
      email: hrEmail,
      password: hrPassword,
      role: 'HR',
      isActive: true
    });
    console.log(`[Setup] HR Administrator account created: ${hrEmail}`);

    // 4. CREATE ONE DUMMY EMPLOYEE ("ek dummy employee create kr dena")
    console.log('[Setup] Creating 1 dummy employee record...');
    const dummyEmp = await Employee.create({
      employeeId: 'NX001',
      fullName: 'Rahul Sharma',
      officialEmail: 'rahul@nxworkos.com',
      mobileNumber: '9876543210',
      department: 'Development',
      designation: 'Developer',
      employmentType: 'Full-time',
      joiningDate: new Date('2024-01-15'),
      assignedShift: shift._id,
      weeklyOff: ['Sunday'],
      leavePolicy: leavePolicy._id,
      employmentStatus: 'Active'
    });

    // Create user login account for the dummy employee
    const empUser = await User.create({
      email: dummyEmp.officialEmail,
      password: 'Employee@123',
      role: 'Employee',
      isActive: true,
      employee: dummyEmp._id
    });

    dummyEmp.user = empUser._id;
    await dummyEmp.save();

    // Create Salary Profile for the dummy employee
    await SalaryProfile.create({
      employee: dummyEmp._id,
      monthlyGrossSalary: 40000,
      basicSalary: 20000,
      hra: 12000,
      specialAllowance: 8000,
      dailyRateBasis: 'CalendarDays',
      effectiveFrom: dummyEmp.joiningDate,
      isCurrent: true,
      configuredBy: hrUser._id,
      notes: 'Initial salary profile for dummy employee'
    });

    // All leaves are unpaid by default; no initial paid quota credits needed

    await AuditLog.create({
      action: 'SYSTEM_RESET_AND_SEEDED',
      entityType: 'Employee',
      entityId: dummyEmp._id,
      performedBy: hrUser._id,
      performedByName: hrUser.email,
      reason: 'Database cleared and single dummy employee initialized',
      newState: { employeeId: dummyEmp.employeeId, fullName: dummyEmp.fullName }
    });

    console.log('\n======================================================');
    console.log('✅ DATABASE INITIALIZED SUCCESSFULLY');
    console.log('======================================================');
    console.log('1. HR Admin Account:');
    console.log(`   Email:    ${hrEmail}`);
    console.log(`   Password: ${hrPassword}`);
    console.log(`   Role:     HR`);
    console.log('------------------------------------------------------');
    console.log('2. Dummy Employee Account:');
    console.log(`   ID:       ${dummyEmp.employeeId}`);
    console.log(`   Name:     ${dummyEmp.fullName}`);
    console.log(`   Email:    ${dummyEmp.officialEmail}`);
    console.log(`   Password: Employee@123`);
    console.log(`   Role:     Employee`);
    console.log(`   Dept:     ${dummyEmp.department} (${dummyEmp.designation})`);
    console.log('======================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ ERROR during database reset and seeding:', err.message);
    process.exit(1);
  }
};

resetAndSeedDummy();
