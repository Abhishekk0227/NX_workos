const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Task = require('../models/Task');
const Employee = require('../models/Employee');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const AuditLog = require('../models/AuditLog');
const NotificationService = require('../services/notificationService');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

/**
 * Middleware: Allow Manager or HR
 */
const requireManagerOrHR = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  const isMgr =
    req.user.role === 'Manager' ||
    req.user.role === 'HR' ||
    Boolean(req.user.employee?.isManager);
  if (!isMgr) {
    return res.status(403).json({
      success: false,
      message: 'Access restricted to Managers and HR administrators'
    });
  }
  next();
};

/**
 * Helper to get student employee IDs assigned to this manager
 */
async function getAssignedStudentIds(user) {
  if (user.role === 'HR') {
    // HR can access all active students/interns/employees
    const all = await Employee.find({ employmentStatus: 'Active' }).select('_id');
    return all.map(e => e._id);
  }

  // If user has an associated employee profile
  const empId = user.employee?._id || user.employee;
  if (empId) {
    const managerEmp = await Employee.findById(empId);
    if (!managerEmp) return [];

    // Find students where assignedManager matches this manager, or student is in assignedStudents
    const students = await Employee.find({
      $or: [
        { assignedManager: managerEmp._id },
        { _id: { $in: managerEmp.assignedStudents || [] } }
      ],
      employmentStatus: 'Active'
    }).select('_id');

    return students.map(s => s._id);
  }

  return [];
}

/**
 * GET /api/manager/dashboard
 * Summary stats for the manager (Manager_Assigned tasks only, student active/inactive status without punch times)
 */
router.get('/dashboard', protect, requireManagerOrHR, async (req, res, next) => {
  try {
    const studentIds = await getAssignedStudentIds(req.user);
    const now = new Date();

    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);

    const [students, tasks, todayAttendances] = await Promise.all([
      Employee.find({ _id: { $in: studentIds } }).select(
        'employeeId fullName department designation officialEmail mobileNumber'
      ),
      Task.find({ employee: { $in: studentIds }, taskType: 'Manager_Assigned' })
        .populate('employee', 'employeeId fullName department designation')
        .populate('assignedBy', 'name email')
        .sort({ dueDate: 1, createdAt: -1 }),
      Attendance.find({ employee: { $in: studentIds }, date: todayStr }).select('employee punchIn punchOut')
    ]);

    // Active status map: true if currently punched in and not yet punched out (no punch times exposed)
    const activeStudentMap = new Map();
    todayAttendances.forEach(att => {
      if (att.punchIn && !att.punchOut) {
        activeStudentMap.set(att.employee.toString(), true);
      }
    });

    const activeTasks = tasks.filter(t => ['New', 'In Progress'].includes(t.status));
    const submittedTasks = tasks.filter(t => ['Submitted', 'Pending Review'].includes(t.status));
    const revisionTasks = tasks.filter(
      t => t.status === 'Revision Requested' || (t.status === 'In Progress' && t.managerFeedback)
    );
    const completedTasks = tasks.filter(t => t.status === 'Completed');

    // Missed deadlines: overdue or marked missed or submitted late
    const missedDeadlineTasks = tasks.filter(
      t =>
        t.status === 'Overdue' ||
        t.deadlineMissed ||
        (t.dueDate && new Date(t.dueDate) < now && !['Completed', 'Submitted'].includes(t.status)) ||
        t.isSubmittedLate
    );

    // Upcoming deadlines within next 48 hours
    const upcomingDeadlines = tasks
      .filter(t => t.dueDate && new Date(t.dueDate) >= now && !['Completed'].includes(t.status))
      .slice(0, 10);

    // Recent submissions awaiting manager review
    const recentSubmissions = submittedTasks.slice(0, 10);

    // Per-student task breakdown with active status (strictly boolean, no punch times)
    const studentStats = students.map(student => {
      const studentTasks = tasks.filter(t => t.employee?._id?.toString() === student._id.toString());
      const studentCompleted = studentTasks.filter(t => t.status === 'Completed');
      const studentMissed = studentTasks.filter(
        t => t.deadlineMissed || t.status === 'Overdue' || t.isSubmittedLate
      );
      const studentActive = studentTasks.filter(t => ['New', 'In Progress', 'Submitted'].includes(t.status));
      const onTimeRate =
        studentTasks.length > 0
          ? Math.round(((studentTasks.length - studentMissed.length) / studentTasks.length) * 100)
          : 100;

      return {
        _id: student._id,
        employeeId: student.employeeId,
        fullName: student.fullName,
        department: student.department,
        designation: student.designation,
        isActiveNow: Boolean(activeStudentMap.get(student._id.toString())),
        totalTasks: studentTasks.length,
        activeTasks: studentActive.length,
        completedTasks: studentCompleted.length,
        missedDeadlines: studentMissed.length,
        onTimeRate
      };
    });

    res.json({
      success: true,
      metrics: {
        totalStudents: students.length,
        activeStudentsToday: students.filter(s => activeStudentMap.get(s._id.toString())).length,
        totalTasks: tasks.length,
        activeTasks: activeTasks.length,
        submittedTasks: submittedTasks.length,
        revisionTasks: revisionTasks.length,
        completedTasks: completedTasks.length,
        missedDeadlines: missedDeadlineTasks.length,
        onTimeRate:
          tasks.length > 0 ? Math.round(((tasks.length - missedDeadlineTasks.length) / tasks.length) * 100) : 100
      },
      upcomingDeadlines,
      recentSubmissions,
      missedDeadlineTasks: missedDeadlineTasks.slice(0, 10),
      studentStats
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/manager/students
 * List all students assigned to this manager (with active/inactive presence, no punch times)
 */
router.get('/students', protect, requireManagerOrHR, async (req, res, next) => {
  try {
    const studentIds = await getAssignedStudentIds(req.user);
    const now = new Date();
    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);

    const [students, tasks, todayAttendances] = await Promise.all([
      Employee.find({ _id: { $in: studentIds } })
        .populate('assignedManager', 'employeeId fullName officialEmail')
        .sort({ fullName: 1 }),
      Task.find({ employee: { $in: studentIds }, taskType: 'Manager_Assigned' }).select(
        'employee status deadlineMissed dueDate isSubmittedLate'
      ),
      Attendance.find({ employee: { $in: studentIds }, date: todayStr }).select('employee punchIn punchOut')
    ]);

    const activeMap = new Map();
    todayAttendances.forEach(att => {
      if (att.punchIn && !att.punchOut) {
        activeMap.set(att.employee.toString(), true);
      }
    });

    const studentsWithMetrics = students.map(s => {
      const sTasks = tasks.filter(t => t.employee?.toString() === s._id.toString());
      const completed = sTasks.filter(t => t.status === 'Completed').length;
      const active = sTasks.filter(t => ['New', 'In Progress', 'Submitted'].includes(t.status)).length;
      const missed = sTasks.filter(
        t =>
          t.deadlineMissed ||
          t.status === 'Overdue' ||
          (t.dueDate && new Date(t.dueDate) < now && t.status !== 'Completed') ||
          t.isSubmittedLate
      ).length;
      const rate = sTasks.length > 0 ? Math.round(((sTasks.length - missed) / sTasks.length) * 100) : 100;

      return {
        ...s.toObject(),
        isActiveNow: Boolean(activeMap.get(s._id.toString())),
        totalTasks: sTasks.length,
        activeTasks: active,
        completedTasks: completed,
        missedDeadlines: missed,
        onTimeRate: rate
      };
    });

    res.json({
      success: true,
      count: studentsWithMetrics.length,
      students: studentsWithMetrics
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/manager/tasks
 * Filter tasks assigned by manager with segregated categories (All, In Review, For Revision, Due Soon, Missed, Completed)
 */
router.get('/tasks', protect, requireManagerOrHR, async (req, res, next) => {
  try {
    const studentIds = await getAssignedStudentIds(req.user);
    const { studentId, segregationFilter = 'all', priority, search } = req.query;
    const now = new Date();

    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);

    // Fetch active attendance map for students
    const todayAttendances = await Attendance.find({
      employee: { $in: studentIds },
      date: todayStr
    }).select('employee punchIn punchOut');

    const activeStudentMap = new Map();
    todayAttendances.forEach(a => {
      if (a.punchIn && !a.punchOut) {
        activeStudentMap.set(a.employee.toString(), true);
      }
    });

    // Base query: ONLY Manager_Assigned tasks for assigned students (no personal tasks)
    const baseFilter = {
      employee: { $in: studentIds },
      taskType: 'Manager_Assigned'
    };

    if (studentId && studentId !== 'All') {
      baseFilter.employee = studentId;
    }
    if (priority && priority !== 'All') {
      baseFilter.priority = priority;
    }
    if (search && search.trim()) {
      baseFilter.title = { $regex: search.trim(), $options: 'i' };
    }

    // Fetch all matching tasks to calculate accurate segregation counts
    const allMatchingTasks = await Task.find(baseFilter)
      .populate('employee', 'employeeId fullName department designation officialEmail')
      .populate('assignedBy', 'name email')
      .populate('auditHistory.performedBy', 'name email')
      .sort({ dueDate: 1, createdAt: -1 });

    // Segregate tasks into clean buckets
    const inReviewTasks = allMatchingTasks.filter(t => ['Submitted', 'Pending Review'].includes(t.status));
    const forRevisionTasks = allMatchingTasks.filter(
      t => t.status === 'Revision Requested' || (t.status === 'In Progress' && t.managerFeedback)
    );
    const missedTasks = allMatchingTasks.filter(
      t =>
        t.status === 'Overdue' ||
        t.deadlineMissed ||
        (t.dueDate && new Date(t.dueDate) < now && !['Completed', 'Submitted'].includes(t.status)) ||
        t.isSubmittedLate
    );
    const dueSoonTasks = allMatchingTasks.filter(
      t =>
        t.dueDate &&
        new Date(t.dueDate) >= now &&
        new Date(t.dueDate) <= new Date(now.getTime() + 48 * 3600 * 1000) &&
        t.status !== 'Completed'
    );
    const completedTasks = allMatchingTasks.filter(t => t.status === 'Completed');

    const counts = {
      all: allMatchingTasks.length,
      inReview: inReviewTasks.length,
      forRevision: forRevisionTasks.length,
      dueSoon: dueSoonTasks.length,
      missed: missedTasks.length,
      completed: completedTasks.length
    };

    // Apply segregation filter
    let filteredTasks = allMatchingTasks;
    if (segregationFilter === 'in_review') {
      filteredTasks = inReviewTasks;
    } else if (segregationFilter === 'for_revision') {
      filteredTasks = forRevisionTasks;
    } else if (segregationFilter === 'due_soon') {
      filteredTasks = dueSoonTasks;
    } else if (segregationFilter === 'missed') {
      filteredTasks = missedTasks;
    } else if (segregationFilter === 'completed') {
      filteredTasks = completedTasks;
    }

    // Attach student active status (boolean only, no punch times)
    const tasksWithStudentStatus = filteredTasks.map(t => {
      const obj = t.toObject();
      if (obj.employee) {
        obj.employee.isActiveNow = Boolean(activeStudentMap.get(obj.employee._id?.toString()));
      }
      return obj;
    });

    res.json({
      success: true,
      counts,
      tasks: tasksWithStudentStatus
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/manager/tasks
 * Create / assign a task to an assigned student with a deadline
 */
router.post('/tasks', protect, requireManagerOrHR, async (req, res, next) => {
  try {
    const {
      title,
      description,
      employeeId,
      dueDate,
      startDate,
      priority = 'Medium',
      category = 'General',
      subtasks = []
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Task title is required' });
    }
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Please select an assigned student' });
    }
    if (!dueDate) {
      return res.status(400).json({ success: false, message: 'Task deadline / due date is required' });
    }

    const studentIds = await getAssignedStudentIds(req.user);
    const isAssigned = studentIds.some(id => id.toString() === employeeId.toString());
    if (!isAssigned && req.user.role !== 'HR') {
      return res.status(403).json({
        success: false,
        message: 'You can only assign tasks to students assigned to you'
      });
    }

    const student = await Employee.findById(employeeId).populate('user');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student employee not found' });
    }

    const parsedSubtasks = Array.isArray(subtasks)
      ? subtasks.map(s => (typeof s === 'string' ? { title: s.trim(), isCompleted: false } : s)).filter(s => s.title)
      : [];

    const now = new Date();
    const task = await Task.create({
      title: title.trim(),
      description: (description || '').trim(),
      taskType: 'Manager_Assigned',
      employee: employeeId,
      assignedBy: req.user._id,
      category,
      priority,
      startDate: startDate || now,
      dueDate: new Date(dueDate),
      subtasks: parsedSubtasks,
      status: 'New',
      auditHistory: [
        {
          action: 'ASSIGNED',
          performedBy: req.user._id,
          performedAt: now,
          details: {
            assignedTo: student.fullName,
            dueDate: new Date(dueDate),
            priority,
            category
          }
        }
      ]
    });

    await task.populate('employee', 'employeeId fullName department designation');
    await task.populate('assignedBy', 'name email');

    // Notify student
    if (student.user) {
      try {
        const formattedDue = new Date(dueDate).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        });
        await NotificationService.send({
          recipient: student.user._id || student.user,
          title: `New Task Assigned: ${task.title}`,
          message: `Your Manager assigned you: "${task.title}". Deadline: ${formattedDue}. Priority: ${task.priority}.`,
          type: 'Task',
          link: '/employee/tasks'
        });
      } catch (notifErr) {
        console.warn('Student task notification error:', notifErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: `Task successfully assigned to ${student.fullName}`,
      task
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/manager/tasks/:id
 * Edit task or extend deadline
 */
router.put('/tasks/:id', protect, requireManagerOrHR, async (req, res, next) => {
  try {
    const { title, description, priority, category, dueDate, subtasks, extensionReason } = req.body;
    const task = await Task.findById(req.params.id).populate('employee');
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const previousDueDate = task.dueDate;
    if (title) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (priority) task.priority = priority;
    if (category) task.category = category;

    if (Array.isArray(subtasks)) {
      task.subtasks = subtasks
        .map(s => (typeof s === 'string' ? { title: s.trim(), isCompleted: false } : s))
        .filter(s => s.title);
    }

    // Handle Deadline Extension / Change
    let deadlineChanged = false;
    if (dueDate && new Date(dueDate).getTime() !== new Date(previousDueDate).getTime()) {
      deadlineChanged = true;
      const newDue = new Date(dueDate);
      task.dueDate = newDue;

      // If extended into the future and task was overdue, restore to In Progress
      if (newDue > new Date() && task.status === 'Overdue') {
        task.status = 'In Progress';
      }

      task.auditHistory.push({
        action: 'DEADLINE_EXTENDED',
        performedBy: req.user._id,
        performedAt: new Date(),
        details: {
          previousDueDate,
          newDueDate: newDue,
          reason: extensionReason || 'Deadline adjusted by Manager'
        }
      });
    }

    await task.save();
    await task.populate('employee', 'employeeId fullName department designation');
    await task.populate('assignedBy', 'name email');

    res.json({
      success: true,
      message: deadlineChanged ? 'Deadline updated and audit history logged' : 'Task updated successfully',
      task
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/manager/tasks/:id
 * Delete task
 */
router.delete('/tasks/:id', protect, requireManagerOrHR, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await Task.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/manager/tasks/:id/review
 * Review submitted task: Approve (complete) or Request Revision
 */
router.post('/tasks/:id/review', protect, requireManagerOrHR, async (req, res, next) => {
  try {
    const { decision, feedback } = req.body; // 'Approve' | 'Request Revision'
    if (!['Approve', 'Request Revision'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Decision must be "Approve" or "Request Revision"' });
    }

    const task = await Task.findById(req.params.id).populate('employee');
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const now = new Date();
    task.managerFeedback = (feedback || '').trim();

    if (decision === 'Approve') {
      task.status = 'Completed';
      task.completedAt = now;
      task.progressPercentage = 100;

      task.auditHistory.push({
        action: 'APPROVED',
        performedBy: req.user._id,
        performedAt: now,
        details: { feedback: task.managerFeedback }
      });
    } else {
      task.status = 'In Progress';

      task.auditHistory.push({
        action: 'REVISION_REQUESTED',
        performedBy: req.user._id,
        performedAt: now,
        details: { feedback: task.managerFeedback }
      });
    }

    await task.save();
    await task.populate('employee', 'employeeId fullName department designation user');

    // Notify student of review decision
    if (task.employee?.user) {
      try {
        await NotificationService.send({
          recipient: task.employee.user,
          title: decision === 'Approve' ? `Task Approved: ${task.title}` : `Revisions Requested: ${task.title}`,
          message: decision === 'Approve'
            ? `Your manager approved task "${task.title}". Well done!`
            : `Your manager requested revisions on task "${task.title}". Feedback: ${task.managerFeedback || 'Please review requirements'}`,
          type: 'Task',
          link: '/employee/tasks'
        });
      } catch (e) {
        console.warn('Review notification note:', e.message);
      }
    }

    res.json({
      success: true,
      message: decision === 'Approve' ? 'Task marked as Completed' : 'Revisions requested from student',
      task
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/manager/deadlines
 * Dedicated Deadline Tracker: track who missed which deadline, how much delay, and upcoming deadlines
 */
router.get('/deadlines', protect, requireManagerOrHR, async (req, res, next) => {
  try {
    const studentIds = await getAssignedStudentIds(req.user);
    const now = new Date();

    const tasks = await Task.find({
      employee: { $in: studentIds },
      taskType: 'Manager_Assigned',
      dueDate: { $ne: null }
    })
      .populate('employee', 'employeeId fullName department designation officialEmail mobileNumber')
      .populate('assignedBy', 'name email')
      .sort({ dueDate: 1 });

    const missedDeadlines = [];
    const approachingDeadlines = [];
    const onTimeCompleted = [];

    tasks.forEach(t => {
      const due = new Date(t.dueDate);
      const isPastDue = due < now;
      const isMissed = t.status === 'Overdue' || t.deadlineMissed || (isPastDue && !['Completed', 'Submitted'].includes(t.status)) || t.isSubmittedLate;

      if (isMissed) {
        // Calculate delay in hours / days
        const delayMs = t.submittedAt
          ? Math.max(0, new Date(t.submittedAt).getTime() - due.getTime())
          : Math.max(0, now.getTime() - due.getTime());
        const delayHours = parseFloat((delayMs / (1000 * 60 * 60)).toFixed(1));
        const delayDays = parseFloat((delayMs / (1000 * 60 * 60 * 24)).toFixed(1));

        missedDeadlines.push({
          task: t,
          student: t.employee,
          dueDate: t.dueDate,
          submittedAt: t.submittedAt,
          status: t.status,
          isSubmittedLate: t.isSubmittedLate,
          delayHours,
          delayDays,
          delayFormatted: delayDays >= 1 ? `${delayDays} day(s)` : `${delayHours} hour(s)`
        });
      } else if (!['Completed'].includes(t.status) && !isPastDue) {
        const remainingMs = due.getTime() - now.getTime();
        const remainingHours = parseFloat((remainingMs / (1000 * 60 * 60)).toFixed(1));
        const remainingDays = parseFloat((remainingMs / (1000 * 60 * 60 * 24)).toFixed(1));

        approachingDeadlines.push({
          task: t,
          student: t.employee,
          dueDate: t.dueDate,
          status: t.status,
          remainingHours,
          remainingDays,
          remainingFormatted: remainingDays >= 1 ? `${remainingDays} day(s) left` : `${remainingHours} hour(s) left`,
          isUrgent: remainingHours <= 24
        });
      } else if (t.status === 'Completed' && !t.isSubmittedLate && !t.deadlineMissed) {
        onTimeCompleted.push(t);
      }
    });

    res.json({
      success: true,
      counts: {
        totalTracked: tasks.length,
        missedCount: missedDeadlines.length,
        approachingCount: approachingDeadlines.length,
        onTimeCount: onTimeCompleted.length
      },
      missedDeadlines,
      approachingDeadlines
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/manager/history
 * Comprehensive task history and audit trail across all assigned students
 */
router.get('/history', protect, requireManagerOrHR, async (req, res, next) => {
  try {
    const studentIds = await getAssignedStudentIds(req.user);
    const { studentId, action, search } = req.query;

    const filter = {
      employee: { $in: studentIds },
      taskType: 'Manager_Assigned'
    };
    if (studentId && studentId !== 'All') {
      filter.employee = studentId;
    }
    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    const tasks = await Task.find(filter)
      .populate('employee', 'employeeId fullName department designation')
      .populate('assignedBy', 'name email')
      .populate('auditHistory.performedBy', 'name email')
      .sort({ updatedAt: -1, createdAt: -1 });

    // Flatten history events into chronological feed
    const historyEvents = [];
    tasks.forEach(task => {
      if (Array.isArray(task.auditHistory)) {
        task.auditHistory.forEach(event => {
          if (!action || action === 'All' || event.action === action) {
            historyEvents.push({
              eventId: event._id,
              taskId: task._id,
              taskTitle: task.title,
              taskStatus: task.status,
              priority: task.priority,
              student: task.employee,
              action: event.action,
              performedBy: event.performedBy,
              performedAt: event.performedAt,
              details: event.details
            });
          }
        });
      }
    });

    historyEvents.sort((a, b) => new Date(b.performedAt) - new Date(a.performedAt));

    res.json({
      success: true,
      count: historyEvents.length,
      historyEvents: historyEvents.slice(0, 100),
      tasks
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/manager/students/:id/history
 * Specific student task history and performance metrics
 */
router.get('/students/:id/history', protect, requireManagerOrHR, async (req, res, next) => {
  try {
    const student = await Employee.findById(req.params.id)
      .populate('assignedManager', 'employeeId fullName officialEmail');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student employee not found' });
    }

    const tasks = await Task.find({ employee: student._id, taskType: 'Manager_Assigned' })
      .populate('assignedBy', 'name email')
      .populate('auditHistory.performedBy', 'name email')
      .sort({ createdAt: -1 });

    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const missed = tasks.filter(t => t.deadlineMissed || t.status === 'Overdue' || t.isSubmittedLate).length;
    const onTimeRate = total > 0 ? Math.round(((total - missed) / total) * 100) : 100;

    res.json({
      success: true,
      student,
      metrics: {
        totalTasks: total,
        completedTasks: completed,
        missedDeadlines: missed,
        activeTasks: tasks.filter(t => ['New', 'In Progress', 'Submitted'].includes(t.status)).length,
        onTimeRate
      },
      tasks
    });
  } catch (err) {
    next(err);
  }
});

/* =========================================================================
   HR ADMIN ENDPOINTS FOR MANAGERS & STUDENT ASSIGNMENTS
   ========================================================================= */

/**
 * GET /api/manager/admin/all-managers
 * HR views all managers, designated status, and assigned students
 */
router.get('/admin/all-managers', protect, authorize('HR'), async (req, res, next) => {
  try {
    // Find all employees that are either isManager: true OR user has role: 'Manager'
    const managerUsers = await User.find({ role: 'Manager' }).select('_id employee email');
    const managerEmpIds = managerUsers.map(u => u.employee).filter(Boolean);

    const managers = await Employee.find({
      $or: [
        { isManager: true },
        { _id: { $in: managerEmpIds } }
      ]
    })
      .populate('assignedStudents', 'employeeId fullName department designation officialEmail employmentType')
      .populate('user', 'email role isActive')
      .sort({ fullName: 1 });

    // Also get all active students/interns/employees available for assignment
    const allStudents = await Employee.find({ employmentStatus: 'Active' })
      .populate('assignedManager', 'employeeId fullName')
      .select('employeeId fullName department designation officialEmail employmentType assignedManager')
      .sort({ fullName: 1 });

    res.json({
      success: true,
      managers,
      allStudents
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/manager/admin/designate
 * HR designates or revokes an employee as Manager
 */
router.post('/admin/designate', protect, authorize('HR'), async (req, res, next) => {
  try {
    const { employeeId, isManager = true } = req.body;
    const employee = await Employee.findById(employeeId).populate('user');
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    employee.isManager = Boolean(isManager);
    await employee.save();

    // Update user role if user exists
    let user = employee.user ? await User.findById(employee.user._id || employee.user) : null;
    if (!user && employee.officialEmail) {
      user = await User.findOne({ email: employee.officialEmail.toLowerCase() });
    }
    if (!user) {
      user = await User.findOne({ employee: employee._id });
    }

    if (user) {
      user.role = isManager ? 'Manager' : 'Employee';
      user.employee = employee._id;
      employee.user = user._id;
      await Promise.all([user.save(), employee.save()]);
    } else if (isManager && employee.officialEmail) {
      const defaultPassword = 'Password@123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      user = await User.create({
        email: employee.officialEmail.toLowerCase(),
        password: hashedPassword,
        role: 'Manager',
        employee: employee._id,
        name: employee.fullName,
        isActive: true
      });
      employee.user = user._id;
      await employee.save();
    }

    await AuditLog.create({
      action: isManager ? 'DESIGNATE_MANAGER' : 'REVOKE_MANAGER',
      entityType: 'Employee',
      entityId: employee._id,
      performedBy: req.user._id,
      performedByName: req.user.email,
      reason: isManager
        ? `Designated ${employee.fullName} (${employee.employeeId}) as Manager`
        : `Revoked Manager role from ${employee.fullName} (${employee.employeeId})`
    });

    const updatedEmployee = await Employee.findById(employee._id)
      .populate('user', 'email role isActive')
      .populate('assignedStudents', 'employeeId fullName department designation officialEmail');

    res.json({
      success: true,
      message: isManager
        ? `${employee.fullName} is now designated as Manager`
        : `Manager role revoked from ${employee.fullName}`,
      employee: updatedEmployee
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/manager/admin/assign-students
 * HR assigns selected students to a manager
 */
router.post('/admin/assign-students', protect, authorize('HR'), async (req, res, next) => {
  try {
    const { managerEmployeeId, studentIds = [] } = req.body;

    const manager = await Employee.findById(managerEmployeeId);
    if (!manager) {
      return res.status(404).json({ success: false, message: 'Manager employee not found' });
    }

    // Ensure manager is marked as manager
    manager.isManager = true;
    manager.assignedStudents = studentIds;
    await manager.save();

    // Ensure linked user role is Manager
    const managerUser = await User.findOne({
      $or: [{ employee: manager._id }, { email: manager.officialEmail.toLowerCase() }]
    });
    if (managerUser && managerUser.role !== 'Manager') {
      managerUser.role = 'Manager';
      await managerUser.save();
    }

    // 1. Unassign students that were previously assigned to this manager but not in new list
    await Employee.updateMany(
      { assignedManager: manager._id, _id: { $nin: studentIds } },
      { $set: { assignedManager: null } }
    );

    // 2. Assign manager to the new selected student IDs
    if (studentIds.length > 0) {
      await Employee.updateMany(
        { _id: { $in: studentIds } },
        { $set: { assignedManager: manager._id } }
      );
    }

    await AuditLog.create({
      action: 'ASSIGN_STUDENTS_TO_MANAGER',
      entityType: 'Employee',
      entityId: manager._id,
      performedBy: req.user._id,
      performedByName: req.user.email,
      reason: `Assigned ${studentIds.length} student(s) to Manager ${manager.fullName} (${manager.employeeId})`
    });

    const updatedManager = await Employee.findById(manager._id).populate(
      'assignedStudents',
      'employeeId fullName department designation officialEmail'
    );

    res.json({
      success: true,
      message: `Successfully assigned ${studentIds.length} student(s) to ${manager.fullName}`,
      manager: updatedManager
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
