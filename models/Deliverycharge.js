
const mongoose = require("mongoose");

const deliveryChargeSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model("DeliveryCharge", deliveryChargeSchema);
