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

  // Punch in at 09:10 (within grace period of 15m)
  const onTimeDate = new Date('2026-10-31T09:10:00');
  const metricsOnTime = AttendanceService.calculateAttendanceMetrics(onTimeDate, null, shift);
  assert.equal(metricsOnTime.lateMinutes, 0, 'Should not be late within grace period');
  assert.equal(metricsOnTime.status, 'Working', 'Status should be Working');

  // Punch in at 09:30 (15m past grace period, 30m past shift start)
  const lateDate = new Date('2026-10-31T09:30:00');
  const metricsLate = AttendanceService.calculateAttendanceMetrics(lateDate, null, shift);
  assert.equal(metricsLate.lateMinutes, 30, 'Should calculate 30 late minutes');

  // Punch out at 18:00 (8.5h worked)
  const punchOutDate = new Date('2026-10-31T18:00:00');
  const metricsFull = AttendanceService.calculateAttendanceMetrics(onTimeDate, punchOutDate, shift);
  assert.equal(metricsFull.status, 'Present', 'Status should be Present');
  assert.equal(metricsFull.actualWorkingHours, 8.83, 'Working hours should be calculated correctly');

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
