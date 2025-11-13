// backend/models/Vendor.js
const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    default: 'vendor',
  },
  description: {
    type: String,
  },
  logo: {
    type: String,
  },
  phone: {
    type: String,
    validate: {
      validator: function (v) {
        return v ? /^\d{11}$/.test(v) : true; // اختياري لكن إذا وُجد يجب 11 رقم
      },
      message: 'رقم الهاتف يجب أن يكون 11 رقمًا',
    },
  },
  // ==== NEW FIELD: حالة الاتصال الحالية ====
  isOnline: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Vendor', vendorSchema);
