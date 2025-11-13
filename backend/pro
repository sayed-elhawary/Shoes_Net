// backend/routes/products.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const isVendor = require('../middleware/isVendor');

// === إعداد Multer ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'Uploads/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|mkv|webm/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('نوع الملف غير مدعوم! مسموح: صور وفيديوهات فقط'));
  },
  limits: { fileSize: 500 * 1024 * 1024 }, // 50MB
});

// === معالج أخطاء Multer (مهم جداً يكون بعد الروتس مش قبلهم) ===
const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'حجم الملف كبير جداً! الحد الأقصى 50 ميجابايت' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'تم رفع أكثر من 10 ملفات!' });
    }
    return res.status(400).json({ message: err.message });
  }
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};

// === الروتس ===

// عرض المنتجات العامة
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ approved: true }).populate('vendor', 'name');
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/all-products', auth, isAdmin, async (req, res) => {
  try {
    const products = await Product.find({}).populate('vendor', 'name');
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/vendor/:vendorId', async (req, res) => {
  try {
    const products = await Product.find({ vendor: req.params.vendorId, approved: true }).populate('vendor', 'name');
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/my-products', auth, isVendor, async (req, res) => {
  try {
    const products = await Product.find({ vendor: req.user.id }).populate('vendor', 'name');
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// === إضافة منتج ===
router.post('/', auth, isVendor, upload.array('files', 10), async (req, res) => {
  try {
    const { name, type, price, quantityPerCarton, manufacturer, description } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'يجب رفع صورة واحدة على الأقل' });
    }

    const images = [];
    const videos = [];

    req.files.forEach(file => {
      if (file.mimetype.startsWith('image/')) images.push(file.filename);
      if (file.mimetype.startsWith('video/')) videos.push(file.filename);
    });

    if (videos.length > 0 && images.length === 0) {
      req.files.forEach(f => fs.unlinkSync(path.join(__dirname, '../Uploads', f.filename)));
      return res.status(400).json({ message: 'يجب رفع صورة واحدة على الأقل عند رفع فيديو' });
    }

    const product = new Product({
      name, type, price: Number(price), quantityPerCarton: Number(quantityPerCarton),
      manufacturer, description, images, videos, vendor: req.user.id, approved: false
    });

    await product.save();
    const populated = await product.populate('vendor', 'name');

    const io = req.app.get('io');
    if (io) io.to('admin_notifications').emit('newPendingProduct', populated);

    res.status(201).json(populated);
  } catch (err) {
    if (req.files) {
      req.files.forEach(f => {
        const p = path.join(__dirname, '../Uploads', f.filename);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      });
    }
    console.error('Add product error:', err);
    res.status(400).json({ message: err.message || 'فشل إضافة المنتج' });
  }
});

// === تعديل مع رفع ملفات جديدة ===
router.put('/:id', auth, isVendor, upload.array('files', 10), async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, vendor: req.user.id });
    if (!product) return res.status(404).json({ message: 'المنتج غير موجود' });

    let images = product.images;
    let videos = product.videos;

    if (req.files && req.files.length > 0) {
      images = [];
      videos = [];
      req.files.forEach(file => {
        if (file.mimetype.startsWith('image/')) images.push(file.filename);
        if (file.mimetype.startsWith('video/')) videos.push(file.filename);
      });
    }

    if (videos.length > 0 && images.length === 0) {
      if (req.files) req.files.forEach(f => fs.unlinkSync(path.join(__dirname, '../Uploads', f.filename)));
      return res.status(400).json({ message: 'يجب رفع صورة واحدة عند رفع فيديو' });
    }

    // حذف القديم
    [...product.images, ...product.videos].forEach(f => {
      const p = path.join(__dirname, '../Uploads', f);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });

    const updated = await Product.findOneAndUpdate(
      { _id: req.params.id, vendor: req.user.id },
      { ...req.body, images, videos },
      { new: true }
    ).populate('vendor', 'name');

    const io = req.app.get('io');
    if (io) io.to('public_products').emit('productUpdated', updated);

    res.json(updated);
  } catch (err) {
    if (req.files) {
      req.files.forEach(f => {
        const p = path.join(__dirname, '../Uploads', f.filename);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      });
    }
    res.status(400).json({ message: err.message });
  }
});

// === تحديث بدون ملفات ===
router.put('/:id/update', auth, isVendor, async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, vendor: req.user.id },
      { updatedAt: new Date() },
      { new: true }
    ).populate('vendor', 'name');

    if (!product) return res.status(404).json({ message: 'المنتج غير موجود' });

    const io = req.app.get('io');
    if (io) io.to('public_products').emit('productUpdated', product);

    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// === موافقة / إلغاء / حذف ===
router.put('/:id/approve', auth, isAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { approved: true }, { new: true }).populate('vendor', 'name');
    if (!product) return res.status(404).json({ message: 'المنتج غير موجود' });
    const io = req.app.get('io');
    if (io) {
      io.to('public_products').emit('productUpdated', product);
      io.to(`vendor_${product.vendor._id}`).emit('productApproved', product);
    }
    res.json(product);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id/unapprove', auth, isAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { approved: false }, { new: true }).populate('vendor', 'name');
    if (!product) return res.status(404).json({ message: 'المنتج غير موجود' });
    const io = req.app.get('io');
    if (io) {
      io.to('public_products').emit('productDeleted', { _id: product._id });
      io.to(`vendor_${product.vendor._id}`).emit('productUnapproved', product);
    }
    res.json(product);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', auth, isVendor, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, vendor: req.user.id });
    if (!product) return res.status(404).json({ message: 'المنتج غير موجود' });

    [...product.images, ...product.videos].forEach(f => {
      const p = path.join(__dirname, '../Uploads', f);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });

    await Product.deleteOne({ _id: req.params.id });
    const io = req.app.get('io');
    if (io) io.to('public_products').emit('productDeleted', { _id: req.params.id });

    res.json({ message: 'تم الحذف بنجاح' });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// === تفعيل معالج الأخطاء بعد كل الروتس ===
router.use(multerErrorHandler);

module.exports = router;
