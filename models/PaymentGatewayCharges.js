const mongoose = require("mongoose");

const paymentGatewayChargesSchema = new mongoose.Schema(
    {
        value: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt fields
    }
);

module.exports = mongoose.model("PaymentGatewayCharges", paymentGatewayChargesSchema);