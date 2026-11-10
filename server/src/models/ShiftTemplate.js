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
    halfDayCutoffTime: {
      type: String,
      default: '14:00',
      trim: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:mm (24h)']
    },
    endTime: {
      type: String,
      required: [true, 'End time is required (HH:mm)'],
      trim: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:mm (24h)']
    },
    gracePeriodMinutes: {
      type: Number,
      default: 15,
      min: [0, 'Grace period cannot be negative']
    },
    fullDayWorkingHoursThreshold: {
      type: Number,
      default: 8,
      min: [1, 'Full-day threshold must be at least 1 hour']
    },
    halfDayWorkingHoursThreshold: {
      type: Number,
      default: 4,
      min: [0.5, 'Half-day threshold must be at least 0.5 hours']
    },
    requiredHours: {
      type: Number,
      default: 8,
      min: [1, 'Required hours must be at least 1']
    },
    breakDurationMinutes: {
      type: Number,
      default: 60
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    isOvernight: {
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

// Pre-save hook to calculate isOvernight if endTime is less than startTime
shiftTemplateSchema.pre('save', function (next) {
  if (this.startTime && this.endTime) {
    const [startH, startM] = this.startTime.split(':').map(Number);
    const [endH, endM] = this.endTime.split(':').map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;
    this.isOvernight = endMins < startMins;
  }
  next();
});

module.exports = mongoose.model('ShiftTemplate', shiftTemplateSchema);
