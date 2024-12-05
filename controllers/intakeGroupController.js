const IntakeGroup = require('../models/IntakeGroup');
const Student = require('../models/Student'); // Ensure Student model is imported
const asyncHandler = require('express-async-handler');

// @desc Get all Intake Groups with their students
// @route GET /intakegroups
// @access Private
const getAllIntakeGroups = asyncHandler(async (req, res) => {
  const intakeGroups = await IntakeGroup.find()
    .populate('campus', 'title') 
    .populate('outcome', 'title') 
    .lean();

  if (!intakeGroups?.length) {
    return res.status(400).json({ message: 'No intake groups found' });
  }

  const intakeGroupsWithTitles = intakeGroups.map(intakeGroup => ({
    ...intakeGroup,
    campus: intakeGroup.campus.map(campus => campus.title), 
    outcome: intakeGroup.outcome.map(outcome => outcome.title),
  }));

  res.json(intakeGroupsWithTitles);
});

// @desc Create new intake group
// @route POST /intakegroups
// @access Private
const createNewIntakeGroup = asyncHandler(async (req, res) => {
  const { title, campus, outcome } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'Title is required' });
  }

  if (!campus || !Array.isArray(campus) || campus.length === 0) {
    return res.status(400).json({ message: 'At least one campus is required' });
  }

  if (!outcome || !Array.isArray(outcome) || outcome.length === 0) {
    return res.status(400).json({ message: 'At least one outcome is required' });
  }

  const duplicate = await IntakeGroup.findOne({ title }).lean().exec();
  if (duplicate) {
    return res.status(409).json({ message: 'Intake Group already exists.' });
  }

  const intakeGroup = await IntakeGroup.create({ title, campus, outcome });
  if (intakeGroup) {
    res.status(201).json({ message: `New intake group ${title} created` });
  } else {
    res.status(400).json({ message: 'Invalid intake group data received' });
  }
});

// @desc Get an intake group by ID
// @route GET /intakegroups/:id
// @access Private
const getIntakeGroupById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const intakeGroup = await IntakeGroup.findById(id)
    .populate('campus', 'title')
    .populate('outcome', 'title')
    .lean();

  if (!intakeGroup) {
    return res.status(404).json({ message: 'Intake Group not found' });
  }
  res.json(intakeGroup);
});

// @desc Update an intake group
// @route PUT /intakegroups/:id
// @access Private
const updateIntakeGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, campus, outcome } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'Title is required' });
  }

  if (!campus || !Array.isArray(campus) || campus.length === 0) {
    return res.status(400).json({ message: 'At least one campus is required' });
  }

  if (!outcome || !Array.isArray(outcome) || outcome.length === 0) {
    return res.status(400).json({ message: 'At least one outcome is required' });
  }

  const intakeGroup = await IntakeGroup.findById(id).exec();
  if (!intakeGroup) {
    return res.status(404).json({ message: 'Intake Group not found' });
  }

  intakeGroup.title = title;
  intakeGroup.campus = campus;
  intakeGroup.outcome = outcome;

  const updatedIntakeGroup = await intakeGroup.save();
  res.json({ message: `Intake group ${title} updated`, updatedIntakeGroup });
});


module.exports = {
  getAllIntakeGroups,
  createNewIntakeGroup,
  getIntakeGroupById,
  updateIntakeGroup,
};
