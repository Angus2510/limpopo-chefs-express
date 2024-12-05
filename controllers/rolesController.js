const Roles = require('../models/Roles');
const axios = require('axios');
const WEBHOOK_URL = 'https://limpopochefs.vercel.app/api/webhook';
const Staff = require('../models/Staff');

const notifyWebhook = async (payload) => {
  try {
    const response = await axios.post(WEBHOOK_URL, payload);
    console.log('Webhook notification sent:', response.data);
  } catch (error) {
    console.error('Error sending webhook notification:', error.message);
  }
};

// Add a new role
exports.addRole = async (req, res) => {
  try {
    const { roleName, description, permissions } = req.body;
    const newRole = new Roles({ roleName, description, permissions });
    await newRole.save();

    // Notify Next.js app
    await notifyWebhook({ event: 'ROLE_ADDED', role: newRole });

    res.status(201).json({ message: 'Role added successfully', role: newRole });
  } catch (error) {
    res.status(400).json({ message: 'Error adding role', error });
  }
};

// Get all roles
exports.fetchAllRoles = async (req, res) => {
  try {
    const roles = await Roles.find();
    res.status(200).json(roles);
  } catch (error) {
    res.status(400).json({ message: 'Error retrieving roles', error });
  }
};

// Get all roles formatted

exports.getRoles = async (req, res) => {
  try {
    const roles = await Roles.find().lean();
    const staff = await Staff.find().lean();

    if (!roles) {
      throw new Error('No roles found');
    }

    if (!staff) {
      throw new Error('No staff found');
    }

    const transformData = (roles, staff) => {
      const pagesAccess = {};

      roles.forEach((role) => {
        role.permissions.forEach((permission) => {
          const page = permission.page;
          const actions = permission.actions;

          if (!pagesAccess[page]) {
            pagesAccess[page] = {
              types: ['staff'],
              userIds: [],
              actions: {
                view: [],
                edit: [],
                upload: [],
              },
            };
          }

          for (const action in actions) {
            if (actions[action] && !pagesAccess[page].actions[action].includes(role.roleName)) {
              pagesAccess[page].actions[action].push(role.roleName);
            }
          }
        });
      });

      staff.forEach((member) => {
        if (member.userPermissions && Array.isArray(member.userPermissions)) {
          member.userPermissions.forEach((permission) => {
            const page = permission.page;
            const staffId = member._id;
            const actions = permission.permissions;

            if (!pagesAccess[page]) {
              pagesAccess[page] = {
                types: ['staff'],
                userIds: [],
                actions: {
                  view: [],
                  edit: [],
                  upload: [],
                },
              };
            }

            if (!pagesAccess[page].userIds.find(user => user.id.toString() === staffId.toString())) {
              pagesAccess[page].userIds.push({
                id: staffId,
                permissions: {
                  view: actions.view,
                  edit: actions.edit,
                  upload: actions.upload
                }
              });
            }

            if (actions.view && !pagesAccess[page].actions.view.includes(staffId.toString())) {
              pagesAccess[page].actions.view.push(staffId.toString());
            }

            if (actions.edit && !pagesAccess[page].actions.edit.includes(staffId.toString())) {
              pagesAccess[page].actions.edit.push(staffId.toString());
            }

            if (actions.upload && !pagesAccess[page].actions.upload.includes(staffId.toString())) {
              pagesAccess[page].actions.upload.push(staffId.toString());
            }
          });
        }
      });

      return pagesAccess;
    };

    const transformedData = transformData(roles, staff);

    res.status(200).json(transformedData);
  } catch (error) {
    console.error('Error retrieving roles:', error);
    res.status(400).json({ message: 'Error retrieving roles', error: error.message });
  }
};

// Get a specific role by ID
exports.getRoleById = async (req, res) => {
  try {
    const role = await Roles.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    res.status(200).json(role);
  } catch (error) {
    res.status(400).json({ message: 'Error retrieving role', error });
  }
};

// Update a role by ID
exports.updateRole = async (req, res) => {
  try {
    const { roleName, description, permissions } = req.body;
    const role = await Roles.findByIdAndUpdate(
      req.params.id,
      { roleName, description, permissions },
      { new: true }
    );
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Notify Next.js app
    await notifyWebhook({ event: 'ROLE_UPDATED', role });

    res.status(200).json({ message: 'Role updated successfully', role });
  } catch (error) {
    res.status(400).json({ message: 'Error updating role', error });
  }
};

// Delete a role by ID
exports.deleteRole = async (req, res) => {
  try {
    const role = await Roles.findByIdAndDelete(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Notify Next.js app
    await notifyWebhook({ event: 'ROLE_DELETED', roleId: req.params.id });

    res.status(200).json({ message: 'Role deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting role', error });
  }
};
