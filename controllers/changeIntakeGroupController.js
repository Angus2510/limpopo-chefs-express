const mongoose = require('mongoose');
const Student = require('../models/Student');
const Result = require('../models/Results');
const Attendance = require('../models/Attendance');
const AssignmentResult = require('../models/AssignmentResults');
const IntakeGroup = require('../models/IntakeGroup');

exports.changeIntakeGroup = async (req, res) => {
  const { studentId, newIntakeGroupId } = req.body;

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Fetch the student details
    const student = await Student.findById(studentId).session(session);
    if (!student) {
      throw new Error('Student not found');
    }

    // Get current intake group and campus
    const currentIntakeGroupId = student.intakeGroup;
    const currentCampusId = student.campus;

    // Fetch new intake group details
    const newIntakeGroup = await IntakeGroup.findById(newIntakeGroupId).session(session);
    if (!newIntakeGroup) {
      throw new Error('New intake group not found');
    }

    // Log details for verification
    console.log(`Current Intake Group ID: ${currentIntakeGroupId}`);
    console.log(`Current Campus ID: ${currentCampusId}`);
    console.log(`New Intake Group ID: ${newIntakeGroupId}`);

    // Proceed to update related collections
    await updateRelatedCollections(
      studentId,
      currentIntakeGroupId,
      currentCampusId,
      newIntakeGroupId,
      session
    );

    // Update student's intake group
    student.intakeGroup = newIntakeGroupId;
    await student.save({ session });

    await session.commitTransaction();
    res.status(200).json({ message: 'Intake group updated successfully' });
  } catch (error) {
    await session.abortTransaction();
    console.error(`Failed to update intake group: ${error.message}`);
    res.status(500).json({ error: `Failed to update intake group: ${error.message}` });
  } finally {
    session.endSession(); 
  }
};

// Function to update related collections
const updateRelatedCollections = async (
  studentId,
  currentIntakeGroupId,
  currentCampusId,
  newIntakeGroupId,
  session
) => {
  try {
    console.log('Starting to update related collections...');

    // Update Results
   // Find all results for the student's current campus and intake group where the student is either in the results array or the participants array
   const results = await Result.find({
    campus: currentCampusId,
    intakeGroups: currentIntakeGroupId,
    $or: [
      { 'results.student': studentId },
      { participants: studentId }
    ]
  }).session(session);
  console.log(`Found ${results.length} results for student ${studentId}`);

  // Iterate through each result found
  for (const result of results) {
    console.log(`Processing result: ${JSON.stringify(result)}`);

    // Check if there is an existing result for the new intake group with the same outcome and campus
    const existingResult = await Result.findOne({
      campus: currentCampusId,
      intakeGroups: newIntakeGroupId,
      outcome: result.outcome
    }).session(session);

    // Find the student's specific result entry within the current result's results array
    const studentResult = result.results.find(r => r.student.toString() === studentId.toString());

    if (!existingResult) {
      // If no existing result is found, create a new result entry for the new intake group
      const newResult = new Result({
        title: result.title,
        conductedOn: result.conductedOn,
        details: result.details,
        participants: [...result.participants, studentId], // Add the student to the participants array
        resultType: result.resultType,
        results: studentResult ? [studentResult] : [], // Include the student's result if it exists
        outcome: result.outcome,
        campus: currentCampusId,
        intakeGroups: newIntakeGroupId,
        observer: result.observer,
      });
      await newResult.save({ session });
      console.log(`Created new result for student ${studentId} in new intake group ${newIntakeGroupId}`);
    } else {
      // If an existing result is found, update it
      if (studentResult) {
        existingResult.results.push(studentResult); // Add the student's result to the existing results array
      }
      if (!existingResult.participants.includes(studentId)) {
        existingResult.participants.push(studentId); // Add the student to the participants array if not already included
      }
      await existingResult.save({ session });
      console.log(`Updated existing result for student ${studentId} in new intake group ${newIntakeGroupId}`);
    }
  }

    // Update Attendance
    const attendances = await Attendance.find({
      intakeGroup: currentIntakeGroupId,
      campus: currentCampusId,
      'attendees.student': studentId,
    }).session(session);
    console.log(`Found ${attendances.length} attendance records for student ${studentId}`);

    for (const attendance of attendances) {
      // Check if an attendance already exists for the new intake group
      const existingAttendance = await Attendance.findOne({
        intakeGroup: newIntakeGroupId,
        campus: currentCampusId,
        attendanceDate: attendance.attendanceDate,
        'attendees.student': studentId,
      }).session(session);

      if (!existingAttendance) {
        // Create a new attendance record for the new intake group
        const newAttendance = new Attendance({
          intakeGroup: newIntakeGroupId,
          campus: currentCampusId,
          attendanceDate: attendance.attendanceDate,
          endDate: attendance.endDate,
          type: attendance.type,
          attendees: attendance.attendees,
        });
        await newAttendance.save({ session });
        console.log(`Created new attendance for student ${studentId} in new intake group ${newIntakeGroupId}`);
      } else {
        // Update existing attendance
        existingAttendance.attendees = attendance.attendees;
        await existingAttendance.save({ session });
        console.log(`Updated existing attendance for student ${studentId} in new intake group ${newIntakeGroupId}`);
      }
    }

    // Update Assignment Results
    const assignmentResults = await AssignmentResult.find({
      student: studentId,
      intakeGroup: currentIntakeGroupId,
      campus: currentCampusId,
    }).session(session);
    console.log(`Found ${assignmentResults.length} assignment results for student ${studentId}`);

    for (const assignmentResult of assignmentResults) {
      // Update intake group for the assignment result
      assignmentResult.intakeGroup = newIntakeGroupId;
      await assignmentResult.save({ session });
      console.log(`Updated assignment result for student ${studentId} in new intake group ${newIntakeGroupId}`);
    }

    console.log('Finished updating related collections.');
  } catch (error) {
    console.error(`Error updating related collections: ${error.message}`);
    throw new Error(`Error updating related collections: ${error.message}`);
  }
};
