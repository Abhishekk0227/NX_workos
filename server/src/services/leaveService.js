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

    // 5. Default: All leaves are Unpaid Leave (LWP) by default without segregation
    const clDays = 0;
    const slDays = 0;
    const lwpDays = requestedDays;
    const autoClassification = 'LWP';

    // Status: Flagged if attendance conflict or late submission, else Approved
    const status = flagReasons.length > 0 ? 'Flagged' : 'Approved';

    return {
      requestedDays,
      autoClassification,
      classificationBreakdown: { clDays: 0, slDays: 0, lwpDays },
      isLateApplication,
      flagReasons,
      status
    };
  }

  /**
   * Post ledger entries for an approved or auto-classified leave
   * All leaves are recorded as Unpaid Leave (LWP)
   */
  static async recordLedgerEntries(leaveRequest, performedBy = null) {
    const { employee, classificationBreakdown, _id, totalDays } = leaveRequest;
    const lwpUnits = classificationBreakdown?.lwpDays ?? totalDays;

    if (lwpUnits > 0) {
      await LeaveLedger.create({
        employee,
        leaveType: 'LWP',
        transactionType: 'Debit',
        units: lwpUnits,
        referenceModel: 'LeaveRequest',
        referenceId: _id,
        remarks: `Unpaid leave (LWP) recorded for ${leaveRequest.startDate}`,
        performedBy
      });
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
