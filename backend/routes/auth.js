// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Vendor = require('../models/Vendor');
const Merchant = require('../models/Merchant');
const Customer = require('../models/Customer');
const auth = require('../middleware/auth');

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

// تسجيل عميل جديد (للأدمن فقط)
router.post('/register-customer', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'غير مصرح: للأدمن فقط' });
    }
    const { name, phone, password } = req.body;
    const existingCustomer = await Customer.findOne({ phone });
    if (existingCustomer) {
      return res.status(400).json({ message: 'رقم الهاتف موجود بالفعل' });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const customer = new Customer({ name, phone, password: hashedPassword });
    await customer.save();
    res.status(201).json({ message: 'تم إنشاء العميل بنجاح' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// تسجيل الدخول
router.post('/login', async (req, res) => {
  try {
    const { phone, email, password } = req.body;

    let user;
    let role;

    // تحقق من العميل (Customer) باستخدام رقم الهاتف
    if (phone) {
      user = await Customer.findOne({ phone });
      role = 'customer';
    }

    // تحقق من التاجر (Vendor) أو الأدمن (Merchant) باستخدام البريد الإلكتروني
    if (!user && email) {
      user = await Vendor.findOne({ email });
      role = 'vendor';
      if (!user) {
        user = await Merchant.findOne({ email });
        role = 'admin';
      }
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
      userId: user._id,
    });
  } catch (err) {
    console.error('Error in login:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
