const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Employee = require('../models/Employee');
const AuditLog = require('../models/AuditLog');
const NotificationService = require('../services/notificationService');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const getHRTasksHandler = async (req, res, next) => {
  try {
    const { status, priority, employeeId, category, search } = req.query;
    const filter = {};

    if (status && status !== 'All') {
      filter.status = status;
    }
    if (priority && priority !== 'All') {
      filter.priority = priority;
    }
    if (category && category !== 'All') {
      filter.category = category;
    }
    if (employeeId && employeeId !== 'All') {
      filter.employee = employeeId;
    }
    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    const tasks = await Task.find(filter)
      .populate('employee', 'employeeId fullName department designation')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: tasks.length,
      tasks
    });
  } catch (err) {
    next(err);
  }
};

router.get('/', protect, authorize('HR'), getHRTasksHandler);
router.get('/hr', protect, authorize('HR'), getHRTasksHandler);

/**
 * GET /api/tasks/my
 * Get current employee's tasks
 */
router.get('/my', protect, async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.json({ success: true, personalTasks: [], hrAssignedTasks: [] });
    }

    const tasks = await Task.find({ employee: req.user.employee._id })
      .populate('employee', 'employeeId fullName department designation')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 });

    const personalTasks = tasks.filter((t) => t.taskType === 'Personal');
    const hrAssignedTasks = tasks.filter((t) => t.taskType === 'HR_Assigned');

    res.json({
      success: true,
      personalTasks,
      hrAssignedTasks
    });
  } catch (err) {
    next(err);
  }
});

const createTaskHandler = async (req, res, next) => {
  try {
    const {
      title,
      description,
      employeeId,
      startDate,
      dueDate,
      priority,
      category,
      subtasks,
      attachments,
      taskType
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Task title is required' });
    }

    let targetEmpId = employeeId;
    let type = taskType || 'Personal';

    if (req.user.role === 'HR') {
      type = 'HR_Assigned';
      if (!targetEmpId) {
        return res.status(400).json({ success: false, message: 'Target employee is required for HR tasks' });
      }
    } else {
      if (!req.user.employee) {
        return res.status(400).json({ success: false, message: 'Employee profile required' });
      }
      targetEmpId = req.user.employee._id;
    }

    const initialSubtasks = Array.isArray(subtasks)
      ? subtasks.map(s => typeof s === 'string' ? { title: s.trim(), isCompleted: false } : s)
      : [];

    const task = await Task.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      taskType: type,
      employee: targetEmpId,
      assignedBy: req.user._id,
      category: category || 'General',
      priority: priority || 'Medium',
      startDate: startDate || null,
      dueDate: dueDate || null,
      subtasks: initialSubtasks,
      attachments: Array.isArray(attachments) ? attachments : [],
      status: 'New'
    });

    await task.populate('employee', 'employeeId fullName department designation user');

    // Notify employee if assigned by HR
    if (type === 'HR_Assigned' && task.employee?.user) {
      try {
        await NotificationService.send({
          recipient: task.employee.user,
          title: `New Task Assigned: ${task.title}`,
          message: `HR assigned you a new task: "${task.title}". Priority: ${task.priority}.`,
          type: 'Task',
          link: '/employee/tasks'
        });
      } catch (e) {
        console.warn('Task notification error:', e.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task
    });
  } catch (err) {
    next(err);
  }
};

router.post('/', protect, createTaskHandler);
router.post('/assign', protect, authorize('HR'), createTaskHandler);

/**
 * POST /api/tasks/personal
 * Legacy alias for personal task creation
 */
router.post('/personal', protect, async (req, res, next) => {
  try {
    const { title, description, dueDate, priority, taskType, employeeId } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Task title is required' });
    }

    let targetEmpId = employeeId;
    if (!targetEmpId) {
      if (!req.user.employee) {
        return res.status(400).json({ success: false, message: 'Employee profile required' });
      }
      targetEmpId = req.user.employee._id;
    }

    const task = await Task.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      dueDate: dueDate || null,
      priority: priority || 'Medium',
      taskType: taskType || 'Personal',
      employee: targetEmpId,
      assignedBy: req.user._id,
      status: 'New'
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/tasks/:id
 * Edit task details
 */
router.put('/:id', protect, async (req, res, next) => {
  try {
    const { title, description, priority, category, startDate, dueDate, completionRemarks, progressPercentage } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (title) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (priority) task.priority = priority;
    if (category) task.category = category;
    if (startDate !== undefined) task.startDate = startDate;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (completionRemarks !== undefined) task.completionRemarks = completionRemarks;
    if (progressPercentage !== undefined) task.progressPercentage = Number(progressPercentage);

    await task.save();

    res.json({
      success: true,
      message: 'Task updated successfully',
      task
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/tasks/:id/status
 * Update status
 */
router.patch('/:id/status', protect, async (req, res, next) => {
  try {
    const { status, completionRemarks } = req.body;
    const validStatuses = ['New', 'In Progress', 'On Hold', 'Completed', 'Overdue', 'Pending'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.status = status === 'Pending' ? 'In Progress' : status;
    if (task.status === 'Completed') {
      task.progressPercentage = 100;
      if (completionRemarks) task.completionRemarks = completionRemarks;
    }

    await task.save();

    res.json({
      success: true,
      message: `Task status updated to ${task.status}`,
      task
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/tasks/:id/subtasks/:subtaskId
 * Toggle subtask completion & update task progress percentage
 */
router.patch('/:id/subtasks/:subtaskId', protect, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const subtask = task.subtasks.id(req.params.subtaskId);
    if (!subtask) {
      return res.status(404).json({ success: false, message: 'Subtask not found' });
    }

    subtask.isCompleted = !subtask.isCompleted;
    subtask.completedAt = subtask.isCompleted ? new Date() : null;

    await task.save();

    res.json({
      success: true,
      message: `Subtask marked as ${subtask.isCompleted ? 'completed' : 'incomplete'}`,
      task
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tasks/:id/subtasks
 * Add a new subtask to the checklist
 */
router.post('/:id/subtasks', protect, async (req, res, next) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Subtask title is required' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.subtasks.push({ title: title.trim(), isCompleted: false });
    await task.save();

    res.status(201).json({
      success: true,
      message: 'Subtask added successfully',
      task
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tasks/:id/updates
 * Add a comment or work update
 */
router.post('/:id/updates', protect, async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Update text is required' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const authorName = req.user.name || (req.user.employee?.fullName) || req.user.email;
    task.updates.push({
      author: req.user._id,
      authorName,
      text: text.trim(),
      createdAt: new Date()
    });

    await task.save();

    res.status(201).json({
      success: true,
      message: 'Update posted successfully',
      task
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/tasks/:id/reassign
 * HR reassigns task to another employee
 */
router.patch('/:id/reassign', protect, authorize('HR'), async (req, res, next) => {
  try {
    const { newEmployeeId, reason } = req.body;
    if (!newEmployeeId) {
      return res.status(400).json({ success: false, message: 'New employee is required for reassignment' });
    }

    const [task, newEmployee] = await Promise.all([
      Task.findById(req.params.id),
      Employee.findById(newEmployeeId)
    ]);

    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (!newEmployee) return res.status(404).json({ success: false, message: 'New employee not found' });

    const prevEmployeeId = task.employee;
    task.employee = newEmployee._id;

    task.auditHistory.push({
      action: 'TASK_REASSIGNED',
      performedBy: req.user._id,
      performedAt: new Date(),
      details: {
        previousEmployee: prevEmployeeId,
        newEmployee: newEmployee._id,
        reason: reason || 'HR reassigned task'
      }
    });

    await task.save();

    await AuditLog.create({
      action: 'TASK_REASSIGN',
      entityType: 'Task',
      entityId: task._id,
      performedBy: req.user._id,
      performedByName: req.user.name || req.user.email,
      reason: reason || `Reassigned task "${task.title}" to ${newEmployee.fullName}`
    });

    res.json({
      success: true,
      message: `Task reassigned to ${newEmployee.fullName}`,
      task
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/tasks/:id
 * Delete task
 */
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Only HR or creator can delete
    if (req.user.role !== 'HR' && task.employee?.toString() !== req.user.employee?._id?.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this task' });
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

module.exports = router;
