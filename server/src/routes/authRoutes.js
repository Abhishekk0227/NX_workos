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
 * User login with email and password
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password')
      .populate({
        path: 'employee',
        populate: [
          { path: 'assignedShift' },
          { path: 'leavePolicy' }
        ]
      });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
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
        message: 'Invalid email or password'
      });
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
        { path: 'assignedShift' },
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
        { path: 'assignedShift' },
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
