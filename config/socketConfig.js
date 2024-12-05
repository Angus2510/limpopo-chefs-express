const webpush = require('web-push');
const Subscription = require('../models/Subscription');
const allowedOrigins = require('./allowedOrigins');

webpush.setVapidDetails(
  'mailto:dev@swartdigital.co.za',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

let io;

const initializeSocket = (server) => {
  io = require('socket.io')(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingInterval: 60000,
    pingTimeout: 120000, 
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', (userId) => {
      console.log(`User with ID ${userId} joined`);
      socket.join(userId);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};

const emitNotification = async (userId, notification) => {
  console.log(`Emitting notification to userId: ${userId}`);
  io.to(userId).emit('notification', notification);

  try {
    console.log(`Fetching subscription for userId: ${userId}`);
    const subscriptions = await Subscription.find({ userId });
    for (const sub of subscriptions) {
      const payload = JSON.stringify({
        title: notification.title,
        message: notification.message,
      });

      console.log(`Sending web push notification to subscription: ${JSON.stringify(sub)}`);
      await webpush.sendNotification(sub.subscription, payload);
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};

module.exports = { initializeSocket, emitNotification };
