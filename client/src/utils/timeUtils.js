/**
 * Formats a Date or timestamp string into 24-hour clock "HH:mm" (e.g. 19:20 for 7:20 PM)
 */
export function formatTime24(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Formats attendance working hours into "H:mm hrs" (e.g. "9:22 hrs")
 * Direct punchOut - punchIn difference
 */
export function formatWorkingHours(recordOrHours) {
  if (!recordOrHours) return '0:00 hrs';

  // If passed an attendance object
  if (typeof recordOrHours === 'object') {
    if (recordOrHours.workingHoursFormatted) {
      return `${recordOrHours.workingHoursFormatted} hrs`;
    }

    if (recordOrHours.punchIn && recordOrHours.punchOut) {
      const diffMs = Math.max(0, new Date(recordOrHours.punchOut).getTime() - new Date(recordOrHours.punchIn).getTime());
      const totalMinutes = Math.round(diffMs / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}:${String(minutes).padStart(2, '0')} hrs`;
    }

    if (typeof recordOrHours.actualWorkingHours === 'number') {
      const totalMinutes = Math.round(recordOrHours.actualWorkingHours * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}:${String(minutes).padStart(2, '0')} hrs`;
    }

    return '0:00 hrs';
  }

  // If passed a number (e.g. 9.37 or 8)
  if (typeof recordOrHours === 'number') {
    const totalMinutes = Math.round(recordOrHours * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${String(minutes).padStart(2, '0')} hrs`;
  }

  return `${recordOrHours} hrs`;
}
