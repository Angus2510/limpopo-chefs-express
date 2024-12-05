// models/Subscription.js
const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'userType',
    required: true,
  },
  userType: {
    type: String,
    required: true,
    enum: ['Student', 'Staff', 'Guardian'],
  },
  subscription: {
    endpoint: String,
    keys: {
      p256dh: String,
      auth: String,
    },
  },
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
