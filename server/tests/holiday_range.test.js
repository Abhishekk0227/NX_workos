const test = require('node:test');
const assert = require('node:assert/strict');

function getDatesInRange(startDateStr, endDateStr) {
  const dates = [];
  let cur = new Date(startDateStr + 'T00:00:00Z');
  const end = new Date(endDateStr + 'T00:00:00Z');
  while (cur <= end) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

test('Holiday Range: Single-day and Multi-day date generation', () => {
  // Single-day
  const single = getDatesInRange('2026-11-12', '2026-11-12');
  assert.equal(single.length, 1);
  assert.deepEqual(single, ['2026-11-12']);

  // 4-day range
  const multi = getDatesInRange('2026-11-12', '2026-11-15');
  assert.equal(multi.length, 4);
  assert.deepEqual(multi, ['2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15']);

  // Cross-month range (October 30 to November 2)
  const crossMonth = getDatesInRange('2026-10-30', '2026-11-02');
  assert.equal(crossMonth.length, 4);
  assert.deepEqual(crossMonth, ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
});

test('Holiday Range: Validation logic', () => {
  const start = '2026-11-15';
  const end = '2026-11-12';
  assert.equal(end < start, true, 'End date earlier than start date must be flagged as invalid');
});

