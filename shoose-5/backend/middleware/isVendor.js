module.exports = (req, res, next) => {
  if (req.user.role !== 'vendor') {
    return res.status(403).json({ message: 'غير مصرح للتجار فقط' });
  }
  next();
};
