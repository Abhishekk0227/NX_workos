const PayrollRecord = require('../models/PayrollRecord');
const SalaryProfile = require('../models/SalaryProfile');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Employee = require('../models/Employee');
const SystemSetting = require('../models/SystemSetting');

class PayrollService {
  /**
   * Helper to get total days in a month (e.g. 28, 30, 31)
   */
  static getDaysInMonth(monthStr) {
    const [year, month] = monthStr.split('-').map(Number);
    return new Date(year, month, 0).getDate();
  }

  /**
   * Helper to count Sundays in a date range within a month (YYYY-MM)
   */
  static getSundaysInRange(monthStr, startDay = 1, endDay = null) {
    const [year, month] = monthStr.split('-').map(Number);
    const totalDays = endDay || new Date(year, month, 0).getDate();
    let sundays = 0;
    for (let day = startDay; day <= totalDays; day++) {
      const dt = new Date(year, month - 1, day);
      if (dt.getDay() === 0) { // 0 = Sunday
        sundays++;
      }
    }
    return sundays;
  }

  /**
   * Helper to get working days (All days - Sundays) in a month
   */
  static getWorkingDaysInMonth(monthStr) {
    const calendarDays = this.getDaysInMonth(monthStr);
    const sundays = this.getSundaysInRange(monthStr, 1, calendarDays);
    return Math.max(1, calendarDays - sundays);
  }

  /**
   * Calculate payroll for a single employee for a specific month (YYYY-MM)
   * Integrates Conditions 11-24, 47-66, and Employee Joining Date boundary
   */
  static async calculateEmployeePayroll(employeeId, month) {
    const employee = await Employee.findById(employeeId).populate('assignedShift');
    if (!employee) throw new Error('Employee not found');

    const settings = await SystemSetting.findOne().lean();

    let salaryProfile = await SalaryProfile.findOne({
      employee: employeeId,
      isCurrent: true
    });

    if (!salaryProfile) {
      if (employee.salary && employee.salary > 0) {
        salaryProfile = await SalaryProfile.create({
          employee: employee._id,
          monthlyGrossSalary: employee.salary,
          dailyRateBasis: 'WorkingDays',
          isCurrent: true,
          effectiveFrom: employee.joiningDate || new Date()
        });
      } else {
        throw new Error(`No active salary profile found for employee ${employee.employeeId}. Please configure salary first.`);
      }
    }

    const calendarDays = this.getDaysInMonth(month);
    const startStr = `${month}-01`;
    const endStr = `${month}-${String(calendarDays).padStart(2, '0')}`;

    // Employee joining date boundary check (Condition: No payroll/attendance before joining date)
    const joinRaw = employee.joiningDate || employee.createdAt;
    const joinDateStr = joinRaw ? (typeof joinRaw === 'string' ? joinRaw.slice(0, 10) : new Date(joinRaw).toISOString().slice(0, 10)) : null;

    if (joinDateStr && joinDateStr > endStr) {
      // Employee joined in a future month! Zero days & zero salary for this month.
      return {
        month,
        employee: employee._id,
        employeeDetails: {
          employeeId: employee.employeeId,
          fullName: employee.fullName,
          department: employee.department
        },
        salaryProfile: salaryProfile._id,
        grossSalary: 0,
        dailyRateBasis: salaryProfile.dailyRateBasis,
        calendarDays,
        payableDays: 0,
        presentDays: 0,
        halfDays: 0,
        lateDays: 0,
        totalLateMinutes: 0,
        perMinuteRate: 0,
        paidLeaveDays: 0,
        weeklyOffDays: 0,
        lwpDays: 0,
        unmarkedDays: 0,
        incompleteDays: 0,
        perDayRate: 0,
        lateDeduction: 0,
        halfDayDeduction: 0,
        lwpDeduction: 0,
        shortfallDeduction: 0,
        deductionBreakdown: [],
        otherDeductions: 0,
        totalDeductions: 0,
        netPayable: 0
      };
    }

    const joinMonthPrefix = joinDateStr ? joinDateStr.slice(0, 7) : null;
    const isMidMonthJoiner = joinMonthPrefix === month;
    const activeStartDay = isMidMonthJoiner ? parseInt(joinDateStr.split('-')[2], 10) : 1;
    const effectiveActiveDays = calendarDays - activeStartDay + 1;

    // Get attendance records in month (strictly from active start date)
    const effectiveStartStr = `${month}-${String(activeStartDay).padStart(2, '0')}`;
    const attendanceRecords = await Attendance.find({
      employee: employeeId,
      date: { $gte: effectiveStartStr, $lte: endStr }
    });

    let presentDays = 0;
    let lateDays = 0;
    let incompleteDays = 0;
    let halfDays = 0;
    let totalLateMinutes = 0;

    for (const att of attendanceRecords) {
      if (att.status === 'Present') {
        presentDays++;
      } else if (att.status === 'Late') {
        presentDays++;
        lateDays++;
      } else if (att.status === 'Half Day' || att.status === 'Half-day') {
        halfDays++;
      } else if (att.status === 'Incomplete') {
        incompleteDays++;
      }

      // Late minutes are deducted if not already deducted as half day
      if (att.status !== 'Half Day' && att.status !== 'Half-day') {
        if (att.lateMinutes > 0) {
          totalLateMinutes += att.lateMinutes;
        }
      }
    }

    // Get approved leaves in month
    const leaves = await LeaveRequest.find({
      employee: employeeId,
      status: 'Approved',
      startDate: { $lte: endStr },
      endDate: { $gte: effectiveStartStr }
    });

    let paidLeaveDays = 0;
    let lwpDays = 0;

    for (const lv of leaves) {
      const cl = lv.classificationBreakdown?.clDays || 0;
      const sl = lv.classificationBreakdown?.slDays || 0;
      const lwp = lv.classificationBreakdown?.lwpDays || 0;

      paidLeaveDays += (cl + sl);
      lwpDays += lwp;
    }

    // Policy Rule: Full month salary is based on "all days - sundays" (WorkingDays)
    const totalMonthSundays = this.getSundaysInRange(month, 1, calendarDays);
    const totalMonthWorkingDays = Math.max(1, calendarDays - totalMonthSundays);

    // Active employment Sundays and active working days (for mid-month joiners)
    const activeSundays = this.getSundaysInRange(month, activeStartDay, calendarDays);
    const activeWorkingDays = Math.max(0, effectiveActiveDays - activeSundays);
    const weeklyOffDays = activeSundays;

    // Calculate unmarked / unexcused days during active employment duration
    const totalAccountedDays = presentDays + halfDays + incompleteDays + paidLeaveDays + lwpDays;
    const unmarkedDays = Math.max(0, activeWorkingDays - totalAccountedDays);

    // Compute Base Rates: Company standard is "all days - sundays" (WorkingDays)
    const fullMonthlyGross = salaryProfile.monthlyGrossSalary;
    let perDayRate = 0;

    const rateBasis = salaryProfile.dailyRateBasis || settings?.dailyRateBasis || 'WorkingDays';
    if (rateBasis === '30DaysFixed') {
      perDayRate = parseFloat((fullMonthlyGross / 30).toFixed(2));
    } else if (rateBasis === 'CalendarDays') {
      perDayRate = parseFloat((fullMonthlyGross / calendarDays).toFixed(2));
    } else {
      // Default & Standard Policy: WorkingDays (all days - sundays)
      perDayRate = parseFloat((fullMonthlyGross / totalMonthWorkingDays).toFixed(2));
    }

    // Mid-month joiner prorated gross (based on active working days vs total working days)
    const grossSalary = isMidMonthJoiner
      ? parseFloat(((fullMonthlyGross / totalMonthWorkingDays) * activeWorkingDays).toFixed(2))
      : fullMonthlyGross;

    // Shift Hours & Per-Minute Rate (10:00 to 18:00 = 8 hours = 480 mins)
    const shiftHours = employee.assignedShift?.requiredHours || settings?.defaultRequiredHours || 8;
    const shiftMinutes = Math.max(60, shiftHours * 60);
    const perMinuteRate = parseFloat((perDayRate / shiftMinutes).toFixed(4));

    // Deduction 1: Late Arrival (Per-minute rate deduction)
    const enableLateDeduction = settings ? settings.enableLateDeduction !== false : true;
    const lateDeduction = enableLateDeduction && totalLateMinutes > 0
      ? parseFloat((totalLateMinutes * perMinuteRate).toFixed(2))
      : 0;

    // Deduction 2: Half-Day Deduction (< 6 hours worked = 50% day salary deduction)
    const halfDayDeductionPct = settings?.halfDayDeductionPercentage || 50;
    const halfDayRate = perDayRate * (halfDayDeductionPct / 100);
    const halfDayDeduction = halfDays > 0
      ? parseFloat((halfDays * halfDayRate).toFixed(2))
      : 0;

    // Deduction 3: LWP / Unpaid Leaves
    const lwpDeduction = lwpDays > 0
      ? parseFloat((lwpDays * perDayRate).toFixed(2))
      : 0;

    // Overtime (> 8 hours): No extra salary added (per user policy)
    const shortfallDeduction = 0;

    // Build Itemized Deduction Breakdown
    const deductionBreakdown = [];
    if (lateDeduction > 0) {
      deductionBreakdown.push({
        type: 'Late_Arrival',
        description: `Late Arrival (${totalLateMinutes} mins @ ₹${perMinuteRate.toFixed(2)}/min)`,
        amount: lateDeduction
      });
    }
    if (halfDayDeduction > 0) {
      deductionBreakdown.push({
        type: 'Half_Day',
        description: `Half Day (${halfDays} days @ ${halfDayDeductionPct}% of ₹${perDayRate.toFixed(2)}/day)`,
        amount: halfDayDeduction
      });
    }
    if (lwpDeduction > 0) {
      deductionBreakdown.push({
        type: 'LWP',
        description: `Unpaid Leave / LWP (${lwpDays} days @ ₹${perDayRate.toFixed(2)}/day)`,
        amount: lwpDeduction
      });
    }

    // Payable Days & Final Net Pay
    const totalDeductions = parseFloat((lateDeduction + halfDayDeduction + lwpDeduction + shortfallDeduction).toFixed(2));
    const netPayable = Math.max(0, parseFloat((grossSalary - totalDeductions).toFixed(2)));
    const payableDays = Math.min(
      effectiveActiveDays,
      parseFloat((presentDays + (halfDays * (1 - halfDayDeductionPct / 100)) + paidLeaveDays + weeklyOffDays).toFixed(2))
    );

    return {
      month,
      employee: employee._id,
      employeeDetails: {
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        department: employee.department
      },
      salaryProfile: salaryProfile._id,
      grossSalary,
      dailyRateBasis: rateBasis,
      calendarDays,
      workingDays: totalMonthWorkingDays,
      sundaysInMonth: totalMonthSundays,
      activeWorkingDays,
      effectiveActiveDays,
      payableDays,
      presentDays,
      halfDays,
      lateDays,
      totalLateMinutes,
      perMinuteRate,
      paidLeaveDays,
      weeklyOffDays: totalMonthSundays,
      lwpDays,
      unmarkedDays,
      incompleteDays,
      perDayRate,
      lateDeduction,
      halfDayDeduction,
      lwpDeduction,
      shortfallDeduction,
      deductionBreakdown,
      otherDeductions: 0,
      totalDeductions,
      netPayable
    };
  }

  /**
   * Finalize and lock payroll
   */
  static async finalizePayroll(payrollId, hrUser, notes = '') {
    const record = await PayrollRecord.findById(payrollId);
    if (!record) throw new Error('Payroll record not found');

    if (record.status === 'Finalized') {
      throw new Error('This payroll record has already been finalized and locked');
    }

    record.status = 'Finalized';
    record.finalizedAt = new Date();
    record.finalizedBy = hrUser._id;
    if (notes) record.notes = notes;

    await record.save();
    return record;
  }
}

module.exports = PayrollService;
