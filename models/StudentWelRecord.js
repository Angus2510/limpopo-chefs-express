const mongoose = require('mongoose');

const welRecordSchema = new mongoose.Schema({
  establishmentName: {
    type: String,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  totalHours: {
    type: Number,
    required: true,
  },
  establishmentContact: {
    type: String,
    required: true,
  },
  evaluated: {
    type: Boolean,
    default: false,
  },
});

const studentWelRecordSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  welRecords: [welRecordSchema],
}, {
  timestamps: true,
});

module.exports = mongoose.model('StudentWelRecord', studentWelRecordSchema);
