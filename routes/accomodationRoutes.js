const express = require('express');
const router = express.Router();
const { getAllAccommodations, createNewAccommodation, deleteAccommodation, updateAccommodation, getAccommodationById, getAvailableAccommodations } = require('../controllers/accommodationController');
const { isAuthenticated, hasPermission, hasRoles, isStaff, isStudent, isGuardian } = require('../middleware/authMiddelware');

router.use(isAuthenticated);

router.route('/available')
.get(getAvailableAccommodations);

router.route('/')
  .get(getAllAccommodations)
  .post(hasPermission(['admin/admin/accommodation']), createNewAccommodation);

  router.route('/:id')
  .get(getAccommodationById)
  .patch(hasPermission(['admin/admin/accommodation']), updateAccommodation)
  .delete(hasPermission(['admin/admin/accommodation']), deleteAccommodation);

module.exports = router;
