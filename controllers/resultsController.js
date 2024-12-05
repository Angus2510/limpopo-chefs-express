const mongoose = require('mongoose');
const Student = require('../models/Student');
const Outcome = require('../models/Outcome');
const Result = require('../models/Results');

exports.getStudentsResults = async (req, res) => {
  try {
    const { campus, intakeGroup, outcome } = req.query;

    // Validate input
    if (!campus || !intakeGroup || !outcome) {
      return res.status(400).json({ message: 'Please provide campus, intake group, and outcome.' });
    }

    // Check if the provided IDs are valid ObjectIds
    if (!mongoose.Types.ObjectId.isValid(campus) || !mongoose.Types.ObjectId.isValid(intakeGroup) || !mongoose.Types.ObjectId.isValid(outcome)) {
      return res.status(400).json({ message: 'Invalid campus, intake group, or outcome ID.' });
    }

    // Fetch outcome details to determine type
    const outcomeDetails = await Outcome.findById(outcome);
    if (!outcomeDetails) {
      return res.status(404).json({ message: 'Outcome not found.' });
    }

    // Fetch students
    const students = await Student.find({
      campus: campus,
      intakeGroup: intakeGroup,
    }).select('admissionNumber profile.firstName profile.lastName');

    if (!students.length) {
      return res.status(404).json({ message: 'No students found for the specified campus and intake group.' });
    }

    // Fetch results based on outcome and resultType
    const results = await Result.find({ outcome: outcome, campus: campus, intakeGroups: intakeGroup })
      .populate('results.student');

    let responseData = students.map(student => {
      const studentResults = results.map(result => {
        const studentResult = result.results.find(r => r.student._id.toString() === student._id.toString());

        if (studentResult) {
          return {
            title: result.title,
            conductedOn: result.conductedOn,
            details: result.details,
            score: studentResult.score,
            testScore: studentResult.testScore,
            taskScore: studentResult.taskScore,
            notes: studentResult.notes,
            overallOutcome: studentResult.overallOutcome,
          };
        } else {
          return {};
        }
      });
      return {
        studentNumber: student.admissionNumber,
        studentName: `${student.profile.firstName} ${student.profile.lastName}`,
        results: studentResults,
      };
    });

    res.status(200).json({ outcomeType: outcomeDetails.type, students: responseData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.updateStudentResult = async (req, res) => {
  try {
    console.log('Received request body:', JSON.stringify(req.body, null, 2));

    const { outcomeType, results, campus, intakeGroup, outcome } = req.body;

    // Validate input
    if (!outcomeType || !results || !Array.isArray(results) || results.length === 0 || !campus || !intakeGroup || !outcome) {
      return res.status(400).json({ message: 'Missing or invalid required fields' });
    }

    // Check if the provided IDs are valid ObjectIds
    if (!mongoose.Types.ObjectId.isValid(campus) || !mongoose.Types.ObjectId.isValid(intakeGroup) || !mongoose.Types.ObjectId.isValid(outcome)) {
      return res.status(400).json({ message: 'Invalid campus, intake group, or outcome ID.' });
    }

    // Find or create the result for the given outcome, campus, and intake group
    let result = await Result.findOne({ outcome: outcome, campus: campus, intakeGroups: intakeGroup, resultType: outcomeType });
    if (!result) {
      const newResultData = {
        title: outcomeType === 'Theory' ? "Theory Exam Title" : "Practical Title",
        conductedOn: new Date(),
        details: outcomeType === 'Theory' ? "Theory exam details" : "Practical details",
        resultType: outcomeType,
        outcome: new mongoose.Types.ObjectId(outcome),
        campus: new mongoose.Types.ObjectId(campus),
        intakeGroups: new mongoose.Types.ObjectId(intakeGroup),
        participants: [],
        results: [],
        observer: "Observer Name" // Set appropriate observer name
      };
      
      console.log('Creating new result record with data:', JSON.stringify(newResultData, null, 2));

      result = new Result(newResultData);
      await result.save();
    }

    for (const student of results) {
      const { studentNumber, results: studentResults } = student;

      // Skip students with invalid or empty results
      if (!studentNumber || !studentResults || !Array.isArray(studentResults) || studentResults.length === 0) {
        continue; // Skip this student
      }

      const resultData = studentResults[0];
      if (outcomeType === 'Practical' && !resultData.score) {
        continue; // Skip practical results without a score
      }
      if (outcomeType === 'Theory' && !resultData.testScore && !resultData.taskScore) {
        continue; // Skip theory results without testScore or taskScore
      }

      // Fetch student ID
      const studentDoc = await Student.findOne({ admissionNumber: studentNumber }).select('_id');
      if (!studentDoc) {
        // Skip the student if the record does not exist
        console.log(`Student not found for admission number ${studentNumber}`);
        continue;
      }

      // Find the specific student's result
      let studentResult = result.results.find(r => r.student.toString() === studentDoc._id.toString());
      if (studentResult) {
        Object.assign(studentResult, resultData); // Assuming results array contains one result object
      } else {
        // Create a new result entry if not found
        studentResult = {
          student: studentDoc._id,
          ...resultData,
          overallOutcome: resultData.overallOutcome || "Not Yet Competent" // Set default overallOutcome if not provided
        };
        result.results.push(studentResult);
      }

      // Ensure student is in participants list
      if (!result.participants.includes(studentResult.student)) {
        result.participants.push(studentResult.student);
      }
    }

    await result.save();

    return res.status(200).json({ message: 'Results updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.getStudentResultsById = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Check if the provided ID is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: 'Invalid student ID.' });
    }

    // Fetch the student
    const student = await Student.findById(studentId).select('admissionNumber profile.firstName profile.lastName');
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Fetch results for the student
    const results = await Result.find({ 'results.student': studentId })
      .populate('results.student')
      .populate('outcome');

     // Helper function to format scores 
     const formatScore = (score) => {
      if (score == null) return ''; // Return empty string if score is null or undefined
      const roundedScore = Math.round(score * 100) / 100; // Rounding to two decimal places
      return `${roundedScore}%`;
    };
    
    // Format the response data
    const studentResults = results.map(result => {
      const studentResult = result.results.find(r => r.student._id.toString() === student._id.toString());

      return {
        title: result.title,
        conductedOn: result.conductedOn,
        details: result.details,
        score: formatScore(studentResult.score),
        testScore: formatScore(studentResult.testScore),
        taskScore: formatScore(studentResult.taskScore),
        notes: studentResult.notes, 
        overallOutcome: studentResult.overallOutcome,
        outcomeType:result.outcome ? result.outcome.type : 'N/A', 
        outcomeTitle: result.outcome ? result.outcome.title : 'N/A', 
      };
    });

    res.status(200).json({
      studentNumber: student.admissionNumber,
      studentName: `${student.profile.firstName} ${student.profile.lastName}`,
      results: studentResults,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};