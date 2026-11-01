const express = require('express');
const router = express.Router();
const LeaveRequest = require('../models/LeaveRequest');
const LeaveLedger = require('../models/LeaveLedger');
const LeavePolicy = require('../models/LeavePolicy');
const Employee = require('../models/Employee');
const AuditLog = require('../models/AuditLog');
const LeaveService = require('../services/leaveService');
const NotificationService = require('../services/notificationService');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

/**
 * GET /api/leaves/policies
 * List all leave policies
 */
router.get('/policies', protect, async (req, res, next) => {
  try {
    const policies = await LeavePolicy.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: policies.length,
      policies
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/leaves/policies
 * Create or update leave policy (HR only)
 */
router.post('/policies', protect, authorize('HR'), async (req, res, next) => {
  try {
    const {
      name,
      clAnnualQuota,
      slAnnualQuota,
      allocationFrequency,
      carryForwardLimit,
      applicationCutOffHours,
      allowHalfDay,
      classificationPriority,
      fallbackPolicy,
      lateLeavePolicy,
      isDefault
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Policy name is required' });
    }

    if (isDefault) {
      await LeavePolicy.updateMany({}, { isDefault: false });
    }

    const policy = await LeavePolicy.create({
      name: name.trim(),
      clAnnualQuota: Number(clAnnualQuota) || 12,
      slAnnualQuota: Number(slAnnualQuota) || 12,
      allocationFrequency: allocationFrequency || 'Annual',
      carryForwardLimit: Number(carryForwardLimit) || 0,
      applicationCutOffHours: Number(applicationCutOffHours) || 2,
      allowHalfDay: allowHalfDay !== false,
      classificationPriority: classificationPriority || 'CL_First',
      fallbackPolicy: fallbackPolicy || 'LWP',
      lateLeavePolicy: lateLeavePolicy || 'Flag_For_Review',
      isDefault: !!isDefault
    });

    res.status(201).json({
      success: true,
      message: 'Leave policy created successfully',
      policy
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/leaves/balance
 * Get logged-in employee leave balance and ledger summary
 */
router.get('/balance', protect, async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.json({
        success: true,
        balances: { clBalance: 0, slBalance: 0, lwpCount: 0 }
      });
    }

    const balances = await LeaveService.getBalance(req.user.employee._id);

    res.json({
      success: true,
      balances
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/leaves/balance/:employeeId
 * Get specific employee leave balance and full ledger history (HR only)
 */
router.get('/balance/:employeeId', protect, authorize('HR'), async (req, res, next) => {
  try {
    const balances = await LeaveService.getBalance(req.params.employeeId);
    const ledger = await LeaveLedger.find({ employee: req.params.employeeId })
      .populate('performedBy', 'email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      balances,
      ledger
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/leaves/apply
 * Employee applies for leave (works without punch in)
 * Auto-classifies CL/SL/LWP, records in ledger, notifies HR
 */
router.post('/apply', protect, async (req, res, next) => {
  try {
    const { startDate, endDate, isHalfDay, halfDayType, reasonCategory, reasonDetails } = req.body;

    if (!req.user.employee) {
      return res.status(400).json({ success: false, message: 'Employee profile required' });
    }

    if (!startDate || !endDate || !reasonCategory || !reasonDetails) {
      return res.status(400).json({
        success: false,
        message: 'Start date, end date, reason category, and reason details are required.'
      });
    }

    const employee = await Employee.findById(req.user.employee._id).populate('assignedShift');
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Validate and auto-classify
    const classification = await LeaveService.validateAndClassify({
      employee,
      startDate,
      endDate,
      isHalfDay: !!isHalfDay,
      halfDayType: halfDayType || 'None',
      reasonCategory,
      reasonDetails: reasonDetails.trim(),
      shift: employee.assignedShift
    });

    const leaveRequest = await LeaveRequest.create({
      employee: employee._id,
      startDate,
      endDate,
      isHalfDay: !!isHalfDay,
      halfDayType: halfDayType || 'None',
      reasonCategory,
      reasonDetails: reasonDetails.trim(),
      totalDays: classification.requestedDays,
      autoClassification: classification.autoClassification,
      classificationBreakdown: classification.classificationBreakdown,
      status: classification.status,
      isLateApplication: classification.isLateApplication,
      flagReasons: classification.flagReasons
    });

    // Record ledger entries for auto-classified leave
    await LeaveService.recordLedgerEntries(leaveRequest, req.user._id);

    // Notify HR
    const flagAlert = classification.flagReasons.length > 0 ? ` [Requires Review: ${classification.flagReasons[0]}]` : '';
    await NotificationService.send({
      targetRole: 'HR',
      title: 'New Leave Application',
      message: `${employee.fullName} applied for ${classification.requestedDays} day(s) leave (${classification.autoClassification})${flagAlert}`,
      type: 'Leave',
      link: '/hr/leave'
    });

    res.status(201).json({
      success: true,
      message: `Leave application submitted. Auto-classified as ${classification.autoClassification} (${classification.status})`,
      leaveRequest
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/leaves/my
 * Current employee's leave requests
 */
router.get('/my', protect, async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.json({ success: true, requests: [] });
    }

    const requests = await LeaveRequest.find({ employee: req.user.employee._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/leaves/all
 * HR view of all leave applications across the company
 */
router.get('/all', protect, authorize('HR'), async (req, res, next) => {
  try {
    const { status, classification, employeeId, month } = req.query;
    const filter = {};

    if (status && status !== 'All') {
      filter.status = status;
    }

    if (classification && classification !== 'All') {
      filter.autoClassification = classification;
    }

    if (employeeId && employeeId !== 'All') {
      filter.employee = employeeId;
    }

    if (month) {
      filter.startDate = { $regex: new RegExp(`^${month}`) };
    }

    const requests = await LeaveRequest.find(filter)
      .populate('employee', 'employeeId fullName department designation')
      .populate('reviewedBy', 'email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/leaves/:id/review
 * HR approves, rejects, or flags a leave request
 */
router.patch('/:id/review', protect, authorize('HR'), async (req, res, next) => {
  try {
    const { status, reviewRemarks } = req.body;

    if (!['Approved', 'Rejected', 'Flagged'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const leave = await LeaveRequest.findById(req.params.id).populate('employee');
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    const prevStatus = leave.status;
    leave.status = status;
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    leave.reviewRemarks = reviewRemarks || '';

    // If changing from Approved to Rejected, reverse ledger debits
    if (prevStatus === 'Approved' && status === 'Rejected') {
      const breakdown = leave.classificationBreakdown || {};
      const lwpUnits = breakdown.lwpDays || leave.totalDays || 0;
      if (lwpUnits > 0) {
        await LeaveLedger.create({
          employee: leave.employee._id,
          leaveType: 'LWP',
          transactionType: 'Reversal',
          units: lwpUnits,
          referenceModel: 'LeaveRequest',
          referenceId: leave._id,
          remarks: `Reversed rejected unpaid leave: ${reviewRemarks || ''}`,
          performedBy: req.user._id
        });
      }
      if (breakdown.clDays > 0) {
        await LeaveLedger.create({
          employee: leave.employee._id,
          leaveType: 'CL',
          transactionType: 'Reversal',
          units: breakdown.clDays,
          referenceModel: 'LeaveRequest',
          referenceId: leave._id,
          remarks: `Reversed rejected leave: ${reviewRemarks || ''}`,
          performedBy: req.user._id
        });
      }
      if (breakdown.slDays > 0) {
        await LeaveLedger.create({
          employee: leave.employee._id,
          leaveType: 'SL',
          transactionType: 'Reversal',
          units: breakdown.slDays,
          referenceModel: 'LeaveRequest',
          referenceId: leave._id,
          remarks: `Reversed rejected leave: ${reviewRemarks || ''}`,
          performedBy: req.user._id
        });
      }
    } else if (prevStatus !== 'Approved' && status === 'Approved') {
      // If approved from pending or flagged
      const lwpUnits = leave.classificationBreakdown?.lwpDays || leave.totalDays || 0;
      if (lwpUnits > 0) {
        await LeaveLedger.create({
          employee: leave.employee._id,
          leaveType: 'LWP',
          transactionType: 'Debit',
          units: lwpUnits,
          referenceModel: 'LeaveRequest',
          referenceId: leave._id,
          remarks: `Approved unpaid leave (LWP): ${reviewRemarks || ''}`,
          performedBy: req.user._id
        });
      }
    }

    await leave.save();

    await AuditLog.create({
      action: `LEAVE_${status.toUpperCase()}`,
      entityType: 'LeaveRequest',
      entityId: leave._id,
      performedBy: req.user._id,
      performedByName: req.user.email,
      reason: reviewRemarks || `HR marked leave as ${status}`,
      newState: { status, reviewRemarks }
    });

    if (leave.employee?.user) {
      await NotificationService.send({
        recipient: leave.employee.user,
        title: `Leave Application ${status}`,
        message: `Your leave request for ${leave.startDate} has been ${status.toLowerCase()}. ${reviewRemarks ? `Note: ${reviewRemarks}` : ''}`,
        type: 'Leave',
        link: '/employee/leave'
      });
    }

    res.json({
      success: true,
      message: `Leave request marked as ${status}`,
      leave
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/leaves/:id/convert-lwp
 * HR converts an approved CL/SL record to LWP during payroll review
 * Restores paid leave balance, updates leave application, and logs audit
 */
router.post('/:id/convert-lwp', protect, authorize('HR'), async (req, res, next) => {
  try {
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A mandatory reason is required to convert paid leave to LWP.'
      });
    }

    const updatedLeave = await LeaveService.convertLeaveToLwp(req.params.id, req.user, reason.trim());

    await AuditLog.create({
      action: 'LEAVE_CONVERTED_TO_LWP',
      entityType: 'LeaveRequest',
      entityId: updatedLeave._id,
      performedBy: req.user._id,
      performedByName: req.user.email,
      reason: reason.trim(),
      details: {
        leaveId: updatedLeave._id,
        newClassification: 'LWP',
        breakdown: updatedLeave.classificationBreakdown
      }
    });

    res.json({
      success: true,
      message: 'Leave successfully converted to LWP. Paid leave balance restored and ledger updated.',
      leave: updatedLeave
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
