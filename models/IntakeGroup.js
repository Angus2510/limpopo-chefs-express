const mongoose = require('mongoose');

const intakeGroupSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
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
});

module.exports = mongoose.model('IntakeGroup', intakeGroupSchema);
