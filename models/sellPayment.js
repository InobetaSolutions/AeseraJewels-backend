const mongoose = require("mongoose");

const sellPaymentSchema = new mongoose.Schema({
    mobileNumber: { type: String, required: true },
    amount: { type: Number, min : 0 },
    gram: { type: Number, min :0 },
    paymentGatewayCharges: { type: Number, required: true , min :0},
    taxAmount: { type: Number, required: true, min : 0 },
    otherCharges: { type: Number, required: true ,min:0},
    paymentStatus: {
        type: String,
        enum: ["Admin Approve Pending", "Approve Confirmed", "Approve Cancelled"],
        default :"Admin Approve Pending",
        required: true
    }
}, { timestamps: true }); // Enable timestamps

module.exports = mongoose.model("SellPayment", sellPaymentSchema);