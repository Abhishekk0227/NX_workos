const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const NotificationService = require('../services/notificationService');
const { protect } = require('../middleware/auth');

/**
 * GET /api/notifications
 * Retrieve notifications for current user
 */
router.get('/', protect, async (req, res, next) => {
  try {
    const notifications = await NotificationService.getForUser(req.user._id, req.user.role);
    res.json({
      success: true,
      notifications
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark single notification as read
 */
router.patch('/:id/read', protect, async (req, res, next) => {
  try {
    const notification = await NotificationService.markRead(req.params.id, req.user._id);
    res.json({
      success: true,
      notification
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for current user
 */
router.patch('/read-all', protect, async (req, res, next) => {
  try {
    await Notification.updateMany(
      {
        $or: [
          { recipient: req.user._id },
          { targetRole: req.user.role },
          { targetRole: 'All' }
        ]
      },
      {
        $addToSet: { readBy: { user: req.user._id, readAt: new Date() } }
      }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/notifications/subscribe
 * Register browser push notification subscription
 */
router.post('/subscribe', protect, async (req, res, next) => {
  try {
    const { subscription } = req.body;
    // Store or update subscription for this user
    await User.findByIdAndUpdate(req.user._id, {
      $set: { pushSubscription: subscription, pushEnabled: true }
    });

    res.json({
      success: true,
      message: 'Push notification subscription registered successfully'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/notifications/test-push
 * Trigger a test push notification for current user
 */
router.post('/test-push', protect, async (req, res, next) => {
  try {
    const notification = await Notification.create({
      recipient: req.user._id,
      title: 'NX Work OS — Push Notification Test',
      message: 'Real-time push notification verified! You will receive live attendance, broadcast, and task alerts.',
      type: 'System',
      link: '/'
    });

    res.json({
      success: true,
      notification,
      message: 'Test push notification dispatched!'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
