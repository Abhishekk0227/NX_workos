const express = require('express');
const router = express.Router();
const Broadcast = require('../models/Broadcast');
const Notification = require('../models/Notification');
const Employee = require('../models/Employee');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');

/**
 * POST /api/broadcasts
 * HR creates an important notice (All Employees OR Specific Employee)
 */
router.post('/', protect, authorize('HR'), async (req, res, next) => {
  try {
    const {
      targetType = 'ALL',
      targetEmployee = null,
      targetEmployees = [],
      title,
      message,
      priority = 'Normal',
      category = 'General',
      isPinnedBanner = true,
      sendPush = true
    } = req.body;

    if (!title || !title.trim() || !message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Notice title and message content are required'
      });
    }

    if (targetType === 'SPECIFIC' && !targetEmployee) {
      return res.status(400).json({
        success: false,
        message: 'A specific employee must be selected when target is not set to All'
      });
    }

    if (targetType === 'MULTIPLE' && (!Array.isArray(targetEmployees) || targetEmployees.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one employee for the multiple broadcast notice'
      });
    }

    let targetEmployeeDoc = null;
    let targetUserDoc = null;

    if (targetType === 'SPECIFIC') {
      targetEmployeeDoc = await Employee.findById(targetEmployee);
      if (!targetEmployeeDoc) {
        return res.status(404).json({
          success: false,
          message: 'Selected employee not found'
        });
      }
      targetUserDoc = await User.findOne({ employee: targetEmployeeDoc._id });
    }

    // 1. Create Broadcast record
    const broadcast = await Broadcast.create({
      sender: req.user._id,
      targetType,
      targetEmployee: targetType === 'SPECIFIC' ? targetEmployeeDoc._id : null,
      targetEmployees: targetType === 'MULTIPLE' ? targetEmployees : [],
      title: title.trim(),
      message: message.trim(),
      priority,
      category,
      isPinnedBanner: isPinnedBanner !== false,
      sendPush: sendPush !== false
    });

    // 2. Create in-app Notification record(s)
    if (targetType === 'ALL') {
      await Notification.create({
        targetRole: 'All',
        title: `[Notice] ${title.trim()}`,
        message: message.trim(),
        type: 'System',
        link: '/employee/home',
        metadata: {
          broadcastId: broadcast._id,
          priority,
          category
        }
      });
    } else if (targetType === 'SPECIFIC' && targetUserDoc) {
      await Notification.create({
        recipient: targetUserDoc._id,
        targetRole: null,
        title: `[Personal Notice] ${title.trim()}`,
        message: message.trim(),
        type: 'System',
        link: '/employee/home',
        metadata: {
          broadcastId: broadcast._id,
          priority,
          category
        }
      });
    } else if (targetType === 'MULTIPLE' && targetEmployees.length > 0) {
      const targetUsers = await User.find({ employee: { $in: targetEmployees } });
      if (targetUsers.length > 0) {
        const notifDocs = targetUsers.map((u) => ({
          recipient: u._id,
          targetRole: null,
          title: `[Notice] ${title.trim()}`,
          message: message.trim(),
          type: 'System',
          link: '/employee/home',
          metadata: {
            broadcastId: broadcast._id,
            priority,
            category
          }
        }));
        await Notification.insertMany(notifDocs);
      }
    }

    // 3. Audit trail
    try {
      await AuditLog.create({
        action: 'BROADCAST_PUBLISHED',
        entityType: 'Broadcast',
        entityId: broadcast._id,
        performedBy: req.user._id,
        performedByName: req.user.email,
        reason: `Published ${priority} notice: ${title.trim()} (${targetType === 'ALL' ? 'All Staff' : targetEmployeeDoc?.fullName})`,
        newState: {
          title,
          targetType,
          targetEmployeeName: targetEmployeeDoc ? targetEmployeeDoc.fullName : 'All Staff',
          priority,
          category
        }
      });
    } catch (auditErr) {
      console.warn('[AuditLog Warning]:', auditErr.message);
    }

    res.status(201).json({
      success: true,
      broadcast,
      message:
        targetType === 'ALL'
          ? 'Important notice broadcast to all employees!'
          : targetType === 'MULTIPLE'
          ? `Important notice sent to ${targetEmployees.length} selected employees!`
          : `Important notice sent directly to ${targetEmployeeDoc?.fullName}!`
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/broadcasts
 * HR lists all broadcast notices with reach and acknowledgement metrics
 */
router.get('/', protect, authorize('HR'), async (req, res, next) => {
  try {
    const broadcasts = await Broadcast.find()
      .populate('sender', 'email fullName')
      .populate('targetEmployee', 'fullName employeeId department designation')
      .populate('targetEmployees', 'fullName employeeId department designation')
      .sort({ createdAt: -1 });

    const totalActiveStaff = await Employee.countDocuments({ employmentStatus: 'Active' });

    const enriched = broadcasts.map((b) => {
      const ackCount = b.acknowledgedBy?.length || 0;
      let totalTarget = 1;
      if (b.targetType === 'ALL') totalTarget = totalActiveStaff;
      else if (b.targetType === 'MULTIPLE') totalTarget = b.targetEmployees?.length || 1;

      return {
        ...b.toObject(),
        acknowledgedCount: ackCount,
        totalTarget,
        acknowledgePercentage: Math.round((ackCount / (totalTarget || 1)) * 100)
      };
    });

    res.json({
      success: true,
      broadcasts: enriched,
      totalActiveStaff
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/broadcasts/active
 * Current employee gets active notices (ALL, direct, or multiple)
 */
router.get('/active', protect, async (req, res, next) => {
  try {
    const empId = req.user.employee?._id || null;

    const query = {
      isActive: true,
      $or: [
        { targetType: 'ALL' },
        ...(empId ? [
          { targetType: 'SPECIFIC', targetEmployee: empId },
          { targetType: 'MULTIPLE', targetEmployees: empId }
        ] : [])
      ]
    };

    const broadcasts = await Broadcast.find(query)
      .populate('sender', 'email fullName')
      .sort({ createdAt: -1 })
      .limit(10);

    const withAckStatus = broadcasts.map((b) => {
      const isAcknowledged = b.acknowledgedBy.some(
        (a) => a.user && a.user.toString() === req.user._id.toString()
      );
      return {
        ...b.toObject(),
        isAcknowledged
      };
    });

    res.json({
      success: true,
      broadcasts: withAckStatus
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/broadcasts/:id/acknowledge
 * Employee acknowledges / marks notice as read
 */
router.post('/:id/acknowledge', protect, async (req, res, next) => {
  try {
    const broadcast = await Broadcast.findById(req.params.id);
    if (!broadcast) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    const alreadyAck = broadcast.acknowledgedBy.some(
      (a) => a.user && a.user.toString() === req.user._id.toString()
    );

    if (!alreadyAck) {
      broadcast.acknowledgedBy.push({
        user: req.user._id,
        employee: req.user.employee?._id || null,
        acknowledgedAt: new Date()
      });
      await broadcast.save();
    }

    res.json({
      success: true,
      message: 'Notice acknowledged'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/broadcasts/:id
 * HR deletes or deactivates a broadcast notice
 */
router.delete('/:id', protect, authorize('HR'), async (req, res, next) => {
  try {
    const broadcast = await Broadcast.findByIdAndDelete(req.params.id);
    if (!broadcast) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    res.json({
      success: true,
      message: 'Notice deleted successfully'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
