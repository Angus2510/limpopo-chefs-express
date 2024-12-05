const express = require('express');
const router = express.Router();
const studentDocumentsController = require('../controllers/studentDocumentsController');


// router.get('/legaldocs/student/:studentId', studentDocumentsController.getLegalDocumentsByStudentId);
// router.get('/generaldocs/student/:studentId', studentDocumentsController.getGeneralDocumentsByStudentId);

router.get('/test', (req, res) => {
    res.send('Test route is working!');
  });

module.exports = router; 
