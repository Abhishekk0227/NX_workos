const mongoose = require('mongoose');

const leavePolicySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Policy name is required'],
      unique: true,
      trim: true
    },
    clAnnualQuota: {
      type: Number,
      default: 12,
      min: 0
    },
    slAnnualQuota: {
      type: Number,
      default: 12,
      min: 0
    },
    allocationFrequency: {
      type: String,
      enum: ['Annual', 'MonthlyAccrual'],
      default: 'Annual'
    },
    carryForwardLimit: {
      type: Number,
      default: 0,
      min: 0
    },
    applicationCutOffHours: {
      type: Number,
      default: 2 // hours before shift start time
    },
    allowHalfDay: {
      type: Boolean,
      default: true
    },
    classificationPriority: {
      type: String,
      enum: ['CL_First', 'SL_First'],
      default: 'CL_First'
    },
    fallbackPolicy: {
      type: String,
      enum: ['LWP', 'Reject'],
      default: 'LWP'
    },
    lateLeavePolicy: {
      type: String,
      enum: ['Flag_For_Review', 'Auto_LWP', 'Allow'],
      default: 'Flag_For_Review'
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('LeavePolicy', leavePolicySchema);
