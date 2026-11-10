const express = require('express');
const router = express.Router();
const DailyReport = require('../models/DailyReport');
const Attendance = require('../models/Attendance');
const NotificationService = require('../services/notificationService');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

/**
 * GET /api/reports
 * HR list of daily work reports with employee and date filtering
 */
router.get('/', protect, authorize('HR'), async (req, res, next) => {
  try {
    const { employeeId, date, month } = req.query;
    const filter = {};

    if (employeeId && employeeId !== 'All') {
      filter.employee = employeeId;
    }

    if (date) {
      filter.date = date;
    } else if (month) {
      filter.date = { $regex: new RegExp(`^${month}`) };
    }

    const reports = await DailyReport.find(filter)
      .populate('employee', 'employeeId fullName department designation')
      .populate('attendance', 'actualWorkingHours status punchIn punchOut')
      .sort({ date: -1, submittedAt: -1 });

    res.json({
      success: true,
      count: reports.length,
      reports
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/my
 * Current employee's submitted daily work reports
 */
router.get('/my', protect, async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.json({ success: true, reports: [] });
    }

    const reports = await DailyReport.find({ employee: req.user.employee._id })
      .populate('attendance', 'actualWorkingHours status')
      .sort({ date: -1 })
      .limit(30);

    res.json({
      success: true,
      count: reports.length,
      reports
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/pending-auto-punch-out
 * Checks if current employee has any auto-punched-out session missing its daily work report
 */
router.get('/pending-auto-punch-out', protect, async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.json({ success: true, pendingReport: null });
    }

    const pendingSession = await Attendance.findOne({
      employee: req.user.employee._id,
      autoPunchedOut: true,
      dailyReport: null
    })
      .populate('shift', 'name startTime endTime')
      .sort({ date: -1 });

    res.json({
      success: true,
      pendingReport: pendingSession
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/reports/submit-pending
 * Employee submits missing daily work report for an auto-punched-out session
 */
router.post('/submit-pending', protect, async (req, res, next) => {
  try {
    const {
      attendanceId,
      completedWork,
      pendingTasks,
      challengesFaced,
      nextDayPlan,
      summaryBullets,
      voiceUsed
    } = req.body;

    if (!req.user.employee) {
      return res.status(400).json({
        success: false,
        message: 'No employee profile associated with this account.'
      });
    }

    if (!attendanceId) {
      return res.status(400).json({
        success: false,
        message: 'attendanceId is required.'
      });
    }

    const hasWorkContent =
      (completedWork && completedWork.trim()) ||
      (Array.isArray(summaryBullets) && summaryBullets.some((b) => b && b.trim()));

    if (!hasWorkContent) {
      return res.status(400).json({
        success: false,
        message: 'Please provide details for Daily Completed Work.'
      });
    }

    const attendance = await Attendance.findOne({
      _id: attendanceId,
      employee: req.user.employee._id
    }).populate('shift');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found for this employee.'
      });
    }

    const now = new Date();
    let cleanBullets = Array.isArray(summaryBullets)
      ? summaryBullets.map((b) => b.trim()).filter(Boolean)
      : [];

    if (cleanBullets.length === 0 && completedWork) {
      cleanBullets = completedWork.split('\n').map((b) => b.trim()).filter(Boolean);
    }

    let report = await DailyReport.findOne({
      employee: req.user.employee._id,
      date: attendance.date
    });

    if (report) {
      report.attendance = attendance._id;
      report.summaryBullets = cleanBullets.length > 0 ? cleanBullets : [completedWork.trim()];
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
        date: attendance.date,
        summaryBullets: cleanBullets.length > 0 ? cleanBullets : [completedWork.trim()],
        completedWork: completedWork ? completedWork.trim() : '',
        pendingTasks: pendingTasks ? pendingTasks.trim() : '',
        challengesFaced: challengesFaced ? challengesFaced.trim() : '',
        nextDayPlan: nextDayPlan ? nextDayPlan.trim() : '',
        voiceUsed: !!voiceUsed,
        submittedAt: now
      });
    }

    attendance.dailyReport = report._id;
    attendance.auditHistory.push({
      action: 'DAILY_REPORT_SUBMITTED_POST_AUTO_PUNCHOUT',
      performedBy: req.user._id,
      performedAt: now,
      reason: 'Employee submitted missing daily work report post auto punch-out.'
    });
    await attendance.save();

    // Notify HR
    try {
      const empName = req.user.employee.fullName || 'Employee';
      await NotificationService.send({
        targetRole: 'HR',
        title: 'Missing Daily Report Submitted',
        message: `${empName} submitted the daily work report for ${attendance.date} (Auto Punched-Out session).`,
        type: 'Attendance',
        link: `/hr/attendance?view=log&date=${attendance.date}`
      });
    } catch (notifErr) {
      console.warn('Error sending HR notification:', notifErr.message);
    }

    res.json({
      success: true,
      message: `Daily work report for ${attendance.date} submitted successfully.`,
      report,
      attendance
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
