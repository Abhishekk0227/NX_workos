const express = require('express');
const router = express.Router();
const ShiftTemplate = require('../models/ShiftTemplate');
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

/**
 * GET /api/shifts
 * List all shift templates
 */
router.get('/', protect, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.activeOnly === 'true') {
      filter.isActive = true;
    }
    const shifts = await ShiftTemplate.find(filter).sort({ isDefault: -1, createdAt: -1 });
    res.json({
      success: true,
      count: shifts.length,
      shifts
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/shifts
 * Create new shift template (HR only)
 */
router.post('/', protect, authorize('HR'), async (req, res, next) => {
  try {
    const {
      name,
      startTime,
      halfDayCutoffTime,
      endTime,
      requiredHours,
      breakDurationMinutes,
      gracePeriodMinutes,
      fullDayWorkingHoursThreshold,
      halfDayWorkingHoursThreshold,
      isActive,
      isDefault,
      description
    } = req.body;

    if (!name || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Name, startTime (HH:mm), and endTime (HH:mm) are required'
      });
    }

    if (isDefault) {
      await ShiftTemplate.updateMany({}, { isDefault: false });
    }

    const shift = await ShiftTemplate.create({
      name,
      startTime,
      halfDayCutoffTime: halfDayCutoffTime || '14:00',
      endTime,
      requiredHours: Number(requiredHours) || 8,
      breakDurationMinutes: Number(breakDurationMinutes) || 60,
      gracePeriodMinutes: Number(gracePeriodMinutes) ?? 15,
      fullDayWorkingHoursThreshold: Number(fullDayWorkingHoursThreshold) || 8,
      halfDayWorkingHoursThreshold: Number(halfDayWorkingHoursThreshold) || 4,
      isActive: isActive !== false,
      isDefault: !!isDefault,
      description: description || ''
    });

    await AuditLog.create({
      action: 'SHIFT_CREATE',
      entityType: 'ShiftTemplate',
      entityId: shift._id,
      performedBy: req.user._id,
      performedByName: req.user.name || 'HR Admin',
      reason: `Created shift ${shift.name}`,
      newState: shift.toObject()
    });

    res.status(201).json({
      success: true,
      message: 'Shift template created successfully',
      shift
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/shifts/:id
 * Update shift template (HR only)
 */
router.put('/:id', protect, authorize('HR'), async (req, res, next) => {
  try {
    const {
      name,
      startTime,
      halfDayCutoffTime,
      endTime,
      requiredHours,
      breakDurationMinutes,
      gracePeriodMinutes,
      fullDayWorkingHoursThreshold,
      halfDayWorkingHoursThreshold,
      isActive,
      isDefault,
      description
    } = req.body;

    const existing = await ShiftTemplate.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Shift template not found' });
    }

    if (isDefault) {
      await ShiftTemplate.updateMany({ _id: { $ne: req.params.id } }, { isDefault: false });
    }

    existing.name = name ?? existing.name;
    existing.startTime = startTime ?? existing.startTime;
    existing.halfDayCutoffTime = halfDayCutoffTime ?? existing.halfDayCutoffTime;
    existing.endTime = endTime ?? existing.endTime;
    if (requiredHours !== undefined) existing.requiredHours = Number(requiredHours);
    if (breakDurationMinutes !== undefined) existing.breakDurationMinutes = Number(breakDurationMinutes);
    if (gracePeriodMinutes !== undefined) existing.gracePeriodMinutes = Number(gracePeriodMinutes);
    if (fullDayWorkingHoursThreshold !== undefined) existing.fullDayWorkingHoursThreshold = Number(fullDayWorkingHoursThreshold);
    if (halfDayWorkingHoursThreshold !== undefined) existing.halfDayWorkingHoursThreshold = Number(halfDayWorkingHoursThreshold);
    if (isActive !== undefined) existing.isActive = !!isActive;
    if (isDefault !== undefined) existing.isDefault = !!isDefault;
    if (description !== undefined) existing.description = description;

    await existing.save();

    await AuditLog.create({
      action: 'SHIFT_UPDATE',
      entityType: 'ShiftTemplate',
      entityId: existing._id,
      performedBy: req.user._id,
      performedByName: req.user.name || 'HR Admin',
      reason: `Updated shift ${existing.name}`,
      newState: existing.toObject()
    });

    res.json({
      success: true,
      message: 'Shift template updated successfully',
      shift: existing
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/shifts/:id/toggle
 * Activate or Deactivate shift template (HR only)
 */
router.patch('/:id/toggle', protect, authorize('HR'), async (req, res, next) => {
  try {
    const shift = await ShiftTemplate.findById(req.params.id);
    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift template not found' });
    }

    shift.isActive = !shift.isActive;
    await shift.save();

    await AuditLog.create({
      action: shift.isActive ? 'SHIFT_ACTIVATE' : 'SHIFT_DEACTIVATE',
      entityType: 'ShiftTemplate',
      entityId: shift._id,
      performedBy: req.user._id,
      performedByName: req.user.name || 'HR Admin',
      reason: `${shift.isActive ? 'Activated' : 'Deactivated'} shift ${shift.name}`,
      newState: { isActive: shift.isActive }
    });

    res.json({
      success: true,
      message: `Shift template ${shift.isActive ? 'activated' : 'deactivated'} successfully`,
      shift
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/shifts/:id
 * Delete shift template (HR only)
 */
router.delete('/:id', protect, authorize('HR'), async (req, res, next) => {
  try {
    const shift = await ShiftTemplate.findById(req.params.id);
    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift template not found' });
    }

    if (shift.isDefault) {
      return res.status(400).json({
        success: false,
        message: 'Default shift cannot be deleted. Assign another shift as default first.'
      });
    }

    await ShiftTemplate.findByIdAndDelete(req.params.id);

    await AuditLog.create({
      action: 'SHIFT_DELETE',
      entityType: 'ShiftTemplate',
      entityId: shift._id,
      performedBy: req.user._id,
      performedByName: req.user.name || 'HR Admin',
      reason: `Deleted shift template ${shift.name}`
    });

    res.json({
      success: true,
      message: 'Shift template deleted successfully'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
