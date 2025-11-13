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

// === CORS ===
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// === JSON + URLENCODED ===
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// === Uploads & Public Folders ===
const uploadsDir = path.join(__dirname, 'Uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created Uploads directory');
}

const placeholderImagePath = path.join(uploadsDir, 'placeholder-image.jpg');
if (!fs.existsSync(placeholderImagePath)) {
  try {
    const source = path.join(__dirname, 'public', 'placeholder-image.jpg');
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, placeholderImagePath);
      console.log('Copied placeholder-image.jpg');
    }
  } catch (err) {
    console.error('Error copying placeholder:', err);
  }
}

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('Created public directory');
}

// === Static Files with Fallback ===
app.use('/Uploads', (req, res, next) => {
  const filePath = path.join(uploadsDir, req.path);
  if (!fs.existsSync(filePath)) {
    if (fs.existsSync(placeholderImagePath)) {
      return res.sendFile(placeholderImagePath);
    }
    return res.status(404).send('Not found');
  }
  const stats = fs.statSync(filePath);
  const etag = `"${stats.size.toString(16)}-${stats.mtime.getTime().toString(16)}"`;
  res.setHeader('ETag', etag);
  res.setHeader('Last-Modified', stats.mtime.toUTCString());
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end();
  }
  next();
}, express.static(uploadsDir));

app.use(express.static(publicDir));

// === MongoDB ===
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB error:', err));

// === Routes ===
app.use('/api/products', require('./routes/products'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/auth', require('./routes/auth'));

// === Global Error Handler ===
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  if (err instanceof SyntaxError && err.status === 413) {
    return res.status(413).json({ message: 'حجم الطلب كبير جدًا' });
  }
  res.status(err.status || 500).json({
    message: err.message || 'خطأ داخلي في السيرفر'
  });
});

// === Socket.IO Setup ===
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'], credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000
});

// === Online Users Tracking ===
const onlineUsers = new Map(); // { userId: { socketId, role, name, connectedAt } }
app.set('io', io);
app.set('onlineUsers', onlineUsers);

// === Broadcast Online Users Update ===
function broadcastOnlineUsersUpdate() {
  const data = {
    count: onlineUsers.size,
    users: Array.from(onlineUsers.entries()).map(([id, info]) => ({
      id, name: info.name, role: info.role, connectedAt: info.connectedAt
    }))
  };
  io.to('admin_room').emit('onlineUsersUpdate', data);
  console.log(`[ONLINE] ${onlineUsers.size} users → admin_room`);
}

// === Unread Messages Update ===
async function emitUnreadCountUpdate(orderId, io) {
  try {
    const Order = require('./models/Order');
    const order = await Order.findById(orderId)
      .populate('user', '_id')
      .populate({ path: 'product', populate: { path: 'vendor', select: '_id' } });
    if (!order?.product?.vendor) return;

    const customerId = order.user._id.toString();
    const vendorId = order.product.vendor._id.toString();
    const customerUnread = (order.messages || []).filter(m => m.from === 'vendor' && !m.isRead).length;
    const vendorUnread = (order.messages || []).filter(m => m.from === 'customer' && !m.isRead).length;

    io.to(`user_${customerId}`).emit('unreadUpdate', { orderId, unreadCount: customerUnread });
    io.to(`user_${vendorId}`).emit('unreadUpdate', { orderId, unreadCount: vendorUnread });
    io.to('admin_room').emit('unreadUpdate', { orderId, unreadCount: Math.max(customerUnread, vendorUnread) });

    console.log(`[UNREAD] order=${orderId}, C:${customerUnread}, V:${vendorUnread}`);
  } catch (err) {
    console.error('emitUnreadCountUpdate error:', err);
  }
}

// === Socket.IO Connection ===
io.on('connection', (socket) => {
  console.log('New socket:', socket.id);

  // === Pre-auth: Join admin_room if role=admin in query ===
  const queryRole = socket.handshake.query.role;
  if (queryRole === 'admin') {
    socket.join('admin_room');
    console.log(`[PRE-AUTH] Admin joined admin_room (socket: ${socket.id})`);
    broadcastOnlineUsersUpdate(); // تحديث فوري
  }

  socket.on('authenticate', async ({ userId, role }) => {
    if (!userId || !role) {
      socket.emit('error', { message: 'userId or role missing' });
      return;
    }

    // === Remove old socket if reconnecting ===
    if (onlineUsers.has(userId)) {
      const old = onlineUsers.get(userId);
      if (old.socketId !== socket.id) {
        const oldSocket = io.sockets.sockets.get(old.socketId);
        if (oldSocket) oldSocket.disconnect();
      }
    }

    // === Fetch user name ===
    let userName = 'مجهول';
    try {
      if (role === 'customer') {
        const Customer = require('./models/Customer');
        const c = await Customer.findById(userId).select('name');
        userName = c?.name || 'عميل مجهول';
      } else if (role === 'vendor') {
        const Vendor = require('./models/Vendor');
        const v = await Vendor.findById(userId).select('name');
        userName = v?.name || 'تاجر مجهول';
      } else if (role === 'admin') {
        userName = 'الإدارة';
      }
    } catch (err) {
      console.error('Name fetch error:', err);
    }

    // === Save user ===
    onlineUsers.set(userId, {
      socketId: socket.id,
      role,
      name: userName,
      connectedAt: new Date()
    });

    socket.join(`user_${userId}`);
    if (role === 'admin') {
      socket.join('admin_room');
      socket.emit('onlineUsersUpdate', {
        count: onlineUsers.size,
        users: Array.from(onlineUsers.entries()).map(([id, info]) => ({
          id, name: info.name, role: info.role, connectedAt: info.connectedAt
        }))
      });
    }

    console.log(`[AUTH] ${userId} (${userName}, ${role}) online`);
    broadcastOnlineUsersUpdate();
    markDeliveredForUser(userId, role, io);
  });

  socket.on('joinOrder', (orderId) => {
    if (!socket.userId) return;
    socket.join(`order_${orderId}`);
    console.log(`User ${socket.userId} joined order_${orderId}`);
    socket.emit('orderJoined', { orderId });
  });

  socket.on('leaveOrder', (orderId) => {
    socket.leave(`order_${orderId}`);
  });

  socket.on('disconnect', () => {
    if (socket.userId && onlineUsers.has(socket.userId)) {
      const user = onlineUsers.get(socket.userId);
      onlineUsers.delete(socket.userId);
      console.log(`[DISCONNECT] ${socket.userId} (${user.name})`);
      broadcastOnlineUsersUpdate();
    }
  });
});

// === Mark Delivered on Connect ===
async function markDeliveredForUser(userId, role, io) {
  try {
    const Order = require('./models/Order');
    const query = role === 'customer' ? { user: userId }
                : role === 'vendor' ? { 'product.vendor': userId }
                : role === 'admin' ? {} : null;
    if (!query) return;

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
    console.error('markDelivered error:', err);
  }
}

// === Heartbeat: Update every 15s ===
setInterval(broadcastOnlineUsersUpdate, 15000);

app.set('emitUnreadCountUpdate', emitUnreadCountUpdate);

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://81.10.88.159:${PORT}`);
  console.log(`API: https://shose.duckdns.org/api`);
  console.log(`Socket.IO: Heartbeat every 15s`);
});
