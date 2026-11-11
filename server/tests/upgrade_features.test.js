const test = require('node:test');
const assert = require('node:assert/strict');
const AttendanceService = require('../src/services/attendanceService');

test('Upgrade Features: Configurable Hours Thresholds & Attendance Categorization', () => {
  const settings = {
    companyTimezone: 'Asia/Kolkata',
    workStartTime: '10:00',
    workEndTime: '18:00',
    fullDayThresholdHours: 8,
    halfDayThresholdHours: 4
  };

  // Case 1: Full Day (8.5 hours worked)
  const punchInFull = '2026-11-08T04:30:00.000Z'; // 10:00 AM IST
  const punchOutFull = '2026-11-08T13:00:00.000Z'; // 06:30 PM IST (8.5 hours)
  const resFull = AttendanceService.calculateAttendanceMetrics(punchInFull, punchOutFull, settings);
  assert.equal(resFull.actualWorkingHours, 8.5, 'Should log 8.5 working hours');
  assert.equal(resFull.status, 'Full Day', 'Status should be Full Day for 8.5 hours worked');
  assert.equal(resFull.isShortAttendance, false, 'Should not trigger short attendance alert');

  // Case 2: Half Day (5.5 hours worked - between 4 and 8 hours)
  const punchOutHalf = '2026-11-08T10:00:00.000Z'; // 03:30 PM IST (5.5 hours)
  const resHalf = AttendanceService.calculateAttendanceMetrics(punchInFull, punchOutHalf, settings);
  assert.equal(resHalf.actualWorkingHours, 5.5, 'Should log 5.5 working hours');
  assert.equal(resHalf.status, 'Half Day', 'Status should be Half Day for 5.5 hours worked');
  assert.equal(resHalf.isShortAttendance, false, 'Should not trigger short attendance alert');

  // Case 3: Short Attendance (3.0 hours worked - under 4 hours threshold)
  const punchOutShort = '2026-11-08T07:30:00.000Z'; // 01:00 PM IST (3.0 hours)
  const resShort = AttendanceService.calculateAttendanceMetrics(punchInFull, punchOutShort, settings);
  assert.equal(resShort.actualWorkingHours, 3.0, 'Should log 3.0 working hours');
  assert.equal(resShort.status, 'Short Attendance', 'Status should be Short Attendance for < 4 hours');
  assert.equal(resShort.isShortAttendance, true, 'Short Attendance Alert flag must be TRUE');

  // Case 4: Custom HR-configured thresholds (e.g. 9h Full Day, 5h Half Day)
  const customSettings = {
    companyTimezone: 'Asia/Kolkata',
    fullDayThresholdHours: 9,
    halfDayThresholdHours: 5
  };
  const resCustomHalf = AttendanceService.calculateAttendanceMetrics(punchInFull, punchOutFull, customSettings);
  assert.equal(resCustomHalf.status, 'Half Day', '8.5 hours under 9h Full-Day threshold must be Half Day');

  const punchOut4_5 = '2026-11-08T09:00:00.000Z'; // 02:30 PM IST (4.5 hours)
  const resCustomShort = AttendanceService.calculateAttendanceMetrics(punchInFull, punchOut4_5, customSettings);
  assert.equal(resCustomShort.status, 'Short Attendance', '4.5 hours under 5h Half-Day threshold must be Short Attendance');
  assert.equal(resCustomShort.isShortAttendance, true);

  // Case 5: Working on Holiday
  const resHolidayWork = AttendanceService.calculateAttendanceMetrics(punchInFull, punchOutFull, settings, true);
  assert.equal(resHolidayWork.status, 'Working on Holiday', 'Status must be Working on Holiday');

  // Case 6: Holiday without punch in
  const resHolidayNoWork = AttendanceService.calculateAttendanceMetrics(null, null, settings, true);
  assert.equal(resHolidayNoWork.status, 'Holiday', 'Status must be Holiday (NOT Absent)');

  // Case 7: No attendance on working day
  const resAbsent = AttendanceService.calculateAttendanceMetrics(null, null, settings, false);
  assert.equal(resAbsent.status, 'Absent', 'No attendance must be Absent');
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

