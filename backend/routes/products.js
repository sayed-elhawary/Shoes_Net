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

// ==================== مكتبات الضغط المتطورة جدًا ====================
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('@ffmpeg-installer/ffmpeg');
ffmpeg.setFfmpegPath(ffmpegStatic.path);

// === إعداد Multer لرفع الملفات مؤقتًا ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'Uploads/temp/';
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
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 ميجا خام (بعد الضغط هيبقى 10-20 ميجا بس)
});

// === معالج أخطاء Multer (نفس اللي عندك بالمللي) ===
const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
     if (err.code === 'LIMIT_FILE_SIZE') { 

     return res.status(400).json({ message: 'حجم الملف كبير جداً! الحد الأقصى 500 ميجابايت' });
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

// === دالة ضغط الصور بتقنية 2025 (WebP + AVIF اختياري) ===
async function compressImage(inputPath, outputPath) {
  try {
    await sharp(inputPath)
      .rotate() // تصليح التوجيه التلقائي
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 85, effort: 6, lossless: false })
      .toFile(outputPath.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp'));
  } catch (err) {
    // في حالة فشل WebP نرجع لـ JPEG عالي الجودة
    await sharp(inputPath)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toFile(outputPath);
  }
}

// === دالة ضغط الفيديو بأعلى كفاءة (H.264 CRF 28 + 720p) ===
function compressVideo(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .addOptions([
        '-crf 28',
        '-preset fast',
        '-tune film',
        '-movflags +faststart',
        '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black'
      ])
      .format('mp4')
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => {
        console.error('FFmpeg Error:', err.message);
        reject(err);
      })
      .run();
  });
}

// === المعالج الرئيسي للملفات بعد الرفع (السحر الحقيقي) ===
async function processAndCompressFiles(files) {
  const finalDir = path.join(__dirname, '../Uploads');
  if (!fs.existsSync(finalDir)) {
    fs.mkdirSync(finalDir, { recursive: true });
  }

  const images = [];
  const videos = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const tempPath = file.path;
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + i;

    if (file.mimetype.startsWith('image/')) {
      const finalFileName = uniqueName + '.webp';
      const finalPath = path.join(finalDir, finalFileName);
      await compressImage(tempPath, finalPath);
      images.push(finalFileName);
    }

    if (file.mimetype.startsWith('video/')) {
      const finalFileName = uniqueName + '.mp4';
      const finalPath = path.join(finalDir, finalFileName);
      await compressVideo(tempPath, finalPath);
      videos.push(finalFileName);
    }

    // حذف الملف المؤقت فورًا بعد المعالجة
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch (err) {
      console.warn('فشل حذف الملف المؤقت:', tempPath);
    }
  }

  return { images, videos };
}

// =====================================================================
// ============================ الروتس الكاملة ===============================
// =====================================================================

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

// === إضافة منتج جديد مع ضغط تلقائي ===
router.post('/', auth, isVendor, upload.array('files', 10), async (req, res) => {
  try {
    const { name, type, price, quantityPerCarton, manufacturer, description } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'يجب رفع صورة واحدة على الأقل' });
    }

    const { images, videos } = await processAndCompressFiles(req.files);

    if (videos.length > 0 && images.length === 0) {
      // حذف الملفات المضغوطة لو رفع فيديو بدون صور
      [...images, ...videos].forEach(f => {
        const p = path.join(__dirname, '../Uploads', f);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      });
      return res.status(400).json({ message: 'يجب رفع صورة واحدة على الأقل عند رفع فيديو' });
    }

    const product = new Product({
      name,
      type,
      price: Number(price),
      quantityPerCarton: Number(quantityPerCarton),
      manufacturer,
      description,
      images,
      videos,
      vendor: req.user.id,
      approved: false
    });

    await product.save();
    const populated = await product.populate('vendor', 'name');
    const io = req.app.get('io');
    if (io) io.to('admin_notifications').emit('newPendingProduct', populated);

    res.status(201).json(populated);
  } catch (err) {
    if (req.files) {
      req.files.forEach(f => {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      });
    }
    console.error('Add product error:', err);
    res.status(400).json({ message: err.message || 'فشل إضافة المنتج' });
  }
});

// === تعديل منتج مع رفع ملفات جديدة (مع الضغط) ===
router.put('/:id', auth, isVendor, upload.array('files', 10), async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, vendor: req.user.id });
    if (!product) return res.status(404).json({ message: 'المنتج غير موجود' });

    let images = product.images;
    let videos = product.videos;

    if (req.files && req.files.length > 0) {
      const { images: newImages, videos: newVideos } = await processAndCompressFiles(req.files);
      images = newImages;
      videos = newVideos;

      if (videos.length > 0 && images.length === 0) {
        [...images, ...videos].forEach(f => {
          const p = path.join(__dirname, '../Uploads', f);
          if (fs.existsSync(p)) fs.unlinkSync(p);
        });
        return res.status(400).json({ message: 'يجب رفع صورة واحدة عند رفع فيديو' });
      }
    }

    // حذف الملفات القديمة
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
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      });
    }
    res.status(400).json({ message: err.message });
  }
});

// === تحديث بدون ملفات (نفس اللي عندك بالظبط) ===
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

// === موافقة على المنتج ===
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
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// === إلغاء الموافقة ===
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
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// === حذف المنتج نهائيًا ===
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
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// === تفعيل معالج الأخطاء في النهاية (زي ما كان عندك بالظبط) ===
router.use(multerErrorHandler);

module.exports = router;
