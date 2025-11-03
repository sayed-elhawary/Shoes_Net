// backend/models/Customer.js
const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function (v) {
        return /^\d{11}$/.test(v);
      },
      message: 'رقم الهاتف يجب أن يتكون من 11 رقمًا',
    },
  },
  password: {
    type: String,
    required: true,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  blockReason: {
    type: String,
    default: '',
  },
  isPending: {
    type: Boolean,
    default: true,  // في انتظار الموافقة
  },
  isApproved: {
    type: Boolean,
    default: false, // لم تتم الموافقة بعد
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Customer', customerSchema);
