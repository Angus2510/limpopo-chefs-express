// studentSettingsController.js
const Student = require('../models/Student');

const toggleStudentStatus = async (req, res) => {
  try {
    const studentId = req.params.id;
    const { reason } = req.body;
    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (student.active) {
      // Disabling the student, reason is required
      if (!reason) {
        return res.status(400).json({ message: 'Reason is required when disabling a student' });
      }
      student.active = false;
      student.inactiveReason = reason;
    } else {
      // Enabling the student, clear the inactive reason
      student.active = true;
      student.inactiveReason = '';
    }

    await student.save();

    res.status(200).json({ message: `Student status updated to ${student.active ? 'active' : 'disabled'}`, student });
  } catch (error) {
    res.status(500).json({ message: 'An error occurred', error });
  }
};

module.exports = {
  toggleStudentStatus,
};
