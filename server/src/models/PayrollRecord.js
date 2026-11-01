const mongoose = require('mongoose');

const convertedLeaveSchema = new mongoose.Schema(
  {
    leaveRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeaveRequest'
    },
    originalClassification: String,
    reason: String,
    convertedAt: {
      type: Date,
      default: Date.now
    },
    convertedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { _id: false }
);

const payrollRecordSchema = new mongoose.Schema(
  {
    month: {
      type: String, // YYYY-MM
      required: true,
      index: true
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true
    },
    salaryProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalaryProfile',
      default: null
    },
    grossSalary: {
      type: Number,
      required: true,
      min: 0
    },
    dailyRateBasis: {
      type: String,
      enum: ['CalendarDays', 'WorkingDays', '30DaysFixed'],
      default: 'CalendarDays'
    },
    calendarDays: {
      type: Number,
      required: true
    },
    payableDays: {
      type: Number,
      required: true
    },
    presentDays: {
      type: Number,
      default: 0
    },
    paidLeaveDays: {
      type: Number,
      default: 0
    },
    weeklyOffDays: {
      type: Number,
      default: 0
    },
    lwpDays: {
      type: Number,
      default: 0
    },
    unmarkedDays: {
      type: Number,
      default: 0
    },
    incompleteDays: {
      type: Number,
      default: 0
    },
    perDayRate: {
      type: Number,
      default: 0
    },
    perMinuteRate: {
      type: Number,
      default: 0
    },
    lateMinutes: {
      type: Number,
      default: 0
    },
    lateDeduction: {
      type: Number,
      default: 0
    },
    halfDays: {
      type: Number,
      default: 0
    },
    halfDayDeduction: {
      type: Number,
      default: 0
    },
    shortfallDeduction: {
      type: Number,
      default: 0
    },
    lwpDeduction: {
      type: Number,
      default: 0
    },
    deductionBreakdown: [
      {
        type: { type: String },
        description: { type: String },
        amount: { type: Number, default: 0 }
      }
    ],
    otherDeductions: {
      type: Number,
      default: 0
    },
    netPayable: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['Draft', 'Review', 'Finalized'],
      default: 'Draft'
    },
    finalizedAt: {
      type: Date,
      default: null
    },
    finalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    convertedLeaves: [convertedLeaveSchema],
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

payrollRecordSchema.index({ employee: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('PayrollRecord', payrollRecordSchema);
