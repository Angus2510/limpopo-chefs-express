const AssignmentResult = require('../models/AssignmentResults');
const Student = require('../models/Student');
const Finance = require('../models/Finance');
const Assignment = require('../models/Assignment');

// Controller function to get accounts in arrears
const getAccountsInArrears = async (req, res) => {
    try {
      // Find all finance records
      const financeRecords = await Finance.find().populate({
        path: 'student',
        populate: ['campus', 'intakeGroup']
      });
  
      // Map the finance records to the required details
      const arrearsDetails = financeRecords
        .map(record => {
          const student = record.student;
          const totalArrears = record.payableFees.reduce((sum, fee) => sum + fee.arrears, 0);
          const totalAmount = record.payableFees.reduce((sum, fee) => sum + fee.amount, 0);
          const dueDate = record.payableFees.length > 0 ? record.payableFees[0].dueDate : '';
  
          return {
            _id: student._id, // Include student _id
            admissionNumber: student.admissionNumber,
            firstName: student.profile.firstName,
            lastName: student.profile.lastName,
            idNumber: student.profile.idNumber,
            arrearsAmount: totalArrears,
            totalAmount: totalAmount,
            dueDate: dueDate ? new Date(dueDate).toLocaleDateString() : '', // Convert due date to normal date format
            campus: student.campus.map(c => c.title).join(', '),
            intakeGroup: student.intakeGroup.map(ig => ig.title).join(', ')
          };
        })
        .filter(record => record.totalAmount > 0); // Filter out records with totalAmount of 0
  
      res.status(200).json(arrearsDetails);
    } catch (error) {
      console.error('Error fetching accounts in arrears:', error);
      res.status(500).json({ error: 'Failed to fetch accounts in arrears' });
    }
  };
  
  
  
  
  

// Controller function to get moderation report
const getModerationReport = async (req, res) => {
    try {
      // Find all assignment results with status 'Moderated'
      const moderatedResults = await AssignmentResult.find({
        status: 'Moderated'
      }).populate('student assignment intakeGroup');
  
      // Map the moderated results to the required details
      const moderationDetails = moderatedResults.map(result => ({
        studentNumber: result.student.admissionNumber,
        studentName: `${result.student.profile.firstName} ${result.student.profile.lastName}`,
        testName: result.assignment.title,
        intakeGroup: result.intakeGroup.title,
        dateWritten: result.dateTaken.toLocaleDateString(),
      }));
  
      res.status(200).json(moderationDetails);
    } catch (error) {
      console.error('Error fetching moderation report:', error);
      res.status(500).json({ error: 'Failed to fetch moderation report' });
    }
  };

module.exports = {
  getAccountsInArrears,
  getModerationReport,
};
