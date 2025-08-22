const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  image: { type: String, required: true },
  tagid: { type: String, required: true },
  description: { type: String },
  goldtype: { type: String },
  price: { type: Number, required: true }
});

module.exports = mongoose.model('Product', productSchema);
