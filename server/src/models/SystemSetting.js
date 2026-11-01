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
    defaultRequiredHours: {
      type: Number,
      default: 9
    },
    dailyRateBasis: {
      type: String,
      enum: ['CalendarDays', 'WorkingDays', '30DaysFixed'],
      default: 'CalendarDays'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
