const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const isVendor = require('../middleware/isVendor');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'Uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// عرض جميع المنتجات الموافق عليها (للزوار)
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ approved: true }).populate('vendor', 'name');
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// جلب جميع المنتجات (للأدمن فقط، سواء موافق عليها أو لا)
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

// جلب منتجات التاجر الخاصة (للتاجر نفسه، بدون فلتر approved)
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
    const images = req.files['images'] ? req.files['images'].map(file => file.path) : [];
    const videos = req.files['videos'] ? req.files['videos'].map(file => file.path) : [];
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
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// تعديل منتج
router.put('/:id', auth, isVendor, upload.fields([{ name: 'images', maxCount: 5 }, { name: 'videos', maxCount: 3 }]), async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.files['images']) {
      updateData.images = req.files['images'].map(file => file.path);
    }
    if (req.files['videos']) {
      updateData.videos = req.files['videos'].map(file => file.path);
    }
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, vendor: req.user.id },
      updateData,
      { new: true }
    );
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// حذف منتج
router.delete('/:id', auth, isVendor, async (req, res) => {
  try {
    await Product.findOneAndDelete({ _id: req.params.id, vendor: req.user.id });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
