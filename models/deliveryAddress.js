const mongoose = require('mongoose');

const userAddressSchema = new mongoose.Schema({
  userid: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  mobile: { type: String },
  address: { type: String, required: true },
  city: { type: String, required: true },
  postalCode: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('deliveryAddress', userAddressSchema);