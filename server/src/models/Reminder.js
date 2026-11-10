const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Reminder title is required'],
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    date: {
      type: String, // YYYY-MM-DD in IST
      required: true,
      index: true
    },
    time: {
      type: String, // HH:mm in IST
      required: true
    },
    remindAt: {
      type: Date,
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: [
        'Task Reminder',
        'Due Date Reminder',
        'Work Update Reminder',
        'Follow-up Reminder',
        'Meeting Reminder',
        'Payment Reminder',
        'Daily Reminder',
        'Personal Reminder',
        'Custom Reminder'
      ],
      default: 'Task Reminder'
    },
    linkedTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium'
    },
    repeat: {
      type: String,
      enum: ['None', 'Daily', 'Weekly', 'Monthly', 'Custom'],
      default: 'None'
    },
    notificationType: {
      type: String,
      enum: ['In-App', 'Browser Push', 'Sound', 'All'],
      default: 'All'
    },
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Snoozed', 'Dismissed'],
      default: 'Pending',
      index: true
    },
    snoozedUntil: {
      type: Date,
      default: null
    },
    isTriggered: {
      type: Boolean,
      default: false
    },
    triggeredAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Reminder', reminderSchema);

