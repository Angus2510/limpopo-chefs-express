const express = require('express');
const router = express.Router();
const outcomeController = require('../controllers/outcomeController');
const { isAuthenticated, hasPermission, hasRoles, isStaff, isStudent, isGuardian } = require('../middleware/authMiddelware');

router.use(isAuthenticated); 

router
  .route('/')
  .get(outcomeController.getAllVisibleOutcomes) 
  .post(hasPermission(['admin/settings/outcomes']), outcomeController.createNewOutcome); 

  router
  .route('/all')
  .get(outcomeController.getAllOutcomes);

  router
  .route('/:id')
  .get(outcomeController.getOutcomeById) 
  .put(hasPermission(['admin/settings/outcomes']), outcomeController.updateOutcome); 
  
module.exports = router;
