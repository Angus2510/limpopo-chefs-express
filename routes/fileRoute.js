const express = require('express');
const { authenticateToken, getFile } = require('../controllers/fileController');
const router = express.Router();
const { isAuthenticated, isStaff, isStudent, isGuardian } = require('../middleware/authMiddelware');

// router.use(isAuthenticated); 

router.get('/getFile', getFile);

module.exports = router;