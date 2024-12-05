const express = require('express');
const router = express.Router();
const campusController = require('../controllers/campusController');
const { isAuthenticated, hasPermission, hasRoles, isStaff, isStudent, isGuardian } = require('../middleware/authMiddelware');

router.use(isAuthenticated); 


router.route('/')
  .get(hasRoles(['student', 'staff']), campusController.getAllCampuses)
  .post(hasPermission(['admin/settings/campus']), campusController.createNewCampus)
  .delete(hasPermission(['admin/settings/campus']), campusController.deleteCampus);

module.exports = router;
