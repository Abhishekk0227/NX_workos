const mongoose = require('mongoose');

const broadcastSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    targetType: {
      type: String,
      enum: ['ALL', 'SPECIFIC', 'MULTIPLE'],
      required: true,
      default: 'ALL'
    },
    targetEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    targetEmployees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
      }
    ],
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    priority: {
      type: String,
      enum: ['Normal', 'High', 'Urgent'],
      default: 'Normal'
    },
    category: {
      type: String,
      enum: ['General', 'Operational', 'Emergency', 'HR Policy', 'Policy', 'Holiday', 'Maintenance', 'Meeting', 'Event', 'Other'],
      default: 'General'
    },
    isPinnedBanner: {
      type: Boolean,
      default: true
    },
    sendPush: {
      type: Boolean,
      default: true
    },
    acknowledgedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        employee: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Employee'
        },
        acknowledgedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Broadcast', broadcastSchema);
