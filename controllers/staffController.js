const asyncHandler = require('express-async-handler');
const Staff = require('../models/Staff');
const bcrypt = require('bcrypt');
const { hashPassword } = require('../middleware/passwordHash');
const randomPasswordMiddleware = require('../middleware/randomPasswordMiddleware');
const transporter = require('../config/nodeMailerConn');
const fs = require('fs');
const path = require('path');

// Create a new staff member

const createStaff = asyncHandler(async (req, res) => {
  try {
    await randomPasswordMiddleware(req, res, async () => {
      const { username, email, profile, roles } = req.body;
      
      console.log('Request Body:', req.body);

      const staffExists = await Staff.findOne({ username });
      if (staffExists) {
        res.status(400).json({ message: 'Staff member already exists' });
        return;
      }

      if (!username || !profile || !roles) {
        res.status(400).json({ message: 'Missing required fields.' });
        return;
      }

      const staffPassword = req.randomPassword;
      const hashedStaffPassword = await bcrypt.hash(staffPassword, 10);

      let userPermissions = [];
      try {
        userPermissions = JSON.parse(req.body.userPermissions);
      } catch (error) {
        res.status(400).json({ message: 'Invalid userPermissions data' });
        return;
      }

      const staff = await Staff.create({
        username,
        email,
        profile,
        password: hashedStaffPassword,
        roles,
        userPermissions,
      });

      if (staff) {
        const templatePath = path.join(__dirname, '../templates/welcome.html');
        let emailTemplate = fs.readFileSync(templatePath, 'utf8');
        
        // Replace placeholders with actual values
        emailTemplate = emailTemplate.replace('[Your Username]', username);
        emailTemplate = emailTemplate.replace('[Your Password]', staffPassword);

        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'Your Staff Account Created',
          html: emailTemplate,
        };

        await transporter.sendMail(mailOptions);

        res.status(201).json({
          _id: staff._id,
          username: staff.username,
          email: staff.email,
          profile: staff.profile,
          roles: staff.roles,
          active: staff.active,
          userPermissions: staff.userPermissions,
        });
      } else {
        res.status(400).json({ message: 'Invalid staff data' });
      }
    });
  } catch (error) {
    console.error('Error creating staff:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all staff members

const getAllStaff = asyncHandler(async (req, res) => {
  let staff;
  try {
    // Attempt to populate the roles field
    staff = await Staff.find({}).populate('roles', 'roleName');
  } catch (error) {
    // If an error occurs, log it and fetch staff without populating roles
    console.error('Error populating roles:', error);
    staff = await Staff.find({});
  }
  res.json(staff);
});

// Get a single staff member by ID
const getStaffById = asyncHandler(async (req, res) => {
  const staff = await Staff.findById(req.params.id);

  if (staff) {
    res.json(staff);
  } else {
    res.status(404);
    throw new Error('Staff not found');
  }
}); 

// Update a staff member
const updateStaff = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    username,
    email,
    profile,
    roles,
    userPermissions,
  } = req.body;

  console.log(req.body)
  try {
    const staff = await Staff.findById(id);

    if (!staff) {
      res.status(404).json({ message: 'Staff not found' });
      return;
    }

    // Update the staff member fields
    staff.username = username || staff.username;
    staff.email = email || staff.email;
    staff.profile = profile || staff.profile;
    staff.roles = roles || staff.roles;
    staff.userPermissions = userPermissions ? JSON.parse(userPermissions) : staff.userPermissions;

    if (req.file) {
      staff.profile.avatar = req.file.location;
    }

    const updatedStaff = await staff.save();

    res.json(updatedStaff);
  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a staff member
const deleteStaff = asyncHandler(async (req, res) => {
  const staff = await Staff.findById(req.params.id);

  if (staff) {
    await Staff.findByIdAndDelete(req.params.id);
    res.json({ message: 'Staff deleted' });
  } else {
    res.status(404);
    throw new Error('Staff not found');
  }
});


const toggleStaffActiveStatus = async (req, res) => {
  try {
      const staff = await Staff.findById(req.params.id);
      if (!staff) {
          return res.status(404).json({ message: 'Staff not found' });
      }
      staff.active = !staff.active;
      await staff.save();
      res.json({ message: `Staff ${staff.active ? 'enabled' : 'disabled'} successfully`, active: staff.active });
  } catch (error) {
      res.status(500).json({ message: 'Failed to toggle staff active status', error });
  }
};

module.exports = {
  createStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
  toggleStaffActiveStatus,
};
