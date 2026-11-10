const mongoose = require('mongoose');
const AttendanceService = require('../services/attendanceService');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    targetRole: {
      type: String,
      enum: ['All', 'HR', 'Employee', null],
      default: null
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: [
        'Attendance',
        'Short Attendance',
        'Auto Punch-Out',
        'Leave',
        'Task',
        'Reminder',
        'Holiday',
        'Payroll',
        'Correction',
        'System'
      ],
      default: 'System'
    },
    link: {
      type: String,
      default: ''
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        readAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    createdAtIST: {
      type: String,
      default: null
    },
    createdAtTime: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to ensure permanent IST storage in database
notificationSchema.pre('save', function (next) {
  const d = this.createdAt || new Date();
  this.createdAtIST = AttendanceService.toISTISOString(d);
  this.createdAtTime = AttendanceService.formatTime(d, {}, 'Asia/Kolkata');
  next();
});

module.exports = mongoose.model('Notification', notificationSchema);
