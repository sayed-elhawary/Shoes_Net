const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  price: { type: Number, required: true },
  quantityPerCarton: { type: Number, required: true },
  manufacturer: { type: String, required: true },
  description: { type: String },
  images: [{ type: String }], // array للصور المتعددة
  videos: [{ type: String }], // array للفيديوهات المتعددة
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  approved: { type: Boolean, default: false },
});

module.exports = mongoose.model('Product', productSchema);
