const express = require('express');
const router = express.Router();
const guardianController = require('../controllers/guardianProfileController');
const { isAuthenticated, hasRoles, isGuardian } = require('../middleware/authMiddelware');

router.use(isAuthenticated); 

// Guardian Dashboard Route
router.route('/dashboard/:guardianId')
  .get( guardianController.getDashboard);

// Guardian Assignments Route
router.route('/assignment-results/:guardianId')
  .get( guardianController.getAssignmentResultsByGuardianId);

// Guardian Attendance Route
router.route('/attendance/:guardianId')
  .get( guardianController.getAttendance);

// Guardian Fees Route
router.route('/fees/:guardianId')
  .get(guardianController.getFees);

module.exports = router;
