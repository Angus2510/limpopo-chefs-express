const Campus = require('../models/Campus');
const Student = require('../models/Student'); // Ensure Student model is imported
const asyncHandler = require('express-async-handler');

// @desc Get all Campuses with their students
// @route GET /campuses
// @access Private
const getAllCampuses = asyncHandler(async (req, res) => {
  const campuses = await Campus.find().lean();

  if (!campuses?.length) {
    return res.status(400).json({ message: 'No campuses found' });
  }

  // Fetch students for each campus and add them to the campus data
  const campusesWithStudents = await Promise.all(
    campuses.map(async (campus) => {
      const students = await Student.find({ campus: campus._id }).lean(); // Assuming 'campus' field in Student model references Campus
      return { ...campus, students };
    })
  );

  res.json(campusesWithStudents);
});

// @desc Create new campus
// @route POST /campuses
// @access Private
const createNewCampus = asyncHandler(async (req, res) => {
  const { title } = req.body; 

  if (!title) {
    return res.status(400).json({ message: 'Title is required' });
  }

  const duplicate = await Campus.findOne({ title }).lean().exec();
  if (duplicate) {
    return res.status(409).json({ message: 'Campus already exists.' });
  }

  const campus = await Campus.create({ title });
  if (campus) {
    res.status(201).json({ message: `New campus ${title} created` });
  } else {
    res.status(400).json({ message: 'Invalid campus data received' });
  }
});

const deleteCampus = asyncHandler(async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: 'Campus ID is required' });
  }
  const campus = await Campus.findById(id).exec();

  if (!campus) {
    return res.status(404).json({ message: 'Campus not found' });
  }

  await campus.deleteOne();

  res.status(200).json({ message: `Campus ${campus.title} deleted successfully` });
});

module.exports = {
  getAllCampuses,
  createNewCampus,
  deleteCampus,
};
