const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Holiday name is required'],
      trim: true
    },
    date: {
      type: String, // YYYY-MM-DD
      required: [true, 'Holiday date (YYYY-MM-DD) is required'],
      index: true
    },
    startDate: {
      type: String, // YYYY-MM-DD
      default: null,
      index: true
    },
    endDate: {
      type: String, // YYYY-MM-DD
      default: null,
      index: true
    },
    rangeGroupId: {
      type: String,
      default: null
    },
    isMultiDay: {
      type: Boolean,
      default: false
    },
    totalDays: {
      type: Number,
      default: 1
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    type: {
      type: String,
      enum: [
        'National Holiday',
        'Public Holiday',
        'Festival Holiday',
        'Company Holiday',
        'Optional Holiday',
        'Special Holiday'
      ],
      default: 'Company Holiday'
    },
    applicability: {
      type: String,
      enum: ['All', 'Department', 'Shift', 'Custom'],
      default: 'All'
    },
    applicableDepartments: {
      type: [String],
      default: []
    },
    applicableShifts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ShiftTemplate'
      }
    ],
    applicableEmployees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
      }
    ],
    isRecurring: {
      type: Boolean,
      default: false
    },
    paid: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

holidaySchema.index({ date: 1, name: 1 }, { unique: true });
holidaySchema.index({ startDate: 1, endDate: 1 });
holidaySchema.index({ rangeGroupId: 1 });

module.exports = mongoose.model('Holiday', holidaySchema);

