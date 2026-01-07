const PaymentGatewayCharges = require("../models/PaymentGatewayCharges");

// Create Payment Gateway Charges
const createPaymentGatewayCharges = async (req, res) => {
    try {
        const { value } = req.body;

        if (!value || typeof value !== "number" || value <= 0) {
            return res.status(400).json({ message: "Invalid value. It must be a positive number." });
        }

        // Check if paymentGatewayCharges already exists
        const existingCharge = await PaymentGatewayCharges.findOne();
        if (existingCharge) {
            return res.status(400).json({ message: "Payment gateway charges already exist. Please update the existing value." });
        }

        const paymentGatewayCharges = new PaymentGatewayCharges({ value });
        await paymentGatewayCharges.save();

        res.status(201).json({ message: "Payment gateway charges created successfully.", paymentGatewayCharges });
    } catch (error) {
        console.error("Error in createPaymentGatewayCharges:", error);
        res.status(500).json({ message: "An error occurred while creating payment gateway charges." });
    }
};

// Read Payment Gateway Charges
const getPaymentGatewayCharges = async (req, res) => {
    try {
        const paymentGatewayCharges = await PaymentGatewayCharges.findOne();

        if (!paymentGatewayCharges) {
            return res.status(404).json({ message: "Payment gateway charges not found." });
        }

        res.status(200).json({ message: "Payment gateway charges fetched successfully.", paymentGatewayCharges });
    } catch (error) {
        console.error("Error in getPaymentGatewayCharges:", error);
        res.status(500).json({ message: "An error occurred while fetching payment gateway charges." });
    }
};

// Update Payment Gateway Charges
const updatePaymentGatewayCharges = async (req, res) => {
    try {
        const { value } = req.body;

        if (!value || typeof value !== "number" || value <= 0) {
            return res.status(400).json({ message: "Invalid value. It must be a positive number." });
        }

        const paymentGatewayCharges = await PaymentGatewayCharges.findOne();

        if (!paymentGatewayCharges) {
            return res.status(404).json({ message: "Payment gateway charges not found." });
        }

        paymentGatewayCharges.value = value;
        await paymentGatewayCharges.save();

        res.status(200).json({ message: "Payment gateway charges updated successfully.", paymentGatewayCharges });
    } catch (error) {
        console.error("Error in updatePaymentGatewayCharges:", error);
        res.status(500).json({ message: "An error occurred while updating payment gateway charges." });
    }
};

// Delete Payment Gateway Charges
const deletePaymentGatewayCharges = async (req, res) => {
    try {
        const paymentGatewayCharges = await PaymentGatewayCharges.findOne();

        if (!paymentGatewayCharges) {
            return res.status(404).json({ message: "Payment gateway charges not found." });
        }

        await paymentGatewayCharges.deleteOne();

        res.status(200).json({ message: "Payment gateway charges deleted successfully." });
    } catch (error) {
        console.error("Error in deletePaymentGatewayCharges:", error);
        res.status(500).json({ message: "An error occurred while deleting payment gateway charges." });
    }
};

module.exports = {
    createPaymentGatewayCharges,
    getPaymentGatewayCharges,
    updatePaymentGatewayCharges,
    deletePaymentGatewayCharges,
};