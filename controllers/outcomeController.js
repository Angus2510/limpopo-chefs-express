const Outcome = require('../models/Outcome');
const IntakeGroup = require('../models/IntakeGroup');
const asyncHandler = require('express-async-handler');

// @desc Get all visible Outcomes with their associated intake groups
// @route GET /outcomes
// @access Private
const getAllVisibleOutcomes = asyncHandler(async (req, res) => {
  const outcomes = await Outcome.find({
    $or: [{ hidden: false }, { hidden: { $exists: false } }]
  }).lean();

  if (!outcomes.length) {
    return res.status(400).json({ message: 'No visible outcomes found' });
  }

  // Fetch intake groups for each outcome and add them to the outcome data
  const outcomesWithIntakeGroups = await Promise.all(
    outcomes.map(async (outcome) => {
      const intakeGroups = await IntakeGroup.find({
        outcomes: outcome._id, // Assuming there is a reference in the IntakeGroup model to outcomes
      }).lean();
      return { ...outcome, intakeGroups };
    })
  );

  console.log(outcomesWithIntakeGroups);
  res.json(outcomesWithIntakeGroups);
});


// @desc Get all Outcomes with their associated intake groups
// @route GET /outcomes
// @access Private
const getAllOutcomes = asyncHandler(async (req, res) => {
  const outcomes = await Outcome.find().lean();

  if (!outcomes.length) {
    return res.status(400).json({ message: 'No outcomes found' });
  }

  // Fetch intake groups for each outcome and add them to the outcome data
  const outcomesWithIntakeGroups = await Promise.all(
    outcomes.map(async (outcome) => {
      const intakeGroups = await IntakeGroup.find({
        outcomes: outcome._id,
      }).lean();
      return { ...outcome, intakeGroups };
    })
  );

  res.json(outcomesWithIntakeGroups);
});

// @desc Get outcome by ID
// @route GET /outcomes/:id
// @access Private
const getOutcomeById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const outcome = await Outcome.findById(id).lean();

  if (!outcome) {
    return res.status(404).json({ message: 'Outcome not found' });
  }

  res.json(outcome);
});
// @desc Create new outcome
// @route POST /outcomes
// @access Private
const createNewOutcome = asyncHandler(async (req, res) => {
  const { title, type } = req.body;

  if (!title || !type) {
    return res.status(400).json({ message: 'Title and type are required' });
  }

  const duplicate = await Outcome.findOne({ title }).lean();
  if (duplicate) {
    return res.status(409).json({ message: 'Outcome already exists.' });
  }

  const outcome = await Outcome.create({ title, type });
  if (outcome) {
    res.status(201).json({ message: `New outcome '${title}' created` });
  } else {
    res.status(400).json({ message: 'Invalid outcome data received' });
  }
});

// @desc Update outcome
// @route PUT /outcomes/:id
// @access Private
const updateOutcome = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, type, hidden } = req.body;

  if (!title || !type) {
    return res.status(400).json({ message: 'Title and type are required' });
  }

  const outcome = await Outcome.findById(id);

  if (!outcome) {
    return res.status(404).json({ message: 'Outcome not found' });
  }

  outcome.title = title;
  outcome.type = type;
  if (hidden !== undefined) {
    outcome.hidden = hidden;
  }

  const updatedOutcome = await outcome.save();

  res.json({ message: `Outcome '${updatedOutcome.title}' updated`, outcome: updatedOutcome });
});


module.exports = {
  getAllVisibleOutcomes,
  getAllOutcomes,
  getOutcomeById,
  createNewOutcome,
  updateOutcome,
};
