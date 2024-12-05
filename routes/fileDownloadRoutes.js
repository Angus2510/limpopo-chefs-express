const express = require('express');
const router = express.Router();
const downloadController = require('../controllers/fileDownloadController');
const { isAuthenticated, isStaff, isStudent, isGuardian } = require('../middleware/authMiddelware');

router.use(isAuthenticated); 

router.get('/:id', downloadController.downloadFileById);

module.exports = router;
