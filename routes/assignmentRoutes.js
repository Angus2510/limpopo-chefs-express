const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const questionController = require('../controllers/questionController');
const answerController = require('../controllers/answerController');
const assignmentResultController = require('../controllers/assignmentResultController');
const assignmentUploadController = require('../controllers/assignmentUploadController');
const assignmentModerationController = require('../controllers/assignmentModerationController');
const { isAuthenticated, hasPermission, hasRoles, isStaff, isStudent, isGuardian } = require('../middleware/authMiddelware');
const assignmentStudentController = require('../controllers/assignmentStudentController');
const studentAssignmentResultController = require('../controllers/studentAssignmentResultController');

const upload = require('../middleware/multerConfig'); 


router.use(isAuthenticated); 

// Upload route for assignments
router
  .route('/upload')
  .post(hasPermission(['admin/assignment/create']), upload.single('fileData'), assignmentUploadController.uploadFileToAssignment);

router
  .get('/student/results/:studentId', studentAssignmentResultController.getAssignmentResultsByStudentId);

router
  .route('/student/:studentId/assignments')
  .get(assignmentStudentController.getAssignmentsForStudent);

// Route to start an assignment
router.post('/student/:studentId/assignments/:assignmentId/start', assignmentStudentController.startAssignment);
router.post('/student/:studentId/assignments/:assignmentId/start-writing', assignmentStudentController.startWritingAssignment);

// Route to submit answers to an assignment
router.post('/student/:studentId/assignments/:assignmentId/answers', assignmentStudentController.submitAnswers);
router.post('/student/:studentId/assignments/:assignmentId/assignment/terminate', assignmentStudentController.terminateAssignment);
router.post('/student/:studentId/assignments/:assignmentId/assignment', assignmentStudentController.submitAssignment);
// Assignment routes

router
  .get('/staff/results',hasPermission(['admin/assignment/mark']), assignmentResultController.getAllAssignmentResults)
  .post('/staff/results',hasPermission(['admin/assignment/mark']), assignmentResultController.createAssignmentResult)
  .get('/staff/results/student/:studentId',hasPermission(['admin/assignment/mark']), assignmentResultController.getAssignmentResultsByStudentId)
  .get('/staff/results/:resultId',hasPermission(['admin/assignment/mark']), assignmentResultController.getAssignmentResultById)
  .put('/staff/results/:resultId',hasPermission(['admin/assignment/mark']), assignmentResultController.updateAssignmentResult)
  .put('/staff/results/:resultId/moderated-marks',hasPermission(['admin/assignment/mark']), assignmentModerationController.updateModeratedMarks)
  .get('/staff/results/:resultId/moderated-marks',hasPermission(['admin/assignment/mark']), assignmentModerationController.getModerationRecordsByResultId)
  .delete('/staff/results/:resultId',hasPermission(['admin/assignment/mark']), assignmentResultController.deleteAssignmentResult)
  .post('/staff/results/:resultId/comments', hasPermission(['admin/assignment/mark']), assignmentResultController.addCommentToAssignmentResult);

router 
  .route('/')
  .get(hasPermission(['admin/assignment/create','admin/assignment']), assignmentController.getAllAssignments)
  .post(hasPermission(['admin/assignment/create']), assignmentController.createAssignment);

router
  .route('/:id')
  .get(assignmentController.getAssignmentById)
  .patch(hasPermission(['admin/assignment/create']), assignmentController.updateAssignment)
  .delete(hasPermission(['admin/assignment/create']), assignmentController.deleteAssignment);

// Questions routes under specific assignment
router
  .route('/:assignmentId/questions')
  .get(hasPermission(['admin/assignment/create','admin/assignment']), questionController.getAllQuestionsForAssignment)
  .post(hasPermission(['admin/assignment/create']), questionController.addQuestionToAssignment);

router
  .route('/:assignmentId/questions/:questionId')
  .get(hasPermission(['admin/assignment/create','admin/assignment']), questionController.getQuestion)
  .patch(hasPermission(['admin/assignment/create']), questionController.updateQuestion)
  .delete(hasPermission(['admin/assignment/create']), questionController.deleteQuestion);


module.exports = router;
