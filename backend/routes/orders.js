const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const Product = require('../models/Product');

console.log('Orders route loaded');

// عرض الطلبات (مصفاة بناءً على الدور، مع دعم فلاتر جديدة)
router.get('/', auth, async (req, res) => {
  try {
    console.log(`Fetching orders for user: ${req.user.id}, role: ${req.user.role}`);
    const { vendorName, startDate, endDate, phone } = req.query;
    let query = {};

    // فلتر بالتاريخ
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // فلتر برقم الهاتف
    if (phone) {
      query.phone = { $regex: phone, $options: 'i' };
    }

    let orders;
    if (req.user.role === 'admin') {
      if (vendorName) {
        const vendors = await Product.aggregate([
          { $lookup: { from: 'vendors', localField: 'vendor', foreignField: '_id', as: 'vendorInfo' } },
          { $match: { 'vendorInfo.name': { $regex: vendorName, $options: 'i' } } }
        ]);
        const productIds = vendors.map(v => v._id);
        query.product = { $in: productIds };
      }
      orders = await Order.find(query).populate({
        path: 'product',
        select: 'name vendor',
        populate: { path: 'vendor', select: 'name' }
      });
    } else if (req.user.role === 'vendor') {
      console.log(`Fetching products for vendor: ${req.user.id}`);
      const vendorProducts = await Product.find({ vendor: req.user.id }).select('_id');
      const productIds = vendorProducts.map(p => p._id);
      console.log(`Vendor product IDs: ${productIds}`);
      query.product = { $in: productIds };
      orders = await Order.find(query).populate({
        path: 'product',
        select: 'name',
        populate: { path: 'vendor', select: 'name' }
      });
    } else {
      query.user = req.user.id;
      orders = await Order.find(query).populate({
        path: 'product',
        select: 'name vendor',
        populate: { path: 'vendor', select: 'name' }
      });
    }
    console.log(`Fetched orders: ${orders.length}`, orders);
    res.json(orders);
  } catch (err) {
    console.error('Detailed error in GET /api/orders:', {
      message: err.message,
      stack: err.stack,
      user: req.user
    });
    res.status(500).json({ message: 'خطأ داخلي في السيرفر: ' + err.message });
  }
});

// إضافة طلب جديد (مفتوح للجميع، بدون auth)
router.post('/', async (req, res) => {
  const { product, vendor, quantity, customerName, phone, address, selectedImage } = req.body;
  try {
    console.log('POST /api/orders received:', req.body);
    const productDoc = await Product.findById(product);
    if (!productDoc) {
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }
    if (vendor !== productDoc.vendor.toString()) {
      return res.status(400).json({ message: 'التاجر غير صحيح لهذا المنتج' });
    }

    const userId = req.user ? req.user.id : null;

    const order = new Order({
      product,
      vendor,
      user: userId,
      quantity,
      customerName: customerName || '',
      phone: phone || '',
      address: address || '',
      status: 'pending',
      selectedImage: selectedImage || 'placeholder-image.jpg' // تخزين الصورة المختارة
    });
    await order.save();
    console.log('Saved order:', order);
    res.status(201).json({ message: 'تم إنشاء الطلب بنجاح', order });
  } catch (err) {
    console.error('Error in POST /api/orders:', {
      message: err.message,
      stack: err.stack
    });
    res.status(400).json({ message: err.message });
  }
});

// حذف طلب (فقط للأدمن)
router.delete('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'الطلب غير موجود' });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'غير مصرح - فقط الأدمن يمكنه حذف الطلبات' });
    }
    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: 'تم حذف الطلب' });
  } catch (err) {
    console.error('Error in DELETE /api/orders/:id:', {
      message: err.message,
      stack: err.stack
    });
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
