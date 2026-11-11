const LeaveLedger = require('../models/LeaveLedger');
const LeaveRequest = require('../models/LeaveRequest');
const Attendance = require('../models/Attendance');
const SystemSetting = require('../models/SystemSetting');
const AttendanceService = require('./attendanceService');

class LeaveService {
  /**
   * Calculate leave balance for an employee from the immutable ledger
   * Initializes annual credit (12 CL, 12 SL) if no credit exists yet
   */
  static async getBalance(employeeId) {
    // Check if initial annual credit exists for this employee
    const hasCredit = await LeaveLedger.exists({
      employee: employeeId,
      transactionType: 'Credit'
    });

    if (!hasCredit) {
      const settings = (await SystemSetting.findOne().lean()) || {};
      const clTotal = Number(settings.yearlyClTotal ?? 12);
      const slTotal = Number(settings.yearlySlTotal ?? 12);

      await LeaveLedger.create([
        {
          employee: employeeId,
          leaveType: 'CL',
          transactionType: 'Credit',
          units: clTotal,
          referenceModel: 'PolicyGrant',
          remarks: 'Annual Casual Leave Entitlement (12 days / 1 per month)'
        },
        {
          employee: employeeId,
          leaveType: 'SL',
          transactionType: 'Credit',
          units: slTotal,
          referenceModel: 'PolicyGrant',
          remarks: 'Annual Sick Leave Entitlement (12 days)'
        }
      ]);
    }

    const transactions = await LeaveLedger.find({ employee: employeeId });

    let clBalance = 0;
    let slBalance = 0;
    let lwpCount = 0;

    for (const tx of transactions) {
      if (tx.leaveType === 'CL') {
        if (['Credit', 'Reversal'].includes(tx.transactionType)) {
          clBalance += tx.units;
        } else if (['Debit', 'Adjustment'].includes(tx.transactionType)) {
          clBalance -= tx.units;
        }
      } else if (tx.leaveType === 'SL') {
        if (['Credit', 'Reversal'].includes(tx.transactionType)) {
          slBalance += tx.units;
        } else if (['Debit', 'Adjustment'].includes(tx.transactionType)) {
          slBalance -= tx.units;
        }
      } else if (tx.leaveType === 'LWP') {
        if (['Debit', 'Adjustment'].includes(tx.transactionType)) {
          lwpCount += tx.units;
        } else if (['Credit', 'Reversal'].includes(tx.transactionType)) {
          lwpCount -= tx.units;
        }
      }
    }

    return {
      clBalance: Math.max(0, parseFloat(clBalance.toFixed(2))),
      slBalance: Math.max(0, parseFloat(slBalance.toFixed(2))),
      lwpCount: Math.max(0, parseFloat(lwpCount.toFixed(2)))
    };
  }

  /**
   * Validate and automatically classify a leave request
   * Rules:
   * 1. 24 hours or less (<= 1 day): Auto-approved.
   * 2. Monthly Casual Leave Quota: 1 Paid CL allowed per month.
   *    Subsequent leaves in the same month auto-classify as LWP (unpaid / salary deduction).
   * 3. More than 24 hours (> 1 day): HR approval mandatory (Pending_Review).
   * 4. Health / Sick Leave (SL): Not automatically paid; HR discretion required (Pending_Review).
   */
  static async validateAndClassify({
    employee,
    startDate,
    endDate,
    isHalfDay,
    halfDayType,
    reasonCategory,
    reasonDetails
  }) {
    const flagReasons = [];
    let isLateApplication = false;

    const settings = (await SystemSetting.findOne().lean()) || {};

    // 1. Date math
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid leave date format. Please use YYYY-MM-DD');
    }

    if (start > end) {
      throw new Error('Start date cannot be after end date');
    }

    // Calculate requested days
    let requestedDays = 0;
    if (isHalfDay) {
      requestedDays = 0.5;
    } else {
      const diffTime = Math.abs(end - start);
      requestedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    // 2. Check duplicate / overlapping leave requests
    const overlappingLeave = await LeaveRequest.findOne({
      employee: employee._id,
      status: { $in: ['Approved', 'Pending_Review', 'Flagged'] },
      $or: [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
      ]
    });

    if (overlappingLeave) {
      throw new Error(
        `A leave request already exists for this timeframe (${overlappingLeave.startDate} to ${overlappingLeave.endDate})`
      );
    }

    // 3. Check existing attendance conflicts
    const attendanceConflict = await Attendance.findOne({
      employee: employee._id,
      date: { $gte: startDate, $lte: endDate },
      punchIn: { $ne: null }
    });

    if (attendanceConflict) {
      flagReasons.push(`Attendance conflict: Employee punched in on ${attendanceConflict.date}`);
    }

    // 4. Configurable Cut-off timing check (Conditions 32-34)
    const todayStr = AttendanceService.formatDate(new Date());
    if (startDate === todayStr) {
      const workStartTime = settings.workStartTime || '10:00';
      const [sh, sm] = workStartTime.split(':').map(Number);
      const startMinutes = (sh || 10) * 60 + (sm || 0);

      let cutOffMinutes = startMinutes - (settings.fullDayCutoffMinutes || 120);

      if (isHalfDay) {
        if (halfDayType === 'FirstHalf') {
          cutOffMinutes = startMinutes - (settings.morningHalfDayCutoffMinutes || 60);
        } else if (halfDayType === 'SecondHalf') {
          const lunchTime = settings.lunchStartTime || '13:30';
          const [lh, lm] = lunchTime.split(':').map(Number);
          const lunchMinutes = (lh || 13) * 60 + (lm || 30);
          cutOffMinutes = lunchMinutes - (settings.afternoonHalfDayCutoffMinutes || 60);
        }
      }

      const now = new Date();
      const currentMinutes = AttendanceService.dateToMinutes(now, settings?.companyTimezone);

      if (currentMinutes > cutOffMinutes) {
        isLateApplication = true;
        flagReasons.push('Late application: submitted past the configured cut-off time');
      }
    }

    // 5. Monthly CL Quota Check (1 CL / month allowed)
    const monthPrefix = startDate.slice(0, 7); // YYYY-MM
    const approvedMonthLeaves = await LeaveRequest.find({
      employee: employee._id,
      status: 'Approved',
      startDate: { $regex: `^${monthPrefix}` }
    });

    let usedMonthlyCl = 0;
    for (const lv of approvedMonthLeaves) {
      usedMonthlyCl += (lv.classificationBreakdown?.clDays || 0);
    }

    const monthlyClAllowance = Number(settings.monthlyClAllowance ?? 1);
    const remainingMonthlyCl = Math.max(0, monthlyClAllowance - usedMonthlyCl);

    // Ledger balance check
    const balances = await this.getBalance(employee._id);
    const availableCl = Math.min(remainingMonthlyCl, balances.clBalance);

    let clDays = 0;
    let slDays = 0;
    let lwpDays = 0;
    let autoClassification = 'LWP';
    let status = 'Approved';

    // 6. Classification & Approval Decision
    if (reasonCategory === 'Health') {
      // Condition 42-44: Sick leave is never automatically paid; HR decides at review/payroll
      autoClassification = 'Pending_Review';
      status = 'Pending_Review';
      slDays = requestedDays;
    } else {
      // Casual / Personal / Other Leave
      if (requestedDays <= 1) {
        // Condition 25-26: <= 24 hours does NOT require HR approval (Auto-approved)
        if (availableCl >= requestedDays) {
          // Within 1 CL monthly quota -> Paid Casual Leave
          clDays = requestedDays;
          lwpDays = 0;
          autoClassification = 'CL';
          status = flagReasons.length > 0 ? 'Flagged' : 'Approved';
        } else if (availableCl > 0 && availableCl < requestedDays) {
          // Partial Paid CL + rest LWP
          clDays = availableCl;
          lwpDays = requestedDays - availableCl;
          autoClassification = 'Split';
          status = flagReasons.length > 0 ? 'Flagged' : 'Approved';
        } else {
          // Monthly 1 CL quota is exhausted! Automatically classified as LWP (unpaid, salary deducted)
          clDays = 0;
          lwpDays = requestedDays;
          autoClassification = 'LWP';
          status = flagReasons.length > 0 ? 'Flagged' : 'Approved';
        }
      } else {
        // Condition 27 & 38: > 24 hours REQUIRES HR approval
        status = 'Pending_Review';
        if (availableCl >= requestedDays) {
          clDays = requestedDays;
          lwpDays = 0;
          autoClassification = 'CL';
        } else if (availableCl > 0) {
          clDays = availableCl;
          lwpDays = requestedDays - availableCl;
          autoClassification = 'Split';
        } else {
          clDays = 0;
          lwpDays = requestedDays;
          autoClassification = 'LWP';
        }
      }
    }

    return {
      requestedDays,
      autoClassification,
      classificationBreakdown: { clDays, slDays, lwpDays },
      isLateApplication,
      flagReasons,
      status
    };
  }

  /**
   * Post ledger entries for an approved leave request
   * CL / SL / LWP entries are posted to the immutable ledger
   */
  static async recordLedgerEntries(leaveRequest, performedBy = null) {
    if (leaveRequest.status !== 'Approved') {
      return; // Only post to ledger when leave is Approved
    }

    const { employee, classificationBreakdown, _id, startDate } = leaveRequest;
    const clUnits = classificationBreakdown?.clDays || 0;
    const slUnits = classificationBreakdown?.slDays || 0;
    const lwpUnits = classificationBreakdown?.lwpDays || 0;

    if (clUnits > 0) {
      await LeaveLedger.create({
        employee,
        leaveType: 'CL',
        transactionType: 'Debit',
        units: clUnits,
        referenceModel: 'LeaveRequest',
        referenceId: _id,
        remarks: `Paid Casual Leave (CL) for ${startDate}`,
        performedBy
      });
    }

    if (slUnits > 0) {
      await LeaveLedger.create({
        employee,
        leaveType: 'SL',
        transactionType: 'Debit',
        units: slUnits,
        referenceModel: 'LeaveRequest',
        referenceId: _id,
        remarks: `Paid Sick Leave (SL) approved for ${startDate}`,
        performedBy
      });
    }

    if (lwpUnits > 0) {
      await LeaveLedger.create({
        employee,
        leaveType: 'LWP',
        transactionType: 'Debit',
        units: lwpUnits,
        referenceModel: 'LeaveRequest',
        referenceId: _id,
        remarks: `Unpaid leave (LWP) recorded for ${startDate}`,
        performedBy
      });
    }
  }

  /**
   * Reclassify an approved or pending leave (Conditions 48-53)
   * Target classifications: 'Paid_CL', 'Paid_SL', 'LWP'
   */
  static async reclassifyLeave(leaveRequestId, targetClassification, hrUser, reason) {
    const leave = await LeaveRequest.findById(leaveRequestId);
    if (!leave) throw new Error('Leave request not found');

    const prevClassification = leave.autoClassification;
    const prevBreakdown = { ...leave.classificationBreakdown };
    const totalDays = leave.totalDays;

    // Reverse any previous debits if it was already Approved
    if (leave.status === 'Approved') {
      if (prevBreakdown.clDays > 0) {
        await LeaveLedger.create({
          employee: leave.employee,
          leaveType: 'CL',
          transactionType: 'Reversal',
          units: prevBreakdown.clDays,
          referenceModel: 'LeaveRequest',
          referenceId: leave._id,
          remarks: `Reclassification reversal by HR: ${reason}`,
          performedBy: hrUser._id
        });
      }
      if (prevBreakdown.slDays > 0) {
        await LeaveLedger.create({
          employee: leave.employee,
          leaveType: 'SL',
          transactionType: 'Reversal',
          units: prevBreakdown.slDays,
          referenceModel: 'LeaveRequest',
          referenceId: leave._id,
          remarks: `Reclassification reversal by HR: ${reason}`,
          performedBy: hrUser._id
        });
      }
      if (prevBreakdown.lwpDays > 0) {
        await LeaveLedger.create({
          employee: leave.employee,
          leaveType: 'LWP',
          transactionType: 'Reversal',
          units: prevBreakdown.lwpDays,
          referenceModel: 'LeaveRequest',
          referenceId: leave._id,
          remarks: `Reclassification reversal by HR: ${reason}`,
          performedBy: hrUser._id
        });
      }
    }

    let newCl = 0;
    let newSl = 0;
    let newLwp = 0;
    let newAutoClass = 'LWP';

    if (targetClassification === 'Paid_CL' || targetClassification === 'CL') {
      newCl = totalDays;
      newAutoClass = 'CL';
    } else if (targetClassification === 'Paid_SL' || targetClassification === 'SL') {
      newSl = totalDays;
      newAutoClass = 'SL';
    } else {
      newLwp = totalDays;
      newAutoClass = 'LWP';
    }

    leave.status = 'Approved';
    leave.autoClassification = newAutoClass;
    leave.classificationBreakdown = { clDays: newCl, slDays: newSl, lwpDays: newLwp };
    leave.convertedToLwp = newLwp > 0;
    leave.conversionAudit = {
      convertedAt: new Date(),
      convertedBy: hrUser._id,
      reason,
      previousClassification: prevClassification
    };

    await leave.save();

    // Post new debits
    await this.recordLedgerEntries(leave, hrUser._id);

    return leave;
  }

  /**
   * Convert CL/SL to LWP during HR Payroll Review (backward compatibility)
   */
  static async convertLeaveToLwp(leaveRequestId, hrUser, reason) {
    return this.reclassifyLeave(leaveRequestId, 'LWP', hrUser, reason);
  }
}

module.exports = LeaveService;
