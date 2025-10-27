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
  limits: { fileSize: 50 * 1024 * 1024 }, // زيادة الحد إلى 50 ميجابايت
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

// تطبيق معالجة الأخطاء على جميع المسارات التي تستخدم multer
router.use(handleMulterError);

// عرض جميع المنتجات الموافق عليها (للزوار)
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ approved: true }).populate('vendor', 'name');
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// جلب جميع المنتجات (للأدمن فقط)
router.get('/all-products', auth, isAdmin, async (req, res) => {
  try {
    const products = await Product.find({}).populate('vendor', 'name');
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// جلب منتجات تاجر معين (للزوار)
router.get('/vendor/:vendorId', async (req, res) => {
  try {
    const products = await Product.find({ vendor: req.params.vendorId, approved: true }).populate('vendor', 'name');
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// جلب منتجات التاجر الخاصة (للتاجر نفسه)
router.get('/my-products', auth, isVendor, async (req, res) => {
  try {
    const products = await Product.find({ vendor: req.user.id }).populate('vendor', 'name');
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// إضافة منتج (للتاجر)
router.post('/', auth, isVendor, upload.fields([{ name: 'images', maxCount: 5 }, { name: 'videos', maxCount: 3 }]), async (req, res) => {
  try {
    const { name, type, price, quantityPerCarton, manufacturer, description } = req.body;
    const images = req.files['images'] ? req.files['images'].map(file => file.filename) : [];
    const videos = req.files['videos'] ? req.files['videos'].map(file => file.filename) : [];

    // Validate: If videos are uploaded, at least one image is required
    if (videos.length > 0 && images.length === 0) {
      return res.status(400).json({ message: 'يجب رفع صورة واحدة على الأقل عند رفع فيديو' });
    }

    const product = new Product({
      name,
      type,
      price,
      quantityPerCarton,
      manufacturer,
      description,
      images,
      videos,
      vendor: req.user.id,
    });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// الموافقة على منتج (للأدمن)
router.put('/:id/approve', auth, isAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
    if (!product) {
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// تعديل منتج
router.put('/:id', auth, isVendor, upload.fields([{ name: 'images', maxCount: 5 }, { name: 'videos', maxCount: 3 }]), async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, vendor: req.user.id });
    if (!product) {
      return res.status(404).json({ message: 'المنتج غير موجود أو لا يمكنك تعديله' });
    }

    const images = req.files['images'] ? req.files['images'].map(file => file.filename) : [];
    const videos = req.files['videos'] ? req.files['videos'].map(file => file.filename) : [];

    // Validate: If videos are uploaded, at least one image is required
    if (videos.length > 0 && images.length === 0 && product.images.length === 0) {
      return res.status(400).json({ message: 'يجب رفع صورة واحدة على الأقل عند رفع فيديو' });
    }

    // Delete old files if new ones are uploaded
    if (req.files['images'] && product.images.length > 0) {
      product.images.forEach(file => {
        try {
          const filePath = path.join(__dirname, '../Uploads', file);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          console.error(`خطأ في حذف الصورة القديمة ${file}:`, err);
        }
      });
    }
    if (req.files['videos'] && product.videos.length > 0) {
      product.videos.forEach(file => {
        try {
          const filePath = path.join(__dirname, '../Uploads', file);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          console.error(`خطأ في حذف الفيديو القديم ${file}:`, err);
        }
      });
    }

    const updateData = { ...req.body };
    if (req.files['images']) {
      updateData.images = req.files['images'].map(file => file.filename);
    } else {
      updateData.images = product.images; // Retain existing images if none uploaded
    }
    if (req.files['videos']) {
      updateData.videos = req.files['videos'].map(file => file.filename);
    } else {
      updateData.videos = product.videos; // Retain existing videos if none uploaded
    }

    const updatedProduct = await Product.findOneAndUpdate(
      { _id: req.params.id, vendor: req.user.id },
      updateData,
      { new: true }
    );
    res.json(updatedProduct);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// حذف منتج
router.delete('/:id', auth, isVendor, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, vendor: req.user.id });
    if (!product) {
      return res.status(404).json({ message: 'المنتج غير موجود أو لا يمكنك حذفه' });
    }
    // حذف الصور والفيديوهات المرتبطة
    product.images.forEach(file => {
      try {
        const filePath = path.join(__dirname, '../Uploads', file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error(`خطأ في حذف الصورة ${file}:`, err);
      }
    });
    product.videos.forEach(file => {
      try {
        const filePath = path.join(__dirname, '../Uploads', file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error(`خطأ في حذف الفيديو ${file}:`, err);
      }
    });
    await Product.deleteOne({ _id: req.params.id });
    res.json({ message: 'تم حذف المنتج بنجاح' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
