// backend/routes/orders.js
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const Product = require('../models/Product');
const Customer = require('../models/Customer');

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
      orders = await Order.find(query)
        .populate({
          path: 'product',
          select: 'name vendor',
          populate: { path: 'vendor', select: 'name' }
        })
        .populate('user', 'name phone');
    } else if (req.user.role === 'vendor') {
      console.log(`Fetching products for vendor: ${req.user.id}`);
      const vendorProducts = await Product.find({ vendor: req.user.id }).select('_id');
      const productIds = vendorProducts.map(p => p._id);
      console.log(`Vendor product IDs: ${productIds}`);
      query.product = { $in: productIds };
      orders = await Order.find(query)
        .populate({
          path: 'product',
          select: 'name',
          populate: { path: 'vendor', select: 'name' }
        })
        .populate('user', 'name phone');
    } else {
      query.user = req.user.id;
      orders = await Order.find(query)
        .populate({
          path: 'product',
          select: 'name vendor',
          populate: { path: 'vendor', select: 'name' }
        })
        .populate('user', 'name phone');
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

// إضافة طلب جديد (يتطلب تسجيل دخول)
router.post('/', auth, async (req, res) => {
  const { product, vendor, quantity, address, selectedImage } = req.body;
  try {
    console.log('POST /api/orders received:', req.body);
    // التحقق من وجود المنتج
    const productDoc = await Product.findById(product);
    if (!productDoc) {
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }
    // التحقق من صحة التاجر
    if (vendor !== productDoc.vendor.toString()) {
      return res.status(400).json({ message: 'التاجر غير صحيح لهذا المنتج' });
    }
    // استخدام معرف المستخدم من التوكن
    const userId = req.user.id;
    const customer = await Customer.findById(userId);
    if (!customer) {
      return res.status(404).json({ message: 'العميل غير موجود' });
    }
    const order = new Order({
      product,
      vendor,
      user: userId,
      quantity,
      address,
      status: 'pending', // الحالة الافتراضية
      selectedImage: selectedImage || 'placeholder-image.jpg'
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

// تحديث حالة الطلب (للتاجر فقط)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'الطلب غير موجود' });
    }
    if (req.user.role !== 'vendor' || order.vendor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'غير مصرح - فقط التاجر المرتبط يمكنه تحديث الحالة' });
    }
    const { status } = req.body;
    if (!['pending', 'shipped', 'delivered', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'حالة غير صالحة' });
    }
    order.status = status;
    await order.save();
    res.json({ message: 'تم تحديث حالة الطلب', order });
  } catch (err) {
    console.error('Error in PUT /api/orders/:id/status:', {
      message: err.message,
      stack: err.stack
    });
    res.status(400).json({ message: err.message });
  }
});

// تعديل الطلب (للعميل فقط، إذا كان الطلب في حالة pending)
router.put('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'الطلب غير موجود' });
    }
    if (req.user.role !== 'customer' || order.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'غير مصرح - فقط العميل المرتبط يمكنه تعديل الطلب' });
    }
    if (order.status !== 'pending') {
      return res.status(403).json({ message: 'لا يمكن تعديل الطلب لأنه ليس في حالة تحت المراجعة' });
    }
    const { quantity, address } = req.body;
    if (quantity !== undefined) {
      if (quantity < 1) {
        return res.status(400).json({ message: 'الكمية يجب أن تكون أكبر من 0' });
      }
      order.quantity = quantity;
    }
    if (address !== undefined) {
      order.address = address;
    }
    await order.save();
    res.json({ message: 'تم تعديل الطلب بنجاح', order });
  } catch (err) {
    console.error('Error in PUT /api/orders/:id:', {
      message: err.message,
      stack: err.stack
    });
    res.status(400).json({ message: err.message });
  }
});

// حذف طلب (للأدمن فقط)
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
