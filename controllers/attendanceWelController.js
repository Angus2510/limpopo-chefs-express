const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const WelAttendance = require('../models/WelAttendance'); 
const StudentWelRecord = require('../models/StudentWelRecord'); 

// Ensure ObjectId is used correctly
const ObjectId = mongoose.Types.ObjectId;

exports.addWelAttendance = async (req, res) => {
  try {
    const { intakeGroup, campuses, attendanceDate, endDate } = req.body;

    // Ensure intakeGroup and campuses are arrays
    const intakeGroups = Array.isArray(intakeGroup) ? intakeGroup : [intakeGroup];
    const campusesArray = Array.isArray(campuses) ? campuses : [campuses];

    console.log('Received intake groups:', intakeGroups);
    console.log('Received campuses:', campusesArray);

    // Determine dates for attendance
    const startDate = new Date(attendanceDate);
    const end = endDate ? new Date(endDate) : startDate; 
    const dates = [];
    let currentDate = startDate;

    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log('Determined dates for attendance:', dates);

    const newWelAttendance = new WelAttendance({
        intakeGroups: intakeGroups.map(id => new ObjectId(id)),
        campuses: campusesArray.map(id => new ObjectId(id)),
        dateFrom: startDate,
        dateTo: end,
      });

    await newWelAttendance.save();
    console.log('Created new WelAttendance record:', newWelAttendance);

    // Iterate over each intake group and campus
    for (const intakeGroupId of intakeGroups) {
      for (const campusId of campusesArray) {
        // Find all students for the given intake group and campus
        const students = await Student.find({
          intakeGroup: new ObjectId(intakeGroupId),
          campus: new ObjectId(campusId),
        }).select('_id');

        console.log(`Fetched students for intake group ${intakeGroupId} and campus ${campusId}:`, students);

        // Check if any students were found
        if (students.length === 0) {
          console.log(`No students found for intake group ${intakeGroupId} and campus ${campusId}.`);
          continue;
        }

        // Prepare attendance data
        const attendanceData = students.map(student => ({
          student: student._id,
          status: 'WEL', // Mark all as WEL (wellness)
        }));

        // Update or create attendance records for each date
        for (const date of dates) {
          let attendanceRecord = await Attendance.findOne({
            intakeGroup: new ObjectId(intakeGroupId),
            campus: new ObjectId(campusId),
            attendanceDate: date,
          });

          if (!attendanceRecord) {
            // Create a new attendance record if one does not exist
            attendanceRecord = new Attendance({
              intakeGroup: new ObjectId(intakeGroupId),
              campus: new ObjectId(campusId),
              attendanceDate: date,
              endDate: endDate,
              type: endDate ? 'Custom Time' : 'One Day',
              attendees: [],
            });
            console.log(`Creating new attendance record for date: ${date} and intake group: ${intakeGroupId}`);
          } else {
            console.log(`Updating existing attendance record for date: ${date} and intake group: ${intakeGroupId}`);
          }

          // Update attendees
          attendanceData.forEach(att => {
            const existingAttendee = attendanceRecord.attendees.find(a => a.student.toString() === att.student.toString());
            if (existingAttendee) {
              // Update existing attendee status
              existingAttendee.status = att.status;
              console.log(`Updating status for student: ${att.student} in intake group: ${intakeGroupId}`);
            } else {
              // Add new attendee
              attendanceRecord.attendees.push(att);
              console.log(`Adding new attendee for student: ${att.student} in intake group: ${intakeGroupId}`);
            }
          });

          // Save the record
          await attendanceRecord.save();
          console.log(`Saved attendance record for date: ${date} and intake group: ${intakeGroupId}`);
        }


        // Create or update student WEL records
        for (const student of students) {
          let studentWelRecord = await StudentWelRecord.findOne({ student: student._id });

          if (!studentWelRecord) {
            // Create a new StudentWelRecord if one does not exist
            studentWelRecord = new StudentWelRecord({
              student: student._id,
              welRecords: [],
            });
            console.log(`Creating new WEL record for student: ${student._id}`);
          }

          // Add a new WEL record to the welRecords array
          studentWelRecord.welRecords.push({
            establishmentName: ' ',
            startDate: attendanceDate,
            endDate: endDate,
            totalHours: 0,
            establishmentContact: ' ',
          });

          // Save the student WEL record
          await studentWelRecord.save();
          console.log(`Updated WEL record for student: ${student._id}`);
        }
      }
    }

    res.status(201).json({ message: 'WEL attendance added successfully' });
  } catch (error) {
    console.error('Error in addWelAttendance:', error);
    res.status(500).json({ error: 'Error adding WEL attendance' });
  }
};


exports.getAllWelAttendance = async (req, res) => {
  try {
    const welAttendanceRecords = await WelAttendance.find()
      .populate('intakeGroups', 'title')
      .populate('campuses', 'title');

    res.status(200).json(welAttendanceRecords);
  } catch (error) {
    console.error('Error in getAllWelAttendance:', error);
    res.status(500).json({ error: 'Error fetching WEL attendance records' });
  }
};
