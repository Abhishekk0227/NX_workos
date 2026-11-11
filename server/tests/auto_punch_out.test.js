const test = require('node:test');
const assert = require('node:assert/strict');
const AttendanceService = require('../src/services/attendanceService');

test('Auto Punch-Out: Automatically punches out unclosed sessions at 12:00 AM IST', () => {
  const sessionDate = '2026-11-10';
  const settings = {
    companyTimezone: 'Asia/Kolkata',
    fullDayThresholdHours: 8,
    halfDayThresholdHours: 4
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

  // PunchIn at 10:00 AM IST on 2026-11-10 -> 14 hours logged -> Full Day
  const punchInTime = AttendanceService.getTimestampForTimeInTimezone(sessionDate, '10:00', 'Asia/Kolkata');
  const metrics = AttendanceService.calculateAttendanceMetrics(punchInTime, cutoffTime, settings);

  assert.equal(metrics.actualWorkingHours, 14);
  assert.equal(metrics.status, 'Full Day');
});

test('Auto Punch-Out: Midnight cutoff classifies 5 hours as Half Day under hours thresholds', () => {
  const sessionDate = '2026-11-10';
  const settings = {
    companyTimezone: 'Asia/Kolkata',
    fullDayThresholdHours: 8,
    halfDayThresholdHours: 4
  };

  // PunchIn at 19:00 (7:00 PM) IST -> auto punch out at 00:00 (12:00 AM) IST next day = 5 hours
  const punchInTime = AttendanceService.getTimestampForTimeInTimezone(sessionDate, '19:00', 'Asia/Kolkata');
  const cutoffTime = AttendanceService.getTimestampForTimeInTimezone('2026-11-11', '00:00', 'Asia/Kolkata');
  const metrics = AttendanceService.calculateAttendanceMetrics(punchInTime, cutoffTime, settings);

  assert.equal(metrics.actualWorkingHours, 5);
  assert.equal(metrics.isShortAttendance, false);
  assert.equal(metrics.status, 'Half Day');
});

test('Auto Punch-Out: Short attendance generates alert when actual hours < half-day threshold', () => {
  const sessionDate = '2026-11-10';
  const settings = {
    companyTimezone: 'Asia/Kolkata',
    fullDayThresholdHours: 8,
    halfDayThresholdHours: 4
  };

  // Punch in at 21:30 (9:30 PM)
  const punchInTime = AttendanceService.getTimestampForTimeInTimezone(sessionDate, '21:30', 'Asia/Kolkata');
  // Auto punch-out at 12:00 AM (00:00) next day -> 2.5 hours worked
  const autoPunchOutTime = AttendanceService.getTimestampForTimeInTimezone('2026-11-11', '00:00', 'Asia/Kolkata');

  const metrics = AttendanceService.calculateAttendanceMetrics(punchInTime, autoPunchOutTime, settings);
  assert.equal(metrics.actualWorkingHours, 2.5);
  assert.equal(metrics.isShortAttendance, true);
  assert.equal(metrics.status, 'Short Attendance');
});
