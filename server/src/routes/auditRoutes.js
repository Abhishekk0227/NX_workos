const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

/**
 * GET /api/audit-logs
 * HR view of operational audit logs
 */
router.get('/', protect, authorize('HR'), async (req, res, next) => {
  try {
    const { action, entityType, limit = 50 } = req.query;
    const filter = {};

    if (action && action !== 'All') filter.action = action;
    if (entityType && entityType !== 'All') filter.entityType = entityType;

    const logs = await AuditLog.find(filter)
      .populate('performedBy', 'email')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
