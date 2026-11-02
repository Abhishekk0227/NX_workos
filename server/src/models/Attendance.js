const mongoose = require('mongoose');

const attendanceCorrectionSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['None', 'Pending', 'Approved', 'Rejected'],
      default: 'None'
    },
    requestedPunchIn: { type: Date },
    requestedPunchOut: { type: Date },
    reason: { type: String, default: '' },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewRemarks: { type: String, default: '' },
    reviewedAt: { type: Date }
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true
    },
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShiftTemplate',
      default: null
    },
    punchIn: {
      type: Date,
      default: null
    },
    punchOut: {
      type: Date,
      default: null
    },
    actualWorkingHours: {
      type: Number,
      default: 0
    },
    workingHoursFormatted: {
      type: String,
      default: '0:00'
    },
    lateMinutes: {
      type: Number,
      default: 0
    },
    earlyMinutes: {
      type: Number,
      default: 0
    },
    breakDurationMinutes: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: [
        'Present',
        'Late',
        'Half Day',
        'Half-day',
        'Absent',
        'On Leave',
        'Weekly Off',
        'Working',
        'Incomplete',
        'Unmarked/Review Required'
      ],
      default: 'Working'
    },
    dailyReport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DailyReport',
      default: null
    },
    isIncomplete: {
      type: Boolean,
      default: false
    },
    correction: {
      type: attendanceCorrectionSchema,
      default: () => ({})
    },
    auditHistory: [
      {
        action: String,
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        performedAt: {
          type: Date,
          default: Date.now
        },
        reason: String,
        details: mongoose.Schema.Types.Mixed
      }
    ]
  },
  {
    timestamps: true
  }
);

// Prevent duplicate sessions for an employee on the same date
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
