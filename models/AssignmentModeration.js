const mongoose = require('mongoose');

// AssignmentModeration Schema
const assignmentModerationSchema = new mongoose.Schema({
  assignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true,
  },
  assignmentResult: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AssignmentResult',
    required: true,
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true,
  },
  moderationEntries: [
    {
      lecturer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff',
        required: true,
      },
      question: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
        required: true,
      },
      answer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Answer',
        required: true,
      },
      moderatedMark: {
        type: Number,
        required: true,
      },
      date: {
        type: Date,
        default: Date.now,
      },
    },
  ],
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

module.exports = mongoose.model('AssignmentModeration', assignmentModerationSchema);
