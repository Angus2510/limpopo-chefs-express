const express = require('express');
const router = express.Router();
const roleController = require('../controllers/rolesController');
const { isAuthenticated, hasPermission, hasRoles, isStaff, isStudent, isGuardian } = require('../middleware/authMiddelware');

// Route to add a new role
router.post('/', roleController.addRole);

// Route to get all roles
router.get('/', roleController.getRoles);

router.get('/all', roleController.fetchAllRoles);

// Route to get a specific role by ID
router.get('/:id', roleController.getRoleById);

// Route to update a specific role by ID
router.put('/:id', roleController.updateRole);

// Route to delete a specific role by ID
router.delete('/:id', roleController.deleteRole);

module.exports = router;
