const express = require('express');
const router = express.Router();
const { getNotifications, deleteNotification, deleteAllNotifications, createNotification } = require('../controllers/notificationController');
const { isAuthenticated } = require('../middleware/authMiddelware');

router.use(isAuthenticated);

router.post('/staff', createNotification);

router.route('/:userId')
  .get(getNotifications)
  .delete(deleteAllNotifications);

router.route('/:userId/:notificationId')
  .delete(deleteNotification);

module.exports = router;
