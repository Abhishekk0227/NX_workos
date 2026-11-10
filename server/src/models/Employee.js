const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true
    },
    officialEmail: {
      type: String,
      required: [true, 'Official email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Valid email is required']
    },
    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      trim: true
    },
    employmentType: {
      type: String,
      enum: ['Full-Time', 'Full-time', 'Part-Time', 'Part-time', 'Intern', 'Internship', 'Contract'],
      default: 'Full-time'
    },
    joiningDate: {
      type: Date,
      default: Date.now
    },
    assignedShift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShiftTemplate',
      default: null
    },
    weeklyOff: {
      type: [String],
      enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      default: ['Sunday']
    },
    leavePolicy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeavePolicy',
      default: null
    },
    employmentStatus: {
      type: String,
      enum: ['Active', 'Inactive', 'Terminated'],
      default: 'Active'
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    profilePicture: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Employee', employeeSchema);
