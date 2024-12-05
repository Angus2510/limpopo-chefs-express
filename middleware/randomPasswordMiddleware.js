function generateRandomPassword(length) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}

const randomPasswordMiddleware = (req, res, next) => {
  const randomPassword = generateRandomPassword(10);
  console.log('Random Password:', randomPassword);
  req.randomPassword = randomPassword;
  next();
};

module.exports = randomPasswordMiddleware;
module.exports.generateRandomPassword = generateRandomPassword;