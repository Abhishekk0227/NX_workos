const test = require('node:test');
const assert = require('node:assert/strict');
const AttendanceService = require('../src/services/attendanceService');
const PayrollService = require('../src/services/payrollService');

test('AttendanceService: Pure hours-based thresholds and late arrival calculation', () => {
  const settings = {
    companyTimezone: 'Asia/Kolkata',
    workStartTime: '09:00',
    workEndTime: '18:00',
    fullDayThresholdHours: 8,
    halfDayThresholdHours: 4
  };

  // Punch in at 09:10 IST (10 mins after work start 09:00)
  const onTimeDate = AttendanceService.getTimestampForTimeInTimezone('2026-10-31', '09:10', 'Asia/Kolkata');
  const metricsOnTime = AttendanceService.calculateAttendanceMetrics(onTimeDate, null, settings);
  assert.equal(metricsOnTime.lateMinutes, 10, 'Should record 10 late minutes from work start time');
  assert.equal(metricsOnTime.status, 'Working', 'Status should be Working');

  // Punch in at 09:30 IST (30m past work start)
  const lateDate = AttendanceService.getTimestampForTimeInTimezone('2026-10-31', '09:30', 'Asia/Kolkata');
  const metricsLate = AttendanceService.calculateAttendanceMetrics(lateDate, null, settings);
  assert.equal(metricsLate.lateMinutes, 30, 'Should calculate 30 late minutes');

  // Punch out at 18:00 IST (8.83h worked >= 8h threshold -> Full Day)
  const punchOutDate = AttendanceService.getTimestampForTimeInTimezone('2026-10-31', '18:00', 'Asia/Kolkata');
  const metricsFull = AttendanceService.calculateAttendanceMetrics(onTimeDate, punchOutDate, settings);
  assert.equal(metricsFull.status, 'Full Day', 'Status should be Full Day for >= 8 hours worked');
  assert.equal(metricsFull.actualWorkingHours, 8.83, 'Working hours should be calculated correctly');

  // Sharp on-time arrival at 09:00 IST, out at 18:00 IST -> 9 hours, 0 late minutes
  const sharpOnTime = AttendanceService.getTimestampForTimeInTimezone('2026-10-31', '09:00', 'Asia/Kolkata');
  const metricsSharp = AttendanceService.calculateAttendanceMetrics(sharpOnTime, punchOutDate, settings);
  assert.equal(metricsSharp.status, 'Full Day', 'Status should be Full Day for 9 hours worked');
  assert.equal(metricsSharp.lateMinutes, 0, 'Zero late minutes for on-time arrival');

  // Worked 5 hours (>= 4h and < 8h) -> Half Day
  const halfPunchOut = AttendanceService.getTimestampForTimeInTimezone('2026-10-31', '14:10', 'Asia/Kolkata');
  const metricsHalfDay = AttendanceService.calculateAttendanceMetrics(onTimeDate, halfPunchOut, settings);
  assert.equal(metricsHalfDay.status, 'Half Day', 'Status should be Half Day for 5 hours worked');

  // Worked less than 4 hours -> Short Attendance
  const shortPunchOut = AttendanceService.getTimestampForTimeInTimezone('2026-10-31', '12:00', 'Asia/Kolkata');
  const metricsShort = AttendanceService.calculateAttendanceMetrics(onTimeDate, shortPunchOut, settings);
  assert.equal(metricsShort.status, 'Short Attendance', 'Status should be Short Attendance for < 4 hours');
  assert.equal(metricsShort.isShortAttendance, true, 'Short Attendance flag should be true');
});

test('PayrollService: Days in month and All Days - Sundays calculation', () => {
  assert.equal(PayrollService.getDaysInMonth('2026-02'), 28, 'February 2026 has 28 days');
  assert.equal(PayrollService.getDaysInMonth('2026-10'), 31, 'October 2026 has 31 days');
  assert.equal(PayrollService.getDaysInMonth('2026-11'), 30, 'November 2026 has 30 days');

  // November 2026 has 5 Sundays (Nov 1, 8, 15, 22, 29) -> 30 - 5 = 25 working days
  const sundaysNov = PayrollService.getSundaysInRange('2026-11', 1, 30);
  assert.equal(sundaysNov, 5, 'November 2026 has exactly 5 Sundays');
  const workingDaysNov = PayrollService.getWorkingDaysInMonth('2026-11');
  assert.equal(workingDaysNov, 25, 'November 2026 has 25 working days (All days - Sundays)');

  // Policy formula validation
  const monthlyGross = 3000;
  const perDayRate = parseFloat((monthlyGross / workingDaysNov).toFixed(2));
  assert.equal(perDayRate, 120, 'Per day rate must be 3000 / 25 = ₹120.00');

  const shiftMinutes = 8 * 60; // 480 mins for 10-6
  const perMinuteRate = parseFloat((perDayRate / shiftMinutes).toFixed(4));
  assert.equal(perMinuteRate, 0.25, 'Per minute rate must be 120 / 480 = ₹0.25/min');

  // 8 minutes late deduction
  const lateMinutes = 8;
  const lateDeduction = parseFloat((lateMinutes * perMinuteRate).toFixed(2));
  assert.equal(lateDeduction, 2.00, '8m late should deduct exactly ₹2.00');

  // Half day deduction (< 6 hrs worked = 50% day salary)
  const halfDayDeduction = parseFloat((0.5 * perDayRate).toFixed(2));
  assert.equal(halfDayDeduction, 60.00, 'Half day deduction must be ₹60.00');
});

test('AttendanceService: Timezone-safe direct working hours calculation (punchOut - punchIn)', () => {
  const settings = {
    companyTimezone: 'Asia/Kolkata',
    workStartTime: '10:00',
    workEndTime: '18:00',
    fullDayThresholdHours: 8,
    halfDayThresholdHours: 4
  };

  // 10:39 AM IST punch in, 05:52 PM IST punch out (7.21 hrs -> between 4h and 8h = Half Day)
  const punchInUTC = '2026-11-02T05:09:29.294Z';
  const punchOutUTC = '2026-11-02T12:22:21.247Z';

  const metrics = AttendanceService.calculateAttendanceMetrics(punchInUTC, punchOutUTC, settings);
  assert.equal(metrics.actualWorkingHours, 7.21, 'Working hours must be ~7.21 hrs');
  assert.equal(metrics.lateMinutes, 39, 'Punch in at 10:39 AM is 39m after 10:00 work start');
  assert.equal(metrics.earlyMinutes, 8, 'Punch out at 17:52 PM is 8m before 18:00');
  assert.equal(metrics.status, 'Half Day', 'Status should be Half Day for 7.21 hours (< 8h full-day threshold)');

  // User Specific Case: 9:58 AM IST punch in (04:28 UTC), 7:20 PM IST punch out (13:50 UTC) -> 9:22 hours -> Full Day
  const userPunchIn = '2026-11-02T04:28:00.000Z'; // 09:58 AM IST
  const userPunchOut = '2026-11-02T13:50:00.000Z'; // 19:20 (07:20 PM) IST
  const userMetrics = AttendanceService.calculateAttendanceMetrics(userPunchIn, userPunchOut, settings);
  assert.equal(userMetrics.workingHoursFormatted, '9:22', 'Working hours formatted must be exactly 9:22');
  assert.equal(userMetrics.actualWorkingHours, 9.37, 'Working hours decimal must be 9.37 hrs (562 minutes / 60)');
  assert.equal(userMetrics.lateMinutes, 0, 'Arrival at 09:58 AM has 0 late minutes');
  assert.equal(userMetrics.status, 'Full Day', 'Status should be Full Day for 9.37 hours');
});

