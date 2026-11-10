const express = require('express');
const router = express.Router();
const Reminder = require('../models/Reminder');
const Task = require('../models/Task');
const NotificationService = require('../services/notificationService');
const AttendanceService = require('../services/attendanceService');
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/auth');

/**
 * GET /api/reminders
 * List user's reminders with filtering (status, type, date)
 */
router.get('/', protect, async (req, res, next) => {
  try {
    const { status, type, date } = req.query;
    const filter = { user: req.user._id };

    if (status && status !== 'All') {
      filter.status = status;
    }
    if (type && type !== 'All') {
      filter.type = type;
    }
    if (date) {
      filter.date = date;
    }

    const reminders = await Reminder.find(filter)
      .populate('linkedTask', 'title priority status dueDate')
      .sort({ remindAt: 1, createdAt: -1 });

    res.json({
      success: true,
      count: reminders.length,
      reminders
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/reminders
 * Create a new reminder
 */
router.post('/', protect, async (req, res, next) => {
  try {
    const {
      title,
      description,
      date,
      time,
      type,
      linkedTask,
      priority,
      repeat,
      notificationType
    } = req.body;

    if (!title || !date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Title, date (YYYY-MM-DD), and time (HH:mm) are required'
      });
    }

    // Convert date + time in IST into UTC Date object
    const remindAt = AttendanceService.getTimestampForTimeInTimezone(date, time, 'Asia/Kolkata');

    const reminder = await Reminder.create({
      user: req.user._id,
      employee: req.user.employee?._id || null,
      title: title.trim(),
      description: description ? description.trim() : '',
      date,
      time,
      remindAt,
      type: type || 'Personal Reminder',
      linkedTask: linkedTask || null,
      priority: priority || 'Medium',
      repeat: repeat || 'None',
      notificationType: notificationType || 'All',
      status: 'Pending'
    });

    res.status(201).json({
      success: true,
      message: 'Reminder created successfully',
      reminder
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/reminders/:id
 * Edit reminder
 */
router.put('/:id', protect, async (req, res, next) => {
  try {
    const {
      title,
      description,
      date,
      time,
      type,
      linkedTask,
      priority,
      repeat,
      notificationType
    } = req.body;

    const reminder = await Reminder.findOne({ _id: req.params.id, user: req.user._id });
    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    if (title) reminder.title = title.trim();
    if (description !== undefined) reminder.description = description.trim();
    if (type) reminder.type = type;
    if (linkedTask !== undefined) reminder.linkedTask = linkedTask || null;
    if (priority) reminder.priority = priority;
    if (repeat) reminder.repeat = repeat;
    if (notificationType) reminder.notificationType = notificationType;

    if (date && time) {
      reminder.date = date;
      reminder.time = time;
      reminder.remindAt = AttendanceService.getTimestampForTimeInTimezone(date, time, 'Asia/Kolkata');
      reminder.status = 'Pending';
      reminder.isTriggered = false;
    }

    await reminder.save();

    res.json({
      success: true,
      message: 'Reminder updated successfully',
      reminder
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/reminders/:id/status
 * Action: 'Completed' | 'Snoozed' | 'Dismissed' | 'Pending'
 */
router.patch('/:id/status', protect, async (req, res, next) => {
  try {
    const { status, snoozeMinutes } = req.body;
    const reminder = await Reminder.findOne({ _id: req.params.id, user: req.user._id });

    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    if (status === 'Snoozed') {
      const minutes = Number(snoozeMinutes) || 10;
      const newRemindAt = new Date(Date.now() + minutes * 60 * 1000);
      reminder.status = 'Snoozed';
      reminder.snoozedUntil = newRemindAt;
      reminder.remindAt = newRemindAt;
      reminder.isTriggered = false;
      reminder.date = AttendanceService.formatDate(newRemindAt, 'Asia/Kolkata');
      reminder.time = AttendanceService.formatTime24(newRemindAt, 'Asia/Kolkata');
    } else if (['Completed', 'Dismissed', 'Pending'].includes(status)) {
      reminder.status = status;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    await reminder.save();

    res.json({
      success: true,
      message: `Reminder status updated to ${reminder.status}`,
      reminder
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/reminders/:id
 * Delete reminder
 */
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const reminder = await Reminder.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    res.json({
      success: true,
      message: 'Reminder deleted successfully'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

