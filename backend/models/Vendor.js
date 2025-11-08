const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'vendor' },
  description: { type: String },
  logo: { type: String },
  phone: {
    type: String,
    validate: {
      validator: function(v) {
        return /^\d{11}$/.test(v); // بالضبط 11 رقم
      },
      message: 'رقم الهاتف يجب أن يكون 11 رقمًا'
    }
  }
});

module.exports = mongoose.model('Vendor', vendorSchema);
