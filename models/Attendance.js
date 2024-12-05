const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  intakeGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IntakeGroup',
    required: true,
  },
  campus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
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
  attendees: [
    {
      student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
      },
      timeCheckedIn: Date,
      status: {
        type: String,
        enum: ['P', 'A', 'H', 'AR', 'WEL', 'N'],
        default: 'N',
        required: true,
      },
    },
  ],
});

module.exports = mongoose.model('Attendance', attendanceSchema);
