const StudentWelRecord = require('../models/StudentWelRecord');

// Add a new W.E.L record for a student
const addWelRecord = async (req, res) => {
  try {
    const { studentId, welRecords } = req.body;
    let studentWelRecord = await StudentWelRecord.findOne({ student: studentId });

    if (!studentWelRecord) {
      studentWelRecord = new StudentWelRecord({ student: studentId, welRecords: welRecords });
    } else {
      // Replace the welRecords array with the new records
      studentWelRecord.welRecords = welRecords;
    }

    await studentWelRecord.save();
    res.status(201).send(studentWelRecord);
  } catch (error) {
    res.status(500).send(error);
  }
};

// Get all W.E.L records for a specific student
const getWelRecordsByStudentId = async (req, res) => {
  try {
    const { studentId } = req.params;
    const studentWelRecord = await StudentWelRecord.findOne({ student: studentId }).populate('student');

    if (!studentWelRecord) {
      return res.status(404).send({ message: 'No W.E.L records found for this student.' });
    }

    res.status(200).send(studentWelRecord.welRecords);
  } catch (error) {
    res.status(500).send(error);
  }
};

module.exports = { addWelRecord, getWelRecordsByStudentId };
