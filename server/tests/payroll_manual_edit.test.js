const test = require('node:test');
const assert = require('node:assert/strict');
const PayrollService = require('../src/services/payrollService');
const PayrollRecord = require('../src/models/PayrollRecord');

test('Manual Payroll Edit: auto-calculates totalDeductions, breakdown, bonus, and netPayable', () => {
  const base = {
    status: 'Review',
    grossSalary: 40000,
    presentDays: 20,
    halfDays: 1,
    paidLeaveDays: 1,
    weeklyOffDays: 4,
    holidayDays: 0,
    lwpDays: 1,
    payableDays: 25.5,
    lateDeduction: 250,
    halfDayDeduction: 750,
    shortAttendanceDeduction: 0,
    lwpDeduction: 1500,
    shortfallDeduction: 0,
    otherDeductions: 0
  };

  const result = PayrollService.buildManualPayrollUpdate(base, {
    grossSalary: 42000,
    bonusAmount: 3000,
    lateDeduction: 0,
    halfDayDeduction: 500,
    shortAttendanceDeduction: 400,
    lwpDeduction: 1500,
    otherDeductions: 600,
    payableDays: 26,
    overrideNetPayable: false,
    reason: 'Performance bonus & advance recovery adjustment',
    notes: 'Approved by HR Director'
  });

  assert.equal(result.grossSalary, 42000);
  assert.equal(result.bonusAmount, 3000);
  assert.equal(result.totalDeductions, 3000);
  assert.equal(result.netPayable, 42000); // 42000 + 3000 - 3000
  assert.equal(result.isNetPayableOverridden, false);
  assert.equal(result.manualEditReason, 'Performance bonus & advance recovery adjustment');
  assert.equal(result.notes, 'Approved by HR Director');
  assert.equal(result.deductionBreakdown.length, 4);
  assert.ok(result.deductionBreakdown.some((d) => d.type === 'Other_Manual' && d.amount === 600));
});

test('Manual Payroll Edit: supports direct netPayable override and zero-deduction cleanup', () => {
  const base = {
    status: 'Draft',
    grossSalary: 30000,
    lateDeduction: 500,
    halfDayDeduction: 0,
    shortAttendanceDeduction: 0,
    lwpDeduction: 0,
    shortfallDeduction: 0,
    otherDeductions: 0
  };

  const result = PayrollService.buildManualPayrollUpdate(base, {
    lateDeduction: 0,
    overrideNetPayable: true,
    netPayable: 31250.5,
    reason: 'Custom settlement payout'
  });

  assert.equal(result.totalDeductions, 0);
  assert.deepEqual(result.deductionBreakdown, []);
  assert.equal(result.isNetPayableOverridden, true);
  assert.equal(result.netPayable, 31250.5);
});

test('Manual Payroll Edit: rejects Finalized records, missing reasons, and negative values', () => {
  assert.throws(
    () =>
      PayrollService.buildManualPayrollUpdate(
        { status: 'Finalized', grossSalary: 30000 },
        { grossSalary: 35000, reason: 'Try modify locked' }
      ),
    /Finalized payroll records are locked/
  );

  assert.throws(
    () =>
      PayrollService.buildManualPayrollUpdate(
        { status: 'Review', grossSalary: 30000 },
        { grossSalary: 35000, reason: '   ' }
      ),
    /audit reason is required/i
  );

  assert.throws(
    () =>
      PayrollService.buildManualPayrollUpdate(
        { status: 'Review', grossSalary: 30000 },
        { otherDeductions: -200, reason: 'Negative check' }
      ),
    /non-negative number/i
  );
});

test('Manual Payroll Edit: mergeSavedRecordIntoPreview preserves HR manual edits across recalculation', () => {
  const freshPreview = {
    employee: 'emp1',
    grossSalary: 25000,
    bonusAmount: 0,
    presentDays: 20,
    halfDays: 0,
    paidLeaveDays: 1,
    weeklyOffDays: 4,
    holidayDays: 0,
    lwpDays: 0,
    payableDays: 25,
    lateDeduction: 300,
    halfDayDeduction: 0,
    shortAttendanceDeduction: 0,
    lwpDeduction: 0,
    shortfallDeduction: 0,
    otherDeductions: 0,
    totalDeductions: 300,
    deductionBreakdown: [{ type: 'Late_Arrival', description: 'Late', amount: 300 }],
    netPayable: 24700
  };

  // Case 1: Manually edited Review record with deductions waived (empty breakdown)
  const manualSaved = {
    _id: 'rec123',
    status: 'Review',
    isManuallyEdited: true,
    manualEditReason: 'Waived late deduction + added bonus',
    grossSalary: 25000,
    bonusAmount: 2000,
    presentDays: 20,
    halfDays: 0,
    paidLeaveDays: 1,
    weeklyOffDays: 4,
    holidayDays: 0,
    lwpDays: 0,
    payableDays: 25,
    lateDeduction: 0,
    halfDayDeduction: 0,
    shortAttendanceDeduction: 0,
    lwpDeduction: 0,
    shortfallDeduction: 0,
    otherDeductions: 0,
    totalDeductions: 0,
    deductionBreakdown: [],
    netPayable: 27000,
    isNetPayableOverridden: false,
    notes: 'Festival bonus'
  };

  const mergedManual = PayrollService.mergeSavedRecordIntoPreview(freshPreview, manualSaved);
  assert.equal(mergedManual.savedStatus, 'Review');
  assert.equal(mergedManual.isManuallyEdited, true);
  assert.equal(mergedManual.bonusAmount, 2000);
  assert.equal(mergedManual.totalDeductions, 0);
  assert.deepEqual(mergedManual.deductionBreakdown, []);
  assert.equal(mergedManual.netPayable, 27000);
  assert.equal(mergedManual.manualEditReason, 'Waived late deduction + added bonus');

  // Case 2: Non-manually-edited Review record uses fresh dynamic preview
  const autoSaved = { _id: 'rec124', status: 'Review', isManuallyEdited: false };
  const mergedAuto = PayrollService.mergeSavedRecordIntoPreview(freshPreview, autoSaved);
  assert.equal(mergedAuto.savedStatus, 'Review');
  assert.equal(mergedAuto.netPayable, 24700);
  assert.equal(mergedAuto.deductionBreakdown.length, 1);
});

test('PayrollRecord schema exposes manual payroll edit audit fields', () => {
  const paths = PayrollRecord.schema.paths;
  for (const field of [
    'bonusAmount',
    'holidayDays',
    'totalDeductions',
    'isNetPayableOverridden',
    'isManuallyEdited',
    'manualEditReason',
    'lastEditedBy',
    'lastEditedAt',
    'notes'
  ]) {
    assert.ok(paths[field], `Expected PayrollRecord schema to define '${field}'`);
  }
});

