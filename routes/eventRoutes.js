const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const studentEventsController = require('../controllers/studentEventsController');
const { isAuthenticated, hasPermission, hasRoles, isStaff, isStudent, isGuardian } = require('../middleware/authMiddelware');

router.use(isAuthenticated); 

// Route to get all events
router.route('/')
  .get(hasPermission(['admin/dashboard']), eventController.getAllEvents)
  .post(hasPermission(['admin/dashboard']), eventController.createEvent);

router.get('/student/:studentId/events', studentEventsController.getStudentEvents);

// Route to get, update, or delete a specific event by ID
router.route('/:id')
  .get(eventController.getEventById)
  .put(hasPermission(['admin/dashboard']), eventController.updateEvent)
  .delete(hasPermission(['admin/dashboard']), eventController.deleteEvent);

module.exports = router;