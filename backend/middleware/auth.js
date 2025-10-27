// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  console.log('Received token:', token ? 'Token exists' : 'No token provided');

  if (!token) {
    console.error('Authentication error: No token provided');
    return res.status(401).json({ message: 'غير مصرح: يرجى تسجيل الدخول' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', { id: decoded.id, role: decoded.role });
    if (!['admin', 'vendor', 'customer'].includes(decoded.role)) {
      console.error('Authentication error: Invalid role in token', decoded.role);
      return res.status(401).json({ message: 'غير مصرح: دور غير صالح' });
    }
    req.user = decoded; // يحتوي على id و role
    next();
  } catch (err) {
    console.error('Authentication error:', {
      message: err.message,
      stack: err.stack,
      token: token ? 'Token provided' : 'No token'
    });
    return res.status(401).json({ message: 'غير مصرح: توكن غير صالح' });
  }
};
