const PayrollRecord = require('../models/PayrollRecord');
const SalaryProfile = require('../models/SalaryProfile');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Employee = require('../models/Employee');
const ShiftTemplate = require('../models/ShiftTemplate');
const SystemSetting = require('../models/SystemSetting');
const Holiday = require('../models/Holiday');

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
    const [year] = month.split('-');
    const startStr = `${month}-01`;
    const endStr = `${month}-${String(calendarDays).padStart(2, '0')}`;

    // Employee joining date boundary check
    const joinRaw = employee.joiningDate || employee.createdAt;
    const joinDateStr = joinRaw ? (typeof joinRaw === 'string' ? joinRaw.slice(0, 10) : new Date(joinRaw).toISOString().slice(0, 10)) : null;

    if (joinDateStr && joinDateStr > endStr) {
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
        holidayDays: 0,
        lwpDays: 0,
        shortAttendanceDays: 0,
        unmarkedDays: 0,
        incompleteDays: 0,
        perDayRate: 0,
        lateDeduction: 0,
        halfDayDeduction: 0,
        shortAttendanceDeduction: 0,
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

    // Get attendance records in month
    const effectiveStartStr = `${month}-${String(activeStartDay).padStart(2, '0')}`;
    const attendanceRecords = await Attendance.find({
      employee: employeeId,
      date: { $gte: effectiveStartStr, $lte: endStr }
    });

    let presentDays = 0;
    let lateDays = 0;
    let incompleteDays = 0;
    let halfDays = 0;
    let shortAttendanceDays = 0;
    let holidayDays = 0;
    let shortAttendanceAdjustmentDeduction = 0;
    let totalLateMinutes = 0;

    for (const att of attendanceRecords) {
      const s = att.status;
      if (s === 'Full Day' || s === 'Present') {
        presentDays++;
      } else if (s === 'Late') {
        presentDays++;
        lateDays++;
      } else if (s === 'Half Day' || s === 'Half-day') {
        halfDays++;
      } else if (s === 'Short Attendance') {
        shortAttendanceDays++;
        // If HR has resolved with specific payable or deduction amount
        if (att.shortAttendanceAlert?.status === 'Resolved') {
          if (att.shortAttendanceAlert.deductionAmount > 0) {
            shortAttendanceAdjustmentDeduction += att.shortAttendanceAlert.deductionAmount;
          }
        }
      } else if (s === 'Holiday') {
        holidayDays++;
      } else if (s === 'Working on Holiday') {
        presentDays++;
        holidayDays++;
      } else if (s === 'Incomplete') {
        incompleteDays++;
      }

      // Late minutes deducted if not already deducted as half day or short attendance
      if (s !== 'Half Day' && s !== 'Half-day' && s !== 'Short Attendance') {
        if (att.lateMinutes > 0) {
          totalLateMinutes += att.lateMinutes;
        }
      }
    }

    // Fetch official holidays for this month to ensure unscheduled/unpunched holidays are paid & not deducted as Absent
    const monthPadded = month.slice(5); // "MM"
    const officialHolidays = await Holiday.find({
      $or: [
        { date: { $regex: new RegExp(`^${month}`) } },
        { isRecurring: true, date: { $regex: new RegExp(`-${monthPadded}-`) } }
      ]
    });

    const applicableHolidayDates = new Set();
    for (const h of officialHolidays) {
      let isApplicable = false;
      if (h.applicability === 'All') isApplicable = true;
      else if (h.applicability === 'Department' && employee.department && h.applicableDepartments?.includes(employee.department)) {
        isApplicable = true;
      } else if (h.applicability === 'Shift' && employee.assignedShift) {
        const sId = employee.assignedShift._id ? employee.assignedShift._id.toString() : employee.assignedShift.toString();
        if (h.applicableShifts?.some(s => s.toString() === sId)) isApplicable = true;
      } else if (h.applicability === 'Custom' && h.applicableEmployees?.some(e => e.toString() === employee._id.toString())) {
        isApplicable = true;
      }

      if (isApplicable) {
        const hDateStr = h.isRecurring ? `${year}-${h.date.slice(5)}` : h.date;
        const dayOfWeek = new Date(hDateStr + 'T12:00:00+05:30').getDay();
        // Exclude if it falls on Sunday (already covered under weeklyOffDays)
        if (dayOfWeek !== 0) {
          applicableHolidayDates.add(hDateStr);
        }
      }
    }

    for (const hDate of applicableHolidayDates) {
      const existingAtt = attendanceRecords.find(att => att.date === hDate);
      if (!existingAtt) {
        holidayDays++;
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

    // Sundays & working days
    const totalMonthSundays = this.getSundaysInRange(month, 1, calendarDays);
    const totalMonthWorkingDays = Math.max(1, calendarDays - totalMonthSundays);

    const activeSundays = this.getSundaysInRange(month, activeStartDay, calendarDays);
    const activeWorkingDays = Math.max(0, effectiveActiveDays - activeSundays);
    const weeklyOffDays = activeSundays;

    // Base rates
    const fullMonthlyGross = salaryProfile.monthlyGrossSalary;
    let perDayRate = 0;

    const rateBasis = salaryProfile.dailyRateBasis || settings?.dailyRateBasis || 'WorkingDays';
    if (rateBasis === '30DaysFixed') {
      perDayRate = parseFloat((fullMonthlyGross / 30).toFixed(2));
    } else if (rateBasis === 'CalendarDays') {
      perDayRate = parseFloat((fullMonthlyGross / calendarDays).toFixed(2));
    } else {
      perDayRate = parseFloat((fullMonthlyGross / totalMonthWorkingDays).toFixed(2));
    }

    const grossSalary = isMidMonthJoiner
      ? parseFloat(((fullMonthlyGross / totalMonthWorkingDays) * activeWorkingDays).toFixed(2))
      : fullMonthlyGross;

    const shiftHours = employee.assignedShift?.fullDayWorkingHoursThreshold || employee.assignedShift?.requiredHours || settings?.defaultRequiredHours || 8;
    const shiftMinutes = Math.max(60, shiftHours * 60);
    const perMinuteRate = parseFloat((perDayRate / shiftMinutes).toFixed(4));

    // Deduction 1: Late Arrival
    const enableLateDeduction = settings ? settings.enableLateDeduction !== false : true;
    const lateDeduction = enableLateDeduction && totalLateMinutes > 0
      ? parseFloat((totalLateMinutes * perMinuteRate).toFixed(2))
      : 0;

    // Deduction 2: Half-Day (50% day salary deduction)
    const halfDayDeductionPct = settings?.halfDayDeductionPercentage || 50;
    const halfDayRate = perDayRate * (halfDayDeductionPct / 100);
    const halfDayDeduction = halfDays > 0
      ? parseFloat((halfDays * halfDayRate).toFixed(2))
      : 0;

    // Deduction 3: Short Attendance (Unresolved short attendance counts as absent deduction unless resolved by HR)
    let shortAttendanceDeduction = 0;
    for (const att of attendanceRecords) {
      if (att.status === 'Short Attendance') {
        if (att.shortAttendanceAlert?.status === 'Resolved') {
          if (att.shortAttendanceAlert.deductionAmount > 0) {
            shortAttendanceDeduction += att.shortAttendanceAlert.deductionAmount;
          } else if (att.shortAttendanceAlert.payableAmount > 0) {
            shortAttendanceDeduction += Math.max(0, perDayRate - att.shortAttendanceAlert.payableAmount);
          } else if (att.shortAttendanceAlert.hrClassification === 'Half Day') {
            shortAttendanceDeduction += halfDayRate;
          } else if (att.shortAttendanceAlert.hrClassification === 'Full Day') {
            // Pardoned - 0 deduction
          } else {
            // HR resolved with 0 deduction
          }
        } else {
          // If unresolved by HR, default to 1 day rate deduction
          shortAttendanceDeduction += perDayRate;
        }
      }
    }
    shortAttendanceDeduction = parseFloat(shortAttendanceDeduction.toFixed(2));

    // Deduction 4: LWP
    const lwpDeduction = lwpDays > 0
      ? parseFloat((lwpDays * perDayRate).toFixed(2))
      : 0;

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
    if (shortAttendanceDeduction > 0) {
      deductionBreakdown.push({
        type: 'Short_Attendance',
        description: `Short Attendance (${shortAttendanceDays} session(s) adjustment/deduction)`,
        amount: shortAttendanceDeduction
      });
    }
    if (lwpDeduction > 0) {
      deductionBreakdown.push({
        type: 'LWP',
        description: `Unpaid Leave / LWP (${lwpDays} days @ ₹${perDayRate.toFixed(2)}/day)`,
        amount: lwpDeduction
      });
    }

    const totalAccountedDays = presentDays + halfDays + incompleteDays + paidLeaveDays + lwpDays + holidayDays;
    const unmarkedDays = Math.max(0, activeWorkingDays - totalAccountedDays);

    const totalDeductions = parseFloat((lateDeduction + halfDayDeduction + shortAttendanceDeduction + lwpDeduction + shortfallDeduction).toFixed(2));
    const netPayable = Math.max(0, parseFloat((grossSalary - totalDeductions).toFixed(2)));
    const payableDays = Math.min(
      effectiveActiveDays,
      parseFloat((presentDays + (halfDays * (1 - halfDayDeductionPct / 100)) + paidLeaveDays + weeklyOffDays + holidayDays).toFixed(2))
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
      shortAttendanceDays,
      holidayDays,
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
      shortAttendanceDeduction,
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
