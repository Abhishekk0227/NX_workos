const mongoose = require('mongoose');

const leaveLedgerSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true
    },
    leaveType: {
      type: String,
      enum: ['CL', 'SL', 'LWP'],
      required: true
    },
    transactionType: {
      type: String,
      enum: ['Credit', 'Debit', 'Reversal', 'Adjustment'],
      required: true
    },
    units: {
      type: Number,
      required: true
    },
    referenceModel: {
      type: String,
      enum: ['LeaveRequest', 'PayrollRecord', 'ManualAdjustment', 'PolicyGrant'],
      default: 'LeaveRequest'
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    remarks: {
      type: String,
      default: ''
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('LeaveLedger', leaveLedgerSchema);
