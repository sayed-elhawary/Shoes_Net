const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// التحقق من وجود مجلد Uploads وإنشاؤه إذا لم يكن موجودًا
const uploadsDir = path.join(__dirname, 'Uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(UploadsDir, { recursive: true });
  console.log('Created Uploads directory');
}

// التحقق من وجود مجلد public وإنشاؤه إذا لم يكن موجودًا
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('Created public directory');
}

// منع الكاش للصور
app.use('/uploads', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
}, express.static(uploadsDir));

// serving الملفات الثابتة من public
app.use(express.static(publicDir));

// الاتصال بـ MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

// Routes
app.use('/api/products', require('./routes/products'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/auth', require('./routes/auth'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://192.168.1.23:${PORT}`));
