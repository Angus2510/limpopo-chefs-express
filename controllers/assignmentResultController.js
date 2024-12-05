const mongoose = require('mongoose');
const AssignmentResult = require('../models/AssignmentResults');
const Assignment = require('../models/Assignment');
const Student = require('../models/Student');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const Outcome = require('../models/Outcome')
const Result = require('../models/Results')
const addNotification = require('../middleware/notificationMiddelware');


const getAllAssignmentResults = async (req, res) => {
  try {
    const assignmentResults = await AssignmentResult.find()
      .populate('assignment')
      .populate({
        path: 'assignment',
        populate: [{
          path: 'lecturer',
          model: 'Staff'
        },
        {
          path: 'outcome',
          model: 'Outcome'
        }]
      })
      .populate('student')
      .populate('intakeGroup')
      .populate('campus');
    
    console.log(assignmentResults);
    res.json(assignmentResults);
  } catch (err) {
    res.status(500).send(err);
  }
};


const getAssignmentResultsByStudentId = async (req, res) => {
  const { studentId } = req.params; 

  try {
    const assignmentResults = await AssignmentResult.find({ student: studentId })
      .populate({
        path: 'assignment',
        select: 'title date',
        populate: {
          path: 'outcome',
          model: 'Outcome',
          select: 'title type',
        },
      })
      .select('scores assignment dateTaken status outcome') 
      .populate('student', 'firstName lastName') 
      .populate('intakeGroup', 'title')
      .populate('campus', 'title'); 

    res.json(assignmentResults); 
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch assignment results' });
  }
};

const createAssignmentResult = async (req, res) => {
  try {
    const newAssignmentResult = new AssignmentResult(req.body);
    await newAssignmentResult.save();
    res.status(201).json(newAssignmentResult);
  } catch (err) {
    res.status(400).send(err);
  }
};

const getAssignmentResultById = async (req, res) => {
  try {
    const assignmentResult = await AssignmentResult.findById(req.params.resultId)
      .populate('student')
      .populate('answers')
      .populate('intakeGroup')
      .populate('campus')
      .populate('markedBy');  

    if (!assignmentResult) {
      return res.status(404).json({ msg: 'Assignment result not found' });
    }

    const assignment = await Assignment.findById(assignmentResult.assignment)
      .populate('lecturer')
      .populate('questions');

    const studentAnswers = assignmentResult.answers.reduce((acc, answer) => {
      acc[answer.question] = answer;
      return acc;
    }, {});

    // Modify image links in questions
    const questions = assignment.questions.map(question => {
      if (question.type === 'Match') {
        question.options.forEach(option => {
          if (option.columnA && option.columnA.startsWith('https://')) {
            const columnAKey = option.columnA.split('.com/')[1];
            option.columnA = `https://limpopochefs.vercel.app/api/files/getFile?key=${columnAKey}`;
          }
          if (option.columnB && option.columnB.startsWith('https://')) {
            const columnBKey = option.columnB.split('.com/')[1];
            option.columnB = `https://limpopochefs.vercel.app/api/files/getFile?key=${columnBKey}`;
          }
        });
      }
      return question;
    });

    const detailedResult = {
      assignmentTitle: assignment.title,
      studentDetails: {
        firstName: assignmentResult.student.profile.firstName,
        lastName: assignmentResult.student.profile.lastName,
        studentNo: assignmentResult.student.admissionNumber,
        intakeGroup: assignmentResult.intakeGroup.title,
        campus: assignmentResult.campus.title,
        createdBy: `${assignment.lecturer.profile.firstName} ${assignment.lecturer.profile.lastName}`,
        dateOfTest: new Date(assignmentResult.dateTaken).toLocaleDateString(),
        testDuration: `${assignment.duration} minutes`,
        feedback: assignmentResult.feedback
      },
      markedBy: assignmentResult.markedBy ? `${assignmentResult.markedBy.profile.firstName} ${assignmentResult.markedBy.profile.lastName}` : 'N/A',
      status: assignmentResult.status,
      totalModeratedScore: assignmentResult.moderatedscores || 0,
      questions: questions.map((question) => ({
        id: question._id,
        text: question.text,
        mark: question.mark,
        type: question.type,
        options: question.options,
        correctAnswer: question.correctAnswer,
        studentAnswer: {
          value: studentAnswers[question._id]?.answer || 'N/A',
          _id: studentAnswers[question._id]?._id || null 
        },
        matchAnswers: studentAnswers[question._id]?.matchAnswers || [],
        score: studentAnswers[question._id]?.scores || 0,
        moderatedScore: studentAnswers[question._id]?.moderatedscores || 0 
      })),
    };

    console.log(detailedResult);
    res.json(detailedResult);
  } catch (err) {
    console.error('Error fetching assignment result by ID:', err);
    res.status(500).send(err);
  }
};

const updateAssignmentResult = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log('Received request to update assignment result:', req.body);

    const { resultId } = req.params;
    const { answers , staffId  } = req.body;

    // Validate the answers array
    if (!Array.isArray(answers) || answers.length === 0) {
      console.log('Invalid answers array:', answers);
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Answers are required to update scores' });
    }

    let totalScore = 0;
    let totalPossibleScore = 0;

    // Iterate over each answer to update scores and calculate total scores
    for (const answer of answers) {
      const { answerId, score } = answer;

      if (!answerId || score === undefined) {
        console.log('Skipping invalid answer object:', answer);
        continue;
      }

      console.log(`Updating answer with id ${answerId} to score ${score}`);

      // Update each answer's score
      const updatedAnswer = await Answer.findByIdAndUpdate(
        answerId,
        { scores: score },
        { new: true, session }
      );

      if (!updatedAnswer) {
        console.log(`Answer with id ${answerId} not found`);
        continue;
      }

      // Find the corresponding question to get the total possible score
      const question = await Question.findById(updatedAnswer.question).session(session);
      if (!question) {
        console.log(`Question with id ${updatedAnswer.question} not found`);
        continue;
      }

      // Accumulate the total score and possible score
      totalScore += score;
      totalPossibleScore += parseFloat(question.mark);
    }

    if (totalPossibleScore === 0) {
      console.log('Total possible score is zero, cannot calculate percentage.');
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Total possible score is zero, cannot calculate percentage.' });
    }

    // Calculate the percentage
    let percentage = (totalScore / totalPossibleScore) * 100;
    // Round the percentage
    percentage = Math.round(percentage);

    console.log(`Total score: ${totalScore}, Total possible score: ${totalPossibleScore}, Percentage: ${percentage}%`);

    // Update the total score and percentage in the assignment result
    const updatedAssignmentResult = await AssignmentResult.findByIdAndUpdate(
      resultId,
      { scores: totalScore, percent: percentage, status: 'Marked', markedBy: staffId },
      { new: true, session }
    ).populate('assignment')
      .populate({
        path: 'assignment',
        populate: {
          path: 'lecturer',
          model: 'Staff',
        }
      })
      .populate({
        path: 'assignment',
        populate: {
          path: 'questions',
          model: 'Question',
        }
      })
      .populate('student')
      .populate('intakeGroup')
      .populate('campus');

    if (!updatedAssignmentResult) {
      console.log(`Assignment result with id ${resultId} not found`);
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Assignment result not found' });
    }

    // Prepare notification data
    const notificationData = {
      title: 'Test/Task Marked',
      message: `Your test/task "${updatedAssignmentResult.assignment.title}" has been marked.`,
      userId: updatedAssignmentResult.student._id,
      type: 'notification'
    };

    // Add notification for the student
    await addNotification(notificationData);

    console.log('Updated assignment result:', updatedAssignmentResult);

    // Update or create the result record in the Result schema
    const resultRecord = await Result.findOne({
      campus: updatedAssignmentResult.campus._id,
      intakeGroups: updatedAssignmentResult.intakeGroup._id,
      outcome: updatedAssignmentResult.outcome._id,
    }).session(session);

    let result;
    if (resultRecord) {
      // Find the specific student result in the existing result record
      const studentResultIndex = resultRecord.results.findIndex(
        (r) => r.student.toString() === updatedAssignmentResult.student._id.toString()
      );

      if (studentResultIndex !== -1) {
        // Update the student's test or task score based on assignment type
        const studentResult = resultRecord.results[studentResultIndex];
        if (updatedAssignmentResult.assignment.type === 'Test') {
          studentResult.testScore = percentage;
        } else if (updatedAssignmentResult.assignment.type === 'Task') {
          studentResult.taskScore = percentage;
        }
        studentResult.percentage = percentage;
      } else {
        // Add a new result entry for the student
        resultRecord.results.push({
          student: updatedAssignmentResult.student._id,
          score: percentage,
          testScore: updatedAssignmentResult.assignment.type === 'Test' ? percentage : 0,
          taskScore: updatedAssignmentResult.assignment.type === 'Task' ? percentage : 0,
          percentage: percentage,
          overallOutcome: 'Not Yet Competent',
        });
      }
      result = await resultRecord.save({ session });
    } else {
      // Create a new result record if none exists for the combination
      const newResult = new Result({
        title: updatedAssignmentResult.assignment.title,
        conductedOn: new Date(),
        details: 'Auto-generated result entry',
        participants: [updatedAssignmentResult.student._id],
        resultType: 'Exams/Well',
        results: [{
          student: updatedAssignmentResult.student._id,
          score: percentage,
          testScore: updatedAssignmentResult.assignment.type === 'Test' ? percentage : 0,
          taskScore: updatedAssignmentResult.assignment.type === 'Task' ? percentage : 0,
          percentage: percentage,
          overallOutcome: 'Not Yet Competent',
        }],
        outcome: updatedAssignmentResult.outcome._id,
        campus: updatedAssignmentResult.campus._id,
        intakeGroups: updatedAssignmentResult.intakeGroup._id,
        observer: 'Auto-generated',
      });

      result = await newResult.save({ session });
    }

    console.log('Result record updated/created:', result);

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.json(updatedAssignmentResult);
  } catch (err) {
    // Abort the transaction in case of error
    await session.abortTransaction();
    session.endSession();
    console.error('Error updating assignment result:', err);
    res.status(400).send(err);
  }
};


const addCommentToAssignmentResult = async (req, res) => {
  try {
    const { resultId } = req.params;
    const { comment } = req.body;

    const assignmentResult = await AssignmentResult.findById(resultId);
    if (!assignmentResult) {
      return res.status(404).json({ msg: 'Assignment result not found' });
    }

    assignmentResult.feedback.push(comment);
    await assignmentResult.save();

    res.json(assignmentResult);
  } catch (err) {
    console.error('Error adding comment to assignment result:', err);
    res.status(500).send(err);
  }
};

const deleteAssignmentResult = async (req, res) => {
  try {
    await AssignmentResult.findByIdAndDelete(req.params.resultId);
    res.json({ msg: 'Assignment result deleted' });
  } catch (err) {
    res.status(500).send(err);
  }
};

module.exports = {
  getAllAssignmentResults,
  createAssignmentResult,
  getAssignmentResultById,
  updateAssignmentResult,
  deleteAssignmentResult,
  addCommentToAssignmentResult,
  getAssignmentResultsByStudentId,
};
