const PayrollRecord = require('../models/PayrollRecord');
const SalaryProfile = require('../models/SalaryProfile');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Employee = require('../models/Employee');
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
   */
  static async calculateEmployeePayroll(employeeId, month) {
    const employee = await Employee.findById(employeeId);
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

    for (const att of attendanceRecords) {
      if (att.status === 'Present') {
        presentDays++;
      } else if (att.status === 'Late') {
        presentDays++;
        lateDays++;
      } else if (att.status === 'Half Day' || att.status === 'Half-day') {
        presentDays += 0.5;
        halfDays++;
      } else if (att.status === 'Incomplete') {
        incompleteDays++;
      }
    }

    // Get leaves in month
    const leaves = await LeaveRequest.find({
      employee: employeeId,
      status: 'Approved',
      startDate: { $lte: endStr },
      endDate: { $gte: startStr }
    });

    let paidLeaveDays = 0;
    let lwpDays = 0;

    for (const lv of leaves) {
      // By default, all approved leaves are unpaid (LWP) without segregation
      const days = lv.totalDays || ((lv.classificationBreakdown?.lwpDays || 0) + (lv.classificationBreakdown?.clDays || 0) + (lv.classificationBreakdown?.slDays || 0));
      lwpDays += days;
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

    // Calculate unmarked days
    const totalAccountedDays = presentDays + incompleteDays + paidLeaveDays + lwpDays + weeklyOffDays;
    const unmarkedDays = Math.max(0, calendarDays - totalAccountedDays);

    // Compute payable days & net salary
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

    // Payable Days = Present + Paid Leaves + Weekly Offs
    const payableDays = Math.min(calendarDays, presentDays + paidLeaveDays + weeklyOffDays);
    const lwpDeduction = parseFloat((lwpDays * perDayRate).toFixed(2));
    const netPayable = Math.max(0, parseFloat((grossSalary - lwpDeduction).toFixed(2)));

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
      paidLeaveDays,
      weeklyOffDays,
      lwpDays,
      unmarkedDays,
      incompleteDays,
      perDayRate,
      lwpDeduction,
      otherDeductions: 0,
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
