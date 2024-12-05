const express = require('express');
const router = express.Router();
const { emitNotification } = require('./config/socketConfig');

router.post('/', async (req, res) => {
  const { userId, title, message } = req.body;

  console.log('Received request to /api/test with body:', req.body);

  if (!userId || !title || !message) {
    console.error('Missing required fields:', req.body);
    return res.status(400).json({ error: 'Missing required fields: userId, title, message' });
  }

  try {
    const notification = { title, message, userId };
    console.log('Emitting notification:', notification);
    await emitNotification(userId, notification);
    res.status(200).json({ message: 'Notification sent successfully' });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

module.exports = router;
