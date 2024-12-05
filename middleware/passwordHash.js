const bcrypt = require('bcrypt');

// Middleware to hash and salt the password
exports.hashPassword = async (req, res, next) => {
  const { password } = req.body;

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    req.hashedPassword = hashedPassword; // Attach hashed password to request object
    next();
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};