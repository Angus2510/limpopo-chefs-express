const asyncHandler = require('express-async-handler');
const Staff = require('../models/Staff');
const Guardian = require('../models/Guardian');
const Student = require('../models/Student');

// Function to handle email verification
const verifyEmail = asyncHandler(async (req, res) => {
  // Email verification logic...
  res.json({ message: 'Email verification request received' });
});

module.exports = {
  verifyEmail,
};
