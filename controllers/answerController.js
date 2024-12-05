const Answer = require('../models/Answer');
const Question = require('../models/Question');

const getAnswersForQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const question = await Question.findById(questionId).populate('answers');
    if (!question) {
      return res.status(404).json({ msg: 'Question not found' });
    }
    res.json(question.answers);
  } catch (err) {
    res.status(500).send(err);
  }
};

const submitAnswerToQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ msg: 'Question not found' });
    }
    const newAnswer = new Answer({
      ...req.body,
      question: questionId,
    });
    await newAnswer.save();
    question.answers.push(newAnswer);
    await question.save();
    res.status(201).json(newAnswer);
  } catch (err) {
    res.status(400).send(err);
  }
};

module.exports = {
  getAnswersForQuestion,
  submitAnswerToQuestion,
};
