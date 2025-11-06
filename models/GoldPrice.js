const mongoose = require('mongoose');

const goldPriceSchema = new mongoose.Schema({
  timestamp: { type: Number, required: true },
  price_gram_24k: { type: Number, required: true },
  istDate: { type: String }
});

module.exports = mongoose.model('GoldPrice', goldPriceSchema);
