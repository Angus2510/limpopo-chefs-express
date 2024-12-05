const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['Test', 'Task', 'Class'],
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
  },

  allDay: {
    type: Boolean,
    default: false,
  },
  
  details: String,
  
  location: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campus',
    },
  ],
  assignedTo: [
    {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'assignedToModel',
    },
  ],
  assignedToModel: [
    {
      type: String,
      enum: ['IntakeGroup', 'Lecturer'],
    },
  ],

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
  },
  
  color: {
    type: String,
    enum: ['#0FBFF6', '#FF3A3A', '#FFE500', '#D4D4D4', '#E660F2', '#FFFFFF'],
    default: '#FFFFFF',
  },
});

module.exports = mongoose.model('Event', eventSchema);
