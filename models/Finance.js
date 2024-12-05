const mongoose = require('mongoose');

const financeSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  payableFees: [
    {
      amount: {
        type: Number,
        required: true,
      },
      arrears: {
        type: Number,
        default: 0,
      },
      dueDate: {
        type: Date,
      },
    },
  ],
  collectedFees: [
    {
      description: {
        type: String,
      },
      debit: {
        type: Number,
        default: 0,
      },
      credit: {
        type: Number,
        default: 0,
      },
      balance: {
        type: String,
        required: true,
      },
      transactionDate: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

module.exports = mongoose.model('Finance', financeSchema);
