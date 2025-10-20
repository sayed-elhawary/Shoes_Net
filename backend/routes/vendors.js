const express = require('express');
const router = express.Router();
const Vendor = require('../models/Vendor');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');

// إعداد multer لرفع الصور
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // مجلد التخزين
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // اسم فريد
  }
});
const upload = multer({ storage });

// جلب قائمة التجار (للزوار)
router.get('/', async (req, res) => {
  try {
    const vendors = await Vendor.find().select('_id name description logo');
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ message: 'خطأ في جلب التجار: ' + err.message });
  }
});

// إنشاء تاجر (للأدمن)
router.post('/', auth, isAdmin, upload.single('logo'), async (req, res) => {
  const { name, email, password, description } = req.body;
  try {
    const existingVendor = await Vendor.findOne({ email });
    if (existingVendor) {
      return res.status(400).json({ message: 'البريد الإلكتروني مستخدم بالفعل' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const vendor = new Vendor({
      name,
      email,
      password: hashedPassword,
      description,
      logo: req.file ? req.file.path : null // إضافة مسار الصورة إذا موجودة
    });
    await vendor.save();
    res.status(201).json({ message: 'تم إنشاء التاجر بنجاح', vendor });
  } catch (err) {
    res.status(400).json({ message: 'خطأ في إنشاء التاجر: ' + err.message });
  }
});

// تعديل تاجر (للأدمن)
router.put('/:id', auth, isAdmin, upload.single('logo'), async (req, res) => {
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
    if (req.file) vendor.logo = req.file.path; // تحديث الصورة إذا مرسلة جديدة

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

    // يمكن إضافة حذف الصورة من السيرفر هنا لو عايز (باستخدام fs.unlink)
    await Vendor.deleteOne({ _id: id });
    res.json({ message: 'تم حذف التاجر بنجاح' });
  } catch (err) {
    res.status(400).json({ message: 'خطأ في حذف التاجر: ' + err.message });
  }
});

module.exports = router;
