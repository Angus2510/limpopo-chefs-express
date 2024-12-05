const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const Guardian = require('../models/Guardian');

async function findUserById(userId) {
  const staffUser = await Staff.findById(userId).exec();
  if (staffUser) {
    return { user: staffUser, userType: 'staff' };
  }

  const guardianUser = await Guardian.findById(userId).exec();
  if (guardianUser) {
    return { user: guardianUser, userType: 'guardian' };
  }

  const studentUser = await Student.findById(userId).exec();
  if (studentUser) {
    return { user: studentUser, userType: 'student' };
  }

  return null; // Return null if user not found
}

const acceptAgreement = asyncHandler(async (req, res) => {
  const { userId, userType } = req.body;

  console.log('Accept Agreement Request:', { userId, userType });

  const result = await findUserById(userId);

  if (!result) {
    return res.status(404).json({ message: 'User not found' });
  }

  const { user } = result;

  console.log('User found:', user);

  // Only update the necessary fields to avoid re-validating roles
  user.agreementAccepted = true;
  user.agreementAcceptedDate = new Date();

  // Avoid validation issues by setting the modified paths only
  await user.save({ validateModifiedOnly: true });

  console.log('User agreement accepted and saved:', user);

  res.status(200).json({ message: 'User agreement accepted' });
});

module.exports = {
  acceptAgreement,
};
