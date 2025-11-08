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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'Uploads/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|mp4/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('الصور والفيديوهات فقط مسموح بها!'));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 },
});

// معالجة أخطاء Multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'حجم الملف كبير جدًا! الحد الأقصى هو 50 ميجابايت.' });
    }
    return res.status(400).json({ message: err.message });
  }
  next(err);
};

router.use(handleMulterError);

// === عرض جميع المنتجات الموافق عليها (للزوار) ===
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ approved: true }).populate('vendor', 'name');
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// === جلب جميع المنتجات (للأدمن فقط) ===
router.get('/all-products', auth, isAdmin, async (req, res) => {
  try {
    const products = await Product.find({}).populate('vendor', 'name');
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// === جلب منتجات تاجر معين (للزوار) ===
router.get('/vendor/:vendorId', async (req, res) => {
  try {
    const products = await Product.find({ vendor: req.params.vendorId, approved: true }).populate('vendor', 'name');
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// === جلب منتجات التاجر الخاصة (للتاجر نفسه) ===
router.get('/my-products', auth, isVendor, async (req, res) => {
  try {
    const products = await Product.find({ vendor: req.user.id }).populate('vendor', 'name');
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// === إضافة منتج (للتاجر) - يحتاج موافقة الأدمن ===
router.post('/', auth, isVendor, upload.fields([{ name: 'images', maxCount: 5 }, { name: 'videos', maxCount: 3 }]), async (req, res) => {
  try {
    const { name, type, price, quantityPerCarton, manufacturer, description } = req.body;
    const images = req.files['images'] ? req.files['images'].map(file => file.filename) : [];
    const videos = req.files['videos'] ? req.files['videos'].map(file => file.filename) : [];

    if (videos.length > 0 && images.length === 0) {
      return res.status(400).json({ message: 'يجب رفع صورة واحدة على الأقل عند رفع فيديو' });
    }

    const product = new Product({
      name, type, price, quantityPerCarton, manufacturer, description,
      images, videos, vendor: req.user.id,
      approved: false
    });

    await product.save();
    const populatedProduct = await product.populate('vendor', 'name');

    const io = req.app.get('io');
    if (io) {
      io.to('admin_notifications').emit('newPendingProduct', populatedProduct);
    }

    res.status(201).json(populatedProduct);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// === الموافقة على منتج (للأدمن) ===
router.put('/:id/approve', auth, isAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { approved: true },
      { new: true }
    ).populate('vendor', 'name');

    if (!product) return res.status(404).json({ message: 'المنتج غير موجود' });

    const io = req.app.get('io');
    if (io) {
      io.to('public_products').emit('productUpdated', product);
      io.to(`vendor_${product.vendor._id}`).emit('productApproved', product);
    }

    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// === إلغاء الموافقة على منتج (للأدمن) - جديد
router.put('/:id/unapprove', auth, isAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { approved: false },
      { new: true }
    ).populate('vendor', 'name');

    if (!product) return res.status(404).json({ message: 'المنتج غير موجود' });

    const io = req.app.get('io');
    if (io) {
      io.to('public_products').emit('productDeleted', { _id: product._id }); // يُزال من العرض العام
      io.to(`vendor_${product.vendor._id}`).emit('productUnapproved', product);
      io.to('admin_notifications').emit('productReturnedToPending', product);
    }

    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// === تعديل منتج مع رفع صور/فيديو ===
router.put('/:id', auth, isVendor, upload.fields([{ name: 'images', maxCount: 5 }, { name: 'videos', maxCount: 3 }]), async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, vendor: req.user.id });
    if (!product) return res.status(404).json({ message: 'المنتج غير موجود أو لا يمكنك تعديله' });

    const images = req.files['images'] ? req.files['images'].map(file => file.filename) : [];
    const videos = req.files['videos'] ? req.files['videos'].map(file => file.filename) : [];

    if (videos.length > 0 && images.length === 0 && product.images.length === 0) {
      return res.status(400).json({ message: 'يجب رفع صورة واحدة على الأقل عند رفع فيديو' });
    }

    if (req.files['images'] && product.images.length > 0) {
      product.images.forEach(file => {
        const filePath = path.join(__dirname, '../Uploads', file);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
    }
    if (req.files['videos'] && product.videos.length > 0) {
      product.videos.forEach(file => {
        const filePath = path.join(__dirname, '../Uploads', file);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
    }

    const updateData = { ...req.body };
    updateData.images = req.files['images'] ? images : product.images;
    updateData.videos = req.files['videos'] ? videos : product.videos;

    const updatedProduct = await Product.findOneAndUpdate(
      { _id: req.params.id, vendor: req.user.id },
      updateData,
      { new: true }
    ).populate('vendor', 'name');

    const io = req.app.get('io');
    if (io) {
      io.to('public_products').emit('productUpdated', updatedProduct);
    }

    res.json(updatedProduct);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// === تحديث المنتج بدون رفع ملفات (لإعادة العرض كجديد) ===
router.put('/:id/update', auth, isVendor, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, vendor: req.user.id });
    if (!product) {
      return res.status(404).json({ message: 'المنتج غير موجود أو لا يمكنك تعديله' });
    }

    product.updatedAt = new Date();
    await product.save();
    const populatedProduct = await product.populate('vendor', 'name');

    const io = req.app.get('io');
    if (io) {
      io.to('public_products').emit('productUpdated', populatedProduct);
    }

    res.json(populatedProduct);
  } catch (err) {
    console.error('Error in /:id/update:', err);
    res.status(400).json({ message: err.message });
  }
});

// === حذف منتج ===
router.delete('/:id', auth, isVendor, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, vendor: req.user.id });
    if (!product) return res.status(404).json({ message: 'المنتج غير موجود أو لا يمكنك حذفه' });

    product.images.forEach(file => {
      const filePath = path.join(__dirname, '../Uploads', file);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
    product.videos.forEach(file => {
      const filePath = path.join(__dirname, '../Uploads', file);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    await Product.deleteOne({ _id: req.params.id });

    const io = req.app.get('io');
    if (io) {
      io.to('public_products').emit('productDeleted', { _id: req.params.id });
    }

    res.json({ message: 'تم حذف المنتج بنجاح' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
