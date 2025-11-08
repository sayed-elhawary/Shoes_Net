// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// إنشاء مجلد Uploads
const uploadsDir = path.join(__dirname, 'Uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created Uploads directory');
}

// التأكد من وجود placeholder-image.jpg
const placeholderImagePath = path.join(uploadsDir, 'placeholder-image.jpg');
if (!fs.existsSync(placeholderImagePath)) {
  try {
    const sourcePlaceholder = path.join(__dirname, 'public', 'placeholder-image.jpg');
    if (fs.existsSync(sourcePlaceholder)) {
      fs.copyFileSync(sourcePlaceholder, placeholderImagePath);
      console.log('Copied placeholder-image.jpg to Uploads directory');
    } else {
      console.warn('Warning: placeholder-image.jpg not found in public directory');
    }
  } catch (err) {
    console.error('Error copying placeholder-image.jpg:', err);
  }
}

// إنشاء مجلد public
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('Created public directory');
}

// تقديم الصور من /Uploads مع كاش ذكي
app.use('/Uploads', (req, res, next) => {
  const filePath = path.join(uploadsDir, req.path);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    if (fs.existsSync(placeholderImagePath)) {
      return res.sendFile(placeholderImagePath);
    }
    return res.status(404).send('File not found');
  }
  const stats = fs.statSync(filePath);
  const etag = `"${stats.size.toString(16)}-${stats.mtime.getTime().toString(16)}"`;
  const lastModified = stats.mtime.toUTCString();
  res.setHeader('ETag', etag);
  res.setHeader('Last-Modified', lastModified);
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  if (req.headers['if-none-match'] === etag || req.headers['if-modified-since'] === lastModified) {
    return res.status(304).end();
  }
  next();
}, express.static(uploadsDir));

// تقديم الملفات الثابتة من public
app.use(express.static(publicDir));

// الاتصال بـ MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/products', require('./routes/products'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/auth', require('./routes/auth'));

// إعداد Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const onlineUsers = new Set();
app.set('io', io);
app.set('onlineUsers', onlineUsers);

// دالة تحديث عدد الرسائل غير المقروءة
async function emitUnreadCountUpdate(orderId, io) {
  try {
    const Order = require('./models/Order');
    const order = await Order.findById(orderId)
      .populate('user', '_id')
      .populate({
        path: 'product',
        populate: { path: 'vendor', select: '_id' },
      });
    if (!order || !order.product || !order.product.vendor) return;
    const customerId = order.user._id.toString();
    const vendorId = order.product.vendor._id.toString();
    const customerUnread = (order.messages || []).filter(m => m.from === 'vendor' && !m.isRead).length;
    const vendorUnread = (order.messages || []).filter(m => m.from === 'customer' && !m.isRead).length;
    io.to(`user_${customerId}`).emit('unreadUpdate', {
      orderId: order._id.toString(),
      unreadCount: customerUnread,
    });
    io.to(`user_${vendorId}`).emit('unreadUpdate', {
      orderId: order._id.toString(),
      unreadCount: vendorUnread,
    });
    io.to('admin_room').emit('unreadUpdate', {
      orderId: order._id.toString(),
      unreadCount: vendorUnread,
    });
    console.log(`unreadUpdate sent: order=${orderId}, customer=${customerUnread}, vendor=${vendorUnread}`);
  } catch (err) {
    console.error('Error in emitUnreadCountUpdate:', err);
  }
}

// إدارة الاتصال عبر Socket.IO
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // === التحسين: كل عميل ينضم للغرفة العامة للمنتجات ===
  socket.join('public_products');
  // === نهاية التحسين ===

  socket.on('authenticate', (data) => {
    const { userId, role } = data;
    if (!userId || !role) {
      console.error('Authentication failed: userId or role missing');
      socket.emit('error', { message: 'Authentication failed: userId or role missing' });
      return;
    }
    socket.userId = userId;
    socket.role = role;
    onlineUsers.add(userId);
    socket.join(`user_${userId}`);
    if (role === 'admin') {
      socket.join('admin_room');
      console.log(`Admin ${userId} joined admin_room`);
    }
    console.log(`User ${userId} authenticated with role ${role}`);
    markDeliveredForUser(userId, role, io);
  });

  socket.on('joinOrder', (orderId) => {
    if (!socket.userId) {
      console.error('Join order failed: userId not set');
      socket.emit('error', { message: 'Authentication required to join order' });
      return;
    }
    socket.join(`order_${orderId}`);
    console.log(`User ${socket.userId} joined order_${orderId}`);
    socket.emit('orderJoined', { orderId });
  });

  socket.on('leaveOrder', (orderId) => {
    if (!socket.userId) {
      console.error('Leave order failed: userId not set');
      return;
    }
    socket.leave(`order_${orderId}`);
    console.log(`User ${socket.userId} left order_${orderId}`);
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      socket.leave(`user_${socket.userId}`);
      if (socket.role === 'admin') {
        socket.leave('admin_room');
      }
      console.log(`User ${socket.userId} disconnected`);
    }
    console.log('Client disconnected:', socket.id);
  });
});

// تحديث التسليم عند الاتصال
async function markDeliveredForUser(userId, role, io) {
  try {
    const Order = require('./models/Order');
    let query = {};
    if (role === 'customer') {
      query = { user: userId };
    } else if (role === 'vendor') {
      query = { 'product.vendor': userId };
    } else if (role === 'admin') {
      query = {};
    } else {
      return;
    }
    const orders = await Order.find(query).populate('product', 'vendor');
    for (let order of orders) {
      const from = role === 'customer' ? 'vendor' : 'customer';
      let updated = false;
      for (let msg of order.messages) {
        if (msg.from === from && !msg.isDelivered) {
          msg.isDelivered = true;
          updated = true;
        }
      }
      if (updated) {
        await order.save();
        io.to(`order_${order._id}`).emit('messagesUpdated', order.messages);
        emitUnreadCountUpdate(order._id, io);
      }
    }
  } catch (err) {
    console.error('Error marking delivered:', err);
  }
}

app.set('emitUnreadCountUpdate', emitUnreadCountUpdate);

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://81.10.88.159:${PORT}`);
});
