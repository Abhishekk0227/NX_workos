const express = require('express');
const router = express.Router();
const PayrollRecord = require('../models/PayrollRecord');
const Employee = require('../models/Employee');
const SalaryProfile = require('../models/SalaryProfile');
const SystemSetting = require('../models/SystemSetting');
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

    await Promise.all(
      employees.map(async (emp) => {
        try {
          const preview = await PayrollService.calculateEmployeePayroll(emp._id, month);

          // Check if a saved record already exists
          const existingRecord = await PayrollRecord.findOne({
            employee: emp._id,
            month
          });

          previews.push(PayrollService.mergeSavedRecordIntoPreview(preview, existingRecord));
        } catch (err) {
          missingProfiles.push({
            employeeId: emp.employeeId,
            fullName: emp.fullName,
            reason: err.message
          });
        }
      })
    );

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
    const { month, employeeId, forceRecalculate = false } = req.body;

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
    const preservedManualRecords = [];
    const errors = [];

    await Promise.all(
      employees.map(async (emp) => {
        try {
          // Check if existing record is already finalized
          const existing = await PayrollRecord.findOne({ employee: emp._id, month });
          if (existing && existing.status === 'Finalized') {
            errors.push(`Payroll for ${emp.employeeId} is already finalized and locked.`);
            return;
          }

          if (existing && existing.isManuallyEdited && !forceRecalculate) {
            preservedManualRecords.push(existing);
            return;
          }

          const calculated = await PayrollService.calculateEmployeePayroll(emp._id, month);

          let record;
          if (existing) {
            existing.grossSalary = calculated.grossSalary;
            existing.bonusAmount = 0;
            existing.dailyRateBasis = calculated.dailyRateBasis;
            existing.salaryProfile = calculated.salaryProfile;
            existing.payableDays = calculated.payableDays;
            existing.calendarDays = calculated.calendarDays;
            existing.presentDays = calculated.presentDays;
            existing.paidLeaveDays = calculated.paidLeaveDays;
            existing.weeklyOffDays = calculated.weeklyOffDays;
            existing.holidayDays = calculated.holidayDays || 0;
            existing.lwpDays = calculated.lwpDays;
            existing.unmarkedDays = calculated.unmarkedDays;
            existing.incompleteDays = calculated.incompleteDays;
            existing.perDayRate = calculated.perDayRate;
            existing.perMinuteRate = calculated.perMinuteRate;
            existing.lateMinutes = calculated.lateMinutes;
            existing.lateDeduction = calculated.lateDeduction;
            existing.halfDays = calculated.halfDays;
            existing.halfDayDeduction = calculated.halfDayDeduction;
            existing.shortAttendanceDays = calculated.shortAttendanceDays;
            existing.shortAttendanceDeduction = calculated.shortAttendanceDeduction;
            existing.shortfallDeduction = calculated.shortfallDeduction;
            existing.lwpDeduction = calculated.lwpDeduction;
            existing.otherDeductions = 0;
            existing.totalDeductions = calculated.totalDeductions;
            existing.deductionBreakdown = calculated.deductionBreakdown;
            existing.netPayable = calculated.netPayable;
            existing.isNetPayableOverridden = false;
            existing.isManuallyEdited = false;
            existing.manualEditReason = '';
            existing.status = 'Review';
            record = await existing.save();
          } else {
            record = await PayrollRecord.create({
              month,
              employee: emp._id,
              salaryProfile: calculated.salaryProfile,
              grossSalary: calculated.grossSalary,
              bonusAmount: 0,
              dailyRateBasis: calculated.dailyRateBasis,
              calendarDays: calculated.calendarDays,
              payableDays: calculated.payableDays,
              presentDays: calculated.presentDays,
              paidLeaveDays: calculated.paidLeaveDays,
              weeklyOffDays: calculated.weeklyOffDays,
              holidayDays: calculated.holidayDays || 0,
              lwpDays: calculated.lwpDays,
              unmarkedDays: calculated.unmarkedDays,
              incompleteDays: calculated.incompleteDays,
              perDayRate: calculated.perDayRate,
              perMinuteRate: calculated.perMinuteRate,
              lateMinutes: calculated.lateMinutes,
              lateDeduction: calculated.lateDeduction,
              halfDays: calculated.halfDays,
              halfDayDeduction: calculated.halfDayDeduction,
              shortAttendanceDays: calculated.shortAttendanceDays,
              shortAttendanceDeduction: calculated.shortAttendanceDeduction,
              shortfallDeduction: calculated.shortfallDeduction,
              lwpDeduction: calculated.lwpDeduction,
              otherDeductions: 0,
              totalDeductions: calculated.totalDeductions,
              deductionBreakdown: calculated.deductionBreakdown,
              netPayable: calculated.netPayable,
              status: 'Review'
            });
          }
          savedRecords.push(record);
        } catch (err) {
          errors.push(`${emp.fullName} (${emp.employeeId}): ${err.message}`);
        }
      })
    );

    if (savedRecords.length === 0 && preservedManualRecords.length === 0 && errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Payroll generation failed: ${errors.join(', ')}`,
        errors
      });
    }

    const preservedMsg =
      preservedManualRecords.length > 0
        ? ` (${preservedManualRecords.length} manually edited record(s) preserved)`
        : '';

    res.json({
      success: true,
      message: `Generated payroll for ${savedRecords.length} employees${preservedMsg}`,
      savedCount: savedRecords.length,
      preservedManualCount: preservedManualRecords.length,
      savedRecords,
      errors
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/payroll/manual-edit
 * Manually edit an employee's non-finalized payroll record (creates Review record if Unprocessed)
 */
router.put('/manual-edit', async (req, res, next) => {
  try {
    const { payrollRecordId, employeeId, month } = req.body;

    let existing = null;
    if (payrollRecordId) {
      existing = await PayrollRecord.findById(payrollRecordId);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Payroll record not found.' });
      }
    } else {
      if (!employeeId || !month || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({
          success: false,
          message: 'Either payrollRecordId or valid employeeId + month (YYYY-MM) is required.'
        });
      }
      existing = await PayrollRecord.findOne({ employee: employeeId, month });
    }

    if (existing && existing.status === 'Finalized') {
      return res.status(400).json({
        success: false,
        message: 'Finalized payroll records are locked and cannot be edited.'
      });
    }

    let baseRecord = existing ? existing.toObject() : null;
    if (!baseRecord) {
      const emp = await Employee.findById(employeeId);
      if (!emp) {
        return res.status(404).json({ success: false, message: 'Employee not found.' });
      }
      try {
        baseRecord = await PayrollService.calculateEmployeePayroll(emp._id, month);
      } catch (calcErr) {
        const [yr, mo] = month.split('-').map(Number);
        const calendarDays = new Date(yr, mo, 0).getDate();
        baseRecord = {
          month,
          employee: emp._id,
          salaryProfile: null,
          grossSalary: 0,
          dailyRateBasis: 'WorkingDays',
          calendarDays,
          payableDays: 0,
          presentDays: 0,
          paidLeaveDays: 0,
          weeklyOffDays: 0,
          holidayDays: 0,
          lwpDays: 0,
          unmarkedDays: 0,
          incompleteDays: 0,
          perDayRate: 0,
          perMinuteRate: 0,
          lateMinutes: 0,
          lateDeduction: 0,
          halfDays: 0,
          halfDayDeduction: 0,
          shortAttendanceDays: 0,
          shortAttendanceDeduction: 0,
          shortfallDeduction: 0,
          lwpDeduction: 0,
          otherDeductions: 0,
          totalDeductions: 0,
          deductionBreakdown: [],
          netPayable: 0,
          status: 'Review'
        };
      }
    }

    let updatePayload;
    try {
      updatePayload = PayrollService.buildManualPayrollUpdate(baseRecord, req.body);
    } catch (validationErr) {
      return res.status(400).json({ success: false, message: validationErr.message });
    }

    const previousState = existing
      ? {
          grossSalary: existing.grossSalary,
          bonusAmount: existing.bonusAmount || 0,
          payableDays: existing.payableDays,
          otherDeductions: existing.otherDeductions || 0,
          totalDeductions: existing.totalDeductions ?? PayrollService.computeTotalDeductions(existing),
          netPayable: existing.netPayable,
          isManuallyEdited: Boolean(existing.isManuallyEdited)
        }
      : null;

    let savedRecord;
    if (existing) {
      Object.assign(existing, updatePayload, {
        isManuallyEdited: true,
        lastEditedBy: req.user._id,
        lastEditedAt: new Date(),
        status: existing.status === 'Draft' ? 'Draft' : 'Review'
      });
      savedRecord = await existing.save();
    } else {
      savedRecord = await PayrollRecord.create({
        month: baseRecord.month,
        employee: baseRecord.employee,
        salaryProfile: baseRecord.salaryProfile || null,
        dailyRateBasis: baseRecord.dailyRateBasis || 'WorkingDays',
        calendarDays: baseRecord.calendarDays,
        unmarkedDays: baseRecord.unmarkedDays || 0,
        incompleteDays: baseRecord.incompleteDays || 0,
        perDayRate: baseRecord.perDayRate || 0,
        perMinuteRate: baseRecord.perMinuteRate || 0,
        lateMinutes: baseRecord.totalLateMinutes ?? baseRecord.lateMinutes ?? 0,
        shortAttendanceDays: baseRecord.shortAttendanceDays || 0,
        ...updatePayload,
        isManuallyEdited: true,
        lastEditedBy: req.user._id,
        lastEditedAt: new Date(),
        status: 'Review'
      });
    }

    await AuditLog.create({
      action: 'PAYROLL_MANUAL_EDIT',
      entityType: 'PayrollRecord',
      entityId: savedRecord._id,
      performedBy: req.user._id,
      performedByName: req.user.email,
      reason: updatePayload.manualEditReason,
      previousState,
      newState: {
        grossSalary: savedRecord.grossSalary,
        bonusAmount: savedRecord.bonusAmount,
        payableDays: savedRecord.payableDays,
        otherDeductions: savedRecord.otherDeductions,
        totalDeductions: savedRecord.totalDeductions,
        netPayable: savedRecord.netPayable,
        isNetPayableOverridden: savedRecord.isNetPayableOverridden
      },
      ipAddress: req.ip || ''
    });

    const populated = await PayrollRecord.findById(savedRecord._id)
      .populate('employee', 'employeeId fullName department designation')
      .populate('lastEditedBy', 'email');

    res.json({
      success: true,
      message: 'Payroll manually updated and audit logged.',
      record: populated
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/payroll/:id/reset-auto
 * Reset a manually edited, non-finalized payroll record back to auto-calculated values
 */
router.post('/:id/reset-auto', async (req, res, next) => {
  try {
    const existing = await PayrollRecord.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Payroll record not found.' });
    }
    if (existing.status === 'Finalized') {
      return res.status(400).json({
        success: false,
        message: 'Finalized payroll records are locked and cannot be reset.'
      });
    }

    const previousState = {
      grossSalary: existing.grossSalary,
      bonusAmount: existing.bonusAmount || 0,
      otherDeductions: existing.otherDeductions || 0,
      totalDeductions: existing.totalDeductions ?? PayrollService.computeTotalDeductions(existing),
      netPayable: existing.netPayable,
      isManuallyEdited: Boolean(existing.isManuallyEdited)
    };

    const calculated = await PayrollService.calculateEmployeePayroll(existing.employee, existing.month);
    Object.assign(existing, {
      salaryProfile: calculated.salaryProfile,
      grossSalary: calculated.grossSalary,
      bonusAmount: 0,
      dailyRateBasis: calculated.dailyRateBasis,
      calendarDays: calculated.calendarDays,
      payableDays: calculated.payableDays,
      presentDays: calculated.presentDays,
      paidLeaveDays: calculated.paidLeaveDays,
      weeklyOffDays: calculated.weeklyOffDays,
      holidayDays: calculated.holidayDays || 0,
      lwpDays: calculated.lwpDays,
      unmarkedDays: calculated.unmarkedDays,
      incompleteDays: calculated.incompleteDays,
      perDayRate: calculated.perDayRate,
      perMinuteRate: calculated.perMinuteRate,
      lateMinutes: calculated.totalLateMinutes ?? 0,
      lateDeduction: calculated.lateDeduction,
      halfDays: calculated.halfDays,
      halfDayDeduction: calculated.halfDayDeduction,
      shortAttendanceDays: calculated.shortAttendanceDays,
      shortAttendanceDeduction: calculated.shortAttendanceDeduction,
      shortfallDeduction: calculated.shortfallDeduction,
      lwpDeduction: calculated.lwpDeduction,
      otherDeductions: 0,
      totalDeductions: calculated.totalDeductions,
      deductionBreakdown: calculated.deductionBreakdown,
      netPayable: calculated.netPayable,
      isNetPayableOverridden: false,
      isManuallyEdited: false,
      manualEditReason: '',
      lastEditedBy: req.user._id,
      lastEditedAt: new Date(),
      status: 'Review'
    });
    await existing.save();

    await AuditLog.create({
      action: 'PAYROLL_MANUAL_RESET',
      entityType: 'PayrollRecord',
      entityId: existing._id,
      performedBy: req.user._id,
      performedByName: req.user.email,
      reason: (req.body?.reason || '').trim() || 'Reset manually edited payroll back to auto-calculated values',
      previousState,
      newState: {
        grossSalary: existing.grossSalary,
        totalDeductions: existing.totalDeductions,
        netPayable: existing.netPayable,
        isManuallyEdited: false
      },
      ipAddress: req.ip || ''
    });

    const populated = await PayrollRecord.findById(existing._id)
      .populate('employee', 'employeeId fullName department designation');

    res.json({
      success: true,
      message: 'Payroll record reset to auto-calculated attendance values.',
      record: populated
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
      .populate('lastEditedBy', 'email')
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
 * GET /api/payroll/short-attendance-review
 * Review all short attendance sessions for the given month before or during payroll
 */
router.get('/short-attendance-review', async (req, res, next) => {
  try {
    const { month } = req.query;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: 'Valid month (YYYY-MM) is required' });
    }

    const Attendance = require('../models/Attendance');
    const calendarDays = PayrollService.getDaysInMonth(month);
    const startStr = `${month}-01`;
    const endStr = `${month}-${String(calendarDays).padStart(2, '0')}`;

    const [records, settings] = await Promise.all([
      Attendance.find({
        date: { $gte: startStr, $lte: endStr },
        $or: [
          { status: 'Short Attendance' },
          { 'shortAttendanceAlert.isAlert': true },
          { 'shortAttendanceAlert.status': { $in: ['Pending', 'Resolved'] } }
        ]
      })
        .populate('employee', 'employeeId fullName department designation salary')
        .populate('shortAttendanceAlert.resolvedBy', 'name email')
        .sort({ date: -1 }),
      SystemSetting.findOne().lean()
    ]);

    res.json({
      success: true,
      month,
      count: records.length,
      records,
      thresholds: {
        fullDayThresholdHours: settings?.fullDayThresholdHours ?? settings?.defaultRequiredHours ?? 8,
        halfDayThresholdHours: settings?.halfDayThresholdHours ?? 4
      }
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
