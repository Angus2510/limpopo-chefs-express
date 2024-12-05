const mongoose = require('mongoose');

const assignmentResultSchema = new mongoose.Schema({
  assignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true,
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  dateTaken: {
    type: Date,
    default: Date.now,
  },
  scores: {
    type: Number,
  },

  percent: {
    type: Number,
  },

  moderatedscores: {
    type: Number,
  },

  status: {
    type: String,
    enum: ['Pending', 'Marked', 'Moderated','Terminated','Writing','Starting'],
    default: 'Starting',
  },
  reason:{
    type: String,
  },
  feedback:[
    {
      type: String,
    },
  ],
  outcome:
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outcome',
    },
  campus:{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campus',
    },
  intakeGroup:{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'IntakeGroup',
    },

  answers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Answer',
    },
  ],
});

module.exports = mongoose.model('AssignmentResult', assignmentResultSchema);
