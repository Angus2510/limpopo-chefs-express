const mongoose = require('mongoose');

const qrCodeSchema = new mongoose.Schema({

intakeGroup: [
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'IntakeGroup',
    },
  ],
  campus: {
    type: String,
    required: true,
  },
  attendanceDate: {
    type: Date,
    required: true,
  },
  endDate: Date, 
  type: {
    type: String,
    enum: ['One Day', 'Custom Time'],
    required: true,
  },
  qrcode:{
    type: String,
  }
});

module.exports = mongoose.model('Qr', qrCodeSchema);