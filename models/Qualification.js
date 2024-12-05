const mongoose = require('mongoose');

const qualificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('Qualification', qualificationSchema);
