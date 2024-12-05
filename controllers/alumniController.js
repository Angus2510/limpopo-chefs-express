const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');
const Accommodation = require('../models/Accommodation');

// @desc Get all alumni
// @route GET /alumni
// @access Private
const getAllAlumni = asyncHandler(async (req, res) => {
  // Get all alumni from MongoDB where alumni is true
  const alumni = await Student.find({ alumni: true })
    .select('-password')
    .populate('intakeGroup')
    .populate('campus')
    .lean();

  // If no alumni found
  if (!alumni?.length) {
    return res.status(400).json({ message: 'No alumni found' });
  }

  res.json(alumni);
});

// @desc Get a single alumni by ID
// @route GET /alumni/:id
// @access Private
const getAlumniById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: 'Alumni ID is required' });
  }

  try {
    let alumni = await Student.findById(id).lean();

    if (!alumni) {
      return res.status(404).json({ message: 'Alumni not found' });
    }

    const populations = [
      { path: 'campus' },
      { path: 'intakeGroup' },
      { path: 'assignments' },
      { path: 'qualification' },
      {
        path: 'guardians',
        model: 'Guardian', 
        select: 'firstName lastName email mobileNumber relation -_id',
      },
    ];

    for (let populate of populations) {
      try {
        alumni = await Student.populate(alumni, populate);
      } catch (popError) {
        console.error(`Failed to populate ${populate.path}: ${popError.message}`);
        continue;
      }
    }

    // Use local proxy URL for the avatar if it exists
    if (alumni.profile && alumni.profile.avatar) {
      const avatarKey = alumni.profile.avatar.split('.com/')[1];
      alumni.profile.avatar = `https://limpopochefs.vercel.app/api/files/getFile?key=${avatarKey}`;
    }

    // Find accommodations where the alumni is an occupant
    const accommodations = await Accommodation.find({ occupants: id }).lean();
    alumni.accommodations = accommodations;

    // Include current accommodation details
    if (alumni.accommodations.length > 0) {
      alumni.currentAccommodation = alumni.accommodations[0];
    } else {
      alumni.currentAccommodation = null;
    }

    res.json(alumni);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to retrieve alumni' });
  }
});


// @desc Toggle alumni status of a student
// @route PUT /alumni/toggle/:id
// @access Private
const toggleAlumniStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: 'Student ID is required' });
  }

  try {
    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Toggle alumni status
    student.alumni = !student.alumni;
    await student.save();

    res.json({ message: `Alumni status toggled for student ${id}`, alumni: student.alumni });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to toggle alumni status' });
  }
});


module.exports = {
  getAllAlumni,
  getAlumniById,
  toggleAlumniStatus,
};
