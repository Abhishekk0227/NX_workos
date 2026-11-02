const mongoose = require('mongoose');
const dotenv = require('dotenv');
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
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {}

dotenv.config();

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nx_work_os';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to MongoDB');

    // Clean existing seed collections to recreate exact UI mockup records
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
      Notification.deleteMany({})
    ]);

    // 1. System Settings
    const settings = await SystemSetting.create({
      companyName: 'NX Work OS Technologies',
      companyTimezone: 'Asia/Kolkata',
      departments: ['Development', 'Design', 'Testing', 'Human Resources', 'Support', 'Operations'],
      designations: ['Developer', 'Designer', 'Tester', 'HR Executive', 'Intern', 'Support Specialist'],
      gracePeriodMinutes: 10,
      defaultRequiredHours: 8,
      dailyRateBasis: 'CalendarDays'
    });

    // 2. Default Shift Template (10:00 AM - 6:00 PM matching UI)
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

    // 3. Default Leave Policy
    const leavePolicy = await LeavePolicy.create({
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

    // 4. HR Admin User
    const hrEmail = (process.env.INITIAL_HR_EMAIL || 'hr@nxworkos.com').toLowerCase();
    const hrPassword = process.env.INITIAL_HR_PASSWORD || 'Admin@NX2026';

    const hrUser = await User.create({
      email: hrEmail,
      password: hrPassword,
      role: 'HR',
      isActive: true
    });
    console.log(`[Seed] Initial HR Account created: ${hrEmail}`);

    await User.create([
      { email: 'admin@nxwork.os', password: 'Password@123', role: 'HR', isActive: true },
      { email: 'admin@nxworkos.com', password: 'Admin@NX2026', role: 'HR', isActive: true }
    ]);

    // 5. Create Employees from UI Mockup
    const employeesData = [
      {
        employeeId: 'TEST_EMP_80',
        fullName: 'Test Employee 80 Conditions',
        officialEmail: 'test80@nxworkos.com',
        mobileNumber: '9998887770',
        department: 'Development',
        designation: 'Developer',
        employmentType: 'Full-time',
        joiningDate: new Date('2024-01-01'),
        salary: 45000
      },
      {
        employeeId: 'NX001',
        fullName: 'Rahul Sharma',
        officialEmail: 'rahul@nxworkos.com',
        mobileNumber: '9876543210',
        department: 'Development',
        designation: 'Developer',
        employmentType: 'Full-time',
        joiningDate: new Date('2024-01-12'),
        salary: 40000
      },
      {
        employeeId: 'NX002',
        fullName: 'Priya Sharma',
        officialEmail: 'priya@nxworkos.com',
        mobileNumber: '9876543211',
        department: 'Design',
        designation: 'Designer',
        employmentType: 'Full-time',
        joiningDate: new Date('2024-02-05'),
        salary: 42000
      },
      {
        employeeId: 'NX003',
        fullName: 'Rahul Verma',
        officialEmail: 'rahul.verma@nxworkos.com',
        mobileNumber: '9876543212',
        department: 'Testing',
        designation: 'Tester',
        employmentType: 'Full-time',
        joiningDate: new Date('2024-03-18'),
        salary: 35500
      },
      {
        employeeId: 'NX004',
        fullName: 'Sneha Patel',
        officialEmail: 'sneha@nxworkos.com',
        mobileNumber: '9876543213',
        department: 'Human Resources',
        designation: 'HR Executive',
        employmentType: 'Full-time',
        joiningDate: new Date('2024-04-01'),
        salary: 41200
      },
      {
        employeeId: 'NX005',
        fullName: 'Vikram Singh',
        officialEmail: 'vikram@nxworkos.com',
        mobileNumber: '9876543214',
        department: 'Development',
        designation: 'Intern',
        employmentType: 'Intern',
        joiningDate: new Date('2024-04-20'),
        salary: 20000
      }
    ];

    const createdEmployees = [];

    for (const empData of employeesData) {
      const emp = await Employee.create({
        employeeId: empData.employeeId,
        fullName: empData.fullName,
        officialEmail: empData.officialEmail,
        mobileNumber: empData.mobileNumber,
        department: empData.department,
        designation: empData.designation,
        employmentType: empData.employmentType,
        joiningDate: empData.joiningDate,
        assignedShift: shift._id,
        weeklyOff: ['Sunday'],
        leavePolicy: leavePolicy._id,
        employmentStatus: 'Active'
      });

      const user = await User.create({
        email: empData.officialEmail,
        password: 'Employee@123',
        role: 'Employee',
        isActive: true,
        employee: emp._id
      });

      emp.user = user._id;
      await emp.save();

      // Salary Profile
      await SalaryProfile.create({
        employee: emp._id,
        monthlyGrossSalary: empData.salary,
        basicSalary: Math.round(empData.salary * 0.5),
        hra: Math.round(empData.salary * 0.3),
        specialAllowance: Math.round(empData.salary * 0.2),
        dailyRateBasis: 'CalendarDays',
        effectiveFrom: empData.joiningDate,
        isCurrent: true,
        configuredBy: hrUser._id,
        notes: 'Initial configured compensation'
      });

      // Leave Ledger credits: 12 CL, 10 SL
      await LeaveLedger.insertMany([
        {
          employee: emp._id,
          leaveType: 'CL',
          transactionType: 'Credit',
          units: 12,
          referenceModel: 'PolicyGrant',
          remarks: 'Annual CL grant',
          performedBy: hrUser._id
        },
        {
          employee: emp._id,
          leaveType: 'SL',
          transactionType: 'Credit',
          units: 10,
          referenceModel: 'PolicyGrant',
          remarks: 'Annual SL grant',
          performedBy: hrUser._id
        }
      ]);

      createdEmployees.push({ emp, user });
    }

    const rahul = createdEmployees[0].emp;
    const priya = createdEmployees[1].emp;

    // Seed tasks exactly matching UI mockups
    await Task.insertMany([
      {
        title: 'Client meeting notes',
        description: 'Review notes from sync with enterprise stakeholders',
        taskType: 'Personal',
        priority: 'High',
        employee: rahul._id,
        status: 'Pending',
        dueDate: new Date()
      },
      {
        title: 'Update website content',
        description: 'Publish documentation for API updates and bugfixes',
        taskType: 'Personal',
        priority: 'Medium',
        employee: rahul._id,
        status: 'In Progress',
        dueDate: new Date()
      },
      {
        title: 'Team meeting',
        description: 'Sprint alignment and weekly progress check',
        taskType: 'HR_Assigned',
        priority: 'Low',
        employee: rahul._id,
        assignedBy: hrUser._id,
        status: 'Pending',
        dueDate: new Date()
      },
      {
        title: 'Prepare monthly report',
        description: 'Summarize engineering throughput and open items',
        taskType: 'HR_Assigned',
        priority: 'Medium',
        employee: rahul._id,
        assignedBy: hrUser._id,
        status: 'Pending',
        dueDate: new Date(Date.now() + 86400000)
      },
      {
        title: 'Design new banner',
        description: 'Create responsive SVG illustrations for marketing banner',
        taskType: 'Personal',
        priority: 'Low',
        employee: rahul._id,
        status: 'Completed',
        dueDate: new Date(Date.now() + 86400000 * 2)
      }
    ]);

    // Seed past attendance records for calendar view
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth(); // 0-indexed

    // Seed 15 days of attendance for Rahul
    for (let day = 1; day <= 26; day++) {
      const dt = new Date(curYear, curMonth, day);
      if (dt.getDay() === 0) continue; // Sunday off

      const dayStr = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      let status = 'Present';
      let lateMinutes = 0;
      let actualWorkingHours = 8.0;

      if (day % 7 === 2) {
        status = 'Late';
        lateMinutes = 15;
        actualWorkingHours = 7.75;
      } else if (day === 14) {
        status = 'On Leave';
        actualWorkingHours = 0;
      }

      const pIn = new Date(curYear, curMonth, day, 10, lateMinutes, 0);
      const pOut = new Date(curYear, curMonth, day, 18, 0, 0);

      const att = await Attendance.create({
        employee: rahul._id,
        date: dayStr,
        shift: shift._id,
        punchIn: status !== 'On Leave' ? pIn : null,
        punchOut: status !== 'On Leave' ? pOut : null,
        actualWorkingHours,
        lateMinutes,
        status
      });

      if (status !== 'On Leave') {
        const rep = await DailyReport.create({
          employee: rahul._id,
          attendance: att._id,
          date: dayStr,
          summaryBullets: [
            'Worked on API integration, fixed bugs, team meeting',
            'Updated frontend responsive layouts and test specs'
          ],
          submittedAt: pOut
        });
        att.dailyReport = rep._id;
        await att.save();
      }
    }

    // Seed leave requests matching UI
    const leaveSample1 = await LeaveRequest.create({
      employee: rahul._id,
      startDate: `${curYear}-${String(curMonth + 1).padStart(2, '0')}-28`,
      endDate: `${curYear}-${String(curMonth + 1).padStart(2, '0')}-28`,
      isHalfDay: false,
      reasonCategory: 'Personal',
      reasonDetails: 'Personal Work',
      totalDays: 1,
      autoClassification: 'CL',
      classificationBreakdown: { clDays: 1, slDays: 0, lwpDays: 0 },
      status: 'Pending_Review'
    });
    await LeaveLedger.create({
      employee: rahul._id,
      leaveType: 'CL',
      transactionType: 'Debit',
      units: 1,
      referenceModel: 'LeaveRequest',
      referenceId: leaveSample1._id,
      remarks: 'Leave debit'
    });

    const leaveSample2 = await LeaveRequest.create({
      employee: rahul._id,
      startDate: `${curYear}-${String(curMonth + 1).padStart(2, '0')}-12`,
      endDate: `${curYear}-${String(curMonth + 1).padStart(2, '0')}-12`,
      isHalfDay: false,
      reasonCategory: 'Health',
      reasonDetails: 'Viral fever rest and medication',
      totalDays: 1,
      autoClassification: 'SL',
      classificationBreakdown: { clDays: 0, slDays: 1, lwpDays: 0 },
      status: 'Approved'
    });
    await LeaveLedger.create({
      employee: rahul._id,
      leaveType: 'SL',
      transactionType: 'Debit',
      units: 1,
      referenceModel: 'LeaveRequest',
      referenceId: leaveSample2._id,
      remarks: 'Sick leave debit'
    });

    // Seed notification
    await Notification.create({
      recipient: createdEmployees[0].user._id,
      title: 'Welcome to NX Work OS',
      message: 'Your developer account is ready. Track attendance and tasks seamlessly.',
      type: 'System'
    });

    console.log('[Seed] Seeding completed with Rahul Sharma (NX001) and full realistic mock dataset!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]:', err);
    process.exit(1);
  }
};

seedDatabase();
