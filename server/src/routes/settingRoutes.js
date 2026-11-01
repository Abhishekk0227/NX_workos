const express = require('express');
const router = express.Router();
const SystemSetting = require('../models/SystemSetting');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

/**
 * GET /api/settings
 * Get current system settings
 */
router.get('/', protect, async (req, res, next) => {
  try {
    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = await SystemSetting.create({});
    }
    res.json({
      success: true,
      settings
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/settings
 * Update system settings (HR only)
 */
router.put('/', protect, authorize('HR'), async (req, res, next) => {
  try {
    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = new SystemSetting();
    }

    const {
      companyName,
      companyTimezone,
      departments,
      designations,
      employmentTypes,
      gracePeriodMinutes,
      defaultRequiredHours,
      dailyRateBasis
    } = req.body;

    if (companyName) settings.companyName = companyName;
    if (companyTimezone) settings.companyTimezone = companyTimezone;
    if (departments) settings.departments = departments;
    if (designations) settings.designations = designations;
    if (employmentTypes) settings.employmentTypes = employmentTypes;
    if (gracePeriodMinutes !== undefined) settings.gracePeriodMinutes = gracePeriodMinutes;
    if (defaultRequiredHours !== undefined) settings.defaultRequiredHours = defaultRequiredHours;
    if (dailyRateBasis) settings.dailyRateBasis = dailyRateBasis;

    await settings.save();

    res.json({
      success: true,
      message: 'System settings updated successfully',
      settings
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
