const express = require('express');
const router = express.Router();
const path = require('path');
const { isAuthenticated, isStaff, isStudent, isGuardian } = require('../middleware/authMiddelware');

router.use(isAuthenticated); 

router.use('/', express.static(path.join(__dirname, '..', 'uploads')));

module.exports = router;
