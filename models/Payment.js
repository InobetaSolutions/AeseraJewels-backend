const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  mobile: { type: String, required: true },
  others: { type: String },
  amount: { type: Number },
  gold: { type: Number }, // allocated gold in grams, set when approved
  totalAmount: { type: Number, default: 0 }, // ✅ running total
  totalGrams: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, default: "Payment Confirmation Pending" },
  // type: { type: String, enum: ['gram', 'amount'], required: true },
  gram: { type: Number },
  amount_allocated: { type: Number },
  gram_allocated: { type: Number },
  paid_amount:{type:Number},
  // paid_by: { type: String } // JWT mobile of payer
}, {timestamps: true});

module.exports = mongoose.model('Payment', paymentSchema);
