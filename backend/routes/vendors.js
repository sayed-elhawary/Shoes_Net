const express = require('express');
const router = express.Router();
const Vendor = require('../models/Vendor');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// إعداد multer لرفع الصور
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'Uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// جلب قائمة التجار
router.get('/', async (req, res) => {
  try {
    const vendors = await Vendor.find().select('_id name description logo');
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ message: 'خطأ في جلب التجار: ' + err.message });
  }
});

// إنشاء تاجر
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
      logo: req.file ? req.file.filename : null // احفظ اسم الملف بس
    });
    await vendor.save();
    res.status(201).json({ message: 'تم إنشاء التاجر بنجاح', vendor });
  } catch (err) {
    res.status(400).json({ message: 'خطأ في إنشاء التاجر: ' + err.message });
  }
});

// تعديل تاجر
router.put('/:id', auth, isAdmin, upload.single('logo'), async (req, res) => {
  const { id } = req.params;
  const { name, email, password, description } = req.body;
  try {
    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ message: 'التاجر غير موجود' });
    }

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
    if (req.file) {
      // حذف الصورة القديمة إذا موجودة
      if (vendor.logo) {
        const oldImagePath = path.join(__dirname, '../Uploads', vendor.logo);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      vendor.logo = req.file.filename; // احفظ اسم الملف بس
    }

    await vendor.save();
    res.json({ message: 'تم تعديل التاجر بنجاح', vendor });
  } catch (err) {
    res.status(400).json({ message: 'خطأ في تعديل التاجر: ' + err.message });
  }
});

// حذف تاجر
router.delete('/:id', auth, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ message: 'التاجر غير موجود' });
    }

    // حذف الصورة إذا موجودة
    if (vendor.logo) {
      const imagePath = path.join(__dirname, '../Uploads', vendor.logo);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Vendor.deleteOne({ _id: id });
    res.json({ message: 'تم حذف التاجر بنجاح' });
  } catch (err) {
    res.status(400).json({ message: 'خطأ في حذف التاجر: ' + err.message });
  }
});

module.exports = router;
