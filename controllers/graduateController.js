const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');

// Graduate students controller
const graduateStudents = asyncHandler(async (req, res) => {
  const studentsToUpdate = req.body;

  if (!Array.isArray(studentsToUpdate) || studentsToUpdate.length === 0) {
    return res.status(400).json({ message: 'No student data provided' });
  }

  const updatedStudents = await Promise.all(studentsToUpdate.map(async (student) => {
    if (!student.id) {
      throw new Error('Invalid student data');
    }
    
    // Set currentResult to 'Fail' if it's undefined
    const currentResult = student.currentResult || 'Fail';
    
    return await Student.findByIdAndUpdate(
      student.id,
      {
        currentResult: currentResult,
        alumni: true
      },
      { new: true }
    ).lean();
  }));

  res.json({ message: 'Students graduated successfully', data: updatedStudents });
});

module.exports = { graduateStudents };
