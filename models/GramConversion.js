const mongoose = require('mongoose');

const gramConversionSchema = new mongoose.Schema({
  mobile: { type: String, required: true },
  grams: { type: Number, required: true },
  goldRate: { type: Number, required: true },
  amount: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GramConversion', gramConversionSchema);
