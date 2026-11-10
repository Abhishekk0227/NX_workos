const test = require('node:test');
const assert = require('node:assert/strict');
const AttendanceService = require('../src/services/attendanceService');

test('Upgrade Features: Configurable Shift Thresholds & Attendance Categorization', () => {
  const shift = {
    name: 'Standard 10-6 Shift',
    startTime: '10:00',
    halfDayCutoffTime: '14:00',
    endTime: '18:00',
    gracePeriodMinutes: 15,
    fullDayWorkingHoursThreshold: 8,
    halfDayWorkingHoursThreshold: 4,
    isActive: true
  };

  // Case 1: Full Day (8.5 hours worked)
  const punchInFull = '2026-11-08T04:30:00.000Z'; // 10:00 AM IST
  const punchOutFull = '2026-11-08T13:00:00.000Z'; // 06:30 PM IST (8.5 hours)
  const resFull = AttendanceService.calculateAttendanceMetrics(punchInFull, punchOutFull, shift);
  assert.equal(resFull.actualWorkingHours, 8.5, 'Should log 8.5 working hours');
  assert.equal(resFull.status, 'Full Day', 'Status should be Full Day for 8.5 hours worked');
  assert.equal(resFull.isShortAttendance, false, 'Should not trigger short attendance alert');

  // Case 2: Half Day (5.5 hours worked - between 4 and 8 hours)
  const punchOutHalf = '2026-11-08T10:00:00.000Z'; // 03:30 PM IST (5.5 hours)
  const resHalf = AttendanceService.calculateAttendanceMetrics(punchInFull, punchOutHalf, shift);
  assert.equal(resHalf.actualWorkingHours, 5.5, 'Should log 5.5 working hours');
  assert.equal(resHalf.status, 'Half Day', 'Status should be Half Day for 5.5 hours worked');
  assert.equal(resHalf.isShortAttendance, false, 'Should not trigger short attendance alert');

  // Case 3: Short Attendance (3.0 hours worked - under 4 hours threshold)
  const punchOutShort = '2026-11-08T07:30:00.000Z'; // 01:00 PM IST (3.0 hours)
  const resShort = AttendanceService.calculateAttendanceMetrics(punchInFull, punchOutShort, shift);
  assert.equal(resShort.actualWorkingHours, 3.0, 'Should log 3.0 working hours');
  assert.equal(resShort.status, 'Short Attendance', 'Status should be Short Attendance for < 4 hours');
  assert.equal(resShort.isShortAttendance, true, 'Short Attendance Alert flag must be TRUE');

  // Case 4: Working on Holiday
  const resHolidayWork = AttendanceService.calculateAttendanceMetrics(punchInFull, punchOutFull, shift, null, true);
  assert.equal(resHolidayWork.status, 'Working on Holiday', 'Status must be Working on Holiday');

  // Case 5: Holiday without punch in
  const resHolidayNoWork = AttendanceService.calculateAttendanceMetrics(null, null, shift, null, true);
  assert.equal(resHolidayNoWork.status, 'Holiday', 'Status must be Holiday (NOT Absent)');
});

test('Upgrade Features: IST Timezone Consistency', () => {
  // Convert UTC timestamp 04:30:00Z to IST string
  const utcDate = new Date('2026-11-08T04:30:00.000Z');
  const formatted12 = AttendanceService.formatTime(utcDate, {}, 'Asia/Kolkata');
  assert.match(formatted12, /10:00\s*AM/i, '04:30 UTC must format to 10:00 AM IST');

  const formatted24 = AttendanceService.formatTime24(utcDate, 'Asia/Kolkata');
  assert.equal(formatted24, '10:00', '04:30 UTC must format to 10:00 in 24h clock');

  const istISO = AttendanceService.toISTISOString(utcDate);
  assert.match(istISO, /\+05:30$/, 'IST ISO string must end with +05:30');
});

