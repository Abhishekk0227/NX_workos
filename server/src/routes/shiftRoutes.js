const express = require('express');
const router = express.Router();
const ShiftTemplate = require('../models/ShiftTemplate');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

/**
 * GET /api/shifts
 * List all shift templates
 */
router.get('/', protect, async (req, res, next) => {
  try {
    const shifts = await ShiftTemplate.find().sort({ createdAt: -1 });
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
    const { name, startTime, endTime, requiredHours, breakDurationMinutes, gracePeriodMinutes, isDefault, description } = req.body;

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
      endTime,
      requiredHours: requiredHours || 8.5,
      breakDurationMinutes: breakDurationMinutes || 60,
      gracePeriodMinutes: gracePeriodMinutes || 15,
      isDefault: !!isDefault,
      description: description || ''
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
    const { name, startTime, endTime, requiredHours, breakDurationMinutes, gracePeriodMinutes, isDefault, description } = req.body;

    if (isDefault) {
      await ShiftTemplate.updateMany({ _id: { $ne: req.params.id } }, { isDefault: false });
    }

    const shift = await ShiftTemplate.findByIdAndUpdate(
      req.params.id,
      {
        name,
        startTime,
        endTime,
        requiredHours,
        breakDurationMinutes,
        gracePeriodMinutes,
        isDefault,
        description
      },
      { new: true, runValidators: true }
    );

    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift template not found' });
    }

    res.json({
      success: true,
      message: 'Shift template updated successfully',
      shift
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
