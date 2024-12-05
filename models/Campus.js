const mongoose = require('mongoose');

const campusSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('Campus', campusSchema);
