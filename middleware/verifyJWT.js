const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const Staff = require('../models/Staff');
const Guardian = require('../models/Guardian');
const Student = require('../models/Student');

const verifyJWT = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized - No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const { user, userType } = await findUser(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized - User not found' });
    }

    req.user = user;
    req.userType = userType;

    next();
  } catch (error) {
    return res.status(403).json({ message: 'Forbidden - Token invalid' });
  }
});

module.exports = verifyJWT;
