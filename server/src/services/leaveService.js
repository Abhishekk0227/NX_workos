const LeaveLedger = require('../models/LeaveLedger');
const LeaveRequest = require('../models/LeaveRequest');
const Attendance = require('../models/Attendance');
const AttendanceService = require('./attendanceService');

class LeaveService {
  /**
   * Calculate leave balance for an employee from the immutable ledger
   */
  static async getBalance(employeeId) {
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
   */
  static async validateAndClassify({
    employee,
    startDate,
    endDate,
    isHalfDay,
    halfDayType,
    reasonCategory,
    reasonDetails,
    shift
  }) {
    const flagReasons = [];
    let isLateApplication = false;

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
      throw new Error(`A leave request already exists for this timeframe (${overlappingLeave.startDate} to ${overlappingLeave.endDate})`);
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

    // 4. Cut-off timing check
    const todayStr = AttendanceService.formatDate(new Date());
    if (startDate === todayStr) {
      const shiftStartTime = shift?.startTime || '09:00';
      const cutOffHours = 2; // Default 2 hours cut-off
      const [sh, sm] = shiftStartTime.split(':').map(Number);
      const shiftStartMinutes = sh * 60 + sm;
      const cutOffMinutes = shiftStartMinutes - cutOffHours * 60;

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      if (currentMinutes > cutOffMinutes) {
        isLateApplication = true;
        flagReasons.push('Late application: submitted past the shift cut-off time');
      }
    }

    // 5. Balance check & intelligent auto-classification
    const balances = await this.getBalance(employee._id);
    let remainingDays = requestedDays;
    let clDays = 0;
    let slDays = 0;
    let lwpDays = 0;

    // Reason-based priority: Health -> SL first; Personal/Other -> CL first
    if (reasonCategory === 'Health') {
      if (balances.slBalance >= remainingDays) {
        slDays = remainingDays;
        remainingDays = 0;
      } else {
        slDays = balances.slBalance;
        remainingDays -= slDays;

        if (balances.clBalance >= remainingDays) {
          clDays = remainingDays;
          remainingDays = 0;
        } else {
          clDays = balances.clBalance;
          remainingDays -= clDays;
          lwpDays = remainingDays;
        }
      }
    } else {
      // Personal or Other
      if (balances.clBalance >= remainingDays) {
        clDays = remainingDays;
        remainingDays = 0;
      } else {
        clDays = balances.clBalance;
        remainingDays -= clDays;

        if (balances.slBalance >= remainingDays) {
          slDays = remainingDays;
          remainingDays = 0;
        } else {
          slDays = balances.slBalance;
          remainingDays -= slDays;
          lwpDays = remainingDays;
        }
      }
    }

    // Determine high-level autoClassification string
    let autoClassification = 'Pending_Review';
    if (lwpDays === 0) {
      if (slDays > 0 && clDays === 0) autoClassification = 'SL';
      else if (clDays > 0 && slDays === 0) autoClassification = 'CL';
      else autoClassification = 'Split';
    } else if (clDays === 0 && slDays === 0) {
      autoClassification = 'LWP';
      flagReasons.push('Insufficient paid leave balance: converted to Leave Without Pay (LWP)');
    } else {
      autoClassification = 'Split';
      flagReasons.push('Partial paid leave balance: split across available paid leave and LWP');
    }

    const status = flagReasons.length > 0 ? 'Flagged' : 'Approved';

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
   * Post ledger entries for an approved or auto-classified leave
   */
  static async recordLedgerEntries(leaveRequest, performedBy = null) {
    const { employee, classificationBreakdown, _id } = leaveRequest;
    const entries = [];

    if (classificationBreakdown?.clDays > 0) {
      entries.push({
        employee,
        leaveType: 'CL',
        transactionType: 'Debit',
        units: classificationBreakdown.clDays,
        referenceModel: 'LeaveRequest',
        referenceId: _id,
        remarks: `Leave request debit for ${leaveRequest.startDate}`,
        performedBy
      });
    }

    if (classificationBreakdown?.slDays > 0) {
      entries.push({
        employee,
        leaveType: 'SL',
        transactionType: 'Debit',
        units: classificationBreakdown.slDays,
        referenceModel: 'LeaveRequest',
        referenceId: _id,
        remarks: `Leave request debit for ${leaveRequest.startDate}`,
        performedBy
      });
    }

    if (classificationBreakdown?.lwpDays > 0) {
      entries.push({
        employee,
        leaveType: 'LWP',
        transactionType: 'Debit',
        units: classificationBreakdown.lwpDays,
        referenceModel: 'LeaveRequest',
        referenceId: _id,
        remarks: `LWP recorded for ${leaveRequest.startDate}`,
        performedBy
      });
    }

    if (entries.length > 0) {
      await LeaveLedger.insertMany(entries);
    }
  }

  /**
   * Convert CL/SL to LWP during HR Payroll Review
   * - Preserves the original leave application
   * - Reverses paid leave debit in ledger
   * - Debits LWP in ledger
   * - Logs audit trail
   */
  static async convertLeaveToLwp(leaveRequestId, hrUser, reason) {
    const leaveRequest = await LeaveRequest.findById(leaveRequestId);
    if (!leaveRequest) throw new Error('Leave request not found');

    if (leaveRequest.convertedToLwp) {
      throw new Error('This leave request has already been converted to LWP');
    }

    const prevClassification = leaveRequest.autoClassification;
    const prevBreakdown = { ...leaveRequest.classificationBreakdown };

    // Reverse paid leave days and convert all to LWP
    const daysToConvert = (prevBreakdown.clDays || 0) + (prevBreakdown.slDays || 0);

    if (daysToConvert <= 0) {
      throw new Error('This leave does not contain any paid days (CL/SL) to convert');
    }

    // 1. Restore CL if any
    if (prevBreakdown.clDays > 0) {
      await LeaveLedger.create({
        employee: leaveRequest.employee,
        leaveType: 'CL',
        transactionType: 'Reversal',
        units: prevBreakdown.clDays,
        referenceModel: 'LeaveRequest',
        referenceId: leaveRequest._id,
        remarks: `Reversed CL conversion to LWP by HR: ${reason}`,
        performedBy: hrUser._id
      });
    }

    // 2. Restore SL if any
    if (prevBreakdown.slDays > 0) {
      await LeaveLedger.create({
        employee: leaveRequest.employee,
        leaveType: 'SL',
        transactionType: 'Reversal',
        units: prevBreakdown.slDays,
        referenceModel: 'LeaveRequest',
        referenceId: leaveRequest._id,
        remarks: `Reversed SL conversion to LWP by HR: ${reason}`,
        performedBy: hrUser._id
      });
    }

    // 3. Debit LWP for converted days
    await LeaveLedger.create({
      employee: leaveRequest.employee,
      leaveType: 'LWP',
      transactionType: 'Debit',
      units: daysToConvert,
      referenceModel: 'LeaveRequest',
      referenceId: leaveRequest._id,
      remarks: `Converted to LWP during payroll review by HR: ${reason}`,
      performedBy: hrUser._id
    });

    // 4. Update the LeaveRequest record without deleting history
    leaveRequest.convertedToLwp = true;
    leaveRequest.autoClassification = 'LWP';
    leaveRequest.classificationBreakdown = {
      clDays: 0,
      slDays: 0,
      lwpDays: leaveRequest.totalDays
    };
    leaveRequest.conversionAudit = {
      convertedAt: new Date(),
      convertedBy: hrUser._id,
      reason,
      previousClassification: prevClassification
    };

    await leaveRequest.save();
    return leaveRequest;
  }
}

module.exports = LeaveService;
