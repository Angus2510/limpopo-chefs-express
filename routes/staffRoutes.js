const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const upload = require('../middleware/multerConfig');
const { isAuthenticated, hasPermission, hasRoles, isStaff, isStudent, isGuardian } = require('../middleware/authMiddelware');

router.use(isAuthenticated); 

router.route('/')
    .post( hasPermission(['admin/settings/staff']), upload.single('photo'), staffController.createStaff)
    .get(hasPermission(['admin/settings/staff']), staffController.getAllStaff);

    router.route('/:id/toggle-active')
    .patch(hasPermission(['admin/settings/staff']), staffController.toggleStaffActiveStatus);

router.route('/:id')
    .get(hasPermission(['admin/settings/staff']), staffController.getStaffById)
    .put(hasPermission(['admin/settings/staff']), upload.single('photo'), staffController.updateStaff)
    .delete(hasPermission(['admin/settings/staff']), staffController.deleteStaff);

module.exports = router;
 