const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  uploadType: {
    type: String,
    enum: ['Study Material', 'Assignment', 'Other'], // Example types
    required: true,
  },
  dateUploaded: {
    type: Date,
    default: Date.now,
  },
  description: {
    type: String,
  },
  intakeGroup:[
    {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IntakeGroup',
    required: true,
  },
],
  filePath: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('LearningMaterial', uploadSchema);
