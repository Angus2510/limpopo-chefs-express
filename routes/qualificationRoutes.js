const express = require('express');
const router = express.Router();
const qualificationController = require('../controllers/qualificationController');
const { isAuthenticated, hasPermission, hasRoles, isStaff, isStudent, isGuardian } = require('../middleware/authMiddelware');

router.use(isAuthenticated);

router
  .route('/')
  .get(qualificationController.getAllQualifications)
  .post(hasPermission(['admin/settings/qualification']), qualificationController.createNewQualification)
  .delete(hasPermission(['admin/settings/qualification']), qualificationController.deleteQualification);

module.exports = router;
