const mongoose = require('mongoose');

const userAddressSchema = new mongoose.Schema({
  mobile: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  postalCode: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('deliveryAddress', userAddressSchema);