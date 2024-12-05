const Guardian = require('../models/Guardian');
const asyncHandler = require('express-async-handler');

// @desc Get all Campuses
// @route GET /campuses
// @access Private
const getAllGuardians = asyncHandler(async (req, res) => {
  // Get all notes from MongoDB
  const guardians = await Guardian.find().lean();

  // If no intake groups
  if (!guardians?.length) {
    return res.status(400).json({ message: 'No guardians found' });
  }

  res.json(guardians);
});

// @desc Create new campus
// @route POST /campuses
// @access Private
const createNewGuardian = asyncHandler(async (req, res) => {
  const { firstName } = req.body;

  // Confirm data
  if (!firstName) {
    return res.status(400).json({ message: 'First Name is required' });
  }

  const guardianObject = { firstName };

  // Create and store new campus
  const guardian = await guardian.create(guardianObject);

  if (guardian) {
    //created
    res.status(201).json({ message: `New Guardian ${title} created` });
  } else {
    res.status(400).json({ message: 'Invalid Guardian data received' });
  }
});

module.exports = {
  getAllGuardians,
  createNewGuardian,
};
