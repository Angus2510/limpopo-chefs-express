const Student = require('../models/Student');
const Event = require('../models/Event');
const moment = require('moment');
const Attendance = require('../models/Attendance');
const Guardian = require('../models/Guardian');
const AssignmentResult = require('../models/AssignmentResults');
const Finance = require('../models/Finance');

const getDashboard = async (req, res) => {
 console.log(req.params)
  try {
    const { guardianId } = req.params;

    // Find all students associated with the guardian
    const students = await Student.find({ guardians: guardianId }).populate('campus intakeGroup').exec();

    if (!students.length) {
      return res.status(404).json({ error: 'No students found for this guardian' });
    }

    // Collect all campuses and intake groups of the students
    const studentCampuses = [];
    const studentIntakeGroups = [];
    students.forEach(student => {
      student.campus.forEach(campus => {
        if (!studentCampuses.includes(campus._id)) {
          studentCampuses.push(campus._id);
        }
      });
      student.intakeGroup.forEach(intakeGroup => {
        if (!studentIntakeGroups.includes(intakeGroup._id)) {
          studentIntakeGroups.push(intakeGroup._id);
        }
      });
    });

    // Find events that match the students' campuses and/or intake groups
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
    console.error('Error fetching guardian dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch guardian dashboard' });
  }
};

  
const getAssignmentResultsByGuardianId = async (req, res) => {
  const { guardianId } = req.params;

  try {
    console.log(`Fetching students for guardian ID: ${guardianId}`);
    const students = await Student.find({ guardians: guardianId }).select('_id');

    if (!students.length) {
      console.log(`No students found for guardian ID: ${guardianId}`);
      return res.status(404).json({ error: 'No students found for this guardian' });
    }

    const studentIds = students.map(student => student._id);
    console.log(`Found students: ${JSON.stringify(studentIds)}`);

    console.log(`Fetching assignment results for students: ${JSON.stringify(studentIds)}`);
    const assignmentResults = await AssignmentResult.find({ student: { $in: studentIds } })
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
      .populate('student', 'profile.firstName profile.lastName')
      .populate('intakeGroup', 'title')
      .populate('campus', 'title');

    res.json(assignmentResults);
  } catch (err) {
    console.error(`Error fetching assignment results by guardian ID: ${guardianId}`, err);
    res.status(500).json({ error: 'Failed to fetch assignment results' });
  }
};

  
  const getAttendance = async (req, res) => {
    try {
      const { guardianId } = req.params;
      const { month, year } = req.query;
  
      // Find students associated with the guardian ID
      const students = await Student.find({ guardians: guardianId });
      if (!students.length) {
        return res.status(404).json({ error: 'No students found for this guardian' });
      }
  
      const studentIds = students.map(student => student._id);
  
      // Define the start and end dates of the month
      const startDate = moment(`${year}-${month}-01`).startOf('month').toDate();
      const endDate = moment(startDate).endOf('month').toDate();
  
      // Fetch attendance records for the students within the specified month
      const attendanceRecords = await Attendance.find({
        'attendees.student': { $in: studentIds },
        attendanceDate: { $gte: startDate, $lte: endDate },
      }).populate('attendees.student');
  
      // Format the response
      const formattedAttendance = attendanceRecords.map(record => ({
        date: moment(record.attendanceDate).format('YYYY-MM-DD'),
        type: record.type,
        status: record.attendees.map(att => ({
          studentId: att.student._id,
          status: att.status
        }))
      }));
  
      res.status(200).json({ success: true, data: formattedAttendance });
    } catch (error) {
      console.error('Error fetching attendance by guardian ID:', error);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  };
  
  
  
  const getFees = async (req, res) => {
    try {
      const { guardianId } = req.params;
      console.log(`Received request to get fees for guardian ID: ${guardianId}`);
      
      const students = await Student.find({ guardians: guardianId });
      console.log(`Found students: ${JSON.stringify(students)}`);
      
      if (!students || students.length === 0) {
        console.log('No students found for this guardian.');
        return res.status(404).send({ message: 'No students found for this guardian.' });
      }
      
      const studentIds = students.map(student => student._id);
      console.log(`Student IDs: ${studentIds}`);
      
      const finances = await Finance.find({ student: { $in: studentIds } }).populate('student');
      console.log(`Found finances: ${JSON.stringify(finances)}`);
      
      if (!finances || finances.length === 0) {
        console.log('No collected fees found for this guardian\'s students.');
        return res.status(404).send({ message: 'No collected fees found for this guardian\'s students.' });
      }
      
      const collectedFees = finances.flatMap(finance => finance.collectedFees);
      console.log(`Collected Fees: ${JSON.stringify(collectedFees)}`);
      
      res.status(200).send(collectedFees);
    } catch (error) {
      console.error('Error fetching fees:', error);
      res.status(500).send(error);
    }
  };
  
  module.exports = {
    getDashboard,
    getAssignmentResultsByGuardianId,
    getAttendance,
    getFees,
  };
  