const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');

router.post('/', async (req, res) => {
  const { userId, userType, subscription } = req.body;

  console.log('Received subscription data:', { userId, userType, subscription });

  if (!userId || !userType || !subscription) {
    console.error('Missing required fields');
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Find an existing subscription with the same endpoint
    let existingSubscription = await Subscription.findOne({
      userId,
      userType,
      'subscription.endpoint': subscription.endpoint,
    });

    if (existingSubscription) {
      // Update the existing subscription
      existingSubscription.subscription = subscription;
      await existingSubscription.save();
      console.log('Subscription updated successfully');
      res.status(200).json({ message: 'Subscription updated successfully' });
    } else {
      // Create a new subscription
      const newSubscription = new Subscription({ userId, userType, subscription });
      await newSubscription.save();
      console.log('Subscription saved successfully');
      res.status(201).json({ message: 'Subscription saved successfully' });
    }
  } catch (error) {
    console.error('Error saving subscription:', error);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

module.exports = router;
