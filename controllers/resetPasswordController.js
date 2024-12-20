const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const Student = require("../models/Student");
const { sendEmailNotification } = require("../config/nodeMailerConn");

// Function to handle password reset request
const resetPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Check if the email exists
  const student = await Student.findOne({ email });
  if (!student) {
    return res.status(404).json({ message: "Student not found" });
  }

  // Generate a reset token and expiry time
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExpiry = Date.now() + 3600000; // 1 hour

  // Save token and expiry to the student
  student.resetToken = resetToken;
  student.resetTokenExpiry = resetTokenExpiry;
  await student.save();

  // Create the reset link
  const resetLink = `${process.env.NEXTAUTH_URL}/auth/reset/${resetToken}`;
  const emailTitle = "Password Reset Request";
  const emailMessage = `
    <p>Hello ${student.name},</p>
    <p>You requested a password reset. Click the link below to reset your password:</p>
    <a href="${resetLink}" style="background-color: #3a6141; color: white; padding: 10px; text-decoration: none;">Reset Password</a>
    <p>If you didn't request this, you can safely ignore this email.</p>
  `;

  // Send the email
  try {
    await sendEmailNotification(student.email, emailTitle, emailMessage);
    res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ message: "Error sending email" });
  }
});

module.exports = {
  resetPassword,
};
