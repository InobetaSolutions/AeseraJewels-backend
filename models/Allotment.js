const mongoose = require('mongoose');

const allotmentSchema = new mongoose.Schema({
  mobile: { type: String, required: true },
  gram: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Allotment', allotmentSchema);
