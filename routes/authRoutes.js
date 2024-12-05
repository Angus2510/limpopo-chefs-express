const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const loginLimiter = require('../middleware/loginLimiter');
const resetPasswordController = require('../controllers/resetPasswordController');
const verifyEmailController = require('../controllers/verifyEmailController');
const agreementController = require('../controllers/agreementController');

router.route('/').post( authController.login);
router.route('/refresh').post(authController.refreshToken);
router.route('/logout').post(authController.logout); 

router.post('/accept-agreement', agreementController.acceptAgreement);
router.post('/reset-password', resetPasswordController.resetPassword);
router.post('/reset-password/confirm', resetPasswordController.resetPasswordConfirm);
router.post('/staff-reset-password', resetPasswordController.staffResetPassword);

router.post('/verify-email', verifyEmailController.verifyEmail);

module.exports = router;