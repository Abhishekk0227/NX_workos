const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const DailyReport = require('../models/DailyReport');
const Employee = require('../models/Employee');
const ShiftTemplate = require('../models/ShiftTemplate');
const SystemSetting = require('../models/SystemSetting');
const AuditLog = require('../models/AuditLog');
const AttendanceService = require('../services/attendanceService');
const NotificationService = require('../services/notificationService');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

/**
 * POST /api/attendance/punch-in
 * Server-timestamped Punch In with Employee ID verification
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
      const joinStr = new Date(joinRaw).toISOString().slice(0, 10);
      if (todayStr < joinStr) {
        return res.status(400).json({
          success: false,
          message: `Your employment starting date is ${joinStr}. Attendance cannot be marked prior to joining date.`
        });
      }
    }

    const [settings, existing] = await Promise.all([
      SystemSetting.findOne(),
      Attendance.findOne({
        employee: employee._id,
        date: todayStr
      })
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
    const metrics = AttendanceService.calculateAttendanceMetrics(now, null, employee.assignedShift, settings);

    let attendance;
    if (existing) {
      existing.punchIn = now;
      existing.shift = employee.assignedShift?._id || null;
      existing.lateMinutes = metrics.lateMinutes;
      existing.status = metrics.status;
      attendance = await existing.save();
    } else {
      attendance = await Attendance.create({
        employee: employee._id,
        date: todayStr,
        shift: employee.assignedShift?._id || null,
        punchIn: now,
        lateMinutes: metrics.lateMinutes,
        status: metrics.status
      });
    }

    // Populate shift before responding
    await attendance.populate('shift');

    // Notify HR of Employee Punch In
    try {
      const lateAlert = metrics.lateMinutes > 0 ? ` [Late by ${metrics.lateMinutes} mins]` : ' on time';
      await NotificationService.send({
        targetRole: 'HR',
        title: 'Employee Punched In',
        message: `${employee.fullName} (${employee.employeeId}) punched in at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${lateAlert}.`,
        type: 'Attendance',
        link: '/hr/attendance'
      });
    } catch (notifErr) {
      console.warn('[Notification Error - Punch In]:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: `Punched in successfully at ${now.toLocaleTimeString()}`,
      attendance
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/attendance/punch-out
 * Server-timestamped Punch Out after saving Daily Work Report
 */
router.post('/punch-out', protect, async (req, res, next) => {
  try {
    const { summaryBullets } = req.body;

    if (!req.user.employee) {
      return res.status(400).json({
        success: false,
        message: 'No employee profile associated with this account.'
      });
    }

    if (!Array.isArray(summaryBullets) || summaryBullets.filter(b => b && b.trim()).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid daily work report with at least one bullet point is required before punching out.'
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
    const cleanBullets = summaryBullets.map(b => b.trim()).filter(Boolean);
    let report = await DailyReport.findOne({
      employee: req.user.employee._id,
      date: todayStr
    });

    if (report) {
      report.summaryBullets = cleanBullets;
      report.submittedAt = now;
      await report.save();
    } else {
      report = await DailyReport.create({
        employee: req.user.employee._id,
        attendance: attendance._id,
        date: todayStr,
        summaryBullets: cleanBullets,
        submittedAt: now
      });
    }

    // 2. Compute final working metrics
    const settings = await SystemSetting.findOne();
    const metrics = AttendanceService.calculateAttendanceMetrics(attendance.punchIn, now, attendance.shift, settings);

    attendance.punchOut = now;
    attendance.dailyReport = report._id;
    attendance.actualWorkingHours = metrics.actualWorkingHours;
    attendance.lateMinutes = metrics.lateMinutes;
    attendance.earlyMinutes = metrics.earlyMinutes;
    attendance.status = metrics.status;
    attendance.isIncomplete = metrics.status === 'Incomplete';

    await attendance.save();

    // Notify HR of Employee Punch Out with Daily Report
    try {
      await NotificationService.send({
        targetRole: 'HR',
        title: 'Employee Punched Out',
        message: `${req.user.employee.fullName || 'Employee'} (${req.user.employee.employeeId || ''}) punched out at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} with Daily Work Report (${metrics.actualWorkingHours} hrs logged).`,
        type: 'Attendance',
        link: '/hr/attendance'
      });
    } catch (notifErr) {
      console.warn('[Notification Error - Punch Out]:', notifErr.message);
    }

    const halfDayNote = metrics.status === 'Half Day' ? ' (Marked as Half Day — under 6 working hours)' : '';
    res.json({
      success: true,
      message: `Punched out successfully at ${now.toLocaleTimeString()}. Logged ${metrics.actualWorkingHours} working hours${halfDayNote}.`,
      attendance,
      dailyReport: report
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
    }).populate('shift').populate('dailyReport');

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
 * HR view of all attendance records with comprehensive filters
 */
router.get('/all', protect, authorize('HR'), async (req, res, next) => {
  try {
    const { date, month, employeeId, status } = req.query;
    const filter = {};

    if (date) {
      filter.date = date;
    } else if (month) {
      filter.date = { $regex: new RegExp(`^${month}`) };
    }

    if (employeeId && employeeId !== 'All') {
      filter.employee = employeeId;
    }

    if (status && status !== 'All') {
      if (status === 'Present') {
        filter.status = { $in: ['Present', 'Working'] };
      } else {
        filter.status = status;
      }
    }

    const records = await Attendance.find(filter)
      .populate('employee', 'employeeId fullName department designation joiningDate createdAt')
      .populate('shift')
      .populate('dailyReport')
      .sort({ date: -1, createdAt: -1 });

    res.json({
      success: true,
      count: records.length,
      records
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
        settings
      );

      attendance.actualWorkingHours = metrics.actualWorkingHours;
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
    const { attendanceId, punchIn, punchOut, status, reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A detailed reason is mandatory for manual attendance modification.'
      });
    }

    const attendance = await Attendance.findById(attendanceId).populate('shift');
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    const prev = attendance.toObject();

    if (punchIn) attendance.punchIn = new Date(punchIn);
    if (punchOut) attendance.punchOut = new Date(punchOut);

    if (attendance.punchIn && attendance.punchOut) {
      const settings = await SystemSetting.findOne();
      const metrics = AttendanceService.calculateAttendanceMetrics(
        attendance.punchIn,
        attendance.punchOut,
        attendance.shift,
        settings
      );
      attendance.actualWorkingHours = metrics.actualWorkingHours;
      attendance.lateMinutes = metrics.lateMinutes;
      attendance.earlyMinutes = metrics.earlyMinutes;
      attendance.status = status || metrics.status;
      attendance.isIncomplete = attendance.status === 'Incomplete';
    } else if (status) {
      attendance.status = status;
    }

    attendance.auditHistory.push({
      action: 'HR_MANUAL_OVERRIDE',
      performedBy: req.user._id,
      performedAt: new Date(),
      reason: reason.trim(),
      details: { previousStatus: prev.status, newStatus: attendance.status }
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

module.exports = router;
