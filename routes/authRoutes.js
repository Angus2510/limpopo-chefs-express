const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const resetPasswordController = require("../controllers/resetPasswordController");
const verifyEmailController = require("../controllers/verifyEmailController");
const agreementController = require("../controllers/agreementController");

// Destructure functions from controllers
const { resetPassword, resetPasswordConfirm, staffResetPassword } =
  resetPasswordController;

// Debugging logs
console.log("resetPassword:", resetPassword);
console.log("resetPasswordConfirm:", resetPasswordConfirm);
console.log("staffResetPassword:", staffResetPassword);

// Auth routes
router.post("/", authController.login);
router.post("/refresh", authController.refreshToken);
router.post("/logout", authController.logout);

// Agreement routes
router.post("/accept-agreement", agreementController.acceptAgreement);

// Password reset routes
router.post(
  "/reset-password",
  resetPassword ||
    ((req, res) =>
      res.status(500).json({ message: "resetPassword is undefined" }))
);
router.post(
  "/reset-password/confirm",
  resetPasswordConfirm ||
    ((req, res) =>
      res.status(500).json({ message: "resetPasswordConfirm is undefined" }))
);
router.post(
  "/staff-reset-password",
  staffResetPassword ||
    ((req, res) =>
      res.status(500).json({ message: "staffResetPassword is undefined" }))
);

// Email verification route
router.post("/verify-email", verifyEmailController.verifyEmail);

module.exports = router;
