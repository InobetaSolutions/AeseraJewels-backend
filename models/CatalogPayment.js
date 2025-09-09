const mongoose = require("mongoose");

const catalogPaymentSchema = new mongoose.Schema(
  {
    mobileNumber: { type: String, required: true },
    tagid: { type: String, required: true },
    goldType: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true }, // total value
    grams: { type: Number, required: true }, // total grams
    address: { type: String, required: true },
    city: { type: String, required: true },
    postCode: { type: String, required: true },
    Paidamount: { type: Number, default: 0 }, // paid so far
    Paidgrams: { type: Number, default: 0 }, // paid grams
    // allotmentStatus: { type: Boolean, default: false }, // Step3 updates this
    allotmentStatus: {
      type: String,
      enum: ["Pending", "Approved"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CatalogPayment", catalogPaymentSchema);
