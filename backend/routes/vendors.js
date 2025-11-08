// backend/routes/vendors.js
const express = require('express');
const router = express.Router();
const Vendor = require('../models/Vendor');
const Product = require('../models/Product'); // تم إضافته هنا
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// إعداد multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'Uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// === جلب التجار (مع رقم الهاتف) ===
router.get('/', async (req, res) => {
  try {
    const vendors = await Vendor.find().select('_id name email description logo phone').lean();
    res.json(vendors);
  } catch (err) {
    console.error('Error fetching vendors:', err);
    res.status(500).json({ message: 'خطأ في جلب التجار: ' + err.message });
  }
});

// === إنشاء تاجر ===
router.post('/', auth, isAdmin, upload.single('logo'), async (req, res) => {
  const { name, email, password, description, phone } = req.body;
  try {
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: 'يرجى ملء جميع الحقول المطلوبة' });
    }

    const existingVendor = await Vendor.findOne({ email });
    if (existingVendor) {
      return res.status(400).json({ message: 'البريد الإلكتروني مستخدم بالفعل' });
    }

    const existingPhone = await Vendor.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({ message: 'رقم الهاتف مستخدم بالفعل' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const vendor = new Vendor({
      name,
      email,
      password: hashedPassword,
      description: description || '',
      phone,
      logo: req.file ? req.file.filename : null
    });

    await vendor.save();
    const savedVendor = await Vendor.findById(vendor._id).select('-password');
    res.status(201).json({ message: 'تم إنشاء التاجر بنجاح', vendor: savedVendor });
  } catch (err) {
    console.error('Error creating vendor:', err);
    res.status(400).json({ message: 'خطأ في إنشاء التاجر: ' + err.message });
  }
});

// === تعديل تاجر ===
router.put('/:id', auth, isAdmin, upload.single('logo'), async (req, res) => {
  const { id } = req.params;
  const { name, email, password, description, phone } = req.body;

  try {
    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ message: 'التاجر غير موجود' });
    }

    if (name) vendor.name = name;

    if (email && email !== vendor.email) {
      const existingEmail = await Vendor.findOne({ email, _id: { $ne: id } });
      if (existingEmail) {
        return res.status(400).json({ message: 'البريد الإلكتروني مستخدم بالفعل' });
      }
      vendor.email = email;
    }

    if (phone && phone !== vendor.phone) {
      const existingPhone = await Vendor.findOne({ phone, _id: { $ne: id } });
      if (existingPhone) {
        return res.status(400).json({ message: 'رقم الهاتف مستخدم بالفعل' });
      }
      vendor.phone = phone;
    }

    if (password) {
      vendor.password = await bcrypt.hash(password, 10);
    }

    if (description !== undefined) {
      vendor.description = description;
    }

    if (req.file) {
      // حذف اللوجو القديم
      if (vendor.logo) {
        const oldPath = path.join(__dirname, '..', 'Uploads', vendor.logo);
        if (fs.existsSync(oldPath)) {
          try {
            fs.unlinkSync(oldPath);
          } catch (err) {
            console.error('Failed to delete old logo:', err);
          }
        }
      }
      vendor.logo = req.file.filename;
    }

    await vendor.save();
    const updatedVendor = await Vendor.findById(id).select('-password');
    res.json({ message: 'تم تعديل التاجر بنجاح', vendor: updatedVendor });
  } catch (err) {
    console.error('Error updating vendor:', err);
    res.status(400).json({ message: 'خطأ في تعديل التاجر: ' + err.message });
  }
});

// === حذف تاجر (مع حذف المنتجات والملفات) ===
router.delete('/:id', auth, isAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ message: 'التاجر غير موجود' });
    }

    // 1. حذف لوجو التاجر
    if (vendor.logo) {
      const logoPath = path.join(__dirname, '..', 'Uploads', vendor.logo);
      if (fs.existsSync(logoPath)) {
        try {
          fs.unlinkSync(logoPath);
        } catch (err) {
          console.error('Failed to delete vendor logo:', err);
        }
      }
    }

    // 2. جلب جميع المنتجات
    const products = await Product.find({ vendor: id }).lean();
    for (const product of products) {
      // حذف الصور
      if (product.images && product.images.length > 0) {
        product.images.forEach(file => {
          const filePath = path.join(__dirname, '..', 'Uploads', file);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (err) {
              console.error(`Failed to delete image ${file}:`, err);
            }
          }
        });
      }

      // حذف الفيديوهات
      if (product.videos && product.videos.length > 0) {
        product.videos.forEach(file => {
          const filePath = path.join(__dirname, '..', 'Uploads', file);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (err) {
              console.error(`Failed to delete video ${file}:`, err);
            }
          }
        });
      }

      // حذف المنتج من القاعدة
      await Product.deleteOne({ _id: product._id });
    }

    // 3. حذف التاجر
    await Vendor.deleteOne({ _id: id });

    res.json({ message: 'تم حذف التاجر وجميع منتجاته وملفاته بنجاح' });
  } catch (err) {
    console.error('Error deleting vendor:', err);
    res.status(500).json({ message: 'خطأ في حذف التاجر: ' + err.message });
  }
});

module.exports = router;
