const Qualification = require('../models/Qualification');
const asyncHandler = require('express-async-handler');

// @desc Get all Qualifications
// @route GET /qualifications
// @access Private
const getAllQualifications = asyncHandler(async (req, res) => {
  const qualifications = await Qualification.find().lean();

  if (!qualifications?.length) {
    return res.status(400).json({ message: 'No qualifications found' });
  }

  res.json(qualifications);
});

// @desc Create new qualification
// @route POST /qualifications
// @access Private
const createNewQualification = asyncHandler(async (req, res) => {
  const { title } = req.body; 

  if (!title) {
    return res.status(400).json({ message: 'Title is required' });
  }

  const duplicate = await Qualification.findOne({ title }).lean().exec();
  if (duplicate) {
    return res.status(409).json({ message: 'Qualification already exists.' });
  }

  const qualification = await Qualification.create({ title });
  if (qualification) {
    res.status(201).json({ message: `New qualification ${title} created` });
  } else {
    res.status(400).json({ message: 'Invalid qualification data received' });
  }
});

const deleteQualification = asyncHandler(async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: 'Qualification ID is required' });
  }
  const qualification = await Qualification.findById(id).exec();

  if (!qualification) {
    return res.status(404).json({ message: 'Qualification not found' });
  }

  await qualification.deleteOne();

  res.status(200).json({ message: `Qualification ${qualification.title} deleted successfully` });
});

module.exports = {
  getAllQualifications,
  createNewQualification,
  deleteQualification,
};
