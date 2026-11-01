const express = require('express');
const router = express.Router();
const DailyReport = require('../models/DailyReport');
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

module.exports = router;
