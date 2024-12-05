const express = require('express');
const router = express.Router();
const resultsController = require('../controllers/resultsController');
const sorController = require('../controllers/sorController'); 
const { isAuthenticated, isStaff, isStudent, isGuardian } = require('../middleware/authMiddelware');

router.use(isAuthenticated); 

router.get('/', resultsController.getStudentsResults);
router.post('/', resultsController.updateStudentResult);

router.get('/:studentId', resultsController.getStudentResultsById);

router.get('/sor/:studentIds', sorController.getStudenSorByIds);

module.exports = router;