const AssignmentResult = require('../models/AssignmentResults');

const getAssignmentResultsByStudentId = async (req, res) => {
  const { studentId } = req.params;

  try {
    const assignmentResults = await AssignmentResult.find({ student: studentId })
      .populate({
        path: 'assignment',
        select: 'title availableFrom',
        populate: {
          path: 'lecturer',
          model: 'Staff', 
          select: 'profile.firstName profile.lastName',
        },
      })
      .select('assignment dateTaken status feedback')
      .populate('student', 'firstName lastName')
      .populate('intakeGroup', 'title')
      .populate('campus', 'title');

    res.json(assignmentResults);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch assignment results' });
  }
};

module.exports = {
  getAssignmentResultsByStudentId,
};
