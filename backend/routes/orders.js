// backend/routes/orders.js
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Vendor = require('../models/Vendor');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// === إعداد Multer لتخزين الصور في مجلد Uploads (بكبيتل) ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'Uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, filename);
  },
});
const upload = multer({ storage });

console.log('Orders route loaded');

// === دالة لحساب عدد الرسائل غير المقروءة لمستخدم معين ===
const calculateUnreadCount = (messages = [], userRole) => {
  const fromField = userRole === 'vendor' ? 'customer' : 'vendor';
  return messages.filter(msg => msg.from === fromField && !msg.isRead).length;
};

// === دالة لإرسال تحديث unreadCount لكل المستخدمين المرتبطين ===
const broadcastUnreadUpdate = async (orderId, io) => {
  try {
    const order = await Order.findById(orderId)
      .populate('user', '_id')
      .populate({
        path: 'product',
        populate: { path: 'vendor', select: '_id' }
      })
      .lean();
    if (!order || !order.user || !order.product?.vendor) return;

    const adminRoom = 'admin_room';
    const customerRoom = `user_${order.user._id}`;
    const vendorRoom = `user_${order.product.vendor._id}`;
    const messages = order.messages || [];

    const customerUnread = calculateUnreadCount(messages, 'customer');
    const vendorUnread = calculateUnreadCount(messages, 'vendor');

    // إرسال للعميل
    io.to(customerRoom).emit('unreadUpdate', { orderId, unreadCount: customerUnread });
    // إرسال للتاجر
    io.to(vendorRoom).emit('unreadUpdate', { orderId, unreadCount: vendorUnread });
    // إرسال للأدمن (يرى رسائل العميل)
    io.to(adminRoom).emit('unreadUpdate', { orderId, unreadCount: customerUnread });
  } catch (err) {
    console.error('Error broadcasting unread update:', err);
  }
};

// === عرض الطلبات (مع كل الفلاتر الجديدة) ===
router.get('/', auth, async (req, res) => {
  try {
    console.log(`Fetching orders for user: ${req.user.id}, role: ${req.user.role}`);
    const {
      vendorName,
      startDate,
      endDate,
      phone,
      orderNumber,
      status,
      unreadOnly,
      page = 1,
      limit = 20
    } = req.query;

    let query = {};

    // فلتر التاريخ
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // فلتر رقم الطلب
    if (orderNumber) {
      const num = parseInt(orderNumber);
      if (!isNaN(num)) {
        query.orderNumber = num;
      } else {
        query.orderNumber = { $regex: orderNumber, $options: 'i' };
      }
    }

    // فلتر الحالة
    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      if (statuses.length > 0) {
        query.status = { $in: statuses };
      }
    }

    // فلتر رقم الهاتف
    if (phone) {
      const users = await Customer.find({ phone: { $regex: phone, $options: 'i' } }).select('_id').lean();
      if (users.length > 0) {
        query.user = { $in: users.map(u => u._id) };
      } else {
        return res.json({ orders: [], total: 0 });
      }
    }

    // فلتر الرسائل غير المقروءة فقط
    if (unreadOnly === 'true') {
      const role = req.user.role;
      const fromField = role === 'vendor' ? 'customer' : 'vendor';
      query['messages'] = {
        $elemMatch: {
          from: fromField,
          isRead: false
        }
      };
    }

    // === بناء الاستعلام الأساسي ===
    let ordersQuery = Order.find(query)
      .populate({
        path: 'product',
        select: 'name vendor',
        populate: { path: 'vendor', select: 'name' }
      })
      .populate('user', 'name phone')
      .sort({ createdAt: -1 });

    // Pagination
    const limitNum = parseInt(limit) || 20;
    const skip = (parseInt(page) - 1) * limitNum;
    ordersQuery = ordersQuery.skip(skip).limit(limitNum);

    let orders = await ordersQuery.lean();

    // === حماية من null في populate ===
    orders = orders.map(order => {
      const safeOrder = { ...order };
      safeOrder.user = safeOrder.user || { name: 'زائر', phone: '-', _id: null };

      // استخدام الحقول المخزنة إذا كان المنتج محذوفاً
      if (!safeOrder.product) {
        safeOrder.product = {
          name: safeOrder.productName || 'غير معروف',
          vendor: { name: safeOrder.vendorName || 'غير معروف' }
        };
      } else {
        safeOrder.product.vendor = safeOrder.product.vendor || { name: safeOrder.vendorName || 'غير معروف' };
      }

      const unreadCount = calculateUnreadCount(safeOrder.messages, req.user.role);
      safeOrder.unreadCount = unreadCount;
      return safeOrder;
    });

    // === فلتر التاجر (للأدمن) ===
    if (req.user.role === 'admin' && vendorName) {
      const vendors = await Vendor.find({ name: { $regex: vendorName, $options: 'i' } }).select('_id').lean();
      const vendorIds = vendors.map(v => v._id);
      if (vendorIds.length > 0) {
        const products = await Product.find({ vendor: { $in: vendorIds } }).select('_id').lean();
        const productIds = products.map(p => p._id);
        orders = orders.filter(order =>
          order.product && productIds.some(id => id.equals(order.product._id))
        );
      } else {
        orders = [];
      }
    }

    // === فلتر التاجر (للتاجر نفسه) ===
    if (req.user.role === 'vendor') {
      const vendorProducts = await Product.find({ vendor: req.user.id }).select('_id').lean();
      const productIds = vendorProducts.map(p => p._id);
      orders = orders.filter(order =>
        order.product && productIds.some(id => id.equals(order.product._id))
      );
    }

    // === فلتر العميل (للعميل) ===
    if (req.user.role === 'customer') {
      orders = orders.filter(order =>
        order.user && order.user._id && order.user._id.equals(req.user.id)
      );
    }

    // === حساب العدد الكلي بعد الفلاتر ===
    const totalQuery = { ...query };
    if (req.user.role === 'admin' && vendorName) {
      const vendors = await Vendor.find({ name: { $regex: vendorName, $options: 'i' } }).select('_id').lean();
      const vendorIds = vendors.map(v => v._id);
      if (vendorIds.length > 0) {
        const products = await Product.find({ vendor: { $in: vendorIds } }).select('_id').lean();
        const productIds = products.map(p => p._id);
        totalQuery.product = { $in: productIds };
      } else {
        return res.json({ orders: [], total: 0 });
      }
    } else if (req.user.role === 'vendor') {
      const vendorProducts = await Product.find({ vendor: req.user.id }).select('_id').lean();
      const productIds = vendorProducts.map(p => p._id);
      totalQuery.product = { $in: productIds };
    } else if (req.user.role === 'customer') {
      totalQuery.user = req.user.id;
    }

    const total = await Order.countDocuments(totalQuery);
    console.log(`Fetched ${orders.length} orders, total: ${total}`);
    res.json({ orders, total });
  } catch (err) {
    console.error('Detailed Retrieval Error:', err);
    res.status(500).json({ message: 'خطأ داخلي في السيرفر: ' + err.message });
  }
});

// === إضافة طلب جديد ===
router.post('/', auth, async (req, res) => {
  const { product, vendor, quantity, address, selectedImage } = req.body;
  try {
    const productDoc = await Product.findById(product).populate('vendor', 'name');
    if (!productDoc) return res.status(404).json({ message: 'المنتج غير موجود' });

    if (vendor !== productDoc.vendor._id.toString()) {
      return res.status(400).json({ message: 'التاجر غير صحيح' });
    }

    const customer = await Customer.findById(req.user.id);
    if (!customer) return res.status(404).json({ message: 'العميل غير موجود' });

    const order = new Order({
      product,
      vendor,
      user: req.user.id,
      quantity: parseInt(quantity) || 1,
      address,
      status: 'pending',
      selectedImage: selectedImage || 'placeholder-image.jpg',
      productName: productDoc.name,
      vendorName: productDoc.vendor.name,
      messages: []
    });

    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate({ path: 'product', populate: { path: 'vendor', select: 'name' } })
      .populate('user', 'name phone')
      .lean();

    res.status(201).json({ message: 'تم إنشاء الطلب', order: populatedOrder });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(400).json({ message: err.message });
  }
});

// === تحديث حالة الطلب ===
router.put('/:id/status', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'الطلب غير موجود' });

    if (req.user.role !== 'vendor' || order.vendor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'غير مصرح' });
    }

    const { status } = req.body;
    if (!['pending', 'shipped', 'delivered', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'حالة غير صالحة' });
    }

    order.status = status;
    await order.save();

    const populated = await Order.findById(order._id)
      .populate({ path: 'product', populate: { path: 'vendor', select: 'name' } })
      .populate('user', 'name phone')
      .lean();

    const io = req.app.get('io');
    io.to(`order_${req.params.id}`).emit('messagesUpdated', populated.messages || []);
    await broadcastUnreadUpdate(req.params.id, io);

    res.json({ message: 'تم تحديث الحالة', order: populated });
  } catch (err) {
    console.error('Status update error:', err);
    res.status(400).json({ message: err.message });
  }
});

// === تعديل الطلب ===
router.put('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'الطلب غير موجود' });

    if (req.user.role !== 'customer' || order.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'غير مصرح' });
    }

    if (order.status !== 'pending') {
      return res.status(403).json({ message: 'لا يمكن التعديل' });
    }

    const { quantity, address } = req.body;
    if (quantity !== undefined && (isNaN(quantity) || quantity < 1)) {
      return res.status(400).json({ message: 'الكمية يجب > 0' });
    }

    if (quantity !== undefined) order.quantity = parseInt(quantity);
    if (address !== undefined) order.address = address;

    await order.save();

    const populated = await Order.findById(order._id)
      .populate({ path: 'product', populate: { path: 'vendor', select: 'name' } })
      .populate('user', 'name phone')
      .lean();

    res.json({ message: 'تم التعديل', order: populated });
  } catch (err) {
    console.error('Edit error:', err);
    res.status(400).json({ message: err.message });
  }
});

// ===================================================
// حذف طلب - آمن 100% - لا يؤثر على المنتج أو صوره
// ===================================================
router.delete('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'الطلب غير موجود' });

    const isAdmin = req.user.role === 'admin';
    const isCustomerPending = req.user.role === 'customer' &&
                              order.user.toString() === req.user.id &&
                              order.status === 'pending';

    if (!isAdmin && !isCustomerPending) {
      return res.status(403).json({ message: 'غير مصرح' });
    }

    // === حذف صورة الطلب فقط إذا لم تكن من صور المنتج ===
    if (order.selectedImage && order.selectedImage !== 'placeholder-image.jpg') {
      const imagePath = path.join(__dirname, '..', 'Uploads', order.selectedImage);

      // تحقق إذا كانت الصورة موجودة في المنتج
      const product = await Product.findById(order.product);
      const isImageInProduct = product && (
        product.images.includes(order.selectedImage) ||
        product.videos.includes(order.selectedImage)
      );

      // لا نحذف الصورة إذا كانت مستخدمة في المنتج
      if (!isImageInProduct && fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log(`تم حذف صورة الطلب: ${order.selectedImage}`);
      } else if (isImageInProduct) {
        console.log(`تم تجاهل حذف الصورة لأنها مستخدمة في المنتج: ${order.selectedImage}`);
      }
    }

    // حذف الطلب من قاعدة البيانات فقط
    await Order.findByIdAndDelete(req.params.id);

    // إشعار السوكت بحذف الطلب (للتحديث الفوري في الواجهة)
    const io = req.app.get('io');
    if (io) {
      io.to(`order_${req.params.id}`).emit('orderDeleted', { orderId: req.params.id });
    }

    res.json({ message: 'تم حذف الطلب بنجاح. لم يتم تعديل المنتج أو صوره.' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(400).json({ message: err.message });
  }
});

// === إضافة رسالة ===
router.post('/:id/message', auth, upload.single('image'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'الطلب غير موجود' });

    const { text } = req.body;
    const image = req.file ? req.file.filename : null;

    if (!text?.trim() && !image) {
      return res.status(400).json({ message: 'يجب إرسال نص أو صورة' });
    }

    let from;
    if (req.user.role === 'vendor' && order.vendor.toString() === req.user.id) from = 'vendor';
    else if (req.user.role === 'customer' && order.user.toString() === req.user.id) from = 'customer';
    else return res.status(403).json({ message: 'غير مصرح' });

    const messageObj = {
      from,
      text: text?.trim() || '',
      image,
      timestamp: new Date(),
      isDelivered: false,
      isRead: false
    };

    order.messages.push(messageObj);
    await order.save();

    // تحديث isDelivered إذا كان المستلم متصل
    const recipientId = from === 'vendor' ? order.user.toString() : order.vendor.toString();
    const onlineUsers = req.app.get('onlineUsers') || new Set();
    if (onlineUsers.has(recipientId)) {
      order.messages[order.messages.length - 1].isDelivered = true;
      await order.save();
    }

    const populatedOrder = await Order.findById(order._id)
      .populate({ path: 'product', populate: { path: 'vendor', select: 'name' } })
      .populate('user', 'name phone')
      .lean();

    const io = req.app.get('io');
    const room = `order_${req.params.id}`;
    io.to(room).emit('newMessage', messageObj);
    io.to(room).emit('messagesUpdated', populatedOrder.messages || []);
    await broadcastUnreadUpdate(req.params.id, io);

    res.json({ message: 'تم إرسال الرسالة', order: populatedOrder });
  } catch (err) {
    console.error('Message send error:', err);
    res.status(500).json({ message: 'خطأ في السيرفر: ' + err.message });
  }
});

// === تحديث قراءة الرسائل ===
router.post('/:id/markRead', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'الطلب غير موجود' });

    const role = req.user.role;
    const isAuthorized =
      (role === 'customer' && order.user.toString() === req.user.id) ||
      (role === 'vendor' && order.vendor.toString() === req.user.id);

    if (!isAuthorized) {
      return res.status(403).json({ message: 'غير مصرح' });
    }

    const from = role === 'customer' ? 'vendor' : 'customer';
    let updated = false;

    for (let msg of order.messages) {
      if (msg.from === from) {
        if (!msg.isDelivered) { msg.isDelivered = true; updated = true; }
        if (!msg.isRead) { msg.isRead = true; updated = true; }
      }
    }

    if (updated) await order.save();

    const io = req.app.get('io');
    io.to(`order_${req.params.id}`).emit('messagesUpdated', order.messages);
    await broadcastUnreadUpdate(req.params.id, io);

    const populatedOrder = await Order.findById(order._id)
      .populate({ path: 'product', populate: { path: 'vendor', select: 'name' } })
      .populate('user', 'name phone')
      .lean();

    res.json({ message: 'تم تحديث القراءة', order: populatedOrder });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
