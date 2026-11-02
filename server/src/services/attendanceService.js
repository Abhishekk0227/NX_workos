const SystemSetting = require('../models/SystemSetting');

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
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  }

  /**
   * Build a UTC Date object representing a specific time string ("HH:mm") on the same day as `dateObj` in `timezone`
   */
  static getTimestampForTimeInTimezone(dateObj, timeStr, timezone = 'Asia/Kolkata') {
    const dateStr = this.formatDate(dateObj, timezone);
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
   * Calculate late minutes, early departure minutes, actual working hours, and status
   */
  static calculateAttendanceMetrics(punchIn, punchOut, shift, settings = null) {
    let lateMinutes = 0;
    let earlyMinutes = 0;
    let actualWorkingHours = 0;
    let status = 'Present';

    if (!punchIn) {
      return {
        lateMinutes: 0,
        earlyMinutes: 0,
        actualWorkingHours: 0,
        status: 'Absent'
      };
    }

    const defaultShift = {
      startTime: '09:00',
      endTime: '18:00',
      requiredHours: 8.5,
      gracePeriodMinutes: 15,
      breakDurationMinutes: 60
    };

    const timezone = this.getTimezone(settings);
    const activeShift = shift || defaultShift;
    const shiftStartMinutes = this.timeToMinutes(activeShift.startTime);
    const shiftEndMinutes = this.timeToMinutes(activeShift.endTime);

    // Grace Period rule (Conditions 5 & 6)
    const isGraceEnabled = activeShift.enableGracePeriod !== false && (settings ? settings.enableGracePeriod !== false : true);
    const graceMinutes = isGraceEnabled ? (activeShift.gracePeriodMinutes ?? 15) : 0;

    const punchInMinutes = this.dateToMinutes(punchIn, timezone);

    // Calculate Late Arrival (Conditions 3, 4, 5, 6)
    if (punchInMinutes > shiftStartMinutes + graceMinutes) {
      lateMinutes = punchInMinutes - shiftStartMinutes;
      status = 'Late';
    }

    // If still working (not punched out)
    if (!punchOut) {
      return {
        lateMinutes,
        earlyMinutes: 0,
        actualWorkingHours: 0,
        status: 'Working'
      };
    }

    // Punched out calculations
    const punchOutMinutes = this.dateToMinutes(punchOut, timezone);
    if (punchOutMinutes < shiftEndMinutes) {
      earlyMinutes = shiftEndMinutes - punchOutMinutes;
    }

    // Conditions 11 & 12: Working hours calculate strictly within allotted shift boundaries (No extra/overtime counting)
    const pInDate = new Date(punchIn);
    const pOutDate = new Date(punchOut);

    const shiftStartDate = this.getTimestampForTimeInTimezone(pInDate, activeShift.startTime || '09:00', timezone);
    let shiftEndDate = this.getTimestampForTimeInTimezone(pInDate, activeShift.endTime || '18:00', timezone);
    if (shiftEndMinutes < shiftStartMinutes) {
      shiftEndDate = new Date(shiftEndDate.getTime() + 24 * 60 * 60 * 1000);
    }

    const clampedIn = Math.max(pInDate.getTime(), shiftStartDate.getTime());
    const clampedOut = Math.min(pOutDate.getTime(), shiftEndDate.getTime());
    const durationMs = Math.max(0, clampedOut - clampedIn);

    if (durationMs > 0) {
      actualWorkingHours = parseFloat((durationMs / (1000 * 60 * 60)).toFixed(2));
    }

    // Half-Day Threshold check (Conditions 15, 16)
    const halfDayThreshold = activeShift.halfDayThresholdHours || settings?.halfDayThresholdHours || 6;
    if (actualWorkingHours < halfDayThreshold) {
      status = 'Half Day';
    } else if (lateMinutes > 0) {
      status = 'Late';
    } else {
      status = 'Present';
    }

    return {
      lateMinutes,
      earlyMinutes,
      actualWorkingHours,
      status
    };
  }
}

module.exports = AttendanceService;
