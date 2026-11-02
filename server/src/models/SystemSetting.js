const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      default: 'NX Global Technologies'
    },
    companyTimezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    departments: {
      type: [String],
      default: [
        'Engineering',
        'Product Design',
        'Operations',
        'Human Resources',
        'Sales & Marketing',
        'Quality Assurance'
      ]
    },
    designations: {
      type: [String],
      default: [
        'Software Engineer',
        'Senior Software Engineer',
        'Lead Architect',
        'UI/UX Designer',
        'Product Manager',
        'HR Specialist',
        'Operations Manager',
        'QA Engineer'
      ]
    },
    employmentTypes: {
      type: [String],
      default: ['Full-Time', 'Part-Time', 'Intern', 'Contract']
    },
    gracePeriodMinutes: {
      type: Number,
      default: 15
    },
    enableGracePeriod: {
      type: Boolean,
      default: true
    },
    halfDayThresholdHours: {
      type: Number,
      default: 6
    },
    halfDayDeductionPercentage: {
      type: Number,
      default: 50
    },
    enableLateDeduction: {
      type: Boolean,
      default: true
    },
    enableShortfallDeduction: {
      type: Boolean,
      default: false
    },
    fullDayCutoffMinutes: {
      type: Number,
      default: 120
    },
    morningHalfDayCutoffMinutes: {
      type: Number,
      default: 60
    },
    afternoonHalfDayCutoffMinutes: {
      type: Number,
      default: 60
    },
    lunchStartTime: {
      type: String,
      default: '13:30'
    },
    monthlyClAllowance: {
      type: Number,
      default: 1
    },
    yearlyClTotal: {
      type: Number,
      default: 12
    },
    yearlySlTotal: {
      type: Number,
      default: 12
    },
    defaultRequiredHours: {
      type: Number,
      default: 8
    },
    dailyRateBasis: {
      type: String,
      enum: ['CalendarDays', 'WorkingDays', '30DaysFixed'],
      default: 'WorkingDays'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
