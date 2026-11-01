const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const User = require('../models/User');
const SalaryProfile = require('../models/SalaryProfile');
const LeaveLedger = require('../models/LeaveLedger');
const LeavePolicy = require('../models/LeavePolicy');
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

/**
 * Helper to generate sequential Employee ID: NX-EMP-001
 */
async function generateNextEmployeeId() {
  const lastEmployee = await Employee.findOne({ employeeId: { $regex: /^NX-EMP-\d+$/ } })
    .sort({ createdAt: -1 })
    .lean();

  if (!lastEmployee || !lastEmployee.employeeId) {
    return 'NX-EMP-001';
  }

  const parts = lastEmployee.employeeId.split('-');
  const seq = parseInt(parts[2], 10);
  const nextSeq = isNaN(seq) ? 1 : seq + 1;
  return `NX-EMP-${String(nextSeq).padStart(3, '0')}`;
}

/**
 * GET /api/employees
 * List all employees with search and status filters (HR only)
 */
router.get('/', protect, authorize('HR'), async (req, res, next) => {
  try {
    const { search, department, status } = req.query;
    const filter = {};

    if (status && status !== 'All') {
      filter.employmentStatus = status;
    }

    if (department && department !== 'All') {
      filter.department = department;
    }

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { officialEmail: { $regex: search, $options: 'i' } }
      ];
    }

    const employees = await Employee.find(filter)
      .populate('assignedShift')
      .populate('leavePolicy')
      .populate('user', 'isActive lastLogin')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: employees.length,
      employees
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/employees
 * Create a new employee, user account, initial leave ledger and salary profile (HR only)
 */
router.post('/', protect, authorize('HR'), async (req, res, next) => {
  try {
    const {
      employeeId: customEmployeeId,
      fullName,
      officialEmail,
      mobileNumber,
      department,
      designation,
      employmentType = 'Full-Time',
      joiningDate = new Date(),
      assignedShift,
      weeklyOff = ['Sunday'],
      leavePolicy,
      initialPassword = 'Employee@123',
      monthlyGrossSalary,
      dailyRateBasis = 'CalendarDays'
    } = req.body;

    if (!fullName || !officialEmail || !mobileNumber || !department || !designation) {
      return res.status(400).json({
        success: false,
        message: 'Full name, official email, mobile number, department, and designation are required.'
      });
    }

    // Check duplicate email
    const existingUser = await User.findOne({ email: officialEmail.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Determine final Employee ID
    let employeeId = customEmployeeId ? customEmployeeId.trim().toUpperCase() : '';
    if (employeeId) {
      const existingEmp = await Employee.findOne({ employeeId });
      if (existingEmp) {
        return res.status(400).json({
          success: false,
          message: `Employee ID "${employeeId}" is already assigned to another employee. Please provide a unique ID.`
        });
      }
    } else {
      employeeId = await generateNextEmployeeId();
    }

    // 1. Create employee document
    const employee = await Employee.create({
      employeeId,
      fullName,
      officialEmail: officialEmail.toLowerCase(),
      mobileNumber,
      department,
      designation,
      employmentType,
      joiningDate,
      assignedShift: assignedShift || null,
      weeklyOff,
      leavePolicy: leavePolicy || null
    });

    // 2. Create user account for login (using official email as login ID)
    const passwordToSet = initialPassword && initialPassword.trim().length >= 6
      ? initialPassword.trim()
      : 'Employee@123';

    const user = await User.create({
      email: officialEmail.toLowerCase(),
      password: passwordToSet,
      role: 'Employee',
      isActive: true,
      employee: employee._id
    });

    employee.user = user._id;
    await employee.save();

    // 3. Setup initial Leave Ledger credits (from policy or default 12 CL, 12 SL)
    let clGrant = 12;
    let slGrant = 12;
    if (leavePolicy) {
      const pol = await LeavePolicy.findById(leavePolicy);
      if (pol) {
        clGrant = pol.clAnnualQuota || 12;
        slGrant = pol.slAnnualQuota || 12;
      }
    }

    await LeaveLedger.insertMany([
      {
        employee: employee._id,
        leaveType: 'CL',
        transactionType: 'Credit',
        units: clGrant,
        referenceModel: 'PolicyGrant',
        remarks: 'Initial annual Casual Leave quota grant',
        performedBy: req.user._id
      },
      {
        employee: employee._id,
        leaveType: 'SL',
        transactionType: 'Credit',
        units: slGrant,
        referenceModel: 'PolicyGrant',
        remarks: 'Initial annual Sick Leave quota grant',
        performedBy: req.user._id
      }
    ]);

    // 4. Configure initial salary profile if provided
    if (monthlyGrossSalary && Number(monthlyGrossSalary) > 0) {
      await SalaryProfile.create({
        employee: employee._id,
        monthlyGrossSalary: Number(monthlyGrossSalary),
        dailyRateBasis,
        effectiveFrom: joiningDate,
        isCurrent: true,
        configuredBy: req.user._id,
        notes: 'Initial salary configuration during employee onboarding'
      });
    }

    await AuditLog.create({
      action: 'EMPLOYEE_CREATED',
      entityType: 'Employee',
      entityId: employee._id,
      performedBy: req.user._id,
      performedByName: req.user.email,
      reason: `New employee created: ${employee.fullName} (${employee.employeeId})`,
      newState: { employeeId: employee.employeeId, email: employee.officialEmail }
    });

    res.status(201).json({
      success: true,
      message: `Employee ${employee.fullName} created successfully with ID ${employee.employeeId}`,
      employee
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/employees/:id
 * Get single employee profile
 */
router.get('/:id', protect, async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('assignedShift')
      .populate('leavePolicy')
      .populate('user', 'isActive lastLogin');

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // If Employee role, ensure employee only views their own profile
    if (req.user.role === 'Employee') {
      if (!req.user.employee || req.user.employee._id.toString() !== employee._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    res.json({
      success: true,
      employee
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/employees/:id
 * Update employee details (HR only)
 */
router.put('/:id', protect, authorize('HR'), async (req, res, next) => {
  try {
    const {
      fullName,
      mobileNumber,
      department,
      designation,
      employmentType,
      assignedShift,
      weeklyOff,
      leavePolicy,
      employmentStatus
    } = req.body;

    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const previousState = employee.toObject();

    if (fullName) employee.fullName = fullName;
    if (mobileNumber) employee.mobileNumber = mobileNumber;
    if (department) employee.department = department;
    if (designation) employee.designation = designation;
    if (employmentType) employee.employmentType = employmentType;
    if (assignedShift !== undefined) employee.assignedShift = assignedShift || null;
    if (weeklyOff) employee.weeklyOff = weeklyOff;
    if (leavePolicy !== undefined) employee.leavePolicy = leavePolicy || null;
    if (employmentStatus) employee.employmentStatus = employmentStatus;

    await employee.save();

    await AuditLog.create({
      action: 'EMPLOYEE_UPDATED',
      entityType: 'Employee',
      entityId: employee._id,
      performedBy: req.user._id,
      performedByName: req.user.email,
      reason: `Employee details updated for ${employee.employeeId}`,
      previousState,
      newState: employee.toObject()
    });

    res.json({
      success: true,
      message: 'Employee updated successfully',
      employee
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/employees/:id/status
 * Activate or deactivate employee account (HR only)
 */
router.patch('/:id/status', protect, authorize('HR'), async (req, res, next) => {
  try {
    const { isActive, employmentStatus } = req.body;
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    if (employmentStatus) {
      employee.employmentStatus = employmentStatus;
      await employee.save();
    }

    if (isActive !== undefined && employee.user) {
      await User.findByIdAndUpdate(employee.user, { isActive });
    }

    await AuditLog.create({
      action: 'EMPLOYEE_STATUS_CHANGED',
      entityType: 'Employee',
      entityId: employee._id,
      performedBy: req.user._id,
      performedByName: req.user.email,
      reason: `Account status set to isActive=${isActive}, employmentStatus=${employmentStatus}`
    });

    res.json({
      success: true,
      message: `Employee account status updated`,
      employee
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/employees/:id/reset-password
 * Reset employee login password (HR only)
 */
router.post('/:id/reset-password', protect, authorize('HR'), async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    const employee = await Employee.findById(req.params.id);

    if (!employee || !employee.user) {
      return res.status(404).json({ success: false, message: 'Employee or linked user account not found' });
    }

    if (newPassword && newPassword.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const tempPassword = newPassword && newPassword.trim().length >= 6
      ? newPassword.trim()
      : `NX@${Math.floor(100000 + Math.random() * 900000)}`;

    const user = await User.findById(employee.user).select('+password');
    user.password = tempPassword;
    await user.save();

    await AuditLog.create({
      action: 'PASSWORD_RESET_BY_HR',
      entityType: 'User',
      entityId: user._id,
      performedBy: req.user._id,
      performedByName: req.user.email,
      reason: `HR updated password for employee ${employee.employeeId}`
    });

    res.json({
      success: true,
      message: `Password updated successfully for ${employee.fullName}`,
      updatedPassword: tempPassword,
      temporaryPassword: tempPassword
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/employees/:id/salary
 * Get salary history & active salary profile (HR ONLY)
 */
router.get('/:id/salary', protect, authorize('HR'), async (req, res, next) => {
  try {
    const profiles = await SalaryProfile.find({ employee: req.params.id })
      .sort({ effectiveFrom: -1 })
      .populate('configuredBy', 'email');

    const currentProfile = profiles.find((p) => p.isCurrent) || profiles[0] || null;

    res.json({
      success: true,
      currentProfile,
      history: profiles
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/employees/:id/salary
 * Add new salary profile with effective dating (HR ONLY)
 */
router.post('/:id/salary', protect, authorize('HR'), async (req, res, next) => {
  try {
    const { monthlyGrossSalary, basicSalary, hra, specialAllowance, dailyRateBasis, effectiveFrom, notes } = req.body;

    if (!monthlyGrossSalary || Number(monthlyGrossSalary) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid monthly gross salary is required'
      });
    }

    // Set all previous profiles to isCurrent: false
    await SalaryProfile.updateMany(
      { employee: req.params.id },
      { $set: { isCurrent: false } }
    );

    const newProfile = await SalaryProfile.create({
      employee: req.params.id,
      monthlyGrossSalary: Number(monthlyGrossSalary),
      basicSalary: Number(basicSalary) || 0,
      hra: Number(hra) || 0,
      specialAllowance: Number(specialAllowance) || 0,
      dailyRateBasis: dailyRateBasis || 'CalendarDays',
      effectiveFrom: effectiveFrom || new Date(),
      isCurrent: true,
      configuredBy: req.user._id,
      notes: notes || 'Updated salary profile'
    });

    await AuditLog.create({
      action: 'SALARY_PROFILE_UPDATED',
      entityType: 'SalaryProfile',
      entityId: newProfile._id,
      performedBy: req.user._id,
      performedByName: req.user.email,
      reason: `Salary updated to ${monthlyGrossSalary} (${dailyRateBasis}) effective ${effectiveFrom || 'now'}`,
      newState: newProfile.toObject()
    });

    res.status(201).json({
      success: true,
      message: 'Salary profile configured successfully',
      salaryProfile: newProfile
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
