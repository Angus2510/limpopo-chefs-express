const express = require('express');
const router = express.Router();
const welController = require('../controllers/welController');
const upload = require('../middleware/multerConfig');
const { isAuthenticated, hasPermission, hasRoles, isStaff, isStudent, isGuardian } = require('../middleware/authMiddelware');

router.use(isAuthenticated); 

router.post('/create',hasPermission(['admin/well']), upload.array('photos', 10), welController.createWel);
router.get('/', welController.getAllWels);
router.get('/:id', welController.getWelById);
router.patch('/:id',hasPermission(['admin/well']), upload.array('photos', 10), welController.updateWel);
router.delete('/:id',hasPermission(['admin/well']), welController.deleteWel); 

module.exports = router;