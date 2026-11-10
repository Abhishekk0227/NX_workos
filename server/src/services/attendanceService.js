const SystemSetting = require('../models/SystemSetting');
const Holiday = require('../models/Holiday');

class AttendanceService {
  /**
   * Helper to retrieve company timezone from settings or env
   */
  static getTimezone(settings = null) {
    return settings?.companyTimezone || process.env.TIMEZONE || process.env.COMPANY_TIMEZONE || 'Asia/Kolkata';
  }

  /**
   * Parse "HH:mm" to minutes from start of day
   */
  static timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  /**
   * Get minutes from midnight for a Date object in the specified timezone (default 'Asia/Kolkata')
   */
  static dateToMinutes(date, timezone = 'Asia/Kolkata') {
    if (!date) return 0;
    const d = new Date(date);
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(d);
    let hour = 0, minute = 0;
    for (const p of parts) {
      if (p.type === 'hour') hour = parseInt(p.value, 10);
      if (p.type === 'minute') minute = parseInt(p.value, 10);
    }
    if (hour === 24) hour = 0;
    return hour * 60 + minute;
  }

  /**
   * Format a Date into 'YYYY-MM-DD' in the specified timezone (default 'Asia/Kolkata')
   */
  static formatDate(date = new Date(), timezone = 'Asia/Kolkata') {
    if (!date) return '';
    const d = new Date(date);
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  }

  /**
   * Format a Date into 12-hour time string in the specified timezone (default 'Asia/Kolkata')
   * Example: "10:48 AM", "07:19 PM"
   */
  static formatTime(date = new Date(), options = {}, timezone = null) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const tz = timezone || this.getTimezone();
    const defaultOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: tz
    };
    return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(d);
  }

  /**
   * Format a Date into 24-hour time string "HH:mm" in the specified timezone (default 'Asia/Kolkata')
   * Example: "10:48", "19:19"
   */
  static formatTime24(date = new Date(), timezone = null) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const tz = timezone || this.getTimezone();
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: tz
    }).format(d);
  }

  /**
   * Format any Date or ISO string into an IST ISO string with "+05:30"
   * Example: 2026-11-03T19:19:02.719+05:30
   */
  static toISTISOString(date = new Date()) {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(d.getTime() + istOffsetMs);
    return istDate.toISOString().replace('Z', '+05:30');
  }

  /**
   * Return a Date representing the current instant in IST
   */
  static getNowIST() {
    return new Date();
  }

  /**
   * Build a UTC Date object representing a specific time string ("HH:mm") on a given date string ("YYYY-MM-DD") in `timezone`
   */
  static getTimestampForTimeInTimezone(dateObjOrStr, timeStr, timezone = 'Asia/Kolkata') {
    const dateStr = typeof dateObjOrStr === 'string' ? dateObjOrStr : this.formatDate(dateObjOrStr, timezone);
    const [h = '00', m = '00', s = '00'] = (timeStr || '00:00').split(':');
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');

    const naiveUtc = new Date(`${dateStr}T${hh}:${mm}:${ss}Z`);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    }).formatToParts(naiveUtc);

    const p = {};
    for (const part of parts) {
      p[part.type] = part.value;
    }
    let hour = parseInt(p.hour, 10);
    if (hour === 24) hour = 0;
    const inTzUtc = Date.UTC(
      parseInt(p.year, 10),
      parseInt(p.month, 10) - 1,
      parseInt(p.day, 10),
      hour,
      parseInt(p.minute, 10),
      parseInt(p.second, 10)
    );

    const offsetMs = inTzUtc - naiveUtc.getTime();
    return new Date(naiveUtc.getTime() - offsetMs);
  }

  /**
   * Check if a given date is an applicable holiday for an employee
   */
  static async checkHoliday(dateStr, employee = null) {
    if (!dateStr) return null;
    try {
      const mmdd = dateStr.slice(5); // "MM-DD"
      const holidays = await Holiday.find({
        $or: [
          { date: dateStr },
          { startDate: { $lte: dateStr }, endDate: { $gte: dateStr } },
          { isRecurring: true, date: { $regex: new RegExp(`-${mmdd}$`) } }
        ]
      });
      if (!holidays || holidays.length === 0) return null;

      if (!employee) return holidays[0];

      // Match applicability
      for (const h of holidays) {
        if (h.applicability === 'All') return h;
        if (h.applicability === 'Department' && employee.department && h.applicableDepartments?.includes(employee.department)) {
          return h;
        }
        if (h.applicability === 'Shift' && employee.assignedShift) {
          const shiftId = employee.assignedShift._id ? employee.assignedShift._id.toString() : employee.assignedShift.toString();
          if (h.applicableShifts?.some(s => s.toString() === shiftId)) return h;
        }
        if (h.applicability === 'Custom' && employee._id) {
          if (h.applicableEmployees?.some(e => e.toString() === employee._id.toString())) return h;
        }
      }
      return null;
    } catch (err) {
      console.warn('Holiday check warning:', err.message);
      return null;
    }
  }

  /**
   * Calculate late minutes, early departure minutes, actual working hours, status, and alert triggers.
   *
   * Threshold rules:
   * - 8 hours or more (>= fullDayThreshold): "Full Day" (or "Late" if arrived after shift start), 100%
   * - 4 to less than 8 hours (>= halfDayThreshold && < fullDayThreshold): "Half Day", 50%
   * - < 4 hours (< halfDayThreshold): "Short Attendance", HR decides, generates Short Attendance Alert
   * - No attendance: "Absent" (or "Holiday" if holiday), 0%
   */
  static calculateAttendanceMetrics(punchIn, punchOut, shift, settings = null, isHoliday = false) {
    let lateMinutes = 0;
    let earlyMinutes = 0;
    let actualWorkingHours = 0;
    let status = isHoliday ? 'Holiday' : 'Absent';
    let isShortAttendance = false;

    if (!punchIn) {
      return {
        lateMinutes: 0,
        earlyMinutes: 0,
        actualWorkingHours: 0,
        workingHoursFormatted: '0:00',
        status: isHoliday ? 'Holiday' : 'Absent',
        isShortAttendance: false
      };
    }

    const defaultShift = {
      startTime: '09:00',
      endTime: '18:00',
      requiredHours: 8,
      fullDayWorkingHoursThreshold: 8,
      halfDayWorkingHoursThreshold: 4,
      gracePeriodMinutes: 15,
      breakDurationMinutes: 60
    };

    const timezone = this.getTimezone(settings);
    const activeShift = shift || defaultShift;
    const shiftStartMinutes = this.timeToMinutes(activeShift.startTime);
    const shiftEndMinutes = this.timeToMinutes(activeShift.endTime);

    const punchInMinutes = this.dateToMinutes(punchIn, timezone);

    // Calculate Late Arrival: count late minutes from shift start
    if (punchInMinutes > shiftStartMinutes) {
      lateMinutes = punchInMinutes - shiftStartMinutes;
    }

    // If still working (not punched out yet)
    if (!punchOut) {
      return {
        lateMinutes,
        earlyMinutes: 0,
        actualWorkingHours: 0,
        workingHoursFormatted: '0:00',
        status: isHoliday ? 'Working on Holiday' : 'Working',
        isShortAttendance: false
      };
    }

    // Punched out calculations
    const punchOutMinutes = this.dateToMinutes(punchOut, timezone);
    if (!activeShift.isOvernight && punchOutMinutes < shiftEndMinutes) {
      earlyMinutes = shiftEndMinutes - punchOutMinutes;
    }

    // Direct punchOut - punchIn difference (actual elapsed duration)
    const pInDate = new Date(punchIn);
    const pOutDate = new Date(punchOut);
    const durationMs = Math.max(0, pOutDate.getTime() - pInDate.getTime());
    let workingHoursFormatted = '0:00';

    if (durationMs > 0) {
      actualWorkingHours = parseFloat((durationMs / (1000 * 60 * 60)).toFixed(2));
      const totalMinutes = Math.round(durationMs / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      workingHoursFormatted = `${hours}:${String(minutes).padStart(2, '0')}`;
    }

    // Explicit threshold configuration check
    const hasExplicitThresholds = activeShift.fullDayWorkingHoursThreshold != null || activeShift.halfDayWorkingHoursThreshold != null;

    if (hasExplicitThresholds) {
      const fullDayThreshold = activeShift.fullDayWorkingHoursThreshold ?? 8;
      const halfDayThreshold = activeShift.halfDayWorkingHoursThreshold ?? 4;

      if (isHoliday) {
        status = 'Working on Holiday';
      } else if (actualWorkingHours >= fullDayThreshold) {
        status = 'Full Day';
      } else if (actualWorkingHours >= halfDayThreshold) {
        status = 'Half Day';
      } else {
        status = 'Short Attendance';
        isShortAttendance = true;
      }
    } else {
      // Legacy compatibility when thresholds are not explicitly defined on shift
      const halfDayThreshold = settings?.halfDayThresholdHours ?? 6;
      if (isHoliday) {
        status = 'Working on Holiday';
      } else if (settings?.shortAttendanceThresholdHours && actualWorkingHours < settings.shortAttendanceThresholdHours) {
        status = 'Short Attendance';
        isShortAttendance = true;
      } else if (actualWorkingHours < halfDayThreshold) {
        status = 'Half Day';
      } else if (lateMinutes > 0) {
        status = 'Late';
      } else {
        status = 'Present';
      }
    }

    return {
      lateMinutes,
      earlyMinutes,
      actualWorkingHours,
      workingHoursFormatted,
      status,
      isShortAttendance
    };
  }

  /**
   * Process Automatic Punch-Out for forgotten punch sessions.
   * - For standard shifts: auto punch out at 12:00 AM IST of the next calendar day.
   * - For overnight shifts: auto punch out at configured shift end time IST.
   */
  static async processAutoPunchOut() {
    const Attendance = require('../models/Attendance');
    const NotificationService = require('./notificationService');
    const now = new Date();
    const todayStr = this.formatDate(now, 'Asia/Kolkata');

    // Find all incomplete sessions where punchIn is present, but punchOut is null
    const incompleteSessions = await Attendance.find({
      punchIn: { $ne: null },
      punchOut: null,
      date: { $lt: todayStr } // Sessions started before today (past midnight 12:00 AM IST)
    }).populate('employee').populate('shift');

    const updated = [];

    for (const session of incompleteSessions) {
      const shift = session.shift;
      const isOvernight = Boolean(
        shift?.isOvernight ||
        (shift?.startTime && shift?.endTime && this.timeToMinutes(shift.endTime) < this.timeToMinutes(shift.startTime))
      );

      // Deterministic calendar next-day calculation
      const [year, month, day] = session.date.split('-').map(Number);
      const nextDayDate = new Date(Date.UTC(year, month - 1, day + 1));
      const nextDayStr = nextDayDate.toISOString().slice(0, 10);

      let autoPunchOutTime;
      if (isOvernight && shift?.endTime) {
        // Overnight shift: Follow configured shift-end time on the next calendar day (Do NOT punch out at midnight)
        autoPunchOutTime = this.getTimestampForTimeInTimezone(nextDayStr, shift.endTime, 'Asia/Kolkata');
      } else {
        // Standard shift: Automatically punch out at 12:00 AM IST (00:00:00 IST of next calendar day)
        autoPunchOutTime = this.getTimestampForTimeInTimezone(nextDayStr, '00:00', 'Asia/Kolkata');
      }

      // If autoPunchOutTime is in the future compared to now, skip (e.g. overnight shift still active)
      if (autoPunchOutTime.getTime() > now.getTime()) {
        continue;
      }

      const isHoliday = !!session.isHoliday;
      const metrics = this.calculateAttendanceMetrics(session.punchIn, autoPunchOutTime, shift, null, isHoliday);

      session.punchOut = autoPunchOutTime;
      session.autoPunchedOut = true;
      session.punchOutType = 'SYSTEM_AUTO';
      session.autoPunchOutAlert = { isAlert: true, reviewed: false };
      session.actualWorkingHours = metrics.actualWorkingHours;
      session.workingHoursFormatted = metrics.workingHoursFormatted;
      session.status = metrics.status;

      // If short attendance, generate short attendance alert
      if (metrics.isShortAttendance) {
        session.shortAttendanceAlert = {
          isAlert: true,
          status: 'Pending',
          payableAmount: 0,
          deductionAmount: 0,
          hrClassification: 'Short Attendance (Auto Punched Out)',
          resolutionRemarks: 'Generated automatically upon auto punch-out.'
        };
      }

      session.auditHistory.push({
        action: 'AUTO_PUNCH_OUT',
        performedAt: now,
        reason: isOvernight
          ? 'Overnight shift ended; automatically punched out by system at configured shift-end time.'
          : 'Employee did not punch out; automatically punched out by system at 12:00 AM IST cutoff.',
        details: {
          sessionDate: session.date,
          punchIn: session.punchIn,
          autoPunchOutTime,
          isOvernight,
          actualWorkingHours: metrics.actualWorkingHours,
          status: metrics.status
        }
      });

      await session.save();
      updated.push(session);

      // Send HR Notification
      try {
        const empName = session.employee?.fullName || 'Employee';
        await NotificationService.send({
          targetRole: 'HR',
          title: 'Auto Punch-Out Alert',
          message: `${empName} was automatically punched out for ${session.date} (${metrics.actualWorkingHours} hrs logged). Status: ${metrics.status}.`,
          type: 'Auto Punch-Out',
          link: '/hr/attendance?view=log&date=' + session.date
        });
      } catch (e) {
        console.warn('Auto punch out notification error:', e.message);
      }

      // Send Employee Notification
      try {
        const empUserId = session.employee?.user || session.employee?._id;
        if (empUserId) {
          await NotificationService.send({
            recipient: empUserId,
            title: 'Auto Punch-Out Notice',
            message: `You were automatically punched out for ${session.date}. Please submit your daily work report.`,
            type: 'Attendance',
            link: '/employee/home'
          });
        }
      } catch (e) {
        console.warn('Employee auto punch out notification error:', e.message);
      }
    }

    return updated;
  }
}

module.exports = AttendanceService;
