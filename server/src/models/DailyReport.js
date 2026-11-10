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
      default: []
    },
    completedWork: {
      type: String,
      default: '',
      trim: true
    },
    pendingTasks: {
      type: String,
      default: '',
      trim: true
    },
    challengesFaced: {
      type: String,
      default: '',
      trim: true
    },
    nextDayPlan: {
      type: String,
      default: '',
      trim: true
    },
    voiceUsed: {
      type: Boolean,
      default: false
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

  // If summaryBullets is empty but completedWork is present, populate summaryBullets for backwards compatibility
  if ((!this.summaryBullets || this.summaryBullets.length === 0) && this.completedWork) {
    this.summaryBullets = this.completedWork
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
  }
  next();
});

// Prevent duplicate reports per day per employee
dailyReportSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyReport', dailyReportSchema);
