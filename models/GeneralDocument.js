const mongoose = require('mongoose');

const generalDocumentSchema = new mongoose.Schema({
  title: String,
  description: String,
  documentUrl: String,
  uploadDate: { type: Date, default: Date.now },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  }
});

module.exports = mongoose.model('GeneralDocument', generalDocumentSchema);