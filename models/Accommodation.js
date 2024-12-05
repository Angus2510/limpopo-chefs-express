const mongoose = require('mongoose');

const accommodationSchema = new mongoose.Schema({
  roomNumber: {
    type: String,
  },
  address: {
    type: String,
  },
  roomType: {
    type: String,
  },
  occupantType: {
    type: String,
  },
  numberOfOccupants: {
    type: Number,
  },
  costPerBed: {
    type: Number,
  },
  occupants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }]
});

module.exports = mongoose.model('Accommodation', accommodationSchema);
