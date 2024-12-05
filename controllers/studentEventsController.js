const Student = require('../models/Student');
const Event = require('../models/Event');

exports.getStudentEvents = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Find the student by ID
    const student = await Student.findById(studentId).populate('campus intakeGroup').exec();

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Extract the student's campuses and intake groups
    const studentCampuses = student.campus.map(campus => campus._id);
    const studentIntakeGroups = student.intakeGroup.map(intakeGroup => intakeGroup._id);

    // Find events that match the student's campus and/or intake group
    const events = await Event.find({
      $or: [
        {
          $and: [
            { location: { $exists: true, $in: studentCampuses } },
            { assignedTo: { $exists: true, $in: studentIntakeGroups } },
          ]
        },
        { location: { $exists: true, $in: studentCampuses }, assignedTo: { $exists: false } },
        { assignedTo: { $exists: true, $in: studentIntakeGroups }, location: { $exists: false } },
      ]
    }).populate('location assignedTo').exec();

    res.status(200).json(events);
  } catch (error) {
    console.error('Error fetching student events:', error);
    res.status(500).json({ error: 'Failed to fetch student events' });
  }
};
