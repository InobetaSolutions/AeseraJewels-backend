const SellPayment = require("../models/sellPayment");
const User = require("../models/User");
const Payment = require("../models/Payment");
const GoldPrice = require("../models/GoldPrice");
const OtherCharges = require("../models/OtherCharges");

const createSellPayment = async (req, res) => {
    try {
        const { mobileNumber, amount, gram, paymentGatewayCharges, taxAmount, otherCharges, paymentStatus } = req.body;

        // Validate mobileNumber
        const mobileNumberRegex = /^[0-9]{10}$/;
        if (!mobileNumber || !mobileNumberRegex.test(mobileNumber)) {
            return res.status(400).json({ message: "Invalid mobile number. It must be a 10-digit number." });
        }

        // Check if mobile number exists in User schema
        const user = await User.findOne({ mobile: mobileNumber });
        if (!user) {
            return res.status(404).json({ message: "Mobile number does not exist in the user database." });
        }

        // // Validate amount and gram
        // if ((!amount && !gram) || (amount && gram)) {
        //     return res.status(400).json({ message: "Either amount or gram must be provided, but not both." });
        // }

        if (amount && amount <= 0) {
            return res.status(400).json({ message: "Amount must be greater than 0." });
        }

        if (gram && gram <= 0) {
            return res.status(400).json({ message: "Gram must be greater than 0." });
        }

        // Fetch the latest payment history for totals
        const payments = await Payment.find({ mobile: mobileNumber }).sort({ createdAt: -1 });
        const latestConfirmed = payments.find(p => p.status === "Payment Confirmed");

        const latestTotalAmount = latestConfirmed ? Number(latestConfirmed.totalAmount || 0) : 0;
        const latestTotalGrams = latestConfirmed ? Number(latestConfirmed.totalGrams || 0) : 0;

        // Check if amount and gram are within total limits
        if (amount && amount > latestTotalAmount) {
            return res.status(400).json({ message: `Amount exceeds the total limit of ${latestTotalAmount}.` });
        }

        if (gram && gram > latestTotalGrams) {
            return res.status(400).json({ message: `Gram exceeds the total limit of ${latestTotalGrams}.` });
        }

        // Check if selling the entire totalAmount or totalGrams
        if (amount && amount > latestTotalAmount - (paymentGatewayCharges || 0) - (taxAmount || 0) - (otherCharges || 0)) {
            const maxSellableAmount = latestTotalAmount - (paymentGatewayCharges || 0) - (taxAmount || 0) - (otherCharges || 0);
            return res.status(400).json({
                message: "Selling full amount not allowed",
                maxSellableAmount: maxSellableAmount > 0 ? maxSellableAmount.toFixed(2) : 0
            });
        }

        // Check if selling the entire totalGrams
        if (gram && gram >= latestTotalGrams - ((paymentGatewayCharges || 0) + (taxAmount || 0) + (otherCharges || 0)) / latestTotalAmount * latestTotalGrams) {
            const maxSellableGrams = latestTotalGrams - ((paymentGatewayCharges || 0) + (taxAmount || 0) + (otherCharges || 0)) / latestTotalAmount * latestTotalGrams;
            return res.status(400).json({
                message: "Selling full gram not allowed. Deductions like payment gateway charges, tax, and other charges must be accounted for.",
                maxSellableGrams: maxSellableGrams > 0 ? maxSellableGrams.toFixed(4) : 0
            });
        }

        // Create the sell payment
        const sellPayment = new SellPayment({
            mobileNumber,
            amount,
            gram,
            paymentGatewayCharges,
            taxAmount,
            otherCharges,
            paymentStatus
        });

        await sellPayment.save();

        res.status(201).json({ message: "Sell payment created successfully.", sellPayment });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred while creating the sell payment." });
    }
};

const approveSellPayment = async (req, res) => {
    try {
        const { id } = req.body;

        // Validate ID
        if (!id) {
            return res.status(400).json({ message: "Payment ID is required." });
        }

        // Find the sell payment by ID
        const sellPayment = await SellPayment.findById(id);
        if (!sellPayment) {
            return res.status(404).json({ message: "Sell payment not found." });
        }

        const { mobileNumber, amount, gram, taxAmount, paymentGatewayCharges, otherCharges } = sellPayment;

        // Fetch the latest confirmed payment for totals
        const latestPayment = await Payment.findOne({
            mobile: mobileNumber,
            status: "Payment Confirmed",
        }).sort({ createdAt: -1 });

        if (!latestPayment) {
            return res.status(404).json({ message: "No confirmed payment found for this mobile number." });
        }

        // Use stored running totals
        const oldTotalAmount = Number(latestPayment.totalAmount || 0);
        const oldTotalGrams = Number(latestPayment.totalGrams || 0);

        // Calculate total deductions
        const totalDeductions = (taxAmount || 0) + (paymentGatewayCharges || 0) + (otherCharges || 0);

        let newTotalAmount = oldTotalAmount;
        let newTotalGrams = oldTotalGrams;

        if (amount) {
            newTotalAmount = Math.max(0, oldTotalAmount - (amount + totalDeductions));
            newTotalAmount = Math.round(newTotalAmount); // Round to whole number
            if (oldTotalAmount > 0) {
                newTotalGrams = Math.round(oldTotalGrams * (newTotalAmount / oldTotalAmount)); // Round to whole number
            }
        } else if (gram) {
            newTotalGrams = Math.max(0, oldTotalGrams - gram);
            newTotalGrams = Math.round(newTotalGrams); // Round to whole number
            if (oldTotalGrams > 0) {
                newTotalAmount = Math.round(oldTotalAmount * (newTotalGrams / oldTotalGrams)); // Round to whole number
            }
        }

        if (newTotalAmount === 0) {
            newTotalGrams = 0;
        }

        // Update the latest payment totals
        latestPayment.totalAmount = newTotalAmount;
        latestPayment.totalGrams = newTotalGrams;
        await latestPayment.save();

        // Update the sell payment status to approved
        sellPayment.paymentStatus = "Approve Confirmed";
        await sellPayment.save();

        res.status(200).json({
            message: "Sell payment approved successfully.",
            sellPayment,
            updatedTotals: {
                totalAmount: newTotalAmount,
                totalGrams: newTotalGrams,
            },
        });
    } catch (error) {
        console.error("Error in approveSellPayment:", error);
        res.status(500).json({ message: "An error occurred while approving the sell payment." });
    }
};

const cancelSellPayment = async (req, res) => {
    try {
        const { id } = req.body;

        // Validate ID
        if (!id) {
            return res.status(400).json({ message: "Sell payment ID is required." });
        }

        // Find the sell payment by ID
        const sellPayment = await SellPayment.findById(id);
        if (!sellPayment) {
            return res.status(404).json({ message: "Sell payment not found." });
        }

        // Check if the payment is already cancelled
        if (sellPayment.paymentStatus === "Approve Cancelled") {
            return res.status(400).json({ message: "Sell payment is already cancelled." });
        }

        // Update the payment status to cancelled
        sellPayment.paymentStatus = "Approve Cancelled";
        await sellPayment.save();

        res.status(200).json({
            success: true,
            message: "Sell payment cancelled successfully.",
            sellPayment,
        });
    } catch (error) {
        console.error("Error in cancelSellPayment:", error);
        res.status(500).json({ error: "Server error." });
    }
};

const getAllSellPaymentHistoryForAdmin = async (req, res) => {
    try {
        const sellPayments = await SellPayment.find().sort({ createdAt: -1 });
        const formattedSellPayments = sellPayments.map((sp) => ({
            ...sp._doc,
            timestamp: sp.updatedAt
                ? new Date(sp.updatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
                : null,
        }));

        res.status(200).json({
            success: true,
            message: "All sell payment history fetched successfully.",
            data: formattedSellPayments,
        });
    } catch (error) {
        console.error("Error in getAllSellPaymentHistoryForAdmin:", error);
        res.status(500).json({ error: "Server error." });
    }
};

const getAllSellPaymentHistoryForUser = async (req, res) => {
    try {
        const { mobile } = req.user; // Assuming `req.user` contains the authenticated user's details
        const sellPayments = await SellPayment.find({ mobileNumber: mobile }).sort({ createdAt: -1 });
        const formattedSellPayments = sellPayments.map((sp) => ({
            ...sp._doc,
            timestamp: sp.updatedAt
                ? new Date(sp.updatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
                : null,
        }));

        res.status(200).json({
            success: true,
            message: "Sell payment history fetched successfully.",
            data: formattedSellPayments,
        });
    } catch (error) {
        console.error("Error in getAllSellPaymentHistoryForUser:", error);
        res.status(500).json({ error: "Server error." });
    }
};

const getApprovedSellPayment = async (req, res) => {
    try {
        const sellPayments = await SellPayment.find({ paymentStatus: "Approve Confirmed" }).sort({ createdAt: -1 });
        const formattedSellPayments = sellPayments.map((sp) => ({
            ...sp._doc,
            timestamp: sp.updatedAt
                ? new Date(sp.updatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
                : null,
        }));

        res.status(200).json({
            success: true,
            message: "Approved sell payments fetched successfully.",
            data: formattedSellPayments,
        });
    } catch (error) {
        console.error("Error in getApprovedSellPayment:", error);
        res.status(500).json({ error: "Server error." });
    }
};

// Create Other Charges
const createOtherCharges = async (req, res) => {
    try {
        const { value } = req.body;

        if (!value || typeof value !== "number" || value <= 0) {
            return res.status(400).json({ message: "Invalid value. It must be a positive number." });
        }

        // Check if otherCharges already exists
        const existingCharge = await OtherCharges.findOne();
        if (existingCharge) {
            return res.status(400).json({ message: "Other charges already exist. Please update the existing value." });
        }

        const otherCharges = new OtherCharges({ value });
        await otherCharges.save();

        res.status(201).json({ message: "Other charges created successfully.", otherCharges });
    } catch (error) {
        console.error("Error in createOtherCharges:", error);
        res.status(500).json({ message: "An error occurred while creating other charges." });
    }
};

// Read Other Charges
const getOtherCharges = async (req, res) => {
    try {
        const otherCharges = await OtherCharges.findOne();

        if (!otherCharges) {
            return res.status(404).json({ message: "Other charges not found." });
        }

        res.status(200).json({ message: "Other charges fetched successfully.", otherCharges });
    } catch (error) {
        console.error("Error in getOtherCharges:", error);
        res.status(500).json({ message: "An error occurred while fetching other charges." });
    }
};

// Update Other Charges
const updateOtherCharges = async (req, res) => {
    try {
        const { value } = req.body;

        if (!value || typeof value !== "number" || value <= 0) {
            return res.status(400).json({ message: "Invalid value. It must be a positive number." });
        }

        const otherCharges = await OtherCharges.findOne();

        if (!otherCharges) {
            return res.status(404).json({ message: "Other charges not found." });
        }

        otherCharges.value = value;
        await otherCharges.save();

        res.status(200).json({ message: "Other charges updated successfully.", otherCharges });
    } catch (error) {
        console.error("Error in updateOtherCharges:", error);
        res.status(500).json({ message: "An error occurred while updating other charges." });
    }
};

// Delete Other Charges
const deleteOtherCharges = async (req, res) => {
    try {
        const otherCharges = await OtherCharges.findOne();

        if (!otherCharges) {
            return res.status(404).json({ message: "Other charges not found." });
        }

        await otherCharges.deleteOne();

        res.status(200).json({ message: "Other charges deleted successfully." });
    } catch (error) {
        console.error("Error in deleteOtherCharges:", error);
        res.status(500).json({ message: "An error occurred while deleting other charges." });
    }
};

module.exports = {
    createSellPayment,
    approveSellPayment,
    cancelSellPayment,
    getAllSellPaymentHistoryForAdmin,
    getAllSellPaymentHistoryForUser,
    getApprovedSellPayment,
    createOtherCharges,
    getOtherCharges,
    updateOtherCharges,
    deleteOtherCharges,
};