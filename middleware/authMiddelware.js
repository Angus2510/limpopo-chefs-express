const jwt = require('jsonwebtoken');
const Roles = require('../models/Roles');
const Staff = require('../models/Staff');

// Middleware to check if the user is authenticated
exports.isAuthenticated = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        console.log('User not authenticated: Invalid token');
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Attaching decoded UserInfo to request to use in other middleware/routes
      req.user = decoded.UserInfo;
      console.log('User authenticated:', req.user);
      return next();
    });
  } else {
    console.log('User not authenticated: No token provided');
    res.status(401).json({ message: 'User not authenticated' });
  }
};

// Middleware to check if the user has the required permissions
exports.hasPermission = (routes) => {
  return async (req, res, next) => {
    if (!req.user) {
      console.log('User not authenticated');
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userId = req.user.id;
    const method = req.method.toLowerCase();
    console.log(`Checking permissions for user ${userId} on routes ${routes} with method ${method}`);

    try {
      // Fetch the user from the database
      const user = await Staff.findById(userId).populate('roles');

      if (!user) {
        console.log('User not found');
        return res.status(403).json({ message: 'User not found' });
      }

      // Check individual user permissions first
      let userHasPermission = false;
      user.userPermissions.forEach(userPermission => {
        if (routes.includes(userPermission.page)) {
          if (method === 'get' && userPermission.permissions.view) {
            userHasPermission = true;
          }
          if (method === 'post' && userPermission.permissions.upload) {
            userHasPermission = true;
          }
          if ((method === 'put' || method === 'patch' || method === 'delete') && userPermission.permissions.edit) {
            userHasPermission = true;
          }
        }
      });

      if (userHasPermission) {
        console.log('User has individual permissions');
        return next();
      }

      // If no individual permission, check roles permissions
      console.log('Checking roles permissions');
      let roleHasPermission = false;
      user.roles.forEach(role => {
        role.permissions.forEach(permission => {
          if (routes.includes(permission.page)) {
            if (method === 'get' && permission.actions.view) {
              roleHasPermission = true;
            }
            if (method === 'post' && permission.actions.upload) {
              roleHasPermission = true;
            }
            if ((method === 'put' || method === 'patch' || method === 'delete') && permission.actions.edit) {
              roleHasPermission = true;
            }
          }
        });
      });

      if (!roleHasPermission) {
        console.log('Insufficient permissions');
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      console.log('User has the required permissions');
      next();
    } catch (error) {
      console.log('Internal server error', error);
      res.status(500).json({ message: 'Internal server error', error });
    }
  };
};

// Middleware to check if the user has any of the specified roles
exports.hasRoles = (roles) => {
  return (req, res, next) => {
    if (req.user && roles.includes(req.user.userType)) {
      console.log(`User has one of the required roles: ${roles}`);
      return next();
    }
    console.log(`Insufficient permissions: User does not have any of the roles ${roles}`);
    res.status(403).json({ message: 'Insufficient permissions' });
  };
};