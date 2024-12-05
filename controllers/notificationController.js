const Notification = require('../models/Notification');
const Student = require('../models/Student');
const Guardian = require('../models/Guardian');
const { emitNotification } = require('../config/socketConfig'); 

const getNotifications = async (req, res) => {
  const { userId } = req.params;

  try {
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

const deleteNotification = async (req, res) => {
  const { userId, notificationId } = req.params;

  try {
    await Notification.findOneAndDelete({ _id: notificationId, userId });
    res.status(200).json({ message: 'Notification removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove notification' });
  }
};

const deleteAllNotifications = async (req, res) => {
  const { userId } = req.params;

  try {
    await Notification.deleteMany({ userId });
    res.status(200).json({ message: 'All notifications removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove notifications' });
  }
};

const createNotification = async (req, res) => {
  const { title, message, campuses, intakeGroups, students } = req.body;

  try {
    // Find students by campuses and intake groups
    let studentIds = [];

    if (campuses.length > 0 && intakeGroups.length > 0) {
      const studentsInGroups = await Student.find({
        campus: { $in: campuses },
        intakeGroup: { $in: intakeGroups }
      }).select('_id guardians');

      studentIds = studentsInGroups.map(student => student._id);
    }

    // Add individual students' IDs
    if (students.length > 0) {
      studentIds = studentIds.concat(students);
    }

    // Remove duplicates
    studentIds = [...new Set(studentIds)];

    // Create notifications for all unique student IDs
    const notifications = [];
    const guardianNotifications = [];

    for (const studentId of studentIds) {
      const notification = {
        title,
        message,
        userId: studentId,
        userType: 'student',
        isRead: false,
        type: 'notification'
      };
      notifications.push(notification);

      emitNotification(studentId, notification);

      // Find guardians for the student and create notifications for them
      const student = await Student.findById(studentId).select('guardians');
      if (student && student.guardians && student.guardians.length > 0) {
        for (const guardianId of student.guardians) {
        const guardianNotification = {
            title,
            message,
            userId: guardianId,
            userType: 'guardian',
            isRead: false,
            type: 'notification'
          };
          guardianNotifications.push(guardianNotification);

          emitNotification(guardianId, guardianNotification);
        }
      }
    }

    // Insert notifications for students and guardians
    await Notification.insertMany([...notifications, ...guardianNotifications]);

    res.status(201).json({ message: 'Notifications created successfully' });
  } catch (error) {
    console.error('Error creating notifications:', error);
    res.status(500).json({ error: 'Failed to create notifications' });
  }
};
  

module.exports = {
  getNotifications,
  deleteNotification,
  deleteAllNotifications,
  createNotification,
};
