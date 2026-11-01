const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true
    },
    startDate: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true
    },
    endDate: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true
    },
    isHalfDay: {
      type: Boolean,
      default: false
    },
    halfDayType: {
      type: String,
      enum: ['None', 'FirstHalf', 'SecondHalf'],
      default: 'None'
    },
    reasonCategory: {
      type: String,
      enum: ['Health', 'Personal', 'Other'],
      required: [true, 'Reason category is required']
    },
    reasonDetails: {
      type: String,
      required: [true, 'Reason details are required'],
      trim: true
    },
    totalDays: {
      type: Number,
      required: true,
      min: [0.5, 'Minimum leave is 0.5 days']
    },
    autoClassification: {
      type: String,
      enum: ['CL', 'SL', 'LWP', 'Pending_Review', 'Split'],
      default: 'Pending_Review'
    },
    classificationBreakdown: {
      clDays: { type: Number, default: 0 },
      slDays: { type: Number, default: 0 },
      lwpDays: { type: Number, default: 0 }
    },
    status: {
      type: String,
      enum: ['Approved', 'Pending_Review', 'Rejected', 'Flagged'],
      default: 'Pending_Review'
    },
    isLateApplication: {
      type: Boolean,
      default: false
    },
    flagReasons: {
      type: [String],
      default: []
    },
    convertedToLwp: {
      type: Boolean,
      default: false
    },
    conversionAudit: {
      convertedAt: { type: Date },
      convertedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reason: { type: String, default: '' },
      previousClassification: { type: String, default: '' }
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    reviewRemarks: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
