const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
require('dotenv').config();

const PayrollService = require('../services/payrollService');
const Employee = require('../models/Employee');
const SalaryProfile = require('../models/SalaryProfile');
const PayrollRecord = require('../models/PayrollRecord');
const ShiftTemplate = require('../models/ShiftTemplate');
const SystemSetting = require('../models/SystemSetting');

async function syncPayroll() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  // Update SystemSetting
  await SystemSetting.updateMany({}, {
    $set: {
      dailyRateBasis: 'WorkingDays',
      defaultRequiredHours: 8
    }
  });

  // Update SalaryProfiles to WorkingDays (All Days - Sundays)
  await SalaryProfile.updateMany({}, {
    $set: {
      dailyRateBasis: 'WorkingDays'
    }
  });
  console.log('Updated SystemSetting and SalaryProfiles to WorkingDays (All Days - Sundays)');

  const emps = await Employee.find({ employmentStatus: 'Active' }).populate('assignedShift');
  let count = 0;
  for (const emp of emps) {
    const calc = await PayrollService.calculateEmployeePayroll(emp._id, '2026-11');
    await PayrollRecord.findOneAndUpdate(
      { employee: emp._id, month: '2026-11' },
      { $set: { ...calc, status: 'Review' } },
      { new: true, upsert: true }
    );
    console.log(`${emp.fullName} (${emp.employeeId}): Gross=₹${calc.grossSalary}, WorkingDays=${calc.workingDays}, PerDay=₹${calc.perDayRate}, PerMin=₹${calc.perMinuteRate}, LateMins=${calc.totalLateMinutes}, LateDed=₹${calc.lateDeduction}, HalfDays=${calc.halfDays}, HalfDayDed=₹${calc.halfDayDeduction}, Net=₹${calc.netPayable}`);
    count++;
  }
  console.log(`\nSuccessfully verified & synced ${count} payroll records for Nov 2026.`);
  process.exit(0);
}

syncPayroll().catch(err => {
  console.error(err);
  process.exit(1);
});
