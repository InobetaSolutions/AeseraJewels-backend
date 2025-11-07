const mongoose = require('mongoose');
const { Schema } = mongoose;

const lineItemSchema = new Schema({
  coinGrams: { type: Number, required: true, min: 0 },   // normalized from "Coin grams"
  quantity: { type: Number, required: true, min: 1 },   // normalized from "Quantty"
  amount: { type: Number, required: true, min: 0 }    // per line subtotal or unit subtotal as per your rule
}, { _id: false });

const coinPaymentSchema = new Schema({
  mobileNumber: { type: String, required: true, trim: true },
  items: { type: [lineItemSchema], required: true, validate: v => Array.isArray(v) && v.length > 0 },
  totalAmount: { type: Number, min: 0 },
  taxAmount: { type: Number, min: 0 },
  deliveryCharge: { type: Number, min: 0 },
  amountPayable: { type: Number, min: 0 },
  investAmount: { type: Number, min: 0 },

  address: { type: String, trim: true },
  city: { type: String, trim: true },
  postCode: { type: String, trim: true },

  // status: {
  //   type: String,
  //   enum: ['Approval Pending', 'Payment Confirmed'],
  //   default: 'Approval Pending',
  //   index: true
  // },

  status: {
    type: String,
    enum: ['Approval Pending', 'Payment Confirmed', 'Cancelled'],
    default: 'Approval Pending',
    index: true
  },

  allotmentStatus: {
    type: String,
    default: "Not Delivered",
  },

  // optional audit fields
  approvedAt: { type: Date },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('CoinPayment', coinPaymentSchema);
