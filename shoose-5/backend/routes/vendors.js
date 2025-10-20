const express = require('express');
const router = express.Router();
const Vendor = require('../models/Vendor');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const bcrypt = require('bcryptjs');

// جلب قائمة التجار (للزوار)
router.get('/', async (req, res) => {
  try {
    const vendors = await Vendor.find().select('_id name description');
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ message: 'خطأ في جلب التجار: ' + err.message });
  }
});

// إنشاء تاجر (للأدمن)
router.post('/', auth, isAdmin, async (req, res) => {
  const { name, email, password, description } = req.body;
  try {
    const existingVendor = await Vendor.findOne({ email });
    if (existingVendor) {
      return res.status(400).json({ message: 'البريد الإلكتروني مستخدم بالفعل' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const vendor = new Vendor({ name, email, password: hashedPassword, description });
    await vendor.save();
    res.status(201).json({ message: 'تم إنشاء التاجر بنجاح', vendor });
  } catch (err) {
    res.status(400).json({ message: 'خطأ في إنشاء التاجر: ' + err.message });
  }
});

// تعديل تاجر (للأدمن)
router.put('/:id', auth, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, email, password, description } = req.body;
  try {
    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ message: 'التاجر غير موجود' });
    }

    // تحديث الحقول الموجودة فقط
    if (name) vendor.name = name;
    if (email) {
      const existingVendor = await Vendor.findOne({ email, _id: { $ne: id } });
      if (existingVendor) {
        return res.status(400).json({ message: 'البريد الإلكتروني مستخدم بالفعل' });
      }
      vendor.email = email;
    }
    if (password) vendor.password = await bcrypt.hash(password, 10);
    if (description) vendor.description = description;

    await vendor.save();
    res.json({ message: 'تم تعديل التاجر بنجاح', vendor });
  } catch (err) {
    res.status(400).json({ message: 'خطأ في تعديل التاجر: ' + err.message });
  }
});

// حذف تاجر (للأدمن)
router.delete('/:id', auth, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ message: 'التاجر غير موجود' });
    }

    await Vendor.deleteOne({ _id: id });
    res.json({ message: 'تم حذف التاجر بنجاح' });
  } catch (err) {
    res.status(400).json({ message: 'خطأ في حذف التاجر: ' + err.message });
  }
});

module.exports = router;
