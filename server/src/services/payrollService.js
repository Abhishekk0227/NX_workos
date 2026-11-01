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
   * Calculate payroll for a single employee for a specific month (YYYY-MM)
   * Integrates Conditions 11-24, 47-66, and Employee Joining Date boundary
   */
  static async calculateEmployeePayroll(employeeId, month) {
    const employee = await Employee.findById(employeeId).populate('assignedShift');
    if (!employee) throw new Error('Employee not found');

    const settings = await SystemSetting.findOne().lean();

    const salaryProfile = await SalaryProfile.findOne({
      employee: employeeId,
      isCurrent: true
    });

    if (!salaryProfile) {
      throw new Error(`No active salary profile found for employee ${employee.employeeId}. Please configure salary first.`);
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

      if (att.lateMinutes > 0) {
        totalLateMinutes += att.lateMinutes;
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

    // Calculate weekly offs only for active employment duration
    const [year, mNum] = month.split('-').map(Number);
    let weeklyOffDays = 0;
    const weeklyOffNames = employee.weeklyOff || ['Sunday'];
    const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let day = activeStartDay; day <= calendarDays; day++) {
      const dt = new Date(year, mNum - 1, day);
      const dayName = daysMap[dt.getDay()];
      if (weeklyOffNames.includes(dayName)) {
        weeklyOffDays++;
      }
    }

    // Calculate unmarked / unexcused days during active employment duration only
    const totalAccountedDays = presentDays + halfDays + incompleteDays + paidLeaveDays + lwpDays + weeklyOffDays;
    const unmarkedDays = Math.max(0, effectiveActiveDays - totalAccountedDays);

    // Compute Base Rates
    const fullMonthlyGross = salaryProfile.monthlyGrossSalary;
    let perDayRate = 0;

    if (salaryProfile.dailyRateBasis === '30DaysFixed') {
      perDayRate = parseFloat((fullMonthlyGross / 30).toFixed(2));
    } else if (salaryProfile.dailyRateBasis === 'WorkingDays') {
      const workingDays = Math.max(1, calendarDays - weeklyOffDays);
      perDayRate = parseFloat((fullMonthlyGross / workingDays).toFixed(2));
    } else {
      // Default: CalendarDays
      perDayRate = parseFloat((fullMonthlyGross / calendarDays).toFixed(2));
    }

    // If mid-month joiner, gross is prorated for active days of the month
    const grossSalary = isMidMonthJoiner
      ? parseFloat(((fullMonthlyGross / calendarDays) * effectiveActiveDays).toFixed(2))
      : fullMonthlyGross;

    // Shift Hours & Per-Minute Rate (Condition 23, 55)
    const shiftHours = employee.assignedShift?.requiredHours || settings?.defaultRequiredHours || 8;
    const shiftMinutes = Math.max(60, shiftHours * 60);
    const perMinuteRate = parseFloat((perDayRate / shiftMinutes).toFixed(4));

    // Deduction 1: Late Arrival (Conditions 19, 20, 56)
    const enableLateDeduction = settings ? settings.enableLateDeduction !== false : true;
    const lateDeduction = enableLateDeduction && totalLateMinutes > 0
      ? parseFloat((totalLateMinutes * perMinuteRate).toFixed(2))
      : 0;

    // Deduction 2: Half-Day Deduction (Conditions 21, 22, 57)
    const halfDayDeductionPct = settings?.halfDayDeductionPercentage || 50;
    const halfDayRate = perDayRate * (halfDayDeductionPct / 100);
    const halfDayDeduction = halfDays > 0
      ? parseFloat((halfDays * halfDayRate).toFixed(2))
      : 0;

    // Deduction 3: LWP / Unpaid Leaves (Condition 60)
    const lwpDeduction = lwpDays > 0
      ? parseFloat((lwpDays * perDayRate).toFixed(2))
      : 0;

    // Deduction 4: Shortfall Deduction (Condition 17, 58)
    const shortfallDeduction = 0;

    // Build Itemized Deduction Breakdown (Condition 62, 65)
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
        description: `Half Day (${halfDays} days @ ${halfDayDeductionPct}% per day)`,
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
      dailyRateBasis: salaryProfile.dailyRateBasis,
      calendarDays,
      effectiveActiveDays,
      payableDays,
      presentDays,
      halfDays,
      lateDays,
      totalLateMinutes,
      perMinuteRate,
      paidLeaveDays,
      weeklyOffDays,
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
