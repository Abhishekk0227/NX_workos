const test = require('node:test');
const assert = require('node:assert/strict');
const AttendanceService = require('../src/services/attendanceService');
const PayrollService = require('../src/services/payrollService');

test('AttendanceService: Time conversion and late arrival calculation', () => {
  const shift = {
    startTime: '09:00',
    endTime: '18:00',
    requiredHours: 8.5,
    gracePeriodMinutes: 15
  };

  // Punch in at 09:10 (10 mins after shift start 09:00)
  const onTimeDate = new Date('2026-10-31T09:10:00');
  const metricsOnTime = AttendanceService.calculateAttendanceMetrics(onTimeDate, null, shift);
  assert.equal(metricsOnTime.lateMinutes, 10, 'Should record 10 late minutes from shift start');
  assert.equal(metricsOnTime.status, 'Working', 'Status should be Working');

  // Punch in at 09:30 (15m past grace period, 30m past shift start)
  const lateDate = new Date('2026-10-31T09:30:00');
  const metricsLate = AttendanceService.calculateAttendanceMetrics(lateDate, null, shift);
  assert.equal(metricsLate.lateMinutes, 30, 'Should calculate 30 late minutes');

  // Punch out at 18:00 (8.83h worked, 10m late)
  const punchOutDate = new Date('2026-10-31T18:00:00');
  const metricsFull = AttendanceService.calculateAttendanceMetrics(onTimeDate, punchOutDate, shift);
  assert.equal(metricsFull.status, 'Late', 'Status should be Late when arrived past shift start');
  assert.equal(metricsFull.actualWorkingHours, 8.83, 'Working hours should be calculated correctly');

  // Pure on-time punch in at 09:00
  const sharpOnTime = new Date('2026-10-31T09:00:00');
  const metricsSharp = AttendanceService.calculateAttendanceMetrics(sharpOnTime, punchOutDate, shift);
  assert.equal(metricsSharp.status, 'Present', 'Status should be Present when arrived on time');
  assert.equal(metricsSharp.lateMinutes, 0, 'Zero late minutes for on-time arrival');

  // Worked less than 6 hours -> Half Day
  const earlyPunchOut = new Date('2026-10-31T12:00:00');
  const metricsHalfDay = AttendanceService.calculateAttendanceMetrics(onTimeDate, earlyPunchOut, shift);
  assert.equal(metricsHalfDay.status, 'Half Day', 'Status should be Half Day if worked under 6 hours');
});

test('PayrollService: Days in month calculation', () => {
  assert.equal(PayrollService.getDaysInMonth('2026-02'), 28, 'February 2026 has 28 days');
  assert.equal(PayrollService.getDaysInMonth('2026-10'), 31, 'October 2026 has 31 days');
  assert.equal(PayrollService.getDaysInMonth('2026-11'), 30, 'November 2026 has 30 days');
});

test('AttendanceService: Timezone-safe direct working hours calculation (punchOut - punchIn)', () => {
  const shift = {
    startTime: '10:00',
    endTime: '18:00',
    requiredHours: 8,
    gracePeriodMinutes: 10
  };
  const settings = {
    companyTimezone: 'Asia/Kolkata',
    halfDayThresholdHours: 6
  };

  // 10:39 AM IST punch in, 05:52 PM IST punch out
  const punchInUTC = '2026-11-02T05:09:29.294Z';
  const punchOutUTC = '2026-11-02T12:22:21.247Z';

  const metrics = AttendanceService.calculateAttendanceMetrics(punchInUTC, punchOutUTC, shift, settings);
  assert.equal(metrics.actualWorkingHours, 7.21, 'Working hours must be ~7.21 hrs, NOT 2.37 hrs');
  assert.equal(metrics.lateMinutes, 39, 'Punch in at 10:39 AM is 39m late for 10:00 shift');
  assert.equal(metrics.earlyMinutes, 8, 'Punch out at 17:52 PM is 8m early before 18:00');
  assert.equal(metrics.status, 'Late', 'Status should be Late, NOT Half Day');

  // User Specific Case: 9:58 AM IST punch in (04:28 UTC), 7:20 PM IST punch out (13:50 UTC) -> 9:22 hours
  const userPunchIn = '2026-11-02T04:28:00.000Z'; // 09:58 AM IST
  const userPunchOut = '2026-11-02T13:50:00.000Z'; // 19:20 (07:20 PM) IST
  const userMetrics = AttendanceService.calculateAttendanceMetrics(userPunchIn, userPunchOut, shift, settings);
  assert.equal(userMetrics.workingHoursFormatted, '9:22', 'Working hours formatted must be exactly 9:22');
  assert.equal(userMetrics.actualWorkingHours, 9.37, 'Working hours decimal must be 9.37 hrs (562 minutes / 60)');
  assert.equal(userMetrics.lateMinutes, 0, 'Arrival at 09:58 AM is on-time for 10:00 AM shift');
  assert.equal(userMetrics.status, 'Present', 'Status should be Present');
});

