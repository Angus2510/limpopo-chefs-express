const express = require('express');
const router = express.Router();
const guardianController = require('../controllers/guardianController');
const { isAuthenticated, isStaff, isStudent, isGuardian } = require('../middleware/authMiddelware');

router.use(isAuthenticated); 


router
  .route('/')
  .get(guardianController.getAllGuardians)
  .post(guardianController.createNewGuardian);

module.exports = router;
