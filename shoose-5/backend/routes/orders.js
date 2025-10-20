// backend/routes/orders.js
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const isVendor = require('../middleware/isVendor');
const Product = require('../models/Product'); // عشان نربط الطلب بالتاجر

// عرض الطلبات (مصفاة بناءً على الدور)
router.get('/', auth, async (req, res) => {
  try {
    let orders;
    if (req.user.role === 'admin') {
      // الأدمن يشوف الكل
      orders = await Order.find().populate('product', 'name vendor');
    } else if (req.user.role === 'vendor') {
      // التاجر يشوف بس الطلبات اللي منتجاتها بتاعته
      const vendorProducts = await Product.find({ vendor: req.user.id }).select('_id');
      const productIds = vendorProducts.map(p => p._id);
      orders = await Order.find({ product: { $in: productIds } }).populate('product', 'name');
    } else {
      // لو مش admin أو vendor، رفض
      return res.status(403).json({ message: 'غير مصرح' });
    }
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// إضافة طلب جديد (للعملاء)
router.post('/', async (req, res) => {
  const { productId, customerName, phone, address } = req.body;
  try {
    // التحقق من وجود المنتج وجلب vendor
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }

    const order = new Order({
      product: productId, // استخدام product بدل productId لتطابق الـ schema
      customerName,
      phone,
      address,
      vendor: product.vendor // إضافة vendor من المنتج
    });
    await order.save();
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// حذف طلب
router.delete('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'الطلب غير موجود' });
    }
    // التحقق من الصلاحية: admin أو vendor صاحب الطلب
    if (req.user.role !== 'admin' && order.vendor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'غير مصرح' });
    }
    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: 'تم حذف الطلب' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
