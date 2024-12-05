const jwt = require('jsonwebtoken');

// Middleware to check if the user is authenticated
exports.isAuthenticated = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Attaching decoded data to request to use in other middleware/routes
      req.user = decoded.UserInfo;
      return next();
    });
  } else {
    res.status(401).json({ message: 'User not authenticated' });
  }
};

// Middleware to check if the user is a Staff
exports.isStaff = (req, res, next) => {
  // Checking the user role from decoded JWT attached in `isAuthenticated` middleware
  if (req.user && req.user.userType === 'staff') {
    return next();
  }
  res.status(403).json({ message: 'Insufficient permissions' });
};

// Middleware to check if the user is a Student
exports.isStudent = (req, res, next) => {
  // Checking the user role from decoded JWT attached in `isAuthenticated` middleware
  if (req.user && req.user.userType === 'student') {
    return next();
  }
  res.status(403).json({ message: 'Insufficient permissions' });
};

// Middleware to check if the user is a Guardian
exports.isGuardian = (req, res, next) => {
  // Checking the user role from decoded JWT attached in `isAuthenticated` middleware
  if (req.user && req.user.userType === 'guardian') {
    return next();
  }
  res.status(403).json({ message: 'Insufficient permissions' });
};