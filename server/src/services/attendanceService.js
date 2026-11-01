const SystemSetting = require('../models/SystemSetting');

class AttendanceService {
  /**
   * Parse "HH:mm" to minutes from start of day
   */
  static timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  /**
   * Get minutes from midnight for a Date object in local time
   */
  static dateToMinutes(date) {
    const d = new Date(date);
    return d.getHours() * 60 + d.getMinutes();
  }

  /**
   * Format a Date into 'YYYY-MM-DD'
   */
  static formatDate(date = new Date()) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

    const activeShift = shift || defaultShift;
    const shiftStartMinutes = this.timeToMinutes(activeShift.startTime);
    const shiftEndMinutes = this.timeToMinutes(activeShift.endTime);

    // Grace Period rule (Conditions 5 & 6)
    const isGraceEnabled = activeShift.enableGracePeriod !== false && (settings ? settings.enableGracePeriod !== false : true);
    const graceMinutes = isGraceEnabled ? (activeShift.gracePeriodMinutes ?? 15) : 0;

    const punchInMinutes = this.dateToMinutes(punchIn);

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
    const punchOutMinutes = this.dateToMinutes(punchOut);
    if (punchOutMinutes < shiftEndMinutes) {
      earlyMinutes = shiftEndMinutes - punchOutMinutes;
    }

    // Conditions 11 & 12: Working hours calculate strictly within allotted shift boundaries (No extra/overtime counting)
    const pInDate = new Date(punchIn);
    const pOutDate = new Date(punchOut);

    const shiftStartDate = new Date(pInDate);
    const [shStartHour, shStartMin] = (activeShift.startTime || '09:00').split(':').map(Number);
    shiftStartDate.setHours(shStartHour, shStartMin, 0, 0);

    const shiftEndDate = new Date(pInDate);
    const [shEndHour, shEndMin] = (activeShift.endTime || '18:00').split(':').map(Number);
    shiftEndDate.setHours(shEndHour, shEndMin, 0, 0);

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
