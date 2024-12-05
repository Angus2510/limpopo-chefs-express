const Question = require('../models/Question');
const Assignment = require('../models/Assignment');
const { s3, bucketName } = require('../config/s3');
const { v4: uuidv4 } = require('uuid');

const getAllQuestionsForAssignment = async (req, res) => {
  try {
      const { assignmentId } = req.params;
      const assignment = await Assignment.findById(assignmentId).populate('questions');
      if (!assignment) {
          return res.status(404).json({ msg: 'Assignment not found' });
      }

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

      res.json(questions);
  } catch (err) {
      res.status(500).send(err);
  }
};


const uploadToS3 = async (file, folder = '') => {
  const params = {
    Bucket: bucketName,
    Key: `${folder}${folder ? '/' : ''}${uuidv4()}_${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    const data = await s3.upload(params).promise();
    return data.Location;
  } catch (err) {
    throw new Error('Failed to upload file to S3');
  }
};

const addQuestionToAssignment = async (req, res) => {
  const { assignmentId } = req.params;
  const { text, mark, type, correctAnswer, options } = req.body;

  try {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ msg: 'Assignment not found' });
    }

    const processedOptions = await Promise.all(
      options.map(async (option) => {
        const processedOption = { ...option };

        if (option.columnA && typeof option.columnA !== 'string') {
          processedOption.columnA = await uploadToS3(option.columnA, 'questions');
        }

        if (option.columnB && typeof option.columnB !== 'string') {
          processedOption.columnB = await uploadToS3(option.columnB, 'questions');
        }

        return processedOption;
      })
    );

    const newQuestion = new Question({
      text,
      mark,
      type,
      correctAnswer,
      options: processedOptions,
    });

    assignment.questions.push(newQuestion);
    await newQuestion.save();
    await assignment.save();
    res.status(201).json(newQuestion);
  } catch (err) {
    res.status(400).send(err.message);
  }
};

const getQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ msg: 'Question not found' });
    }
    res.json(question);
  } catch (err) {
    res.status(500).send(err);
  }
};

const updateQuestion = async (req, res) => {
  const { questionId } = req.params;
  const { text, mark, type, correctAnswer, options } = req.body;

  try {
      const processedOptions = await Promise.all(
          options.map(async (option) => {
              const processedOption = { ...option };

              if (option.columnA && typeof option.columnA !== 'string') {
                  processedOption.columnA = await uploadToS3(option.columnA, 'questions');
              }

              if (option.columnB && typeof option.columnB !== 'string') {
                  processedOption.columnB = await uploadToS3(option.columnB, 'questions');
              }

              return processedOption;
          })
      );

      const updatedQuestion = await Question.findByIdAndUpdate(
          questionId,
          {
              text,
              mark,
              type,
              correctAnswer,
              options: processedOptions,
          },
          { new: true }
      );

      res.json(updatedQuestion);
  } catch (err) {
      res.status(400).send(err.message);
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    await Question.findByIdAndDelete(questionId);
    res.json({ msg: 'Question deleted' });
  } catch (err) {
    res.status(500).send(err);
  }
};

module.exports = {
  getAllQuestionsForAssignment,
  addQuestionToAssignment,
  getQuestion,
  updateQuestion,
  deleteQuestion,
};
