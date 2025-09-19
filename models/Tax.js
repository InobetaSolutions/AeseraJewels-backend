
const mongoose = require("mongoose");

const taxSchema = new mongoose.Schema({
  percentage: {
    type: Number,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model("Tax", taxSchema);