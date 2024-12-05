const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentsController');
const studentDocumentsController = require('../controllers/studentDocumentsController');
const studentWelRecordController = require('../controllers/studentWelRecordController');
const stdudentSettingsController = require('../controllers/studentSettingsController');
const upload = require('../middleware/multerConfig');
const { isAuthenticated, hasPermission, hasRoles, isStaff, isStudent, isGuardian } = require('../middleware/authMiddelware');

router.use(isAuthenticated);  

router
  .route('/') 
  .get(hasRoles(['staff']),studentController.getAllStudents)

  .post(hasPermission(['admin/students']),
    upload.single('photo'), (req, res, next) => {
    req.query.folder = 'dev/profilephotos';
    upload.s3Upload(req, res, next);
  }, studentController.createNewStudent); 

  
router.patch('/:id', hasPermission(['admin/students']), upload.single('photo'), upload.s3Upload, studentController.updateStudent);

router.get('/:id', studentController.getStudentById);

router.post('/imporantinfo/:id',hasPermission(['admin/students']), studentController.updateImportantInformation);

router.post('/toggle-status/:id',hasPermission(['admin/students']), stdudentSettingsController.toggleStudentStatus);

router.post('/legaldocs/upload',hasPermission(['admin/students']), upload.single('file'), studentDocumentsController.uploadLegalDocument);
router.post('/generaldocs/upload',hasPermission(['admin/students']), upload.single('file'), studentDocumentsController.uploadGeneralDocument);

router.post('/wel-records',hasPermission(['admin/students']), studentWelRecordController.addWelRecord);
router.get('/wel-records/student/:studentId', studentWelRecordController.getWelRecordsByStudentId);

router.get('/legaldocs/download/:id',studentDocumentsController.downloadLegalDocument);
router.get('/generaldocs/download/:id', studentDocumentsController.downloadGeneralDocument);

router.get('/legaldocs', hasPermission(['admin/students']),studentDocumentsController.getAllLegalDocuments);
router.get('/generaldocs',hasPermission(['admin/students']), studentDocumentsController.getAllGeneralDocuments);

router.delete('/legaldocs/delete-multiple', hasPermission(['admin/students']),studentDocumentsController.deleteMultipleLegalDocuments);
router.delete('/generaldocs/delete-multiple', hasPermission(['admin/students']),studentDocumentsController.deleteMultipleGeneralDocuments);

router.get('/legaldocs/student/:studentId', studentDocumentsController.getLegalDocumentsByStudentId);
router.get('/generaldocs/student/:studentId', studentDocumentsController.getGeneralDocumentsByStudentId);

module.exports = router; 
