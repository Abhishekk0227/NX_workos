const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const DailyReport = require('../models/DailyReport');
const Employee = require('../models/Employee');
const ShiftTemplate = require('../models/ShiftTemplate');
const SystemSetting = require('../models/SystemSetting');
const Holiday = require('../models/Holiday');
const AuditLog = require('../models/AuditLog');
const AttendanceService = require('../services/attendanceService');
const NotificationService = require('../services/notificationService');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

/**
 * POST /api/attendance/punch-in
 * Server-timestamped Punch In with Employee ID verification & Holiday detection
 */
router.post('/punch-in', protect, async (req, res, next) => {
  try {
    const { employeeIdInput } = req.body;

    if (!req.user.employee) {
      return res.status(400).json({
        success: false,
        message: 'No employee profile associated with this account.'
      });
    }

    const employee = await Employee.findById(req.user.employee._id).populate('assignedShift');
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee record not found.' });
    }

    if (!employeeIdInput || employeeIdInput.trim().toUpperCase() !== employee.employeeId.toUpperCase()) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID verification failed. The entered ID does not match your authenticated account.'
      });
    }

    const todayStr = AttendanceService.formatDate(new Date());

    // Joining date boundary check
    const joinRaw = employee.joiningDate || employee.createdAt;
    if (joinRaw) {
      const joinStr = AttendanceService.formatDate(joinRaw, 'Asia/Kolkata');
      if (todayStr < joinStr) {
        return res.status(400).json({
          success: false,
          message: `Your employment starting date is ${joinStr}. Attendance cannot be marked prior to joining date.`
        });
      }
    }

    const [settings, existing, holidayRecord] = await Promise.all([
      SystemSetting.findOne(),
      Attendance.findOne({
        employee: employee._id,
        date: todayStr
      }),
      AttendanceService.checkHoliday(todayStr, employee)
    ]);

    if (existing && existing.punchIn) {
      return res.status(400).json({
        success: false,
        message: existing.punchOut
          ? 'You have already completed your attendance session for today.'
          : 'You already have an active attendance session for today.'
      });
    }

    const now = new Date();
    const isHoliday = !!holidayRecord;
    const metrics = AttendanceService.calculateAttendanceMetrics(now, null, employee.assignedShift, settings, isHoliday);

    let attendance;
    if (existing) {
      existing.punchIn = now;
      existing.shift = employee.assignedShift?._id || null;
      existing.lateMinutes = metrics.lateMinutes;
      existing.status = metrics.status;
      existing.isHoliday = isHoliday;
      if (holidayRecord) existing.holiday = holidayRecord._id;
      attendance = await existing.save();
    } else {
      attendance = await Attendance.create({
        employee: employee._id,
        date: todayStr,
        shift: employee.assignedShift?._id || null,
        punchIn: now,
        lateMinutes: metrics.lateMinutes,
        status: metrics.status,
        isHoliday,
        holiday: holidayRecord?._id || null
      });
    }

    // Populate shift before responding
    await attendance.populate('shift');

    // Notify HR of Employee Punch In
    const timezone = AttendanceService.getTimezone(settings);
    const formattedPunchInTime = AttendanceService.formatTime(now, {}, timezone);

    try {
      const lateAlert = metrics.lateMinutes > 0 ? ` [Late by ${metrics.lateMinutes} mins]` : ' on time';
      const holidayAlert = isHoliday ? ' (Working on Holiday)' : '';
      await NotificationService.send({
        targetRole: 'HR',
        title: 'Employee Punched In',
        message: `${employee.fullName} (${employee.employeeId}) punched in at ${formattedPunchInTime}${lateAlert}${holidayAlert}.`,
        type: 'Attendance',
        link: '/hr/attendance'
      });
    } catch (notifErr) {
      console.warn('[Notification Error - Punch In]:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: `Punched in successfully at ${formattedPunchInTime}`,
      attendance
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/attendance/punch-out
 * Server-timestamped Punch Out with Voice-to-Text Work Report & Short Attendance Alert Trigger
 */
router.post('/punch-out', protect, async (req, res, next) => {
  try {
    const {
      summaryBullets,
      completedWork,
      pendingTasks,
      challengesFaced,
      nextDayPlan,
      voiceUsed
    } = req.body;

    if (!req.user.employee) {
      return res.status(400).json({
        success: false,
        message: 'No employee profile associated with this account.'
      });
    }

    // Must have either completedWork text or non-empty summaryBullets
    const hasWorkContent = (completedWork && completedWork.trim()) ||
      (Array.isArray(summaryBullets) && summaryBullets.some(b => b && b.trim()));

    if (!hasWorkContent) {
      return res.status(400).json({
        success: false,
        message: 'A valid daily work report is required before punching out.'
      });
    }

    const todayStr = AttendanceService.formatDate(new Date());

    // Find active attendance session
    const attendance = await Attendance.findOne({
      employee: req.user.employee._id,
      date: todayStr,
      punchIn: { $ne: null },
      punchOut: null
    }).populate('shift');

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'No active attendance session found to punch out.'
      });
    }

    const now = new Date();

    // 1. Save or update Daily Work Report
    let cleanBullets = Array.isArray(summaryBullets)
      ? summaryBullets.map(b => b.trim()).filter(Boolean)
      : [];

    if (cleanBullets.length === 0 && completedWork) {
      cleanBullets = completedWork.split('\n').map(b => b.trim()).filter(Boolean);
    }

    let report = await DailyReport.findOne({
      employee: req.user.employee._id,
      date: todayStr
    });

    if (report) {
      report.summaryBullets = cleanBullets;
      report.completedWork = completedWork ? completedWork.trim() : report.completedWork;
      report.pendingTasks = pendingTasks ? pendingTasks.trim() : report.pendingTasks;
      report.challengesFaced = challengesFaced ? challengesFaced.trim() : report.challengesFaced;
      report.nextDayPlan = nextDayPlan ? nextDayPlan.trim() : report.nextDayPlan;
      report.voiceUsed = !!voiceUsed;
      report.submittedAt = now;
      await report.save();
    } else {
      report = await DailyReport.create({
        employee: req.user.employee._id,
        attendance: attendance._id,
        date: todayStr,
        summaryBullets: cleanBullets,
        completedWork: completedWork ? completedWork.trim() : '',
        pendingTasks: pendingTasks ? pendingTasks.trim() : '',
        challengesFaced: challengesFaced ? challengesFaced.trim() : '',
        nextDayPlan: nextDayPlan ? nextDayPlan.trim() : '',
        voiceUsed: !!voiceUsed,
        submittedAt: now
      });
    }

    // 2. Compute final working metrics
    const settings = await SystemSetting.findOne();
    const isHoliday = !!attendance.isHoliday;
    const metrics = AttendanceService.calculateAttendanceMetrics(
      attendance.punchIn,
      now,
      attendance.shift,
      settings,
      isHoliday
    );

    attendance.punchOut = now;
    attendance.dailyReport = report._id;
    attendance.actualWorkingHours = metrics.actualWorkingHours;
    attendance.workingHoursFormatted = metrics.workingHoursFormatted;
    attendance.lateMinutes = metrics.lateMinutes;
    attendance.earlyMinutes = metrics.earlyMinutes;
    attendance.status = metrics.status;
    attendance.isIncomplete = metrics.status === 'Incomplete';

    // 3. Trigger Short Attendance Alert if working hours under half-day threshold
    if (metrics.isShortAttendance) {
      attendance.shortAttendanceAlert = {
        isAlert: true,
        status: 'Pending',
        payableAmount: 0,
        deductionAmount: 0,
        hrClassification: 'Short Attendance Pending Review',
        resolutionRemarks: `Generated automatically upon punch-out. Logged ${metrics.actualWorkingHours} hrs.`
      };

      // Notify HR of Short Attendance
      try {
        const empName = req.user.employee.fullName || 'Employee';
        await NotificationService.send({
          targetRole: 'HR',
          title: `Short Attendance Alert: ${empName}`,
          message: `${empName} logged only ${metrics.actualWorkingHours} hrs on ${todayStr} (under threshold). HR action required.`,
          type: 'Short Attendance',
          link: '/hr/attendance?view=log&date=' + todayStr
        });
      } catch (alertNotifErr) {
        console.warn('[Notification Error - Short Attendance Alert]:', alertNotifErr.message);
      }
    }

    await attendance.save();

    // Notify HR of Employee Punch Out with Daily Report
    const timezone = AttendanceService.getTimezone(settings);
    const formattedPunchOutTime = AttendanceService.formatTime(now, {}, timezone);

    try {
      await NotificationService.send({
        targetRole: 'HR',
        title: 'Employee Punched Out',
        message: `${req.user.employee.fullName || 'Employee'} (${req.user.employee.employeeId || ''}) punched out at ${formattedPunchOutTime} with Daily Work Report (${metrics.actualWorkingHours} hrs logged). Status: ${metrics.status}.`,
        type: 'Attendance',
        link: '/hr/attendance'
      });
    } catch (notifErr) {
      console.warn('[Notification Error - Punch Out]:', notifErr.message);
    }

    let statusNote = '';
    if (metrics.status === 'Short Attendance') {
      statusNote = ' (Marked as Short Attendance — HR review pending)';
    } else if (metrics.status === 'Half Day') {
      statusNote = ' (Marked as Half Day)';
    }

    res.json({
      success: true,
      message: `Punched out successfully at ${formattedPunchOutTime}. Logged ${metrics.actualWorkingHours} working hours${statusNote}.`,
      attendance,
      dailyReport: report
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/attendance/:id/resolve-short-attendance
 * HR manually resolves a Short Attendance Alert
 */
router.patch('/:id/resolve-short-attendance', protect, authorize('HR'), async (req, res, next) => {
  try {
    const { payableAmount, deductionAmount, hrClassification, resolutionRemarks } = req.body;

    const attendance = await Attendance.findById(req.params.id)
      .populate('employee')
      .populate('shift');

    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    const previousState = attendance.toObject();

    attendance.shortAttendanceAlert.status = 'Resolved';
    attendance.shortAttendanceAlert.payableAmount = Number(payableAmount) || 0;
    attendance.shortAttendanceAlert.deductionAmount = Number(deductionAmount) || 0;
    attendance.shortAttendanceAlert.hrClassification = hrClassification || attendance.status;
    attendance.shortAttendanceAlert.resolutionRemarks = resolutionRemarks || 'HR resolved short attendance alert.';
    attendance.shortAttendanceAlert.resolvedBy = req.user._id;
    attendance.shortAttendanceAlert.resolvedAt = new Date();

    if (hrClassification && ['Full Day', 'Half Day', 'Short Attendance', 'Absent', 'On Leave'].includes(hrClassification)) {
      attendance.status = hrClassification;
    }

    attendance.auditHistory.push({
      action: 'SHORT_ATTENDANCE_RESOLVED',
      performedBy: req.user._id,
      performedAt: new Date(),
      reason: resolutionRemarks || 'HR resolved short attendance alert.',
      details: {
        payableAmount,
        deductionAmount,
        hrClassification,
        previousStatus: previousState.status,
        newStatus: attendance.status
      }
    });

    await attendance.save();

    // Automatic Payroll Recalculation if a non-finalized PayrollRecord exists for this employee & month
    let updatedPayroll = null;
    try {
      const PayrollRecord = require('../models/PayrollRecord');
      const PayrollService = require('../services/payrollService');
      const monthStr = attendance.date.slice(0, 7);
      const existingPayroll = await PayrollRecord.findOne({
        employee: attendance.employee._id,
        month: monthStr,
        status: { $ne: 'Finalized' }
      });
      if (existingPayroll) {
        const recalculated = await PayrollService.calculateEmployeePayroll(attendance.employee._id, monthStr);
        existingPayroll.shortAttendanceDeduction = recalculated.shortAttendanceDeduction;
        existingPayroll.shortAttendanceDays = recalculated.shortAttendanceDays;
        existingPayroll.halfDays = recalculated.halfDays;
        existingPayroll.halfDayDeduction = recalculated.halfDayDeduction;
        existingPayroll.presentDays = recalculated.presentDays;
        existingPayroll.payableDays = recalculated.payableDays;
        existingPayroll.deductionBreakdown = recalculated.deductionBreakdown;
        existingPayroll.netPayable = recalculated.netPayable;
        await existingPayroll.save();
        updatedPayroll = existingPayroll;
      }
    } catch (payrollErr) {
      console.warn('Auto payroll recalculate warning:', payrollErr.message);
    }

    await AuditLog.create({
      action: 'SHORT_ATTENDANCE_RESOLVE',
      entityType: 'Attendance',
      entityId: attendance._id,
      performedBy: req.user._id,
      performedByName: req.user.name || req.user.email,
      reason: resolutionRemarks || `Resolved short attendance for ${attendance.employee?.fullName}`,
      previousState,
      newState: attendance.toObject()
    });

    res.json({
      success: true,
      message: 'Short attendance alert resolved successfully.',
      attendance,
      updatedPayroll
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/attendance/:id/review-auto-punch-out
 * HR acknowledges and marks an Auto Punch-Out record as reviewed
 */
router.patch('/:id/review-auto-punch-out', protect, authorize('HR'), async (req, res, next) => {
  try {
    const { remarks } = req.body;
    const attendance = await Attendance.findById(req.params.id)
      .populate('employee', 'employeeId fullName')
      .populate('shift', 'name startTime endTime');

    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    if (!attendance.autoPunchOutAlert) {
      attendance.autoPunchOutAlert = { isAlert: true, reviewed: false };
    }
    attendance.autoPunchOutAlert.reviewed = true;

    attendance.auditHistory.push({
      action: 'AUTO_PUNCH_OUT_REVIEWED',
      performedBy: req.user._id,
      performedAt: new Date(),
      reason: remarks || 'HR acknowledged and verified auto punch-out record.'
    });

    await attendance.save();

    res.json({
      success: true,
      message: 'Auto punch-out record reviewed and acknowledged successfully.',
      attendance
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/attendance/pending-alerts
 * Fetch all pending Short Attendance and Auto Punch-Out alerts for HR
 */
router.get('/pending-alerts', protect, authorize('HR'), async (req, res, next) => {
  try {
    const [shortAttendanceAlerts, autoPunchOutRecords] = await Promise.all([
      Attendance.find({ 'shortAttendanceAlert.status': 'Pending' })
        .populate('employee', 'employeeId fullName department designation')
        .populate('shift', 'name startTime endTime')
        .sort({ date: -1 }),
      Attendance.find({ autoPunchedOut: true, 'autoPunchOutAlert.reviewed': false })
        .populate('employee', 'employeeId fullName department designation')
        .populate('shift', 'name startTime endTime')
        .sort({ date: -1 })
    ]);

    res.json({
      success: true,
      count: shortAttendanceAlerts.length + autoPunchOutRecords.length,
      shortAttendanceAlerts,
      autoPunchOutRecords
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/attendance/short-attendance-alerts
 * Fetch Short Attendance alerts with status filtering (Pending, Resolved, All) and historical review
 */
router.get('/short-attendance-alerts', protect, authorize('HR'), async (req, res, next) => {
  try {
    const { status, month } = req.query;
    const filter = {
      $or: [
        { status: 'Short Attendance' },
        { 'shortAttendanceAlert.isAlert': true },
        { 'shortAttendanceAlert.status': { $in: ['Pending', 'Resolved'] } }
      ]
    };

    if (status && status !== 'All') {
      filter['shortAttendanceAlert.status'] = status;
    }
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      filter.date = { $regex: new RegExp(`^${month}`) };
    }

    const alerts = await Attendance.find(filter)
      .populate('employee', 'employeeId fullName department designation salary')
      .populate('shift', 'name startTime endTime requiredHours fullDayWorkingHoursThreshold halfDayWorkingHoursThreshold')
      .populate('shortAttendanceAlert.resolvedBy', 'name email')
      .sort({ date: -1 });

    res.json({
      success: true,
      count: alerts.length,
      alerts
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/attendance/auto-punch-out/check
 * Trigger the automatic punch-out check process for past sessions
 */
router.post('/auto-punch-out/check', protect, async (req, res, next) => {
  try {
    const updated = await AttendanceService.processAutoPunchOut();
    res.json({
      success: true,
      message: `Automatic punch-out check completed. Processed ${updated.length} sessions.`,
      processedCount: updated.length
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/attendance/today
 * Get today's attendance session for current employee
 */
router.get('/today', protect, async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.json({ success: true, attendance: null });
    }

    const todayStr = AttendanceService.formatDate(new Date());
    const attendance = await Attendance.findOne({
      employee: req.user.employee._id,
      date: todayStr
    }).populate('shift').populate('dailyReport').populate('holiday');

    res.json({
      success: true,
      attendance
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/attendance/my-history
 * Current employee's attendance history
 */
router.get('/my-history', protect, async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.json({ success: true, attendance: [] });
    }

    const { month } = req.query; // YYYY-MM
    const filter = { employee: req.user.employee._id };

    if (month) {
      filter.date = { $regex: new RegExp(`^${month}`) };
    }

    const history = await Attendance.find(filter)
      .populate('shift')
      .populate('dailyReport')
      .populate('holiday')
      .sort({ date: -1 })
      .limit(60);

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
 * POST /api/attendance/request-correction
 * Employee requests correction for a past attendance session
 */
router.post('/request-correction', protect, async (req, res, next) => {
  try {
    const { attendanceId, requestedPunchIn, requestedPunchOut, reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Reason for correction is required' });
    }

    const attendance = await Attendance.findOne({
      _id: attendanceId,
      employee: req.user.employee._id
    });

    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    attendance.correction = {
      status: 'Pending',
      requestedPunchIn: requestedPunchIn ? new Date(requestedPunchIn) : attendance.punchIn,
      requestedPunchOut: requestedPunchOut ? new Date(requestedPunchOut) : attendance.punchOut,
      reason: reason.trim(),
      reviewedBy: null,
      reviewRemarks: ''
    };

    await attendance.save();

    await NotificationService.send({
      targetRole: 'HR',
      title: 'Attendance Correction Requested',
      message: `${req.user.employee.fullName} submitted attendance correction for ${attendance.date}`,
      type: 'Correction',
      link: '/hr/attendance'
    });

    res.json({
      success: true,
      message: 'Correction request submitted for HR review',
      attendance
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/attendance/all
 * HR view of all attendance records with comprehensive filters, Holiday integration, and 7 KPI cards
 */
router.get('/all', protect, authorize('HR'), async (req, res, next) => {
  try {
    const { date, month, employeeId, status } = req.query;

    const empFilter = {
      $or: [{ employmentStatus: 'Active' }, { status: 'Active' }, { employmentStatus: { $exists: false } }]
    };
    if (employeeId && employeeId !== 'All') {
      empFilter._id = employeeId;
    }

    const [activeEmployees, holidayForDate] = await Promise.all([
      Employee.find(empFilter).select('employeeId fullName department designation joiningDate createdAt').lean(),
      date ? Holiday.findOne({ date }) : null
    ]);

    const filter = {};
    if (date) {
      filter.date = date;
    } else if (month) {
      filter.date = { $regex: new RegExp(`^${month}`) };
    }
    if (employeeId && employeeId !== 'All') {
      filter.employee = employeeId;
    }

    let records = await Attendance.find(filter)
      .populate('employee', 'employeeId fullName department designation joiningDate createdAt')
      .populate('shift')
      .populate('dailyReport')
      .populate('holiday')
      .sort({ date: -1, createdAt: -1 });

    // When querying a specific date (e.g. today or a past date), generate virtual records for active employees without attendance
    if (date) {
      const attendedEmpIds = new Set(
        records
          .filter(r => r.employee)
          .map(r => r.employee._id ? r.employee._id.toString() : r.employee.toString())
      );

      const missingEmployees = activeEmployees.filter(emp => !attendedEmpIds.has(emp._id.toString()));

      const virtualRecords = missingEmployees.map(emp => {
        const isHoliday = !!holidayForDate;
        return {
          _id: `unrecorded-${emp._id}-${date}`,
          employee: emp,
          date,
          status: isHoliday ? 'Holiday' : 'Absent',
          punchIn: null,
          punchOut: null,
          actualWorkingHours: 0,
          workingHoursFormatted: '0:00',
          isHoliday,
          holiday: holidayForDate ? holidayForDate._id : null,
          isVirtualAbsent: !isHoliday
        };
      });

      records = [...records, ...virtualRecords];
    }

    // Apply status filter if requested
    if (status && status !== 'All') {
      if (status === 'Full Day' || status === 'Present') {
        records = records.filter(r => ['Full Day', 'Present', 'Late', 'Working'].includes(r.status));
      } else {
        records = records.filter(r => r.status === status);
      }
    }

    // Compute the 7 Dashboard KPI Cards:
    // 1. Total Employees
    // 2. Full Day Present
    // 3. Half Day (NO 0.5 conversion!)
    // 4. Short Attendance
    // 5. Absent
    // 6. On Leave
    // 7. Holiday
    let fullDayCount = 0;
    let halfDayCount = 0;
    let shortAttendanceCount = 0;
    let absentCount = 0;
    let onLeaveCount = 0;
    let holidayCount = 0;

    records.forEach(r => {
      const s = r.status;
      if (s === 'Full Day' || s === 'Present' || s === 'Late' || s === 'Working') {
        fullDayCount++;
      } else if (s === 'Half Day' || s === 'Half-day') {
        halfDayCount++;
      } else if (s === 'Short Attendance') {
        shortAttendanceCount++;
      } else if (s === 'Absent' || s === 'Incomplete') {
        absentCount++;
      } else if (s === 'On Leave') {
        onLeaveCount++;
      } else if (s === 'Holiday' || s === 'Working on Holiday') {
        holidayCount++;
      }
    });

    const stats = {
      totalEmployees: activeEmployees.length,
      fullDayPresent: fullDayCount,
      halfDay: halfDayCount,
      shortAttendance: shortAttendanceCount,
      absent: absentCount,
      onLeave: onLeaveCount,
      holiday: holidayCount
    };

    res.json({
      success: true,
      count: records.length,
      records,
      stats
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/attendance/review-correction
 * HR reviews and approves/rejects an attendance correction request
 */
router.post('/review-correction', protect, authorize('HR'), async (req, res, next) => {
  try {
    const { attendanceId, decision, reviewRemarks } = req.body; // decision: 'Approved' | 'Rejected'

    if (!['Approved', 'Rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Decision must be Approved or Rejected' });
    }

    const attendance = await Attendance.findById(attendanceId).populate('shift').populate('employee');
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    const prevAttendance = attendance.toObject();

    attendance.correction.status = decision;
    attendance.correction.reviewedBy = req.user._id;
    attendance.correction.reviewedAt = new Date();
    attendance.correction.reviewRemarks = reviewRemarks || '';

    if (decision === 'Approved') {
      if (attendance.correction.requestedPunchIn) {
        attendance.punchIn = attendance.correction.requestedPunchIn;
      }
      if (attendance.correction.requestedPunchOut) {
        attendance.punchOut = attendance.correction.requestedPunchOut;
      }

      const settings = await SystemSetting.findOne();
      const metrics = AttendanceService.calculateAttendanceMetrics(
        attendance.punchIn,
        attendance.punchOut,
        attendance.shift,
        settings,
        attendance.isHoliday
      );

      attendance.actualWorkingHours = metrics.actualWorkingHours;
      attendance.workingHoursFormatted = metrics.workingHoursFormatted;
      attendance.lateMinutes = metrics.lateMinutes;
      attendance.earlyMinutes = metrics.earlyMinutes;
      attendance.status = metrics.status;
      attendance.isIncomplete = metrics.status === 'Incomplete';
    }

    attendance.auditHistory.push({
      action: `CORRECTION_${decision.toUpperCase()}`,
      performedBy: req.user._id,
      performedAt: new Date(),
      reason: reviewRemarks || `HR ${decision} attendance correction`,
      details: { previousStatus: prevAttendance.status, newStatus: attendance.status }
    });

    await attendance.save();

    await AuditLog.create({
      action: `ATTENDANCE_CORRECTION_${decision.toUpperCase()}`,
      entityType: 'Attendance',
      entityId: attendance._id,
      performedBy: req.user._id,
      performedByName: req.user.email,
      reason: reviewRemarks || `Attendance correction ${decision}`,
      previousState: prevAttendance,
      newState: attendance.toObject()
    });

    // Notify employee
    if (attendance.employee?.user) {
      await NotificationService.send({
        recipient: attendance.employee.user,
        title: `Attendance Correction ${decision}`,
        message: `Your attendance correction for ${attendance.date} was ${decision.toLowerCase()}.`,
        type: 'Correction',
        link: '/employee/attendance'
      });
    }

    res.json({
      success: true,
      message: `Correction request ${decision.toLowerCase()} successfully`,
      attendance
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/attendance/manual-correct
 * HR direct manual adjustment of an attendance record with mandatory audit reason
 */
router.post('/manual-correct', protect, authorize('HR'), async (req, res, next) => {
  try {
    const { attendanceId, punchIn, punchOut, status, reason, employeeId, date } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A detailed reason is mandatory for manual attendance modification.'
      });
    }

    let attendance = null;
    let targetEmpId = employeeId;
    let targetDate = date;

    if (attendanceId && mongoose.Types.ObjectId.isValid(attendanceId)) {
      attendance = await Attendance.findById(attendanceId).populate('shift');
    } else if (attendanceId && typeof attendanceId === 'string' && (attendanceId.startsWith('absent-') || attendanceId.startsWith('unrecorded-'))) {
      const parts = attendanceId.split('-');
      targetEmpId = targetEmpId || parts[1];
      targetDate = targetDate || parts.slice(2).join('-');
    }

    if (!attendance) {
      if (!targetEmpId || !targetDate) {
        return res.status(404).json({ success: false, message: 'Attendance record or employee/date not found' });
      }

      attendance = await Attendance.findOne({ employee: targetEmpId, date: targetDate }).populate('shift');
      if (!attendance) {
        const employeeDoc = await Employee.findById(targetEmpId).populate('assignedShift');
        if (!employeeDoc) {
          return res.status(404).json({ success: false, message: 'Employee not found' });
        }
        attendance = new Attendance({
          employee: targetEmpId,
          date: targetDate,
          shift: employeeDoc.assignedShift?._id,
          status: status || 'Full Day'
        });
      }
    }

    const prev = attendance.toObject ? attendance.toObject() : attendance;

    if (punchIn) attendance.punchIn = new Date(punchIn);
    if (punchOut) attendance.punchOut = new Date(punchOut);

    if (attendance.punchIn && attendance.punchOut) {
      const settings = await SystemSetting.findOne();
      const metrics = AttendanceService.calculateAttendanceMetrics(
        attendance.punchIn,
        attendance.punchOut,
        attendance.shift,
        settings,
        attendance.isHoliday
      );
      attendance.actualWorkingHours = metrics.actualWorkingHours;
      attendance.workingHoursFormatted = metrics.workingHoursFormatted;
      attendance.lateMinutes = metrics.lateMinutes;
      attendance.earlyMinutes = metrics.earlyMinutes;
      attendance.status = (!status || status === 'Auto') ? metrics.status : status;
      attendance.isIncomplete = attendance.status === 'Incomplete';
    } else if (attendance.punchIn && !attendance.punchOut) {
      const settings = await SystemSetting.findOne();
      const metrics = AttendanceService.calculateAttendanceMetrics(
        attendance.punchIn,
        null,
        attendance.shift,
        settings,
        attendance.isHoliday
      );
      attendance.lateMinutes = metrics.lateMinutes;
      attendance.actualWorkingHours = 0;
      attendance.workingHoursFormatted = '0:00';
      attendance.status = (!status || status === 'Auto') ? metrics.status : status;
    } else if (status && status !== 'Auto') {
      attendance.status = status;
    }

    if (attendance.status === 'Short Attendance') {
      if (!attendance.shortAttendanceAlert || attendance.shortAttendanceAlert.status !== 'Resolved') {
        attendance.shortAttendanceAlert = {
          isAlert: true,
          status: 'Pending',
          payableAmount: 0,
          deductionAmount: 0,
          hrClassification: 'Short Attendance Pending Review',
          resolutionRemarks: reason ? `Manual adjustment: ${reason}` : 'Generated via manual correction.'
        };
      }
    }

    if (attendance.autoPunchedOut) {
      if (!attendance.autoPunchOutAlert) attendance.autoPunchOutAlert = { isAlert: true, reviewed: false };
      attendance.autoPunchOutAlert.reviewed = true;
      attendance.punchOutType = 'HR_CORRECTED';
    }

    if (!attendance.auditHistory) attendance.auditHistory = [];
    attendance.auditHistory.push({
      action: 'HR_MANUAL_OVERRIDE',
      performedBy: req.user._id,
      performedAt: new Date(),
      reason: reason.trim(),
      details: { previousStatus: prev.status || 'None', newStatus: attendance.status }
    });

    await attendance.save();

    await AuditLog.create({
      action: 'ATTENDANCE_MANUAL_OVERRIDE',
      entityType: 'Attendance',
      entityId: attendance._id,
      performedBy: req.user._id,
      performedByName: req.user.email,
      reason: reason.trim(),
      previousState: prev,
      newState: attendance.toObject()
    });

    res.json({
      success: true,
      message: 'Attendance record updated successfully with audit trail',
      attendance
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/attendance/:id
 * Delete an attendance record (HR only)
 */
router.delete('/:id', protect, authorize('HR'), async (req, res, next) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }
    await Attendance.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Attendance record deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
