const mongoose = require('mongoose');

const welAttendanceSchema = new mongoose.Schema({
  intakeGroups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IntakeGroup',
    required: true,
  }],
  campuses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    required: true,
  }],
  dateFrom: {
    type: Date,
    required: true,
  },
  dateTo: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('WelAttendance', welAttendanceSchema);
