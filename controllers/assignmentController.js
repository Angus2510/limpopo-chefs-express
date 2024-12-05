const Assignment = require('../models/Assignment');
const Question = require('../models/Question');
const Student = require('../models/Student');
const { s3, bucketName } = require('../config/s3');
const { v4: uuidv4 } = require('uuid');

// Helper function to upload a file to S3
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

const getAllAssignments = async (req, res) => {
  try {
    const assignments = await Assignment.find()
      .populate('intakeGroups')
      .populate('questions')
      .populate('campus')
      .populate('individualStudents')
      .populate('lecturer')
      .populate('outcome');
    res.json(assignments);
  } catch (err) {
    res.status(500).send(err);
  }
};

const createAssignment = async (req, res) => {
  console.log('Request Body:', req.body);
  try {
    const randomFiveDigitNumber = Math.floor(
      10000 + Math.random() * 90000
    ).toString();
    
    const newAssignment = new Assignment({
      ...req.body,
      availableFrom: new Date(req.body.availableFrom),
      password: randomFiveDigitNumber,
    });
    
    await newAssignment.save();
    console.log('New Test/Task Created:', newAssignment);

    res.status(201).json(newAssignment);
  } catch (err) {
    console.error('Error creating Test/Task:', err);
    res.status(400).send(err);
  }
};


const getAssignmentById = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('intakeGroups')
      .populate('questions')
      .populate('campus')
      .populate('individualStudents')
      .populate('lecturer')
      .populate('outcome');

    if (!assignment) {
      return res.status(404).json({ msg: 'Assignment not found' });
    }

    // Replace S3 URLs with local proxy URLs
    assignment.questions.forEach(question => {
      if (question.type === 'Match' && question.options) {
        question.options.forEach(option => {
          if (option.columnA && option.columnA.startsWith('https://limpopochefs.s3.af-south-1.amazonaws.com')) {
            const keyA = option.columnA.split('.com/')[1];
            option.columnA = `https://limpopochefs.vercel.app/api/files/getFile?key=${keyA}`;
          }
          if (option.columnB && option.columnB.startsWith('https://limpopochefs.s3.af-south-1.amazonaws.com')) {
            const keyB = option.columnB.split('.com/')[1];
            option.columnB = `https://limpopochefs.vercel.app/api/files/getFile?key=${keyB}`;
          }
        });
      }
    });

    res.json(assignment);
  } catch (err) {
    res.status(500).send(err);
  }
};



const updateAssignment = async (req, res) => {
  try {
      const { id } = req.params;
      const { title, type, intakeGroups, individualStudents, campus, outcome, availableFrom, lecturer, duration } = req.body;

      console.log(req.body)

      const updatedAssignment = await Assignment.findByIdAndUpdate(
          id,
          {
              title,
              type,
              intakeGroups,
              individualStudents,
              campus,
              outcome,
              availableFrom,
              lecturer,
              duration
          },
          { new: true }
      ); 

      res.json(updatedAssignment);
  } catch (err) {
      res.status(400).send(err.message);
  }
};

const deleteAssignment = async (req, res) => {
  try {
    await Assignment.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Assignment deleted' });
  } catch (err) {
    res.status(500).send(err);
  }
};

module.exports = {
  getAllAssignments,
  createAssignment,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
};
