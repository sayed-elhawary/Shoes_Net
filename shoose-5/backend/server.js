const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path'); // path العادي

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// serving الملفات الثابتة من مجلد uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
