const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'vendor' },
  description: { type: String } // إضافة حقل الوصف للتاجر
});

module.exports = mongoose.model('Vendor', vendorSchema);
