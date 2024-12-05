const Notification = require('../models/Notification');
const Staff = require('../models/Staff');
const Guardian = require('../models/Guardian');
const Student = require('../models/Student');
const { emitNotification } = require('../config/socketConfig');
const { sendEmailNotification } = require('../config/nodeMailerConn'); 

const addNotification = async (notificationData) => {
  const { title, message, userId, type } = notificationData;

  if (!title || !message || !userId || !type) {
    throw new Error('Notification data is incomplete');
  }

  try {
    let userType = null;
    let userEmail = null;

    const staffUser = await Staff.findById(userId);
    if (staffUser) {
      userType = 'staff';
      userEmail = staffUser.email;
    } else {
      const guardianUser = await Guardian.findById(userId);
      if (guardianUser) {
        userType = 'guardian';
        userEmail = guardianUser.email;
      } else {
        const studentUser = await Student.findById(userId);
        if (studentUser) {
          userType = 'student';
          userEmail = studentUser.email;

          // Save notification for the student
          console.log(`Creating notification for student ${userId}`);
          const studentNotification = new Notification({ title, message, userId, userType, type });
          await studentNotification.save();
          emitNotification(userId, studentNotification);
          sendEmailNotification(userEmail, title, message);

          // Also save the notification for each guardian of the student
          const guardianIds = studentUser.guardians;
          for (const guardianId of guardianIds) {
            console.log(`Creating notification for guardian ${guardianId}`);
            const guardianNotification = new Notification({ title, message, userId: guardianId, userType: 'guardian', type });
            await guardianNotification.save();
            emitNotification(guardianId, guardianNotification);

               // Send email notification to guardians
            const guardian = await Guardian.findById(guardianId);
               if (guardian) {
                 sendEmailNotification(guardian.email, title, message);
               }
          }

          return studentNotification;
        }
      }
    }

    if (!userType) {
      throw new Error('User not found');
    }
    
    console.log(`Creating notification for ${userType} ${userId}`);
    const notification = new Notification({ title, message, userId, userType, type });
    await notification.save();
    
    emitNotification(userId, notification);

  // Send email notification to staff or guardian
    if (userEmail) {
      sendEmailNotification(userEmail, title, message);
    }

    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw new Error('Failed to create notification');
  }
};

module.exports = addNotification;
