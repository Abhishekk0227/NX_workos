const test = require('node:test');
const assert = require('node:assert/strict');
const AttendanceService = require('../src/services/attendanceService');

test('Auto Punch-Out: Standard Shift auto punches out at 12:00 AM IST', () => {
  const sessionDate = '2026-11-10';
  const standardShift = {
    name: 'General Day Shift',
    startTime: '09:00',
    endTime: '18:00',
    isOvernight: false,
    fullDayWorkingHoursThreshold: 8,
    halfDayWorkingHoursThreshold: 4
  };

  // Next calendar day calculation
  const [year, month, day] = sessionDate.split('-').map(Number);
  const nextDayDate = new Date(Date.UTC(year, month - 1, day + 1));
  const nextDayStr = nextDayDate.toISOString().slice(0, 10);
  assert.equal(nextDayStr, '2026-11-11');

  // Standard cutoff is 12:00 AM IST (00:00:00 IST) of next day
  const cutoffTime = AttendanceService.getTimestampForTimeInTimezone(nextDayStr, '00:00', 'Asia/Kolkata');

  // Verify time in IST is 12:00 AM (midnight)
  const cutoffISTTime = AttendanceService.formatTime(cutoffTime, {}, 'Asia/Kolkata');
  assert.equal(cutoffISTTime, '12:00 AM');

  // PunchIn at 10:00 AM IST on 2026-11-10
  const punchInTime = AttendanceService.getTimestampForTimeInTimezone(sessionDate, '10:00', 'Asia/Kolkata');
  const metrics = AttendanceService.calculateAttendanceMetrics(punchInTime, cutoffTime, standardShift);

  assert.equal(metrics.actualWorkingHours, 14); // 10:00 AM to 12:00 AM midnight = 14 hours
  assert.equal(metrics.status, 'Full Day');
});

test('Auto Punch-Out: Overnight Shift DOES NOT punch out at midnight and follows shift-end time', () => {
  const sessionDate = '2026-11-10';
  const overnightShift = {
    name: 'Night Shift',
    startTime: '20:00',
    endTime: '05:00',
    isOvernight: true,
    fullDayWorkingHoursThreshold: 8,
    halfDayWorkingHoursThreshold: 4
  };

  const isOvernight = Boolean(
    overnightShift.isOvernight ||
    AttendanceService.timeToMinutes(overnightShift.endTime) < AttendanceService.timeToMinutes(overnightShift.startTime)
  );
  assert.equal(isOvernight, true, 'Shift from 20:00 to 05:00 must be recognized as overnight');

  const [year, month, day] = sessionDate.split('-').map(Number);
  const nextDayDate = new Date(Date.UTC(year, month - 1, day + 1));
  const nextDayStr = nextDayDate.toISOString().slice(0, 10);

  // Midnight 12:00 AM IST time on 2026-11-11
  const midnightIST = AttendanceService.getTimestampForTimeInTimezone(nextDayStr, '00:00', 'Asia/Kolkata');

  // Overnight shift autoPunchOutTime follows configured shift-end time (05:00 IST)
  const shiftEndAutoPunchOutTime = AttendanceService.getTimestampForTimeInTimezone(nextDayStr, overnightShift.endTime, 'Asia/Kolkata');

  // At midnight (12:00 AM IST), shiftEndAutoPunchOutTime is strictly in the future
  assert.equal(
    shiftEndAutoPunchOutTime.getTime() > midnightIST.getTime(),
    true,
    'Overnight auto punch-out must be in the future at midnight (must NOT punch out at 12:00 AM)'
  );

  // At 5:00 AM IST, auto punch-out triggers and calculates metrics
  const punchInTime = AttendanceService.getTimestampForTimeInTimezone(sessionDate, '20:00', 'Asia/Kolkata');
  const metrics = AttendanceService.calculateAttendanceMetrics(punchInTime, shiftEndAutoPunchOutTime, overnightShift);

  // 20:00 (8:00 PM) to 05:00 (5:00 AM) = 9 hours
  assert.equal(metrics.actualWorkingHours, 9);
  assert.equal(metrics.status, 'Full Day');
});

test('Auto Punch-Out: Short attendance generates alert when actual hours < half-day threshold', () => {
  const sessionDate = '2026-11-10';
  const shift = {
    name: 'Evening Shift',
    startTime: '17:00',
    endTime: '23:00',
    isOvernight: false,
    fullDayWorkingHoursThreshold: 8,
    halfDayWorkingHoursThreshold: 4
  };

  // Late punch in at 21:30 (9:30 PM)
  const punchInTime = AttendanceService.getTimestampForTimeInTimezone(sessionDate, '21:30', 'Asia/Kolkata');
  // Auto punch-out at 12:00 AM (00:00) next day -> 2.5 hours worked
  const nextDayStr = '2026-11-11';
  const autoPunchOutTime = AttendanceService.getTimestampForTimeInTimezone(nextDayStr, '00:00', 'Asia/Kolkata');

  const metrics = AttendanceService.calculateAttendanceMetrics(punchInTime, autoPunchOutTime, shift);
  assert.equal(metrics.actualWorkingHours, 2.5);
  assert.equal(metrics.isShortAttendance, true);
  assert.equal(metrics.status, 'Short Attendance');
});
