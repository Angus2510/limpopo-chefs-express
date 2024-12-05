const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const Staff = require('../models/Staff');
const Guardian = require('../models/Guardian');
const Student = require('../models/Student');
const transporter = require('../config/nodeMailerConn');
const crypto = require('crypto');

// Helper function to find user by identifier for students and staff
async function findUser(identifier) {
  const staffUser = await Staff.findOne({ $or: [{ email: identifier }, { username: identifier }] }).exec();
  if (staffUser) {
    return { user: staffUser, userType: 'staff' };
  }

  const guardianUser = await Guardian.findOne({ email: identifier }).exec();
  if (guardianUser) {
    return { user: guardianUser, userType: 'guardian' };
  }

  const studentUser = await Student.findOne({ admissionNumber: identifier }).exec();
  if (studentUser) {
    return { user: studentUser, userType: 'student' };
  }

  return null;
}

// Helper function to find user by reset token
async function findUserByResetToken(token) {
  const user = await Staff.findOne({ resetToken: token, resetTokenExpiry: { $gte: Date.now() } }) ||
               await Guardian.findOne({ resetToken: token, resetTokenExpiry: { $gte: Date.now() } }) ||
               await Student.findOne({ resetToken: token, resetTokenExpiry: { $gte: Date.now() } });

  if (user) {
    return { user };
  }

  return null;
}

// Function to handle password reset request
const resetPassword = asyncHandler(async (req, res) => {
  const { identifier } = req.body;

  if (!identifier) {
    return res.status(400).json({ message: 'Identifier is required' });
  }

  const userResult = await findUser(identifier);
  if (!userResult) {
    return res.status(404).json({ message: 'User not found' });
  }

  const { user } = userResult;

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = Date.now() + 3600000; // 1 hour

  // Save token to the user record
  user.resetToken = resetToken;
  user.resetTokenExpiry = resetTokenExpiry;
  await user.save();

  // HTML template for email
  const resetLink = `${process.env.NEXTAUTH_URL}/auth/reset/${resetToken}`;
  const htmlTemplate = `
  <!DOCTYPE html>
  <html>
  <head>
  <title>Password Reset</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">

  <!-- Header -->
  <div class="header" style="background-color: white; text-align: center; padding: 20px;">
      <img class="logo" src="https://limpopochefs.co.za/wp-content/uploads/2023/05/Limpopo-Chefs-Academy_Small-Logo.png" alt="Logo" style="max-width: 150px;">
  </div>

  <!-- Body -->
  <div class="body" style="background-color: #3a6141; padding: 20px;">
      <div class="card" style="background-color: white; padding: 20px; max-width: 80%; margin: 0 auto; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
          <h2 style="text-align: center; color: #3a6141;">Reset Your Password</h2>
          <p style="text-align: center;">Click the button below to reset your password:</p>
          <div style="text-align: center; margin-top: 20px;">
              <a href="${resetLink}" style="display: inline-block; background-color: #3a6141; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px;">Reset Password</a>
          </div>
          <p style="text-align: center; margin-top: 20px;">If the button above does not work, you can <a href="${resetLink}" style="color: #3a6141; text-decoration: none;">click here</a> to reset your password.</p>
          <p style="text-align: center; margin-top: 20px;">If you didn't request a password reset, you can ignore this email.</p>
      </div>
  </div>

  <!-- Footer -->
  <div class="footer" style="background-color: #3a6141; padding: 20px; text-align: center;">
      <p style="color: white;">Follow Us:</p>
      <p style="color: white;">
          <a href="https://www.facebook.com/limpopochefsacademy/" style="color: white; text-decoration: none;">Facebook</a> |
          <a href="https://www.instagram.com/limpopochefsacademy/" style="color: white; text-decoration: none;">Instagram</a> |
          <a href="https://www.youtube.com/channel/UCi2ewhBYkfY2SpWruMB_tiw" style="color: white; text-decoration: none;">YouTube</a> |
          <a href="https://www.tiktok.com/@limpopochefsacademy?_t=8ckZh1yl6V4&_r=1" style="color: white; text-decoration: none;">TikTok</a>
      </p>
  </div>

  </body>
  </html>
  `;

  // Send email
  const mailOptions = {
    to: user.email,  // Updated to use the user's email
    from: process.env.EMAIL_USER,
    subject: 'Password Reset',
    html: htmlTemplate,  // Use the HTML template
  };

  await transporter.sendMail(mailOptions);

  res.json({ message: 'Password reset request received' });
});

const staffResetPassword = asyncHandler(async (req, res) => {
  res.json({ message: 'Temporary password generated' });
});

const resetPasswordConfirm = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: 'Token and password are required' });
  }

  console.log("Received token:", token); // Debugging line
  console.log("Received password:", password); // Debugging line

  // Find user by reset token and ensure token is not expired
  const userResult = await findUserByResetToken(token);
  if (!userResult) {
    console.log("Invalid or expired token"); // Debugging line
    return res.status(400).json({ message: 'Invalid or expired token' });
  }

  const { user } = userResult;

  console.log("Found user:", user); // Debugging line

  // Hash new password
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log("Hashed Password: ", hashedPassword); // Debugging line

  // Update user's password and remove reset token
  user.password = hashedPassword;
  user.resetToken = null;
  user.resetTokenExpiry = null;

  // Save user and check for errors
  try {
    await user.save();
    console.log("User password updated successfully"); // Debugging line
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error("Error saving user:", error); // Debugging line
    res.status(500).json({ message: 'Error saving user' });
  }
});

module.exports = {
  resetPassword,
  resetPasswordConfirm,
  staffResetPassword,
};
