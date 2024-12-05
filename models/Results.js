
const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  title: {
    type: String,
  },
  conductedOn: {
    type: Date,
    default: Date.now,
    required: true,
  },
  details: {
    type: String,
  },
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
    },
  ],
  resultType: {
    type: String, 
    enum: ['Practical', 'Theory','Exams/Well'],
    required: true,
  },
  results: [
    {
      student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true,
      },
      score: Number, 
      testScore: Number,
      taskScore: Number, 
      notes: String,
      overallOutcome: {
        type: String,
        enum: ['Competent', 'Not Yet Competent'],
      },
    },
  ],
  outcome: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Outcome',
  },
  campus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
  },
  intakeGroups: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IntakeGroup',
  },
  observer: {
    type: String,
  },
});

module.exports = mongoose.model('Result', resultSchema);
