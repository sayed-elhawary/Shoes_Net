const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'vendor' },
  description: { type: String },
  logo: { type: String }
});

module.exports = mongoose.model('Vendor', vendorSchema);
