const Student = require('../models/Student');
const Guardian = require('../models/Guardian');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const { hashPassword } = require('../middleware/passwordHash');
const { s3, bucketName } = require('../config/s3');
const Accommodation = require('../models/Accommodation');
const { sendEmailNotification } = require('../config/nodeMailerConn')
const { generateRandomPassword } = require('../middleware/randomPasswordMiddleware');
const fs = require('fs');
const path = require('path');

const getPreSignedUrl = (key) => {
  const params = {
    Bucket: bucketName,
    Key: key,
    Expires: 60 * 60
  };
  return s3.getSignedUrl('getObject', params);
};

// @desc Get all users
// @route GET /users
// @access Private
const getAllStudents = asyncHandler(async (req, res) => {
  // Get all students from MongoDB where alumni is false or alumni is not present
  const students = await Student.find({
    $or: [{ alumni: false }, { alumni: { $exists: false } }],
  })
    .select('-password')
    .populate('intakeGroup')
    .populate('campus')
    .lean();

  // If no students found
  if (!students?.length) {
    return res.status(400).json({ message: 'No students found' });
  }

  res.json(students);
});


// @desc Get a single student by ID
// @route GET /students/:id
// @access Private
const getStudentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: 'Student ID is required' });
  }

  try {
    let student = await Student.findById(id).lean();

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const populations = [
      { path: 'campus' },
      { path: 'intakeGroup' },
      { path: 'assignments' },
      { path: 'qualification' },
      {
        path: 'guardians',
        model: 'Guardian', 
        select: 'firstName lastName email mobileNumber relation -_id',
      },
    ];

    for (let populate of populations) {
      try {
        student = await Student.populate(student, populate);
      } catch (popError) {
        console.error(`Failed to populate ${populate.path}: ${popError.message}`);
        continue;
      }
    }

    // Use local proxy URL for the avatar if it exists
    if (student.profile && student.profile.avatar) {
      const avatarKey = student.profile.avatar.split('.com/')[1];
      student.profile.avatar = `https://swartstudio.co.za/api/files/getFile?key=${avatarKey}`;
    }

    // Find accommodations where the student is an occupant
    const accommodations = await Accommodation.find({ occupants: id }).lean();
    student.accommodations = accommodations;

    // Include current accommodation details
    if (student.accommodations.length > 0) {
      student.currentAccommodation = student.accommodations[0];
    } else {
      student.currentAccommodation = null;
    }
    console.log(student)
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to retrieve student' });
  }
});




// @desc Create new student with optional guardian creation
// @route POST /students
// @access Private

// const createNewStudent = asyncHandler(async (req, res) => {
//   const {
//     admissionNumber,
//     intakeGroup,
//     campus,
//     firstName,
//     middleName,
//     lastName,
//     gender,
//     dateOfBirth,
//     idNumber,
//     mobileNumber,
//     email,
//     homeLanguage,
//     cityAndGuildNumber,
//     admissionDate,
//     qualification,
//     address,
//     postalAddress,
//     accommodation, // The ID of the accommodation
//   } = req.body;

//   const guardians = Array.isArray(req.body.guardians) ? req.body.guardians : [];
//   const photo = req.body.photoUrl || null;

//   if (!admissionNumber || !firstName || !idNumber) {
//     return res.status(400).json({ message: 'Missing required fields.' });
//   }

//   let session;
//   try {
//     session = await mongoose.startSession();
//     session.startTransaction();

//     const duplicate = await Student.findOne({ admissionNumber }).session(session);
//     if (duplicate) {
//       throw new Error('Admission number already in use');
//     }

//     const studentPassword = generateRandomPassword(10);
//     const hashedStudentPassword = await bcrypt.hash(studentPassword, 10);

//     const newStudent = new Student({
//       username: admissionNumber,
//       admissionNumber,
//       password: hashedStudentPassword,
//       intakeGroup,
//       qualification,
//       campus,
//       email,
//       profile: {
//         firstName,
//         middleName,
//         lastName,
//         gender,
//         dateOfBirth,
//         idNumber,
//         mobileNumber,
//         homeLanguage,
//         cityAndGuildNumber,
//         admissionDate,
//         avatar: photo,
//         address: {
//           street1: address.street1,
//           street2: address.street2,
//           city: address.city,
//           province: address.province,
//           country: address.country,
//           postalCode: address.postalCode,
//         },
//         postalAddress: {
//           street1: postalAddress.street1,
//           street2: postalAddress.street2,
//           city: postalAddress.city,
//           province: postalAddress.province,
//           country: postalAddress.country,
//           postalCode: postalAddress.postalCode,
//         },
//       },
//     });
//     await newStudent.save({ session });

//     let newGuardians = [];
//     if (guardians.length > 0) {
//       for (let i = 0; i < guardians.length; i++) {
//         const guardian = guardians[i];
//         if (guardian.firstName && guardian.lastName) {
//           const guardianPassword = generateRandomPassword(10);
//           const hashedGuardianPassword = await bcrypt.hash(guardianPassword, 10);

//           const newGuardian = new Guardian({
//             firstName: guardian.firstName,
//             lastName: guardian.lastName,
//             email: guardian.email,
//             mobileNumber: guardian.phoneNumber,
//             relation: guardian.relation,
//             password: hashedGuardianPassword,
//             student: newStudent._id,
//           });
//           await newGuardian.save({ session });
//           newStudent.guardians.push(newGuardian._id);
//           newGuardians.push({ guardian: newGuardian, password: guardianPassword });

//           const templatePath = path.join(__dirname, '../templates/welcome.html');
//           let guardianEmailTemplate = fs.readFileSync(templatePath, 'utf8');
//           guardianEmailTemplate = guardianEmailTemplate.replace('[Your Username]', guardian.email || guardian.mobileNumber);
//           guardianEmailTemplate = guardianEmailTemplate.replace('[Your Password]', guardianPassword);

//           const guardianMailOptions = {
//             from: process.env.EMAIL_USER,
//             to: guardian.email,
//             subject: 'Your Guardian Account Created',
//             html: guardianEmailTemplate,
//           };

//           await transporter.sendMail(guardianMailOptions);
          
//         }
//       }
//       await newStudent.save({ session });
//     }

//     if (accommodation) {
//       const accommodationDoc = await Accommodation.findById(accommodation).session(session);
//       if (accommodationDoc) {
//         accommodationDoc.occupants.push(newStudent._id);
//         await accommodationDoc.save({ session });
//       }
//     }

//     await session.commitTransaction();

//     const templatePath = path.join(__dirname, '../templates/welcome.html');
//     let emailTemplate = fs.readFileSync(templatePath, 'utf8');

//     emailTemplate = emailTemplate.replace('[Your Username]', admissionNumber);
//     emailTemplate = emailTemplate.replace('[Your Password]', studentPassword);

//     const mailOptions = {
//       from: process.env.EMAIL_USER,
//       to: email,
//       subject: 'Your Account Created',
//       html: emailTemplate,
//     };

//     await transporter.sendMail(mailOptions);

//     return res.status(201).json({
//       message: 'New student added successfully',
//       studentId: newStudent._id,
//       guardianIds: newGuardians.map(g => g.guardian._id),
//       studentPassword,
//       guardianPasswords: newGuardians.map(g => ({ guardianId: g.guardian._id, password: g.password })),
//     });
//   } catch (error) {
//     console.error('Failed to create new student:', error);
//     if (session) {
//       await session.abortTransaction();
//     }
//     return res.status(500).json({ message: 'Server error', error: error.message });
//   } finally {
//     if (session) {
//       session.endSession();
//     }
//   }
// });


const createNewStudent = asyncHandler(async (req, res) => {
  const {
    admissionNumber,
    intakeGroup,
    campus,
    firstName,
    middleName,
    lastName,
    gender,
    dateOfBirth,
    idNumber,
    mobileNumber,
    email,
    homeLanguage,
    cityAndGuildNumber,
    admissionDate,
    qualification,
    address,
    postalAddress,
    accommodation, // The ID of the accommodation
  } = req.body;

  const guardians = Array.isArray(req.body.guardians) ? req.body.guardians : [];
  const photo = req.body.photoUrl || null;

  if (!admissionNumber || !firstName || !idNumber) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const duplicate = await Student.findOne({ admissionNumber }).session(session);
    if (duplicate) {
      throw new Error('Admission number already in use');
    }

    const studentPassword = generateRandomPassword(10);
    const hashedStudentPassword = await bcrypt.hash(studentPassword, 10);

    const newStudent = new Student({
      username: admissionNumber,
      admissionNumber,
      password: hashedStudentPassword,
      intakeGroup,
      qualification,
      campus,
      email,
      profile: {
        firstName,
        middleName,
        lastName,
        gender,
        dateOfBirth,
        idNumber,
        mobileNumber,
        homeLanguage,
        cityAndGuildNumber,
        admissionDate,
        avatar: photo,
        address: {
          street1: address.street1,
          street2: address.street2,
          city: address.city,
          province: address.province,
          country: address.country,
          postalCode: address.postalCode,
        },
        postalAddress: {
          street1: postalAddress.street1,
          street2: postalAddress.street2,
          city: postalAddress.city,
          province: postalAddress.province,
          country: postalAddress.country,
          postalCode: postalAddress.postalCode,
        },
      },
    });
    await newStudent.save({ session });

    let newGuardians = [];
    if (guardians.length > 0) {
      for (let i = 0; i < guardians.length; i++) {
        const guardian = guardians[i];
        if (guardian.firstName && guardian.lastName) {
          const guardianPassword = generateRandomPassword(10);
          const hashedGuardianPassword = await bcrypt.hash(guardianPassword, 10);

          const newGuardian = new Guardian({
            firstName: guardian.firstName,
            lastName: guardian.lastName,
            email: guardian.email,
            mobileNumber: guardian.phoneNumber,
            relation: guardian.relation,
            password: hashedGuardianPassword,
            student: newStudent._id,
          });
          await newGuardian.save({ session });
          newStudent.guardians.push(newGuardian._id);
          newGuardians.push({ guardian: newGuardian, password: guardianPassword });

          // Use sendEmailNotification function to send email to guardian
          const guardianTitle = 'Your Guardian Account Created';
          const guardianMessage = `Username: ${guardian.email || guardian.phoneNumber}\nPassword: ${guardianPassword}`;
          sendEmailNotification(guardian.email, guardianTitle, guardianMessage);
        }
      }
      await newStudent.save({ session });
    }

    if (accommodation) {
      const accommodationDoc = await Accommodation.findById(accommodation).session(session);
      if (accommodationDoc) {
        accommodationDoc.occupants.push(newStudent._id);
        await accommodationDoc.save({ session });
      }
    }

    await session.commitTransaction();

    // Use sendEmailNotification function to send email to student
    const studentTitle = 'Your Account Created';
    const studentMessage = `Username: ${admissionNumber}\nPassword: ${studentPassword}`;
    sendEmailNotification(email, studentTitle, studentMessage);

    return res.status(201).json({
      message: 'New student added successfully',
      studentId: newStudent._id,
      guardianIds: newGuardians.map(g => g.guardian._id),
      studentPassword,
      guardianPasswords: newGuardians.map(g => ({ guardianId: g.guardian._id, password: g.password })),
    });
  } catch (error) {
    console.error('Failed to create new student:', error);
    if (session) {
      await session.abortTransaction();
    }
    return res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    if (session) {
      session.endSession();
    }
  }
});


// @desc Updae important infromation
// @route PATCH /students/:id
// @access Private

const updateImportantInformation = async (req, res) => {
  try {
      const studentId = req.params.id;
      const updateData = req.body;

      const updatedStudent = await Student.findByIdAndUpdate(studentId, updateData, { new: true, runValidators: true });
      if (!updatedStudent) {
          return res.status(404).send('Student not found');
      }

      res.status(200).send(updatedStudent);
  } catch (error) {
      res.status(500).send('Server error');
  }
};

// @desc Update student details
// @route PATCH /students/:id
// @access Private
const updateStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    admissionNumber,
    email,
    firstName,
    middleName,
    lastName,
    gender,
    dateOfBirth,
    idNumber,
    mobileNumber,
    homeLanguage,
    cityAndGuildNumber,
    admissionDate,
    accommodation,
    qualification,
    address,
    postalAddress,
  } = req.body;

  // Handling the file upload
  const photoUrl = req.body.photoUrl;

  // Handling nested guardians data
  const guardians = Array.isArray(req.body.guardians) ? req.body.guardians : [];

  console.log('Incoming request body:', req.body);

  if (!id || !admissionNumber || !firstName || !idNumber || !dateOfBirth || !gender) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const student = await Student.findById(id).session(session).populate('guardians');
    if (!student) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Student not found' });
    }

    const duplicate = await Student.findOne({
      admissionNumber,
      _id: { $ne: id },
    }).session(session);

    if (duplicate) {
      throw new Error('Duplicate admission number found');
    }

    // Check if the accommodation has changed
    const oldAccommodation = await Accommodation.findOne({ occupants: student._id }).session(session);
    const newAccommodationId = mongoose.Types.ObjectId.isValid(accommodation) ? accommodation : null;
    if (newAccommodationId && (!oldAccommodation || oldAccommodation._id.toString() !== newAccommodationId.toString())) {
      // Remove student from the old accommodation
      if (oldAccommodation) {
        oldAccommodation.occupants.pull(student._id);
        await oldAccommodation.save({ session });
      }

      // Add student to the new accommodation
      if (newAccommodationId) {
        const newAccommodationDoc = await Accommodation.findById(newAccommodationId).session(session);
        if (newAccommodationDoc) {
          newAccommodationDoc.occupants.push(student._id);
          await newAccommodationDoc.save({ session });
        }
      }
    }

    // Update student details
    student.set({
      admissionNumber,
      email,
      qualification,
      profile: {
        firstName,
        middleName,
        lastName,
        gender,
        dateOfBirth,
        idNumber,
        mobileNumber,
        homeLanguage,
        cityAndGuildNumber,
        admissionDate,
        avatar: photoUrl || student.profile.avatar, // Update photo only if provided
        address: {
          street1: address.street1,
          street2: address.street2,
          city: address.city,
          province: address.province,
          country: address.country,
          postalCode: address.postalCode,
        },
        postalAddress: {
          street1: postalAddress.street1,
          street2: postalAddress.street2,
          city: postalAddress.city,
          province: postalAddress.province,
          country: postalAddress.country,
          postalCode: postalAddress.postalCode,
        },
      },
    });

    // Identify and remove deleted guardians
    const existingGuardianIds = student.guardians.map(guardian => guardian._id.toString());
    const updatedGuardianIds = guardians.map(guardian => guardian._id).filter(id => id);

    const guardiansToRemove = existingGuardianIds.filter(id => !updatedGuardianIds.includes(id));
    await Guardian.deleteMany({ _id: { $in: guardiansToRemove } }).session(session);

    // Handling guardians update
    let newGuardians = [];
    if (guardians.length > 0) {
      for (let i = 0; i < guardians.length; i++) {
        const guardianData = guardians[i];
        if (guardianData.firstName && guardianData.lastName) {
          if (guardianData._id) {
            // Update existing guardian
            const guardian = await Guardian.findById(guardianData._id).session(session);
            if (guardian) {
              guardian.set({
                firstName: guardianData.firstName || guardian.firstName,
                lastName: guardianData.lastName || guardian.lastName,
                relation: guardianData.relation || guardian.relation,
                mobileNumber: guardianData.mobileNumber || guardian.mobileNumber, 
              });
              await guardian.save({ session });
            }
          } else {
            // Add new guardian
            const guardianPassword = generateRandomPassword(10);
            const hashedGuardianPassword = await bcrypt.hash(guardianPassword, 10);

            const newGuardian = new Guardian({
              firstName: guardianData.firstName,
              lastName: guardianData.lastName,
              email: guardianData.email,
              mobileNumber: guardianData.mobileNumber,
              relation: guardianData.relation,
              password: hashedGuardianPassword,
              student: student._id,
            });
            await newGuardian.save({ session });
            student.guardians.push(newGuardian._id);
            newGuardians.push({ guardian: newGuardian, password: guardianPassword });
          }
        }
      }
    }

    await student.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({
      message: 'Student updated successfully',
      studentId: student._id,
      guardianIds: student.guardians.map(g => g._id),
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Update Student Error:", error);
    res.status(500).json({ message: error.message || 'Failed to update student' });
  }
});

module.exports = {
  getAllStudents,
  updateImportantInformation,
  createNewStudent,
  updateStudent,
  getStudentById,
};
