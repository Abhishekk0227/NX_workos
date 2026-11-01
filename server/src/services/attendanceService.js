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
  static calculateAttendanceMetrics(punchIn, punchOut, shift) {
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
    const graceMinutes = activeShift.gracePeriodMinutes || 0;

    const punchInMinutes = this.dateToMinutes(punchIn);

    // Calculate Late Arrival
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

    const durationMs = new Date(punchOut).getTime() - new Date(punchIn).getTime();
    if (durationMs > 0) {
      actualWorkingHours = parseFloat((durationMs / (1000 * 60 * 60)).toFixed(2));
    }

    // Determine final status:
    // Rule: If punch out occurs before completing 6 hours of work, mark as 'Half Day'
    if (actualWorkingHours < 6) {
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
