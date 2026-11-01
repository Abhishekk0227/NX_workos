const express = require('express');
const router = express.Router();
const PayrollRecord = require('../models/PayrollRecord');
const Employee = require('../models/Employee');
const SalaryProfile = require('../models/SalaryProfile');
const AuditLog = require('../models/AuditLog');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveService = require('../services/leaveService');
const PayrollService = require('../services/payrollService');
const NotificationService = require('../services/notificationService');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Enforce HR only across all payroll endpoints
router.use(protect, authorize('HR'));

/**
 * GET /api/payroll/preview
 * Preview payroll calculations for all active employees for a given month (YYYY-MM)
 */
router.get('/preview', async (req, res, next) => {
  try {
    const { month } = req.query;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        success: false,
        message: 'A valid month parameter in YYYY-MM format is required (e.g., 2026-10)'
      });
    }

    const employees = await Employee.find({ employmentStatus: 'Active' });
    const previews = [];
    const missingProfiles = [];

    for (const emp of employees) {
      try {
        const preview = await PayrollService.calculateEmployeePayroll(emp._id, month);

        // Check if a saved record already exists
        const existingRecord = await PayrollRecord.findOne({
          employee: emp._id,
          month
        });

        previews.push({
          ...preview,
          savedStatus: existingRecord ? existingRecord.status : 'Unprocessed',
          existingRecordId: existingRecord ? existingRecord._id : null
        });
      } catch (err) {
        missingProfiles.push({
          employeeId: emp.employeeId,
          fullName: emp.fullName,
          reason: err.message
        });
      }
    }

    res.json({
      success: true,
      month,
      count: previews.length,
      previews,
      missingProfiles
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/payroll/generate
 * Calculate and save draft/review payroll records for an employee or all active employees
 */
router.post('/generate', async (req, res, next) => {
  try {
    const { month, employeeId } = req.body;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: 'Valid month (YYYY-MM) is required' });
    }

    let employees = [];
    if (employeeId && employeeId !== 'All') {
      const emp = await Employee.findById(employeeId);
      if (emp) employees = [emp];
    } else {
      employees = await Employee.find({ employmentStatus: 'Active' });
    }

    const savedRecords = [];
    const errors = [];

    for (const emp of employees) {
      try {
        // Check if existing record is already finalized
        const existing = await PayrollRecord.findOne({ employee: emp._id, month });
        if (existing && existing.status === 'Finalized') {
          errors.push(`Payroll for ${emp.employeeId} is already finalized and locked.`);
          continue;
        }

        const calculated = await PayrollService.calculateEmployeePayroll(emp._id, month);

        let record;
        if (existing) {
          existing.grossSalary = calculated.grossSalary;
          existing.payableDays = calculated.payableDays;
          existing.calendarDays = calculated.calendarDays;
          existing.presentDays = calculated.presentDays;
          existing.paidLeaveDays = calculated.paidLeaveDays;
          existing.weeklyOffDays = calculated.weeklyOffDays;
          existing.lwpDays = calculated.lwpDays;
          existing.unmarkedDays = calculated.unmarkedDays;
          existing.incompleteDays = calculated.incompleteDays;
          existing.perDayRate = calculated.perDayRate;
          existing.perMinuteRate = calculated.perMinuteRate;
          existing.lateMinutes = calculated.lateMinutes;
          existing.lateDeduction = calculated.lateDeduction;
          existing.halfDays = calculated.halfDays;
          existing.halfDayDeduction = calculated.halfDayDeduction;
          existing.shortfallDeduction = calculated.shortfallDeduction;
          existing.lwpDeduction = calculated.lwpDeduction;
          existing.deductionBreakdown = calculated.deductionBreakdown;
          existing.netPayable = calculated.netPayable;
          existing.status = 'Review';
          record = await existing.save();
        } else {
          record = await PayrollRecord.create({
            month,
            employee: emp._id,
            salaryProfile: calculated.salaryProfile,
            grossSalary: calculated.grossSalary,
            dailyRateBasis: calculated.dailyRateBasis,
            calendarDays: calculated.calendarDays,
            payableDays: calculated.payableDays,
            presentDays: calculated.presentDays,
            paidLeaveDays: calculated.paidLeaveDays,
            weeklyOffDays: calculated.weeklyOffDays,
            lwpDays: calculated.lwpDays,
            unmarkedDays: calculated.unmarkedDays,
            incompleteDays: calculated.incompleteDays,
            perDayRate: calculated.perDayRate,
            perMinuteRate: calculated.perMinuteRate,
            lateMinutes: calculated.lateMinutes,
            lateDeduction: calculated.lateDeduction,
            halfDays: calculated.halfDays,
            halfDayDeduction: calculated.halfDayDeduction,
            shortfallDeduction: calculated.shortfallDeduction,
            lwpDeduction: calculated.lwpDeduction,
            deductionBreakdown: calculated.deductionBreakdown,
            netPayable: calculated.netPayable,
            status: 'Review'
          });
        }
        savedRecords.push(record);
      } catch (err) {
        errors.push(`${emp.fullName} (${emp.employeeId}): ${err.message}`);
      }
    }

    res.json({
      success: true,
      message: `Generated payroll for ${savedRecords.length} employees`,
      savedCount: savedRecords.length,
      savedRecords,
      errors
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/payroll/finalize
 * Finalize and permanently lock payroll records for a month
 */
router.post('/finalize', async (req, res, next) => {
  try {
    const { month, notes } = req.body;

    if (!month) {
      return res.status(400).json({ success: false, message: 'Month (YYYY-MM) is required' });
    }

    const records = await PayrollRecord.find({ month, status: { $ne: 'Finalized' } });

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No pending or review payroll records found to finalize for this month.'
      });
    }

    const finalizedRecords = [];
    for (const rec of records) {
      rec.status = 'Finalized';
      rec.finalizedAt = new Date();
      rec.finalizedBy = req.user._id;
      if (notes) rec.notes = notes;
      await rec.save();
      finalizedRecords.push(rec);
    }

    await AuditLog.create({
      action: 'MONTHLY_PAYROLL_FINALIZED',
      entityType: 'PayrollRecord',
      performedBy: req.user._id,
      performedByName: req.user.email,
      reason: `Finalized monthly payroll for ${month} (${finalizedRecords.length} records locked)`
    });

    res.json({
      success: true,
      message: `Successfully finalized and locked ${finalizedRecords.length} payroll records for ${month}.`,
      finalizedCount: finalizedRecords.length
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/payroll/history
 * List finalized and historical payroll records
 */
router.get('/history', async (req, res, next) => {
  try {
    const { month, employeeId } = req.query;
    const filter = {};

    if (month) filter.month = month;
    if (employeeId && employeeId !== 'All') filter.employee = employeeId;

    const history = await PayrollRecord.find(filter)
      .populate('employee', 'employeeId fullName department designation')
      .populate('finalizedBy', 'email')
      .sort({ month: -1, createdAt: -1 });

    res.json({
      success: true,
      count: history.length,
      history
    });
  } catch (err) {
    next(err);
  }
});


/**
 * GET /api/payroll/leaves-review
 * Review employee leaves for the given month before running payroll
 */
router.get('/leaves-review', async (req, res, next) => {
  try {
    const { month } = req.query;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: 'Valid month (YYYY-MM) is required' });
    }

    const leaves = await LeaveRequest.find({
      startDate: { $regex: new RegExp(`^${month}`) }
    })
      .populate('employee', 'employeeId fullName department designation')
      .populate('reviewedBy', 'email')
      .sort({ startDate: 1 });

    res.json({
      success: true,
      month,
      count: leaves.length,
      leaves
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/payroll/reclassify-leave
 * HR reclassifies a leave request (CL, SL, LWP) with audit reason during payroll processing
 */
router.post('/reclassify-leave', async (req, res, next) => {
  try {
    const { leaveId, targetClassification, reason } = req.body;

    if (!leaveId || !targetClassification || !reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'leaveId, targetClassification (CL/SL/LWP), and a mandatory audit reason are required.'
      });
    }

    if (!['CL', 'SL', 'LWP', 'Paid_CL', 'Paid_SL'].includes(targetClassification)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target classification. Must be CL, SL, or LWP.'
      });
    }

    const updatedLeave = await LeaveService.reclassifyLeave(
      leaveId,
      targetClassification,
      req.user,
      reason.trim()
    );

    await AuditLog.create({
      action: 'PAYROLL_LEAVE_RECLASSIFIED',
      entityType: 'LeaveRequest',
      entityId: updatedLeave._id,
      performedBy: req.user._id,
      performedByName: req.user.email,
      reason: reason.trim(),
      details: {
        newClassification: updatedLeave.autoClassification,
        breakdown: updatedLeave.classificationBreakdown
      }
    });

    res.json({
      success: true,
      message: `Leave successfully reclassified to ${updatedLeave.autoClassification}`,
      leave: updatedLeave
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
