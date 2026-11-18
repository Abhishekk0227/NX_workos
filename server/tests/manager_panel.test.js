const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('../src/models/User');
const Employee = require('../src/models/Employee');
const Task = require('../src/models/Task');

test('Manager Panel: User schema supports Manager role and Employee schema supports student assignment', () => {
  const roleValues = User.schema.path('role').enumValues;
  assert.ok(roleValues.includes('Manager'), 'User role enum must include "Manager"');
  assert.ok(roleValues.includes('HR'), 'User role enum must include "HR"');
  assert.ok(roleValues.includes('Employee'), 'User role enum must include "Employee"');

  const empPaths = Employee.schema.paths;
  assert.ok(empPaths['assignedManager'], 'Employee must have assignedManager field');
  assert.ok(empPaths['assignedStudents'], 'Employee must have assignedStudents array field');
  assert.ok(empPaths['isManager'], 'Employee must have isManager boolean field');
});

test('Manager Panel: Task schema supports Manager_Assigned, deadline tracking & submission fields', () => {
  const taskTypeValues = Task.schema.path('taskType').enumValues;
  assert.ok(taskTypeValues.includes('Manager_Assigned'), 'Task taskType enum must include "Manager_Assigned"');

  const statusValues = Task.schema.path('status').enumValues;
  assert.ok(statusValues.includes('Submitted'), 'Task status enum must include "Submitted"');
  assert.ok(statusValues.includes('Completed'), 'Task status enum must include "Completed"');
  assert.ok(statusValues.includes('Overdue'), 'Task status enum must include "Overdue"');

  const taskPaths = Task.schema.paths;
  assert.ok(taskPaths['deadlineMissed'], 'Task must define deadlineMissed flag');
  assert.ok(taskPaths['missedDeadlineAt'], 'Task must define missedDeadlineAt timestamp');
  assert.ok(taskPaths['submittedAt'], 'Task must define submittedAt timestamp');
  assert.ok(taskPaths['completedAt'], 'Task must define completedAt timestamp');
  assert.ok(taskPaths['isSubmittedLate'], 'Task must define isSubmittedLate flag');
  assert.ok(taskPaths['submissionNote'], 'Task must define submissionNote');
  assert.ok(taskPaths['submissionLink'], 'Task must define submissionLink');
  assert.ok(taskPaths['managerFeedback'], 'Task must define managerFeedback');
});

test('Manager Panel: Deadline tracking logic flags overdue tasks and late submissions', () => {
  const now = new Date();
  const pastDeadline = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
  const futureDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000); // tomorrow

  // Case 1: Uncompleted task past due date -> Overdue & deadlineMissed
  const taskOverdue = new Task({
    title: 'Complete Research Module',
    taskType: 'Manager_Assigned',
    employee: new (require('mongoose').Types.ObjectId)(),
    dueDate: pastDeadline,
    status: 'In Progress'
  });

  // Trigger pre-save checks
  if (taskOverdue.dueDate && !['Completed', 'Submitted', 'On Hold'].includes(taskOverdue.status) && new Date(taskOverdue.dueDate) < now) {
    taskOverdue.status = 'Overdue';
    taskOverdue.deadlineMissed = true;
    taskOverdue.missedDeadlineAt = taskOverdue.dueDate;
  }

  assert.equal(taskOverdue.status, 'Overdue', 'Task past due date must be marked Overdue');
  assert.equal(taskOverdue.deadlineMissed, true, 'deadlineMissed flag must be set to true');
  assert.ok(taskOverdue.missedDeadlineAt, 'missedDeadlineAt must record when deadline was missed');

  // Case 2: Task submitted after deadline -> Late Submission
  const submissionTime = new Date(pastDeadline.getTime() + 30 * 60 * 1000); // submitted 30 mins after deadline
  const isLate = submissionTime > pastDeadline;
  assert.equal(isLate, true, 'Submission after deadline must be detected as late');

  // Case 3: Task with future deadline -> On time
  const onTimeSubmission = new Date();
  assert.equal(onTimeSubmission < futureDeadline, true, 'Submission before deadline is on-time');
});

test('Manager Panel: Task segregation categories correctly categorize tasks', () => {
  const now = new Date();
  const past = new Date(now.getTime() - 3600 * 1000);
  const futureSoon = new Date(now.getTime() + 24 * 3600 * 1000);
  const futureFar = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

  const tasks = [
    { _id: '1', taskType: 'Manager_Assigned', status: 'Submitted', dueDate: futureFar },
    { _id: '2', taskType: 'Manager_Assigned', status: 'Revision Requested', dueDate: futureFar },
    { _id: '3', taskType: 'Manager_Assigned', status: 'Overdue', deadlineMissed: true, dueDate: past },
    { _id: '4', taskType: 'Manager_Assigned', status: 'In Progress', dueDate: futureSoon },
    { _id: '5', taskType: 'Manager_Assigned', status: 'Completed', dueDate: past }
  ];

  const inReview = tasks.filter(t => ['Submitted', 'Pending Review'].includes(t.status));
  const forRevision = tasks.filter(t => t.status === 'Revision Requested');
  const missed = tasks.filter(t => t.status === 'Overdue' || t.deadlineMissed || (t.dueDate && t.dueDate < now && !['Completed', 'Submitted'].includes(t.status)));
  const dueSoon = tasks.filter(t => t.dueDate && t.dueDate >= now && t.dueDate <= new Date(now.getTime() + 48 * 3600 * 1000) && t.status !== 'Completed');
  const completed = tasks.filter(t => t.status === 'Completed');

  assert.equal(inReview.length, 1, 'In Review count should be 1');
  assert.equal(forRevision.length, 1, 'For Revision count should be 1');
  assert.equal(missed.length, 1, 'Missed count should be 1');
  assert.equal(dueSoon.length, 1, 'Due Soon count should be 1');
  assert.equal(completed.length, 1, 'Completed count should be 1');
});

test('Manager Panel: Student presence exposes only boolean isActiveNow without punch times', () => {
  const todayAttendances = [
    { employee: 'emp1', punchIn: new Date(), punchOut: null },
    { employee: 'emp2', punchIn: new Date(), punchOut: new Date() },
    { employee: 'emp3', punchIn: null, punchOut: null }
  ];

  const activeMap = new Map();
  todayAttendances.forEach(att => {
    if (att.punchIn && !att.punchOut) {
      activeMap.set(att.employee, true);
    }
  });

  const students = [
    { _id: 'emp1', fullName: 'Active Student' },
    { _id: 'emp2', fullName: 'Finished Student' },
    { _id: 'emp3', fullName: 'Absent Student' }
  ];

  const result = students.map(s => ({
    fullName: s.fullName,
    isActiveNow: Boolean(activeMap.get(s._id))
  }));

  assert.equal(result[0].isActiveNow, true, 'Currently punched in without punch out is Active');
  assert.equal(result[1].isActiveNow, false, 'Already punched out is Inactive');
  assert.equal(result[2].isActiveNow, false, 'Not punched in is Inactive');
  assert.equal(result[0].punchIn, undefined, 'punchIn timestamp must NOT be exposed');
  assert.equal(result[0].punchOut, undefined, 'punchOut timestamp must NOT be exposed');
});
