const express = require('express');
const router = express.Router();
const learningMaterialController = require('../controllers/learningMaterialController');
const upload = require('../middleware/multerConfig');
const { isAuthenticated, hasPermission, hasRoles, isStaff, isStudent, isGuardian } = require('../middleware/authMiddelware');

router.use(isAuthenticated); 

router.post('/upload', hasPermission(['admin/uploads']), upload.single('file'), learningMaterialController.uploadFileToS3);

router.get('/download/:id', learningMaterialController.downloadFileFromS3);

router.get('/', learningMaterialController.getAllLearningMaterials);
router.delete('/delete-multiple',hasPermission(['admin/uploads']), learningMaterialController.deleteMultipleLearningMaterials);

router.get('/student/:id', learningMaterialController.getLearningMaterialsByStudentId);

module.exports = router;

