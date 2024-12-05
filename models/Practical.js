const mongoose = require('mongoose');

const practicalSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true, 
  },
  conductedOn: {
    type: Date,
    default: Date.now,
    required: true,
  },
  details: {
    type: String,
    required: true,
  },
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student', 
    },
  ],
  results: [
    {
      student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true,
      },
      score: {
        type: Number,
        required: true,
      },
      notes: String,
      overallOutcome: {
        type: String,
        enum: ['Competent', 'Not Yet Competent'],
        default: 'Not Yet Competent'
      },
    },
  ],
  outcome:{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outcome',
    },
  campus:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campus',
      },

  intakeGroups:{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'IntakeGroup',
        },
  observer: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('Practical', practicalSchema);
