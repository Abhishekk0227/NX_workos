const mongoose = require('mongoose');

const salaryProfileSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true
    },
    monthlyGrossSalary: {
      type: Number,
      required: [true, 'Monthly gross salary is required'],
      min: [0, 'Salary cannot be negative']
    },
    basicSalary: {
      type: Number,
      default: 0
    },
    hra: {
      type: Number,
      default: 0
    },
    specialAllowance: {
      type: Number,
      default: 0
    },
    dailyRateBasis: {
      type: String,
      enum: ['CalendarDays', 'WorkingDays', '30DaysFixed'],
      default: 'CalendarDays'
    },
    effectiveFrom: {
      type: Date,
      default: Date.now
    },
    isCurrent: {
      type: Boolean,
      default: true
    },
    configuredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('SalaryProfile', salaryProfileSchema);
