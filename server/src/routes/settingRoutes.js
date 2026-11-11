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
      enableGracePeriod,
      fullDayThresholdHours,
      halfDayThresholdHours,
      halfDayDeductionPercentage,
      enableLateDeduction,
      enableShortfallDeduction,
      fullDayCutoffMinutes,
      morningHalfDayCutoffMinutes,
      afternoonHalfDayCutoffMinutes,
      lunchStartTime,
      monthlyClAllowance,
      yearlyClTotal,
      yearlySlTotal,
      workStartTime,
      workEndTime,
      defaultRequiredHours,
      dailyRateBasis
    } = req.body;

    if (companyName) settings.companyName = companyName;
    if (companyTimezone) settings.companyTimezone = companyTimezone;
    if (departments) settings.departments = departments;
    if (designations) settings.designations = designations;
    if (employmentTypes) settings.employmentTypes = employmentTypes;
    const nextFullDay = fullDayThresholdHours !== undefined
      ? Number(fullDayThresholdHours)
      : (defaultRequiredHours !== undefined ? Number(defaultRequiredHours) : (settings.fullDayThresholdHours ?? settings.defaultRequiredHours ?? 8));
    const nextHalfDay = halfDayThresholdHours !== undefined
      ? Number(halfDayThresholdHours)
      : (settings.halfDayThresholdHours ?? 4);

    if (
      fullDayThresholdHours !== undefined ||
      halfDayThresholdHours !== undefined ||
      defaultRequiredHours !== undefined
    ) {
      if (isNaN(nextFullDay) || nextFullDay <= 0 || isNaN(nextHalfDay) || nextHalfDay <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Working hour thresholds must be greater than 0.'
        });
      }
      if (nextHalfDay >= nextFullDay) {
        return res.status(400).json({
          success: false,
          message: 'Half-Day working hours threshold must be strictly less than Full-Day threshold.'
        });
      }
    }

    if (gracePeriodMinutes !== undefined) settings.gracePeriodMinutes = Number(gracePeriodMinutes);
    if (enableGracePeriod !== undefined) settings.enableGracePeriod = Boolean(enableGracePeriod);
    if (fullDayThresholdHours !== undefined) {
      settings.fullDayThresholdHours = Number(fullDayThresholdHours);
      settings.defaultRequiredHours = Number(fullDayThresholdHours);
    }
    if (halfDayThresholdHours !== undefined) settings.halfDayThresholdHours = Number(halfDayThresholdHours);
    if (halfDayDeductionPercentage !== undefined) settings.halfDayDeductionPercentage = Number(halfDayDeductionPercentage);
    if (enableLateDeduction !== undefined) settings.enableLateDeduction = Boolean(enableLateDeduction);
    if (enableShortfallDeduction !== undefined) settings.enableShortfallDeduction = Boolean(enableShortfallDeduction);
    if (fullDayCutoffMinutes !== undefined) settings.fullDayCutoffMinutes = Number(fullDayCutoffMinutes);
    if (morningHalfDayCutoffMinutes !== undefined) settings.morningHalfDayCutoffMinutes = Number(morningHalfDayCutoffMinutes);
    if (afternoonHalfDayCutoffMinutes !== undefined) settings.afternoonHalfDayCutoffMinutes = Number(afternoonHalfDayCutoffMinutes);
    if (lunchStartTime !== undefined) settings.lunchStartTime = lunchStartTime;
    if (monthlyClAllowance !== undefined) settings.monthlyClAllowance = Number(monthlyClAllowance);
    if (yearlyClTotal !== undefined) settings.yearlyClTotal = Number(yearlyClTotal);
    if (yearlySlTotal !== undefined) settings.yearlySlTotal = Number(yearlySlTotal);
    if (workStartTime !== undefined) settings.workStartTime = workStartTime;
    if (workEndTime !== undefined) settings.workEndTime = workEndTime;
    if (defaultRequiredHours !== undefined && fullDayThresholdHours === undefined) {
      settings.defaultRequiredHours = Number(defaultRequiredHours);
      settings.fullDayThresholdHours = Number(defaultRequiredHours);
    }
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
