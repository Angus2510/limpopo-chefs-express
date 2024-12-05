const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  lecturer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
  },
  intakeGroups: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'IntakeGroup',
    },
  ],
  individualStudents: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
    },
  ],
  campus: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campus',
    },
  ],
  outcome: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outcome',
    },
  ],

  type: { type: String, enum: ['Test', 'Task', 'Other'] },

  password: {
    type: String,
  },
  availableFrom: {
    type: Date,
  },
  availableUntil: {
    type: Date,
  },
  duration: {
    type: Number,
  },
  questions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
    },
  ],
},
{
  timestamps: true,
}
);
module.exports = mongoose.model('Assignment', assignmentSchema);
