const mongoose = require('mongoose');
const Finance = require('../models/Finance');
const Student = require('../models/Student');
const Outcome = require('../models/Outcome');
const addNotification = require('../middleware/notificationMiddelware');


// Controller for collecting fees
const collectFees = async (req, res) => {
  try {
    const { studentId, collectedFee } = req.body;
    let finance = await Finance.findOne({ student: studentId });

    if (finance) {
      finance.collectedFees.push(collectedFee);
    } else {
      finance = new Finance({
        student: studentId,
        collectedFees: [collectedFee],
      });
    }

    await finance.save();
    res.status(201).send(finance);
  } catch (error) {
    res.status(400).send(error);
  }
};

// Controller for adding payable fees
const addPayableFees = async (req, res) => {
  try {
    const { studentId, payableFee } = req.body;
    let finance = await Finance.findOne({ student: studentId });

    if (finance) {
      finance.payableFees.push(payableFee);
    } else {
      finance = new Finance({
        student: studentId,
        payableFees: [payableFee],
      });
    }

    await finance.save();

    const notificationData = {
      title: 'Fees Updated',
      message: `Your Fees have been updated.`,
      userId: studentId,
      type: 'notification'
    };

    await addNotification(notificationData);

    res.status(201).send(finance);
  } catch (error) {
    res.status(400).send(error);
  }
};

// Controller to get all collected fees
const getAllCollectedFees = async (req, res) => {
  try {
    const finances = await Finance.find().populate('student');
    const collectedFees = finances.map(finance => finance.collectedFees).flat();
    res.status(200).send(collectedFees);
  } catch (error) {
    res.status(500).send(error);
  }
};

const getCollectedFeesByStudentId = async (req, res) => {
  try {
    const { studentId } = req.params;
    const finance = await Finance.findOne({ student: studentId }).populate('student');

    if (!finance) {
      return res.status(404).send({ message: 'No collected fees found for this student.' });
    }

    res.status(200).send(finance.collectedFees);
  } catch (error) {
    res.status(500).send(error);
  }
};

const updateCollectedFees = async (req, res) => {
  try {
    const { studentId, collectedFees } = req.body;

    // Try to find the finance record for the given student
    let finance = await Finance.findOne({ student: studentId });

    if (finance) {
      // If the record exists, update the collected fees
      finance.collectedFees = collectedFees;
    } else {
      // If the record does not exist, create a new one
      finance = new Finance({
        student: studentId,
        collectedFees: collectedFees
      });
    }

    // Save the finance record (either updated or new)
    await finance.save();

    const notificationData = {
      title: 'Fees Added',
      message: `Fees where updated on your profile.`,
      userId: studentId,
      type: 'notification'
    };

    await addNotification(notificationData);

    // Send a success response with the finance record
    res.status(200).send(finance);
  } catch (error) {
    // Handle errors and send an error response
    res.status(500).send(error);
  }
};

// Controller to get all payable fees
const getAllPayableFees = async (req, res) => {
  try {
    const finances = await Finance.find().populate('student');
    const payableFees = finances.map(finance => finance.payableFees).flat();
    res.status(200).send(payableFees);
  } catch (error) {
    res.status(500).send(error);
  }
};

const getStudentFees = async (req, res) => {
    try {
      const { campus, intakeGroup } = req.query;
  
      if (!campus || !intakeGroup) {
        return res.status(400).json({ message: 'Please provide campus and intake group.' });
      }
  
      if (!mongoose.Types.ObjectId.isValid(campus) || !mongoose.Types.ObjectId.isValid(intakeGroup)) {
        return res.status(400).json({ message: 'Invalid campus or intake group ID.' });
      }
  
      const students = await Student.find({ campus, intakeGroup }).select('_id admissionNumber profile.firstName profile.lastName profile.admissionDate profile.cityAndGuildNumber');
      if (!students.length) {
        return res.status(404).json({ message: 'No students found for the specified campus and intake group.' });
      }
  
      const fees = await Finance.find({ student: { $in: students.map(student => student._id) } });
  
      const studentFees = students.map(student => {
        const studentFee = fees.find(fee => fee.student.toString() === student._id.toString());
        return {
          studentNumber: student.admissionNumber,
          studentName: `${student.profile.firstName} ${student.profile.lastName}`,
          admissionDate: student.profile.admissionDate,
          cityAndGuildNumber: student.profile.cityAndGuildNumber,
          payableFees: studentFee ? studentFee.payableFees : [],
        };
      });
  
      res.status(200).json(studentFees);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error' });
    }
  };

  const getStudentFeesById = async (req, res) => {
    try {
      const { studentId } = req.params;
  
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ message: 'Invalid student ID.' });
      }
  
      const student = await Student.findById(studentId).select('_id admissionNumber profile.firstName profile.lastName profile.admissionDate profile.cityAndGuildNumber');
      if (!student) {
        return res.status(404).json({ message: 'Student not found.' });
      }
  
      const finance = await Finance.findOne({ student: student._id });
      if (!finance) {
        return res.status(404).json({ message: 'No finance record found for this student.' });
      }
  
      const studentFees = {
        studentNumber: student.admissionNumber,
        studentName: `${student.profile.firstName} ${student.profile.lastName}`,
        admissionDate: student.profile.admissionDate,
        cityAndGuildNumber: student.profile.cityAndGuildNumber,
        payableFees: finance.payableFees.map(fee => ({
          amount: fee.amount,
          dueDate: fee.dueDate
        }))
      };
  
      res.status(200).json(studentFees);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error' });
    }
  };

  const bulkAddPayableFees = async (req, res) => {
    try {
      const studentsFeesData = req.body;
  
      for (const studentData of studentsFeesData) {
        const { studentNumber, payableFees } = studentData;
  
        console.log(`Processing student number: ${studentNumber}`);
        
        const student = await Student.findOne({ admissionNumber: studentNumber });
  
        if (!student) {
          console.error(`Student with number ${studentNumber} not found.`);
          continue;
        }
  
        let financeRecord = await Finance.findOne({ student: student._id });
  
        if (!financeRecord) {
          financeRecord = new Finance({
            student: student._id,
            payableFees: []
          });
        }
  
        let arrearsChanged = false;
  
        // Log payableFees to ensure they are correct
        console.log(`Payable fees for student ${studentNumber}:`, JSON.stringify(payableFees, null, 2));
  
        // Update or add payable fees
        payableFees.forEach(newFee => {
          const existingFeeIndex = financeRecord.payableFees.findIndex(fee => fee._id.toString() === newFee._id);
          if (existingFeeIndex !== -1) {
            console.log(`Existing fee found for student ${studentNumber}. Current arrears: ${financeRecord.payableFees[existingFeeIndex].arrears}, New arrears: ${newFee.arrears}`);
            // Check if arrears changed from 0 to 1 or true
            if (financeRecord.payableFees[existingFeeIndex].arrears === 0 && (newFee.arrears === 1 || newFee.arrears === true)) {
              arrearsChanged = true;
              console.log(`Arrears changed from 0 to 1 for student ${studentNumber}`);
            }
            // Update existing fee
            financeRecord.payableFees[existingFeeIndex] = newFee;
          } else {
            console.log(`New fee added for student ${studentNumber}. Arrears: ${newFee.arrears}`);
            if (newFee.arrears === 1 || newFee.arrears === true) {
              arrearsChanged = true;
              console.log(`New fee with arrears 1 added for student ${studentNumber}`);
            }
            financeRecord.payableFees.push(newFee);
          }
        });
  
        await financeRecord.save();
        console.log(`Finance record saved for student ${studentNumber}`);
  
        // Block student's profile if arrears changed from 0 to 1 or true
        if (arrearsChanged) {
          student.active = false;
          student.inactiveReason = 'Arrears account';
          console.log(`Blocking student profile for ${studentNumber}...`);
          try {
            await student.save();
            console.log(`Student profile blocked for ${studentNumber}`);
          } catch (err) {
            console.error(`Error blocking student profile for ${studentNumber}: ${err}`);
          }
        } else {
          console.log(`No arrears change detected for student ${studentNumber}`);
        }
      }
  
      res.status(200).json({ message: 'Payable fees added or updated successfully.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error' });
    }
  };
  
  
  
  
  

module.exports = {
  collectFees,
  addPayableFees,
  getAllCollectedFees,
  getAllPayableFees,
  getStudentFees,
  bulkAddPayableFees,
  getCollectedFeesByStudentId,
  updateCollectedFees,
  getStudentFeesById,
};
