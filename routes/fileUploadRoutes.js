const express = require('express');
const router = express.Router();
const fileUploadController = require('../controllers/fileUploadController');
const upload = require('../middleware/multerConfig');
const { isAuthenticated, isStaff, isStudent, isGuardian } = require('../middleware/authMiddelware');

router.use(isAuthenticated); 

router.post('/', upload.single('fileData'), fileUploadController.uploadFile);
router.get('/', fileUploadController.getAllFiles);
router.get('/:id', fileUploadController.getFileById);
router.patch(
  '/:id',
  upload.single('fileData'),
  fileUploadController.updateFileInfo
);
router.delete('/:id', fileUploadController.deleteFile);

module.exports = router;
