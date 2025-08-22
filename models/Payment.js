const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  mobile: { type: String, required: true },
  amount: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, default: 'pending' }
});

module.exports = mongoose.model('Payment', paymentSchema);
