const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Student = require('../models/Student');
const Event = require('../models/Event');
const LearningMaterial = require('../models/LearningMaterial');
const { isAuthenticated } = require('../middleware/authMiddelware');
const Roles = require('../models/Roles');
const Staff = require('../models/Staff');

// Function to format student results
const formatStudentResults = (students) => {
  return students.map(student => ({
    heading: `${student.profile.firstName} ${student.profile.lastName}`,
    subheading: student.email,
    route: `/admin/students/${student._id}`
  }));
};

// Function to format event results
const formatEventResults = (events) => {
  return events.map(event => ({
    heading: event.title,
    subheading: `${event.type} - ${new Date(event.startDate).toLocaleDateString()} to ${new Date(event.endDate).toLocaleDateString()}`,
    route: `/events/${event._id}`
  }));
};

const formatDownloadResults = (downloads) => {
  return downloads.map(download => ({
    heading: download.title,
    subheading: `${download.uploadType} - ${new Date(download.dateUploaded).toLocaleDateString()}`,
    route: `/downloads/${download._id}`
  }));
};

// Middleware to check if the user has specific search permissions
const checkSearchPermissions = (user, entity) => {
  let hasPermission = false;

  // Check individual user permissions first
  user.userPermissions.forEach(userPermission => {
    if (userPermission.page === `${entity}` && userPermission.permissions.view) {
      hasPermission = true;
    }
  });

  if (hasPermission) return true;

  // If no individual permission, check roles permissions
  user.roles.forEach(role => {
    role.permissions.forEach(permission => {
      if (permission.page === `${entity}` && permission.actions.view) {
        hasPermission = true;
      }
    });
  });

  return hasPermission;
};

// Search endpoint with authentication and role determination
router.get('/', isAuthenticated, async (req, res) => {
  const { query } = req.query;
  const userType = req.user.userType;
  const userId = req.user.id;

  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  let searchResults = {};


  try {
    if (userType === 'staff') {
      const user = await Staff.findById(userId).populate('roles');

      if (!user) {
        return res.status(403).json({ error: 'User not found' });
      }

      if (checkSearchPermissions(user, 'admin/students')) {
        const studentResults = await Student.find({
          $or: [
            { username: new RegExp(query, 'i') },
            { admissionNumber: new RegExp(query, 'i') },
            { email: new RegExp(query, 'i') },
            { 'profile.firstName': new RegExp(query, 'i') },
            { 'profile.lastName': new RegExp(query, 'i') },
          ],
        }).limit(10);

        searchResults.students = formatStudentResults(studentResults);
      }

      if (checkSearchPermissions(user, 'admin/dashboard')) {
        const eventResults = await Event.find({
          $or: [
            { title: new RegExp(query, 'i') },
            { type: new RegExp(query, 'i') },
            { details: new RegExp(query, 'i') },
          ],
        }).limit(10);

        searchResults.events = formatEventResults(eventResults);
      }
    } else if (userType === 'student') {
      const student = await Student.findById(userId).populate('campus intakeGroup').exec();

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      const studentCampuses = student.campus.map(campus => campus._id);
      const studentIntakeGroups = student.intakeGroup.map(intakeGroup => intakeGroup._id);

      const events = await Event.find({
        $and: [
          {
            $or: [
              { location: { $in: studentCampuses } },
              { assignedTo: { $in: studentIntakeGroups } }
            ]
          },
          {
            $or: [
              { title: new RegExp(query, 'i') },
              { type: new RegExp(query, 'i') },
              { details: new RegExp(query, 'i') }
            ]
          }
        ]
      }).limit(10).populate('location assignedTo').exec();

      searchResults.events = formatEventResults(events);

      const downloads = await LearningMaterial.find({
        intakeGroup: { $in: studentIntakeGroups },
        $or: [
          { title: new RegExp(query, 'i') },
          { description: new RegExp(query, 'i') }
        ]
      }).limit(10);

      searchResults.downloads = formatDownloadResults(downloads);
    }

    console.log(searchResults);
    res.json(searchResults);
  }catch (error) {
    console.error('Error determining user role and search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
