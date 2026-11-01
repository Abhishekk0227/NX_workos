const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Employee = require('../models/Employee');
const NotificationService = require('../services/notificationService');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

/**
 * GET /api/tasks/my
 * Get current employee tasks (personal and HR assigned separated)
 */
router.get('/my', protect, async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.json({ success: true, personalTasks: [], hrAssignedTasks: [] });
    }

    const tasks = await Task.find({ employee: req.user.employee._id })
      .populate('assignedBy', 'email')
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

/**
 * POST /api/tasks/personal
 * Employee creates personal or HR assigned task
 */
router.post('/personal', protect, async (req, res, next) => {
  try {
    const { title, description, dueDate, priority, taskType } = req.body;

    if (!req.user.employee) {
      return res.status(400).json({ success: false, message: 'Employee profile required' });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Task title is required' });
    }

    const assignedType = taskType === 'HR_Assigned' ? 'HR_Assigned' : 'Personal';

    const task = await Task.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      dueDate: dueDate || null,
      priority: priority || 'Medium',
      taskType: assignedType,
      employee: req.user.employee._id,
      status: 'Pending'
    });

    res.status(201).json({
      success: true,
      message: `${assignedType === 'HR_Assigned' ? 'HR Assigned' : 'Personal'} task created`,
      task
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/tasks/:id/status
 * Update status of personal or assigned task
 */
router.patch('/:id/status', protect, async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['Pending', 'In Progress', 'Completed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Verify ownership if employee
    if (req.user.role === 'Employee') {
      if (!req.user.employee || task.employee.toString() !== req.user.employee._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this task' });
      }
    }

    task.status = status;
    await task.save();

    res.json({
      success: true,
      message: `Task marked as ${status}`,
      task
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/tasks/:id
 * Delete personal task
 */
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (task.taskType === 'HR_Assigned' && req.user.role !== 'HR' && task.assignedBy && task.assignedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Employees cannot delete tasks assigned by HR administrators' });
    }

    if (req.user.role === 'Employee' && task.employee.toString() !== req.user.employee._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await task.deleteOne();

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tasks/hr
 * HR view of all HR assigned tasks across the organization
 */
router.get('/hr', protect, authorize('HR'), async (req, res, next) => {
  try {
    const { employeeId, status } = req.query;
    const filter = { taskType: 'HR_Assigned' };

    if (employeeId && employeeId !== 'All') {
      filter.employee = employeeId;
    }

    if (status && status !== 'All') {
      filter.status = status;
    }

    const tasks = await Task.find(filter)
      .populate('employee', 'employeeId fullName department designation')
      .populate('assignedBy', 'email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: tasks.length,
      tasks
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/tasks/:id
 * Edit personal or assigned task
 */
router.put('/:id', protect, async (req, res, next) => {
  try {
    const { title, description, dueDate, priority, status, taskType } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (req.user.role === 'Employee' && task.employee.toString() !== req.user.employee._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this task' });
    }

    if (title) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (dueDate !== undefined) task.dueDate = dueDate || null;
    if (priority) task.priority = priority;
    if (status) task.status = status;
    if (taskType && ['Personal', 'HR_Assigned'].includes(taskType)) {
      task.taskType = taskType;
    }

    await task.save();
    res.json({ success: true, message: 'Task updated successfully', task });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tasks/assign
 * HR assigns a new task to an employee
 */
router.post('/assign', protect, authorize('HR'), async (req, res, next) => {
  try {
    const { employeeId, title, description, dueDate, priority } = req.body;

    if (!employeeId || !title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Employee and task title are required'
      });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const task = await Task.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      dueDate: dueDate || null,
      priority: priority || 'Medium',
      taskType: 'HR_Assigned',
      employee: employee._id,
      assignedBy: req.user._id,
      status: 'Pending'
    });

    // Notify employee
    if (employee.user) {
      await NotificationService.send({
        recipient: employee.user,
        title: 'New HR Task Assigned',
        message: `HR assigned you a new task: "${task.title}"`,
        type: 'Task',
        link: '/employee/tasks'
      });
    }

    res.status(201).json({
      success: true,
      message: `Task assigned to ${employee.fullName} successfully`,
      task
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
