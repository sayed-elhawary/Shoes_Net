const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Vendor = require('../models/Vendor');
const Merchant = require('../models/Merchant');

// تسجيل تاجر جديد
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 12);
    const vendor = new Vendor({ name, email, password: hashedPassword });
    await vendor.save();
    res.status(201).json({ message: 'تم إنشاء التاجر بنجاح' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// تسجيل الدخول
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    let user = await Vendor.findOne({ email });
    let role = 'vendor';
    
    if (!user) {
      user = await Merchant.findOne({ email });
      role = 'admin';
    }
    
    if (!user) {
      return res.status(400).json({ message: 'بيانات غير صحيحة' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'بيانات غير صحيحة' });
    }
    
    const token = jwt.sign(
      { id: user._id, role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    res.json({
      token,
      role,
      userId: user._id
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
