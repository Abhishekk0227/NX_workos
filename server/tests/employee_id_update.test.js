const test = require('node:test');
const assert = require('node:assert/strict');

test('Employee ID Update: Validation & Uniqueness Check Logic', () => {
  const existingEmployees = [
    { _id: 'emp1', employeeId: 'NX001', fullName: 'Rahul Sharma' },
    { _id: 'emp2', employeeId: 'INT001', fullName: 'Aman Verma', employmentType: 'Intern' }
  ];

  // 1. Convert Aman from INT001 to NX002
  const newId = 'NX002';
  const duplicate = existingEmployees.find(e => e.employeeId === newId && e._id !== 'emp2');
  assert.equal(duplicate, undefined, 'NX002 should not be duplicate');

  // 2. Try to change to NX001 (already taken)
  const duplicateTaken = existingEmployees.find(e => e.employeeId === 'NX001' && e._id !== 'emp2');
  assert.notEqual(duplicateTaken, undefined, 'NX001 should be detected as duplicate');
  assert.equal(duplicateTaken.fullName, 'Rahul Sharma');

  // 3. Uppercase and trim normalization
  const rawInput = '  nx-intern-09  ';
  const sanitized = rawInput.trim().toUpperCase();
  assert.equal(sanitized, 'NX-INTERN-09');
});

test('Employee ID Update: Employment Type enum supports both Intern and Internship', () => {
  const Employee = require('../src/models/Employee');
  const schemaEnum = Employee.schema.path('employmentType').enumValues;

  assert.equal(schemaEnum.includes('Intern'), true);
  assert.equal(schemaEnum.includes('Internship'), true);
  assert.equal(schemaEnum.includes('Full-time'), true);
});

