const mongoose = require('mongoose');

const subtaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    isCompleted: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

const updateCommentSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    authorName: {
      type: String,
      default: ''
    },
    text: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const attachmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    fileType: { type: String, default: '' },
    uploadedAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    taskType: {
      type: String,
      enum: ['Personal', 'HR_Assigned', 'Manager_Assigned'],
      default: 'Personal'
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    category: {
      type: String,
      default: 'General',
      trim: true
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium'
    },
    status: {
      type: String,
      enum: ['New', 'In Progress', 'Submitted', 'Pending Review', 'Completed', 'Overdue', 'On Hold'],
      default: 'New'
    },
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    startDate: {
      type: Date,
      default: null
    },
    dueDate: {
      type: Date,
      default: null
    },
    subtasks: [subtaskSchema],
    updates: [updateCommentSchema],
    attachments: [attachmentSchema],
    completionRemarks: {
      type: String,
      default: ''
    },
    deadlineMissed: {
      type: Boolean,
      default: false,
      index: true
    },
    missedDeadlineAt: {
      type: Date,
      default: null
    },
    submittedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    isSubmittedLate: {
      type: Boolean,
      default: false
    },
    submissionNote: {
      type: String,
      default: '',
      trim: true
    },
    submissionLink: {
      type: String,
      default: '',
      trim: true
    },
    managerFeedback: {
      type: String,
      default: '',
      trim: true
    },
    auditHistory: [
      {
        action: String,
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        performedAt: {
          type: Date,
          default: Date.now
        },
        details: mongoose.Schema.Types.Mixed
      }
    ]
  },
  {
    timestamps: true
  }
);

// Pre-save hook: auto-calculate progress percentage if subtasks exist
taskSchema.pre('save', function (next) {
  if (this.subtasks && this.subtasks.length > 0) {
    const completedCount = this.subtasks.filter(s => s.isCompleted).length;
    this.progressPercentage = Math.round((completedCount / this.subtasks.length) * 100);
    if (this.progressPercentage === 100 && this.status !== 'Completed') {
      this.status = 'Completed';
    }
  }

  // Check overdue condition and mark deadline missed
  if (this.dueDate && !['Completed', 'Submitted', 'On Hold'].includes(this.status) && new Date(this.dueDate) < new Date()) {
    this.status = 'Overdue';
    this.deadlineMissed = true;
    if (!this.missedDeadlineAt) {
      this.missedDeadlineAt = new Date();
    }
  }
  next();
});

module.exports = mongoose.model('Task', taskSchema);
