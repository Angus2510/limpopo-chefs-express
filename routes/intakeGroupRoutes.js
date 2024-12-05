const express = require('express');
const router = express.Router();
const intakeGroupController = require('../controllers/intakeGroupController');
const { isAuthenticated, hasPermission, hasRoles, isStaff, isStudent, isGuardian } = require('../middleware/authMiddelware');

router.use(isAuthenticated); 

router
  .route('/')
  .get(intakeGroupController.getAllIntakeGroups)
  .post( hasPermission(['admin/settings/intakegroup']), intakeGroupController.createNewIntakeGroup);

router
  .route('/:id')
  .get(hasPermission(['admin/settings/intakegroup']), intakeGroupController.getIntakeGroupById) 
  .patch(hasPermission(['admin/settings/intakegroup']), intakeGroupController.updateIntakeGroup);

module.exports = router;
