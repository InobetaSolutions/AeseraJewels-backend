const mongoose = require("mongoose");

const catalogPaymentSchema = new mongoose.Schema(
  {
    mobileNumber: { type: String, required: true },
    tagid: { type: String, required: true },
    goldType: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true }, // total value
    grams: { type: Number, required: true }, // total grams
    address: { type: String},
    city: { type: String},
    postCode: { type: String},
  // amount to deduct (for payments created with an existing amount)
    investAmount: { type: Number, default: 0 },
    Paidamount: { type: Number, default: 0 }, // paid so far
    Paidgrams: { type: Number, default: 0 }, // paid grams
    // allotmentStatus: { type: Boolean, default: false }, // Step3 updates this
    paymentStatus: {
      type: String,
      // enum: ["Pending", "Approved", "Delivered"],
      enum: [
        "Payment Confirmation Pending",
        "Payment Approved - Delivery is in Process"
      ],
      default: "Payment Confirmation Pending",
    },
    allotmentStatus: {
      type: String,
      default: "Not Delivered",
    },
  },
  { 
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        if (ret.createdAt) {
          ret.createdAt = new Date(ret.createdAt).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata"
          });
        }
        if (ret.updatedAt) {
          ret.updatedAt = new Date(ret.updatedAt).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata"
          });
        }
        return ret;
      }
    }
  }
);

module.exports = mongoose.model("CatalogPayment", catalogPaymentSchema);
