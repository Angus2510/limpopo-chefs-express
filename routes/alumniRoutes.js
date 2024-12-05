const express = require('express');
const router = express.Router();
const alumniController = require('../controllers/alumniController');
const { isAuthenticated, hasPermission, hasRoles, isStaff, isStudent, isGuardian } = require('../middleware/authMiddelware');

router.use(isAuthenticated); 

router.put('/toggle/:id', hasPermission(['admin/admin/alumni']), alumniController.toggleAlumniStatus);

router
  .route('/') 
  .get(hasPermission(['admin/admin/alumni']), alumniController.getAllAlumni)

router.get('/:id', hasPermission(['admin/admin/alumni']), alumniController.getAlumniById);

module.exports = router;  
