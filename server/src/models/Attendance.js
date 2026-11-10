const mongoose = require('mongoose');
const AttendanceService = require('../services/attendanceService');

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

const shortAttendanceAlertSchema = new mongoose.Schema(
  {
    isAlert: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['None', 'Pending', 'Resolved'],
      default: 'None'
    },
    payableAmount: {
      type: Number,
      default: 0
    },
    deductionAmount: {
      type: Number,
      default: 0
    },
    hrClassification: {
      type: String,
      default: '' // 'Half Day', 'LWP', 'Special Allowance', etc.
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    resolutionRemarks: {
      type: String,
      default: ''
    }
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
    punchInIST: {
      type: String,
      default: null
    },
    punchOutIST: {
      type: String,
      default: null
    },
    punchInTime: {
      type: String,
      default: null
    },
    punchOutTime: {
      type: String,
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
        'Full Day',
        'Present',
        'Late',
        'Half Day',
        'Half-day',
        'Short Attendance',
        'Absent',
        'On Leave',
        'Holiday',
        'Working on Holiday',
        'Weekly Off',
        'Working',
        'Auto Punch-Out',
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
    autoPunchedOut: {
      type: Boolean,
      default: false
    },
    punchOutType: {
      type: String,
      enum: ['MANUAL', 'SYSTEM_AUTO', 'HR_CORRECTED'],
      default: 'MANUAL'
    },
    autoPunchOutAlert: {
      isAlert: { type: Boolean, default: false },
      reviewed: { type: Boolean, default: false }
    },
    shortAttendanceAlert: {
      type: shortAttendanceAlertSchema,
      default: () => ({})
    },
    isHoliday: {
      type: Boolean,
      default: false
    },
    holiday: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Holiday',
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

// Pre-save hook to ensure permanent IST storage in database
attendanceSchema.pre('save', function (next) {
  if (this.punchIn) {
    this.punchInIST = AttendanceService.toISTISOString(this.punchIn);
    this.punchInTime = AttendanceService.formatTime(this.punchIn, {}, 'Asia/Kolkata');
  }
  if (this.punchOut) {
    this.punchOutIST = AttendanceService.toISTISOString(this.punchOut);
    this.punchOutTime = AttendanceService.formatTime(this.punchOut, {}, 'Asia/Kolkata');
  }
  next();
});

// Serialization transforms
attendanceSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    if (ret.punchIn instanceof Date) {
      ret.punchIn = AttendanceService.toISTISOString(ret.punchIn);
    }
    if (ret.punchOut instanceof Date) {
      ret.punchOut = AttendanceService.toISTISOString(ret.punchOut);
    }
    if (ret.createdAt instanceof Date) {
      ret.createdAt = AttendanceService.toISTISOString(ret.createdAt);
    }
    if (ret.updatedAt instanceof Date) {
      ret.updatedAt = AttendanceService.toISTISOString(ret.updatedAt);
    }
    return ret;
  }
});

attendanceSchema.set('toObject', {
  virtuals: true,
  transform: (doc, ret) => {
    if (ret.punchIn instanceof Date) {
      ret.punchIn = AttendanceService.toISTISOString(ret.punchIn);
    }
    if (ret.punchOut instanceof Date) {
      ret.punchOut = AttendanceService.toISTISOString(ret.punchOut);
    }
    return ret;
  }
});

// Prevent duplicate sessions for an employee on the same date
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
