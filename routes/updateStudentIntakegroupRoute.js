const express = require('express');
const router = express.Router();
const changeIntakeGroupController = require('../controllers/changeIntakeGroupController');
const { isAuthenticated, hasPermission } = require('../middleware/authMiddelware');

router.use(isAuthenticated);

router
  .route('/')
  .post(hasPermission(['admin/admin/change-student-intakegroup']),changeIntakeGroupController.changeIntakeGroup);

module.exports = router;
