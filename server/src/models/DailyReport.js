const mongoose = require('mongoose');
const AttendanceService = require('../services/attendanceService');

const dailyReportSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true
    },
    attendance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attendance',
      required: true
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true
    },
    summaryBullets: {
      type: [String],
      required: [true, 'At least one bullet point summary is required'],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0 && v.some(b => b && b.trim().length > 0);
        },
        message: 'At least one valid bullet point must be provided'
      }
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    submittedAtIST: {
      type: String,
      default: null
    },
    submittedTime: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to ensure permanent IST storage in database
dailyReportSchema.pre('save', function (next) {
  const d = this.submittedAt || new Date();
  this.submittedAtIST = AttendanceService.toISTISOString(d);
  this.submittedTime = AttendanceService.formatTime(d, {}, 'Asia/Kolkata');
  next();
});

// Prevent duplicate reports per day per employee
dailyReportSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyReport', dailyReportSchema);
