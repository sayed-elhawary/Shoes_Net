const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, default: null },
  quantity: { type: Number, required: true },
  customerName: { type: String, default: '' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
