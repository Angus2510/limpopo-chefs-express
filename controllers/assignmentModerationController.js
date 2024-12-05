const mongoose = require('mongoose');
const AssignmentResult = require('../models/AssignmentResults');
const Answer = require('../models/Answer');
const AssignmentModeration =require('../models/AssignmentModeration');
const Result = require('../models/Results');
const addNotification = require('../middleware/notificationMiddelware');

const updateModeratedMarks = async (req, res) => {
  console.log('Received request to update moderated marks:', req.body);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { resultId } = req.params;
    const { answers, lecturerId } = req.body;

    if (!Array.isArray(answers) || answers.length === 0) {
      console.log('Invalid answers array:', answers);
      return res.status(400).json({ error: 'Moderated marks are required to update scores' });
    }

    if (!lecturerId) {
      console.log('Lecturer ID is required');
      return res.status(400).json({ error: 'Lecturer ID is required' });
    }

    let totalModeratedScore = 0;
    let totalPossibleScore = 0;
    const moderationEntries = [];

    for (const mark of answers) {
      const { answerId, moderatedScore } = mark;

      if (!answerId || moderatedScore === undefined) {
        console.log('Skipping invalid moderated mark object:', mark);
        continue;
      }

      console.log(`Updating moderated score for answer with id ${answerId} to score ${moderatedScore}`);

      // Update each answer's moderated score
      const updatedAnswer = await Answer.findByIdAndUpdate(
        answerId,
        { moderatedscores: moderatedScore },
        { new: true }
      ).populate('question');

      if (!updatedAnswer) {
        console.log(`Moderated answer with id ${answerId} not found`);
        continue;
      }
      console.log(`question here ${updatedAnswer}`)
      totalModeratedScore += moderatedScore;
      let possibleScore = parseFloat(updatedAnswer.question.mark);
      totalPossibleScore += possibleScore;
      // Find the questionId associated with the answerId
      const questionId = updatedAnswer.question;

      // Create moderation entry
      moderationEntries.push({
        lecturer: lecturerId,
        question: questionId,
        answer: answerId,
        moderatedMark: moderatedScore,
        date: new Date(),
      });
    }

    console.log(`Total moderated score for assignment result ${resultId} is ${totalModeratedScore}`);

  // Calculate the percentage
   let percentage = (totalModeratedScore / totalPossibleScore) * 100;
   percentage = Math.round(percentage);

    // Update the total moderated score in the assignment result
    const updatedAssignmentResult = await AssignmentResult.findByIdAndUpdate(
      resultId,
      { moderatedscores: totalModeratedScore, status: 'Moderated' },
      { new: true }
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
      return res.status(404).json({ error: 'Assignment result not found' });
    }

    // Prepare notification data
    const notificationData = {
      title: 'Test/Task Moderated',
      message: `Your test/task "${updatedAssignmentResult.assignment.title}" has been Moderated.`,
      userId: updatedAssignmentResult.student._id,
      type: 'notification'
    };

    // Add notification for the student
    await addNotification(notificationData);


    // Update or create the result record
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

    // Create a new moderation record
    const newModerationRecord = new AssignmentModeration({
      assignment: updatedAssignmentResult.assignment._id,
      assignmentResult: updatedAssignmentResult._id,
      moderatedBy: lecturerId,
      moderationEntries: moderationEntries,
    });

    await newModerationRecord.save();

    console.log('Updated assignment result and created new moderation record:', updatedAssignmentResult, newModerationRecord);

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

  

const getModerationRecordsByResultId = async (req, res) => {
    try {
      const { resultId } = req.params;
  
      const moderationRecords = await AssignmentModeration.find({ assignmentResult: resultId })
        .populate({
          path: 'moderationEntries.question',
          model: 'Question',
        })
        .populate({
          path: 'moderationEntries.answer',
          model: 'Answer',
        })
        .populate('moderatedBy')
        .populate('assignment')
        .populate('assignmentResult');
  
      if (!moderationRecords || moderationRecords.length === 0) {
        return res.status(404).json({ msg: 'Moderation records not found' });
      }
  
      const detailedModerationRecords = moderationRecords.map(record => {
        return {
          assignmentTitle: record.assignment.title,
          moderatedBy: `${record.moderatedBy.profile.firstName} ${record.moderatedBy.profile.lastName}`,
          moderationEntries: record.moderationEntries.map(entry => ({
            question: {
              id: entry.question._id,
              text: entry.question.text,
              type: entry.question.type,
              options: entry.question.options,
              correctAnswer: entry.question.correctAnswer,
            },
            answer: {
              id: entry.answer._id,
              value: entry.answer.answer,
              matchAnswers: entry.answer.matchAnswers,
              originalScore: entry.answer.scores,
              moderatedScore: entry.moderatedMark,
            },
            date: entry.date,
          })),
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        };
      });
  
      res.json(detailedModerationRecords);
    } catch (err) {
      console.error('Error fetching moderation records by result ID:', err);
      res.status(500).send(err);
    }
  };

module.exports = {
    updateModeratedMarks,
    getModerationRecordsByResultId,
};
