const express = require('express');
const router = express.Router();
const { graduateStudents } = require('../controllers/graduateController');
const { isAuthenticated, hasPermission, hasRoles, isStaff, isStudent, isGuardian } = require('../middleware/authMiddelware');

router.use(isAuthenticated); 

router.post('/',hasPermission(['admin/admin/graduate']), graduateStudents);

module.exports = router;
