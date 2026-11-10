const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Holiday = require('../models/Holiday');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const NotificationService = require('../services/notificationService');
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

/**
 * Helper to compute array of YYYY-MM-DD date strings between start and end (inclusive)
 */
function getDatesInRange(startDateStr, endDateStr) {
  const dates = [];
  let cur = new Date(startDateStr + 'T00:00:00Z');
  const end = new Date(endDateStr + 'T00:00:00Z');
  while (cur <= end) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

/**
 * GET /api/holidays
 * List holidays with year, month, department filtering
 */
router.get('/', protect, async (req, res, next) => {
  try {
    const { year, month, department, type } = req.query;
    const conditions = [];

    if (year && month) {
      const monthPadded = String(month).padStart(2, '0');
      const lastDayOfMonth = new Date(year, month, 0).getDate();
      const monthStart = `${year}-${monthPadded}-01`;
      const monthEnd = `${year}-${monthPadded}-${String(lastDayOfMonth).padStart(2, '0')}`;

      conditions.push({
        $or: [
          { date: { $regex: new RegExp(`^${year}-${monthPadded}`) } },
          { startDate: { $lte: monthEnd }, endDate: { $gte: monthStart } },
          { isRecurring: true, date: { $regex: new RegExp(`-${monthPadded}-`) } }
        ]
      });
    } else if (year) {
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;
      conditions.push({
        $or: [
          { date: { $regex: new RegExp(`^${year}`) } },
          { startDate: { $lte: yearEnd }, endDate: { $gte: yearStart } },
          { isRecurring: true }
        ]
      });
    }

    if (type && type !== 'All') {
      conditions.push({ type });
    }

    // Role-based applicability scoping:
    if (req.user.role === 'Employee' && req.user.employee) {
      const empDept = req.user.employee.department;
      const empId = req.user.employee._id;
      const empShift = req.user.employee.assignedShift || req.user.employee.shift;

      const appConditions = [{ applicability: 'All' }];
      if (empDept) {
        appConditions.push({ applicability: 'Department', applicableDepartments: empDept });
      }
      if (empShift) {
        appConditions.push({ applicability: 'Shift', applicableShifts: empShift });
      }
      if (empId) {
        appConditions.push({ applicableEmployees: empId });
      }

      conditions.push({ $or: appConditions });
    } else if (department && department !== 'All') {
      conditions.push({
        $or: [
          { applicability: 'All' },
          { applicableDepartments: department }
        ]
      });
    }

    const finalQuery = conditions.length > 0 ? { $and: conditions } : {};

    const holidays = await Holiday.find(finalQuery)
      .populate('applicableShifts', 'name startTime endTime')
      .populate('applicableEmployees', 'employeeId fullName department')
      .populate('createdBy', 'name email')
      .sort({ date: 1 });

    res.json({
      success: true,
      count: holidays.length,
      holidays
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/holidays/upcoming
 * List upcoming holidays from today, including projected recurring holidays
 * Groups multi-day holiday ranges so they appear as one event
 */
router.get('/upcoming', protect, async (req, res, next) => {
  try {
    const today = new Date();
    const currentYear = today.getFullYear();
    const todayStr = today.toISOString().split('T')[0];

    const rawHolidays = await Holiday.find({
      $or: [
        { date: { $gte: todayStr } },
        { endDate: { $gte: todayStr } },
        { isRecurring: true }
      ]
    }).sort({ date: 1 });

    const upcoming = [];
    const seenDatesAndNames = new Set();
    const seenGroups = new Set();

    for (const hol of rawHolidays) {
      const groupKey = hol.rangeGroupId || `${hol.name}_${hol.startDate || hol.date}_${hol.endDate || hol.date}`;
      if (seenGroups.has(groupKey)) {
        continue;
      }

      let holidayDate = hol.startDate || hol.date;
      if (hol.isRecurring && holidayDate < todayStr) {
        // Project to current year or next year
        const mmdd = holidayDate.slice(5);
        let projected = `${currentYear}-${mmdd}`;
        if (projected < todayStr) {
          projected = `${currentYear + 1}-${mmdd}`;
        }
        const key = `${projected}_${hol.name}`;
        if (!seenDatesAndNames.has(key)) {
          seenDatesAndNames.add(key);
          seenGroups.add(groupKey);
          const obj = hol.toObject();
          obj.date = projected;
          upcoming.push(obj);
        }
      } else if (hol.endDate ? hol.endDate >= todayStr : holidayDate >= todayStr) {
        const key = `${holidayDate}_${hol.name}`;
        if (!seenDatesAndNames.has(key)) {
          seenDatesAndNames.add(key);
          seenGroups.add(groupKey);
          upcoming.push(hol.toObject());
        }
      }
    }

    upcoming.sort((a, b) => (a.startDate || a.date).localeCompare(b.startDate || b.date));

    res.json({
      success: true,
      count: upcoming.slice(0, 10).length,
      holidays: upcoming.slice(0, 10)
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/holidays
 * Add new holiday or multi-day range (HR only)
 */
router.post('/', protect, authorize('HR'), async (req, res, next) => {
  try {
    let {
      name,
      date,
      startDate,
      endDate,
      description,
      type,
      applicability,
      applicableDepartments,
      applicableShifts,
      applicableEmployees,
      isRecurring,
      paid
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Holiday name is required.'
      });
    }

    // Fallbacks if only date was supplied or startDate/endDate supplied
    if (!startDate && date) startDate = date;
    if (!endDate && startDate) endDate = startDate;
    if (startDate && !endDate) endDate = startDate;
    if (!startDate && !date) {
      return res.status(400).json({
        success: false,
        message: 'Holiday Start Date (YYYY-MM-DD) is required.'
      });
    }

    if (endDate < startDate) {
      return res.status(400).json({
        success: false,
        message: 'End Date cannot be earlier than Start Date.'
      });
    }

    const datesInRange = getDatesInRange(startDate, endDate);
    if (datesInRange.length > 60) {
      return res.status(400).json({
        success: false,
        message: 'Holiday date range cannot exceed 60 days.'
      });
    }

    const isMultiDay = datesInRange.length > 1;
    const rangeGroupId = isMultiDay ? new mongoose.Types.ObjectId().toString() : null;
    const totalDays = datesInRange.length;

    const createdHolidays = [];

    for (const singleDate of datesInRange) {
      let holiday = await Holiday.findOne({ date: singleDate, name: name.trim() });
      if (holiday) {
        holiday.startDate = startDate;
        holiday.endDate = endDate;
        holiday.rangeGroupId = rangeGroupId;
        holiday.isMultiDay = isMultiDay;
        holiday.totalDays = totalDays;
        holiday.description = description !== undefined ? description : holiday.description;
        holiday.type = type || holiday.type;
        holiday.applicability = applicability || holiday.applicability;
        holiday.applicableDepartments = Array.isArray(applicableDepartments) ? applicableDepartments : holiday.applicableDepartments;
        holiday.applicableShifts = Array.isArray(applicableShifts) ? applicableShifts : holiday.applicableShifts;
        holiday.applicableEmployees = Array.isArray(applicableEmployees) ? applicableEmployees : holiday.applicableEmployees;
        holiday.isRecurring = !!isRecurring;
        holiday.paid = paid !== false;
        await holiday.save();
      } else {
        holiday = await Holiday.create({
          name: name.trim(),
          date: singleDate,
          startDate,
          endDate,
          rangeGroupId,
          isMultiDay,
          totalDays,
          description: description || '',
          type: type || 'Company Holiday',
          applicability: applicability || 'All',
          applicableDepartments: Array.isArray(applicableDepartments) ? applicableDepartments : [],
          applicableShifts: Array.isArray(applicableShifts) ? applicableShifts : [],
          applicableEmployees: Array.isArray(applicableEmployees) ? applicableEmployees : [],
          isRecurring: !!isRecurring,
          paid: paid !== false,
          createdBy: req.user._id
        });
      }
      createdHolidays.push(holiday);

      // Automatically synchronize Attendance for this singleDate
      const matchingAttendance = await Attendance.find({ date: singleDate });
      for (const att of matchingAttendance) {
        if (!att.punchIn && (att.status === 'Absent' || att.status === 'Incomplete' || att.status === 'Working')) {
          att.status = 'Holiday';
          att.isHoliday = true;
          att.holiday = holiday._id;
          await att.save();
        } else if (att.punchIn) {
          att.status = 'Working on Holiday';
          att.isHoliday = true;
          att.holiday = holiday._id;
          await att.save();
        }
      }
    }

    // Broadcast notification to employees
    const dateRangeLabel = isMultiDay ? `${startDate} to ${endDate} (${totalDays} days)` : startDate;
    try {
      await NotificationService.send({
        targetRole: 'All',
        title: `Holiday Announcement: ${name.trim()}`,
        message: `${name.trim()} has been scheduled for ${dateRangeLabel} (${type || 'Company Holiday'}).`,
        type: 'Holiday',
        link: '/employee/home'
      });
    } catch (notifErr) {
      console.warn('Holiday notification error:', notifErr.message);
    }

    await AuditLog.create({
      action: 'HOLIDAY_CREATE',
      entityType: 'Holiday',
      entityId: createdHolidays[0]._id,
      performedBy: req.user._id,
      performedByName: req.user.name || 'HR Admin',
      reason: `Created holiday ${name.trim()} for ${dateRangeLabel}`,
      newState: { name: name.trim(), startDate, endDate, totalDays, isMultiDay }
    });

    res.status(201).json({
      success: true,
      message: isMultiDay
        ? `Multi-day holiday created successfully for ${totalDays} days (${startDate} to ${endDate}).`
        : `Holiday created successfully for ${startDate}.`,
      holiday: createdHolidays[0],
      holidays: createdHolidays
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/holidays/:id
 * Edit holiday or multi-day range (HR only)
 */
router.put('/:id', protect, authorize('HR'), async (req, res, next) => {
  try {
    let {
      name,
      date,
      startDate,
      endDate,
      description,
      type,
      applicability,
      applicableDepartments,
      applicableShifts,
      applicableEmployees,
      isRecurring,
      paid
    } = req.body;

    const existing = await Holiday.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Holiday not found' });
    }

    const previousState = existing.toObject();

    // Standardize startDate and endDate
    if (!startDate && date) startDate = date;
    if (!startDate && existing.startDate) startDate = existing.startDate;
    if (!startDate) startDate = existing.date;

    if (!endDate && startDate) endDate = startDate;
    if (!endDate && existing.endDate) endDate = existing.endDate;
    if (!endDate) endDate = startDate;

    if (endDate < startDate) {
      return res.status(400).json({ success: false, message: 'End Date cannot be earlier than Start Date.' });
    }

    const newDates = getDatesInRange(startDate, endDate);
    if (newDates.length > 60) {
      return res.status(400).json({ success: false, message: 'Holiday date range cannot exceed 60 days.' });
    }

    const isMultiDay = newDates.length > 1;
    const totalDays = newDates.length;

    // Find all existing records in this holiday group or single holiday
    let groupHolidays = [];
    if (existing.rangeGroupId) {
      groupHolidays = await Holiday.find({ rangeGroupId: existing.rangeGroupId });
    } else {
      groupHolidays = [existing];
    }

    const oldHolidayIds = groupHolidays.map((h) => h._id);
    const oldDates = groupHolidays.map((h) => h.date);

    // Identify dates that were in old holiday but removed in new range
    const datesToRemove = oldDates.filter((d) => !newDates.includes(d));

    // Revert attendance for removed dates
    for (const d of datesToRemove) {
      await Attendance.updateMany(
        { date: d, holiday: { $in: oldHolidayIds }, status: 'Holiday' },
        { $set: { status: 'Absent', isHoliday: false, holiday: null } }
      );
      await Attendance.updateMany(
        { date: d, holiday: { $in: oldHolidayIds }, status: 'Working on Holiday' },
        { $set: { isHoliday: false, holiday: null } }
      );
    }

    // Delete old group entries
    if (existing.rangeGroupId) {
      await Holiday.deleteMany({ rangeGroupId: existing.rangeGroupId });
    } else {
      await Holiday.findByIdAndDelete(existing._id);
    }

    // Generate new rangeGroupId if multi-day
    const newRangeGroupId = isMultiDay ? (existing.rangeGroupId || new mongoose.Types.ObjectId().toString()) : null;
    const finalName = name ? name.trim() : existing.name;

    const newHolidays = [];
    for (const singleDate of newDates) {
      const hol = await Holiday.create({
        name: finalName,
        date: singleDate,
        startDate,
        endDate,
        rangeGroupId: newRangeGroupId,
        isMultiDay,
        totalDays,
        description: description !== undefined ? description : existing.description,
        type: type || existing.type,
        applicability: applicability || existing.applicability,
        applicableDepartments: applicableDepartments !== undefined ? applicableDepartments : existing.applicableDepartments,
        applicableShifts: applicableShifts !== undefined ? applicableShifts : existing.applicableShifts,
        applicableEmployees: applicableEmployees !== undefined ? applicableEmployees : existing.applicableEmployees,
        isRecurring: isRecurring !== undefined ? !!isRecurring : existing.isRecurring,
        paid: paid !== undefined ? !!paid : existing.paid,
        createdBy: existing.createdBy || req.user._id
      });
      newHolidays.push(hol);

      // Re-sync attendance for singleDate
      const matchingAttendance = await Attendance.find({ date: singleDate });
      for (const att of matchingAttendance) {
        if (!att.punchIn && (att.status === 'Absent' || att.status === 'Incomplete' || att.status === 'Working')) {
          att.status = 'Holiday';
          att.isHoliday = true;
          att.holiday = hol._id;
          await att.save();
        } else if (att.punchIn) {
          att.status = 'Working on Holiday';
          att.isHoliday = true;
          att.holiday = hol._id;
          await att.save();
        }
      }
    }

    await AuditLog.create({
      action: 'HOLIDAY_UPDATE',
      entityType: 'Holiday',
      entityId: newHolidays[0]._id,
      performedBy: req.user._id,
      performedByName: req.user.name || 'HR Admin',
      reason: `Updated holiday ${finalName} (${startDate} to ${endDate})`,
      previousState,
      newState: { name: finalName, startDate, endDate, totalDays, isMultiDay }
    });

    res.json({
      success: true,
      message: 'Holiday updated successfully and attendance records refreshed.',
      holiday: newHolidays[0],
      holidays: newHolidays
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/holidays/:id
 * Delete holiday (HR only) - automatically cleans up entire multi-day range if applicable
 */
router.delete('/:id', protect, authorize('HR'), async (req, res, next) => {
  try {
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Holiday not found' });
    }

    let holidayIds = [holiday._id];
    let dates = [holiday.date];
    const isMultiDay = !!holiday.rangeGroupId;

    if (holiday.rangeGroupId) {
      const groupHolidays = await Holiday.find({ rangeGroupId: holiday.rangeGroupId });
      holidayIds = groupHolidays.map((h) => h._id);
      dates = groupHolidays.map((h) => h.date);
      await Holiday.deleteMany({ rangeGroupId: holiday.rangeGroupId });
    } else {
      await Holiday.findByIdAndDelete(req.params.id);
    }

    // Revert holiday status on attendance records for all affected dates
    for (const d of dates) {
      await Attendance.updateMany(
        { date: d, holiday: { $in: holidayIds }, status: 'Holiday' },
        { $set: { status: 'Absent', isHoliday: false, holiday: null } }
      );
      await Attendance.updateMany(
        { date: d, holiday: { $in: holidayIds }, status: 'Working on Holiday' },
        { $set: { isHoliday: false, holiday: null } }
      );
    }

    await AuditLog.create({
      action: 'HOLIDAY_DELETE',
      entityType: 'Holiday',
      entityId: holiday._id,
      performedBy: req.user._id,
      performedByName: req.user.name || 'HR Admin',
      reason: `Deleted holiday ${holiday.name} (${dates[0]}${dates.length > 1 ? ` to ${dates[dates.length - 1]}` : ''})`
    });

    res.json({
      success: true,
      message: isMultiDay
        ? `Multi-day holiday and all ${dates.length} days deleted. Attendance records reverted.`
        : 'Holiday deleted and attendance records reverted.'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
