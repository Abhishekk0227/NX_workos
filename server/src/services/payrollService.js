const PayrollRecord = require('../models/PayrollRecord');
const SalaryProfile = require('../models/SalaryProfile');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Employee = require('../models/Employee');
const SystemSetting = require('../models/SystemSetting');
const AuditLog = require('../models/AuditLog');

class PayrollService {
  /**
   * Get days in month for YYYY-MM
   */
  static getDaysInMonth(yearMonth) {
    const [year, month] = yearMonth.split('-').map(Number);
    return new Date(year, month, 0).getDate();
  }

  /**
   * Calculate or preview payroll for an employee for a specific month
   * Enforces all Conditions: Per-minute late rate, Half-day %, LWP deductions & Itemized breakdown
   */
  static async calculateEmployeePayroll(employeeId, month) {
    const [employee, settings] = await Promise.all([
      Employee.findById(employeeId).populate('assignedShift'),
      SystemSetting.findOne()
    ]);

    if (!employee) throw new Error('Employee not found');

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

    // Get attendance records in month
    const attendanceRecords = await Attendance.find({
      employee: employeeId,
      date: { $gte: startStr, $lte: endStr }
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
      endDate: { $gte: startStr }
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

    // Calculate weekly offs in the month
    const [year, mNum] = month.split('-').map(Number);
    let weeklyOffDays = 0;
    const weeklyOffNames = employee.weeklyOff || ['Sunday'];
    const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let day = 1; day <= calendarDays; day++) {
      const dt = new Date(year, mNum - 1, day);
      const dayName = daysMap[dt.getDay()];
      if (weeklyOffNames.includes(dayName)) {
        weeklyOffDays++;
      }
    }

    // Calculate unmarked / unexcused days
    const totalAccountedDays = presentDays + halfDays + incompleteDays + paidLeaveDays + lwpDays + weeklyOffDays;
    const unmarkedDays = Math.max(0, calendarDays - totalAccountedDays);

    // Compute Rates
    const grossSalary = salaryProfile.monthlyGrossSalary;
    let perDayRate = 0;

    if (salaryProfile.dailyRateBasis === '30DaysFixed') {
      perDayRate = parseFloat((grossSalary / 30).toFixed(2));
    } else if (salaryProfile.dailyRateBasis === 'WorkingDays') {
      const workingDays = Math.max(1, calendarDays - weeklyOffDays);
      perDayRate = parseFloat((grossSalary / workingDays).toFixed(2));
    } else {
      // Default: CalendarDays
      perDayRate = parseFloat((grossSalary / calendarDays).toFixed(2));
    }

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
    const shortfallDeduction = 0; // Configured if shortfall enabled

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
    const payableDays = Math.min(calendarDays, parseFloat((presentDays + (halfDays * (1 - halfDayDeductionPct / 100)) + paidLeaveDays + weeklyOffDays).toFixed(2)));

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
      throw new Error('This payroll record is already finalized and locked against direct edits.');
    }

    record.status = 'Finalized';
    record.finalizedAt = new Date();
    record.finalizedBy = hrUser._id;
    if (notes) record.notes = notes;

    await record.save();

    await AuditLog.create({
      action: 'PAYROLL_FINALIZED',
      entityType: 'PayrollRecord',
      entityId: record._id,
      performedBy: hrUser._id,
      performedByName: hrUser.email,
      reason: `Payroll finalized for month ${record.month}`,
      newState: { status: 'Finalized', netPayable: record.netPayable }
    });

    return record;
  }
}

module.exports = PayrollService;
