const mongoose = require('mongoose');

const shiftTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Shift name is required'],
      unique: true,
      trim: true
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required (HH:mm)'],
      trim: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:mm (24h)']
    },
    endTime: {
      type: String,
      required: [true, 'End time is required (HH:mm)'],
      trim: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:mm (24h)']
    },
    requiredHours: {
      type: Number,
      default: 9,
      min: [1, 'Required hours must be at least 1']
    },
    breakDurationMinutes: {
      type: Number,
      default: 60
    },
    gracePeriodMinutes: {
      type: Number,
      default: 15
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    description: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ShiftTemplate', shiftTemplateSchema);
