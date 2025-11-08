// backend/models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  price: { type: Number, required: true },
  quantityPerCarton: { type: Number, required: true },
  manufacturer: { type: String, required: true },
  description: { type: String },
  images: [{
    type: String,
    validate: {
      validator: function (images) {
        if (this.videos && this.videos.length > 0) {
          return images && images.length >= 1;
        }
        return true;
      },
      message: 'يجب رفع صورة واحدة على الأقل عند رفع فيديو'
    }
  }],
  videos: [{ type: String }],
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  approved: { type: Boolean, default: false },
}, {
  timestamps: true   // ← هذا السطر الجديد
});

module.exports = mongoose.model('Product', productSchema);
