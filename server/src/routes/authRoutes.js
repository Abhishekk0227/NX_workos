const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Employee = require('../models/Employee');
const { protect } = require('../middleware/auth');

// Generate JWT token helper
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'nx_work_os_super_secret_jwt_key_2026_secure', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

/**
 * POST /api/auth/login
 * User login with Employee ID OR Email and password
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, loginId, identifier, employeeId } = req.body;
    const rawId = (email || loginId || identifier || employeeId || '').trim();

    if (!rawId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide Employee ID / Email and password'
      });
    }

    let user = null;
    const escapedInput = rawId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // 1. If input contains @, try finding by email directly
    if (rawId.includes('@')) {
      user = await User.findOne({ email: rawId.toLowerCase() })
        .select('+password')
        .populate({
          path: 'employee',
          populate: [
            { path: 'leavePolicy' }
          ]
        });
    }

    // 2. If not found by email or if input is an Employee ID (e.g. "TEST_EMP_80", "NX001")
    if (!user) {
      const employee = await Employee.findOne({
        $or: [
          { employeeId: { $regex: new RegExp(`^${escapedInput}$`, 'i') } },
          { officialEmail: rawId.toLowerCase() }
        ]
      });

      if (employee) {
        user = await User.findOne({
          $or: [
            { employee: employee._id },
            { email: employee.officialEmail?.toLowerCase() }
          ]
        })
        .select('+password')
        .populate({
          path: 'employee',
          populate: [
            { path: 'leavePolicy' }
          ]
        });

        // Self-heal: If employee exists in DB but User account was missing
        if (!user) {
          user = await User.create({
            email: employee.officialEmail.toLowerCase(),
            password: password,
            role: 'Employee',
            isActive: true,
            employee: employee._id
          });
          employee.user = user._id;
          await employee.save();

          user = await User.findById(user._id)
            .select('+password')
            .populate({
              path: 'employee',
              populate: [
                { path: 'leavePolicy' }
              ]
            });
        } else if (!employee.user || !user.employee) {
          employee.user = user._id;
          user.employee = employee._id;
          await Promise.all([employee.save(), user.save()]);
        }
      }
    }

    // 3. Fallback: Search email prefix (e.g. 'test80' matching 'test80@...')
    if (!user && !rawId.includes('@')) {
      user = await User.findOne({
        email: { $regex: new RegExp(`^${escapedInput}@`, 'i') }
      })
      .select('+password')
      .populate({
        path: 'employee',
        populate: [
          { path: 'leavePolicy' }
        ]
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Employee ID / Email or password'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated. Please contact your HR administrator.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Employee ID / Email or password'
      });
    }

    // Auto-link employee object if user is Employee and employee was missing
    if (user.role === 'Employee' && !user.employee) {
      const emp = await Employee.findOne({ officialEmail: user.email.toLowerCase() });
      if (emp) {
        user.employee = emp._id;
        emp.user = user._id;
        await Promise.all([user.save(), emp.save()]);
        user = await User.findById(user._id)
          .select('+password')
          .populate({
            path: 'employee',
            populate: [
              { path: 'leavePolicy' }
            ]
          });
      }
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    // Prepare safe response object without password
    const safeUser = {
      _id: user._id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      employee: user.employee
    };

    res.json({
      success: true,
      token,
      user: safeUser
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user profile
 */
router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'employee',
      populate: [
        { path: 'leavePolicy' }
      ]
    });

    res.json({
      success: true,
      user
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/auth/change-password
 * Change current user password
 */
router.put('/change-password', protect, async (req, res, next) => {
  try {
    // Only HR administrators can change passwords directly
    if (req.user.role !== 'HR') {
      return res.status(403).json({
        success: false,
        message: 'Employee passwords are strictly managed by HR administrators. Please contact your HR desk to update your password.'
      });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect current password'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/auth/profile-picture
 * Update current user / employee profile picture
 */
router.put('/profile-picture', protect, async (req, res, next) => {
  try {
    const { profilePicture } = req.body;
    if (!profilePicture) {
      return res.status(400).json({
        success: false,
        message: 'Profile picture data is required'
      });
    }

    if (req.user.employee) {
      await Employee.findByIdAndUpdate(req.user.employee, { profilePicture });
    }

    const updatedUser = await User.findById(req.user._id).populate({
      path: 'employee',
      populate: [
        { path: 'leavePolicy' }
      ]
    });

    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      user: updatedUser
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
