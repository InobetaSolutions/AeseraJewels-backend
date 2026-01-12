const SellPayment = require("../models/sellPayment");
const User = require("../models/User");
const Payment = require("../models/Payment");
const GoldPrice = require("../models/GoldPrice");
const OtherCharges = require("../models/OtherCharges");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");




const sanitizeFileName = (name) => {
  if (!name) return "Customer";

  return name
    .toString()
    .trim()
    .replace(/[^a-zA-Z0-9 ]/g, "") // remove special chars
    .replace(/\s+/g, "_");         // spaces → underscore
};


const createSellPayment = async (req, res) => {
    try {
        const { mobileNumber, amount, gram, paymentGatewayCharges, taxAmount, deliveryCharges, paymentStatus } = req.body;

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

        // if (gram && gram > latestTotalGrams) {
        //     return res.status(400).json({ message: `Gram exceeds the total limit of ${latestTotalGrams}.` });
        // }

        // Check if selling the entire totalAmount or totalGrams
        if (amount && amount > latestTotalAmount - (paymentGatewayCharges || 0) - (taxAmount || 0) - (deliveryCharges || 0)) {
            const maxSellableAmount = latestTotalAmount - (paymentGatewayCharges || 0) - (taxAmount || 0) - (deliveryCharges || 0);
            return res.status(400).json({
                message: "Selling full amount not allowed",
                maxSellableAmount: maxSellableAmount > 0 ? maxSellableAmount.toFixed(2) : 0
            });
        }

        // // Check if selling the entire totalGrams
        // if (gram && gram >= latestTotalGrams - ((paymentGatewayCharges || 0) + (taxAmount || 0) + (deliveryCharges || 0)) / latestTotalAmount * latestTotalGrams) {
        //     const maxSellableGrams = latestTotalGrams - ((paymentGatewayCharges || 0) + (taxAmount || 0) + (deliveryCharges || 0)) / latestTotalAmount * latestTotalGrams;
        //     return res.status(400).json({
        //         message: "Selling full gram not allowed. ",
        //         maxSellableGrams: maxSellableGrams > 0 ? maxSellableGrams.toFixed(4) : 0
        //     });
        // }

        // Create the sell payment
        const sellPayment = new SellPayment({
            mobileNumber,
            amount,
            gram,
            paymentGatewayCharges,
            taxAmount,
            deliveryCharges,
            paymentStatus
        });

        await sellPayment.save();

        res.status(201).json({ message: "Sell payment created successfully.", sellPayment });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred while creating the sell payment." });
    }
};

// const approveSellPayment = async (req, res) => {
//     try {
//         const { id } = req.body;

//         // Validate ID
//         if (!id) {
//             return res.status(400).json({ message: "Payment ID is required." });
//         }

//         // Find the sell payment by ID
//         const sellPayment = await SellPayment.findById(id);
//         if (!sellPayment) {
//             return res.status(404).json({ message: "Sell payment not found." });
//         }

//         const { mobileNumber, amount, gram, taxAmount, paymentGatewayCharges, deliveryCharges } = sellPayment;

//         // Fetch the latest confirmed payment for totals
//         const latestPayment = await Payment.findOne({
//             mobile: mobileNumber,
//             status: "Payment Confirmed",
//         }).sort({ createdAt: -1 });

//         if (!latestPayment) {
//             return res.status(404).json({ message: "No confirmed payment found for this mobile number." });
//         }

//         // Use stored running totals
//         const oldTotalAmount = Number(latestPayment.totalAmount || 0);
//         const oldTotalGrams = Number(latestPayment.totalGrams || 0);

//         // Calculate total deductions
//         const totalDeductions = (taxAmount || 0) + (paymentGatewayCharges || 0) + (deliveryCharges || 0);

//         let newTotalAmount = oldTotalAmount;
//         let newTotalGrams = oldTotalGrams;

//         if (amount) {
//             newTotalAmount = Math.max(0, oldTotalAmount - (amount + totalDeductions));
//             newTotalAmount = Math.round(newTotalAmount); // Round to whole number
//             if (oldTotalAmount > 0) {
//                 newTotalGrams = Math.round(oldTotalGrams * (newTotalAmount / oldTotalAmount)); // Round to whole number
//             }
//         } else if (gram) {
//             newTotalGrams = Math.max(0, oldTotalGrams - gram);
//             newTotalGrams = Math.round(newTotalGrams); // Round to whole number
//             if (oldTotalGrams > 0) {
//                 newTotalAmount = Math.round(oldTotalAmount * (newTotalGrams / oldTotalGrams)); // Round to whole number
//             }
//         }

//         if (newTotalAmount === 0) {
//             newTotalGrams = 0;
//         }

//         // Update the latest payment totals
//         latestPayment.totalAmount = newTotalAmount;
//         latestPayment.totalGrams = newTotalGrams;
//         await latestPayment.save();

//         // Update the sell payment status to approved
//         sellPayment.paymentStatus = "Approve Confirmed";
//         await sellPayment.save();

//         res.status(200).json({
//             message: "Sell payment approved successfully.",
//             sellPayment,
//             updatedTotals: {
//                 totalAmount: newTotalAmount,
//                 totalGrams: newTotalGrams,
//             },
//         });
//     } catch (error) {
//         console.error("Error in approveSellPayment:", error);
//         res.status(500).json({ message: "An error occurred while approving the sell payment." });
//     }
// };

const approveSellPayment = async (req, res) => {
  try {
    const { id } = req.body;

    console.log("====== APPROVE SELL PAYMENT START ======");

    // ----------------- BASIC VALIDATION -----------------
    if (!id) {
      console.log("❌ Missing payment ID");
      return res.status(400).json({ message: "Payment ID is required." });
    }

    const sellPayment = await SellPayment.findById(id);
    if (!sellPayment) {
      console.log("❌ Sell payment not found:", id);
      return res.status(404).json({ message: "Sell payment not found." });
    }

    if (sellPayment.paymentStatus === "Approve Confirmed") {
      console.log("⚠️ Already approved:", id);
      return res.status(400).json({ message: "Sell payment already approved." });
    }

    const {
      mobileNumber,
      amount,
      gram,
      taxAmount = 0,
      paymentGatewayCharges = 0,
      deliveryCharges = 0
    } = sellPayment;

    const sellAmount = Number(amount);

    console.log("SellPayment Data:", {
      mobileNumber,
      sellAmount,
      gram,
      taxAmount,
      paymentGatewayCharges,
      deliveryCharges
    });

    if (!sellAmount || sellAmount <= 0) {
      console.log("❌ Invalid sell amount:", sellAmount);
      return res.status(400).json({ message: "Valid amount is required." });
    }

    // ----------------- FETCH WALLET -----------------
    const latestPayment = await Payment.findOne({
      mobile: mobileNumber,
      status: "Payment Confirmed",
    }).sort({ createdAt: -1 });

    if (!latestPayment) {
      console.log("❌ Wallet not found for:", mobileNumber);
      return res.status(404).json({
        message: "No confirmed wallet found for this mobile number."
      });
    }

    // ----------------- WALLET VALUES -----------------
    const oldTotalAmount = Number(latestPayment.totalAmount || 0);
    const oldTotalGrams  = Number(latestPayment.totalGrams || latestPayment.gold || 0);

    console.log("Wallet BEFORE Sell:", {
      oldTotalAmount,
      oldTotalGrams,
      walletDoc: latestPayment._id
    });

    if (oldTotalAmount <= 0 || oldTotalGrams <= 0) {
      console.log("❌ Invalid wallet balances");
      return res.status(400).json({ message: "Wallet balance is invalid." });
    }

    // ----------------- TOTAL MONEY DEDUCTION -----------------
    const totalDeductions =
      sellAmount +
      Number(taxAmount) +
      Number(paymentGatewayCharges) +
      Number(deliveryCharges);

    console.log("Total Deductions:", totalDeductions);

    if (totalDeductions > oldTotalAmount) {
      console.log("❌ Insufficient wallet amount");
      return res.status(400).json({
        message: "Insufficient wallet balance for this sell."
      });
    }

    // ----------------- FETCH CURRENT GOLD RATE -----------------
    const lastRate = await GoldPrice.findOne().sort({ timestamp: -1 });

    console.log("Gold Rate Record:", lastRate);

    if (!lastRate || !lastRate.price_gram_24k) {
      console.log("❌ Gold rate not available");
      return res.status(500).json({ message: "Gold rate not available." });
    }

    const pricePerGram = Number(lastRate.price_gram_24k);

    console.log("Price Per Gram (Current Rate):", pricePerGram);

    // ----------------- GRAMS DEDUCTED -----------------
    const gramsDeducted = totalDeductions / pricePerGram;

    console.log("Grams Deducted:", gramsDeducted);

    if (gramsDeducted > oldTotalGrams) {
      console.log("❌ Insufficient gold balance");
      return res.status(400).json({
        message: "Insufficient gold balance."
      });
    }

    // ----------------- NEW WALLET TOTALS -----------------
    const newTotalAmount = Number((oldTotalAmount - totalDeductions).toFixed(2));
    let newTotalGrams = Number((oldTotalGrams - gramsDeducted).toFixed(4));

    console.log("Wallet AFTER Sell (Calculated):", {
      newTotalAmount,
      newTotalGrams
    });

    if (newTotalAmount <= 0 || newTotalGrams <= 0) {
      console.log("⚠️ Wallet reached zero");
      newTotalGrams = 0;
    }

    // ----------------- UPDATE WALLET -----------------
    latestPayment.totalAmount = newTotalAmount;
    latestPayment.gold = newTotalGrams;
    latestPayment.totalGrams = newTotalGrams;

    console.log("Wallet BEFORE SAVE:", {
      save_totalAmount: latestPayment.totalAmount,
      save_gold: latestPayment.gold,
      save_totalGrams: latestPayment.totalGrams
    });

    await latestPayment.save();

    console.log("✅ Wallet Updated Successfully");

    // ----------------- UPDATE SELL STATUS -----------------
    sellPayment.paymentStatus = "Approve Confirmed";
    await sellPayment.save();

    console.log("✅ Sell Payment Approved:", sellPayment._id);

    console.log("====== APPROVE SELL PAYMENT END ======");

    // ----------------- RESPONSE -----------------
    return res.status(200).json({
      message: "Sell payment approved successfully.",
      sellPayment: {
        ...sellPayment.toObject(),
        gram
      },
      updatedTotals: {
        totalAmount: newTotalAmount,
        totalGrams: newTotalGrams
      }
    });

  } catch (error) {
    console.error("🔥 Error in approveSellPayment:", error);
    return res.status(500).json({
      message: "An error occurred while approving the sell payment."
    });
  }
};



// const approveSellPayment = async (req, res) => {
//   try {
//     const { id } = req.body;

//     // ----------------- VALIDATION -----------------
//     if (!id) {
//       return res.status(400).json({ message: "Payment ID is required." });
//     }

//     const sellPayment = await SellPayment.findById(id);
//     if (!sellPayment) {
//       return res.status(404).json({ message: "Sell payment not found." });
//     }

//     const {
//       mobileNumber,
//       amount,
//       gram, // only for response
//       taxAmount = 0,
//       paymentGatewayCharges = 0,
//       deliveryCharges = 0
//     } = sellPayment;

//     if (!amount || amount <= 0) {
//       return res.status(400).json({ message: "Valid amount is required." });
//     }

//     // ----------------- FETCH WALLET -----------------
//     const latestPayment = await Payment.findOne({
//       mobile: mobileNumber,
//       status: "Payment Confirmed",
//     }).sort({ createdAt: -1 });

//     if (!latestPayment) {
//       return res.status(404).json({
//         message: "No confirmed payment found for this mobile number."
//       });
//     }

//     // ----------------- WALLET VALUES -----------------
//     const oldTotalAmount = Number(latestPayment.totalAmount || 0);
//     const oldTotalGrams  = Number(latestPayment.gold || 0); // use gold

//     // ----------------- DEDUCTIONS -----------------
//     const totalDeductions =
//       Number(amount) +
//       Number(taxAmount) +
//       Number(paymentGatewayCharges) +
//       Number(deliveryCharges);

//     if (totalDeductions > oldTotalAmount) {
//       return res.status(400).json({
//         message: "Insufficient wallet balance for this sell."
//       });
//     }

//     // ----------------- NEW WALLET TOTALS -----------------
//     const newTotalAmount = Number((oldTotalAmount - totalDeductions).toFixed(2));

//     let newTotalGrams = 0;
//     if (oldTotalAmount > 0 && oldTotalGrams > 0) {
//       newTotalGrams = Number(
//         (oldTotalGrams * (newTotalAmount / oldTotalAmount)).toFixed(4)
//       );
//     }

//     if (newTotalAmount <= 0) newTotalGrams = 0;

//     // ----------------- UPDATE WALLET -----------------
//     latestPayment.totalAmount = newTotalAmount;
//     latestPayment.gold = newTotalGrams;        // real wallet grams
//     latestPayment.totalGrams = newTotalGrams; // keep in sync for history

//     await latestPayment.save();

//     // ----------------- UPDATE SELL STATUS -----------------
//     sellPayment.paymentStatus = "Approve Confirmed";
//     await sellPayment.save();

//     // ----------------- RESPONSE -----------------
//     return res.status(200).json({
//       message: "Sell payment approved successfully.",
//       sellPayment: {
//         ...sellPayment.toObject(),
//         gram // returned exactly as created
//       },
//       updatedTotals: {
//         totalAmount: newTotalAmount,
//         totalGrams: newTotalGrams
//       }
//     });

//   } catch (error) {
//     console.error("Error in approveSellPayment:", error);
//     return res.status(500).json({
//       message: "An error occurred while approving the sell payment."
//     });
//   }
// };



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

// const getAllSellPaymentHistoryForAdmin = async (req, res) => {
//     try {
//         const sellPayments = await SellPayment.find().sort({ createdAt: -1 });
//         const formattedSellPayments = sellPayments.map((sp) => ({
//             ...sp._doc,
//             timestamp: sp.updatedAt
//                 ? new Date(sp.updatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
//                 : null,
//         }));

//         res.status(200).json({
//             success: true,
//             message: "All sell payment history fetched successfully.",
//             data: formattedSellPayments,
//         });
//     } catch (error) {
//         console.error("Error in getAllSellPaymentHistoryForAdmin:", error);
//         res.status(500).json({ error: "Server error." });
//     }
// };


const getAllSellPaymentHistoryForAdmin = async (req, res) => {
  try {
    const sellPayments = await SellPayment.find().sort({ createdAt: -1 });

    // ✅ get unique mobile numbers from SellPayment
    const mobiles = [
      ...new Set(sellPayments.map((sp) => String(sp.mobileNumber))),
    ];

    // ✅ fetch users by mobile field
    const users = await User.find({
      mobile: { $in: mobiles },
    }).select("name mobile");

    // ✅ map mobile -> name
    const userMap = {};
    users.forEach((u) => {
      userMap[String(u.mobile)] = u.name;
    });

    // ✅ attach name to each sell payment
    const formattedSellPayments = sellPayments.map((sp) => ({
      ...sp._doc,
      user_name: userMap[String(sp.mobileNumber)] || null,
      timestamp: sp.updatedAt
        ? new Date(sp.updatedAt).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })
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

// Generate Sell Payment History Report for a specific user
const generateSellPaymentHistoryReport = async (req, res) => {
    try {
        const userId = req.user.id; // Assuming user ID is available in the auth middleware
        const SellPayment = require("../models/sellPayment");

        const sellPayments = await SellPayment.find({ userId }).sort({ createdAt: -1 });

        const report = sellPayments.map((sellPayment) => ({
            id: sellPayment._id,
            amount: sellPayment.amount,
            grams: sellPayment.grams,
            status: sellPayment.status,
            date: sellPayment.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        }));

        res.json({
            success: true,
            message: "Sell payment history report generated successfully.",
            data: report,
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to generate sell payment history report." });
    }
};





const CoinPayment = require("../models/coinPayment");


/* ================= HELPER FUNCTIONS ================= */

const applyBorder = cell => {
  cell.border = {
    top: { style: "medium" },
    left: { style: "medium" },
    bottom: { style: "medium" },
    right: { style: "medium" }
  };
};

const getGoldRateAtTime = (rates, date) => {
  const rate = rates.find(r => new Date(r.timestamp) <= new Date(date));
  return rate ? Number(rate.pricePerGram) : 0;
};

/* ================= CONTROLLER ================= */

// const generateTransactionReport = async (req, res) => {
//   try {
//     const { mobile, start_date, end_date } = req.body;

//     if (!mobile) {
//       return res.status(400).json({ message: "mobile is required" });
//     }

//     const startDate = start_date ? new Date(start_date) : null;
//     const endDate = end_date ? new Date(end_date) : null;

//     const dateFilter = {};
//     if (startDate && endDate) {
//       dateFilter.createdAt = { $gte: startDate, $lte: endDate };
//     }

//     /* ===== FETCH CUSTOMER ===== */
//     const user = await User.findOne({ mobile }).lean();
//     const customerName = user?.name || "N/A";

//     /* ===== FETCH DATA ===== */
//     const [payments, coinPayments, sellPayments, goldRates] =
//       await Promise.all([
//         Payment.find({ mobile, ...dateFilter }).lean(),
//         CoinPayment.find({ mobileNumber: mobile, ...dateFilter }).lean(),
//         SellPayment.find({ mobileNumber: mobile, ...dateFilter }).lean(),
//         GoldPrice.find().sort({ timestamp: -1 }).lean()
//       ]);

//     /* ===== MERGE TIMELINE ===== */
//     const timeline = [];

//     payments.forEach(p =>
//       timeline.push({ type: "BUY", date: p.createdAt, data: p })
//     );
//     coinPayments.forEach(c =>
//       timeline.push({ type: "COIN", date: c.createdAt, data: c })
//     );
//     sellPayments.forEach(s =>
//       timeline.push({ type: "SELL", date: s.createdAt, data: s })
//     );

//     timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

//     /* ===== PROCESS TRANSACTIONS ===== */
//     let runningGold = 0;
//     let slNo = 1;
//     const rows = [];

//     for (const tx of timeline) {
//       const goldRate = getGoldRateAtTime(goldRates, tx.date);
//       const beforeGold = Number(runningGold.toFixed(6));

//       let bought = "", sold = "", coin = "";
//       let goldCost = "", gst = "", gateway = "", others = "";
//       let totalAmount = "", txnChargeGms = 0;

//       if (tx.type === "BUY") {
//         bought = Number(tx.data.gram_allocated || tx.data.gram || 0);
//         runningGold += bought;

//         goldCost = tx.data.amount || "";
//         gst = tx.data.taxAmount || "";
//         totalAmount = tx.data.totalWithTax || "";

//         txnChargeGms = goldRate ? gst / goldRate : 0;
//         runningGold -= txnChargeGms;
//       }

//       if (tx.type === "COIN") {
//         coin = (tx.data.items || []).reduce(
//           (s, i) => s + Number(i.coinGrams || 0) * Number(i.quantity || 1),
//           0
//         );

//         runningGold -= coin;

//         gst = tx.data.taxAmount || "";
//         others = tx.data.deliveryCharge || "";
//         totalAmount = tx.data.amountPayable || "";

//         txnChargeGms = goldRate
//           ? (Number(gst) + Number(others)) / goldRate
//           : 0;

//         runningGold -= txnChargeGms;
//       }

//       if (tx.type === "SELL") {
//         sold = Number(tx.data.gram || 0);
//         runningGold -= sold;

//         goldCost = tx.data.amount || "";
//         gst = tx.data.taxAmount || "";
//         gateway = tx.data.paymentGatewayCharges || "";
//         others = tx.data.deliveryCharges || "";

//         txnChargeGms = goldRate
//           ? (Number(gst) + Number(gateway) + Number(others)) / goldRate
//           : 0;

//         runningGold -= txnChargeGms;
//       }

//       rows.push({
//         slNo: slNo++,
//         date: new Date(tx.date).toLocaleDateString("en-IN"),
//         time: new Date(tx.date).toLocaleTimeString("en-IN"),
//         goldRate,
//         availableBefore: beforeGold,
//         bought,
//         sold,
//         coin,
//         goldCost,
//         gst,
//         gateway,
//         others,
//         totalAmount,
//         thruGateway: "",
//         fromWallet: "",
//         chargesGms: txnChargeGms.toFixed(6),
//         availableAfter: Number(runningGold.toFixed(6))
//       });
//     }

//     /* ===== EXCEL ===== */
//     const workbook = new ExcelJS.Workbook();
//     const sheet = workbook.addWorksheet("Transaction Report");

//     // Customer Name (ONLY COLUMN A)
//     const customerRow = sheet.addRow([`Customer Name : ${customerName}`]);
//     const customerCell = customerRow.getCell(1);
//     customerCell.font = { bold: true };
//     applyBorder(customerCell);

//     // Mobile Number (ONLY COLUMN A)
//     const mobileRow = sheet.addRow([`Mobile Number : ${mobile}`]);
//     const mobileCell = mobileRow.getCell(1);
//     mobileCell.font = { bold: true };
//     applyBorder(mobileCell);

//     sheet.addRow([]);

//     const headerRow = sheet.addRow([
//       "Sl No","Date","Time","Gold rate per gm",
//       "Available Gold before","Bought in Gms","Sold in Gms",
//       "Coin Purchased in Gms","Gold Cost","GST",
//       "Gateway Charges","Others","Total Amount",
//       "Thru Payment Gateway","From Wallet",
//       "Transactional charges in Gms","Available Gold after"
//     ]);

//     headerRow.eachCell(cell => {
//       cell.font = { bold: true, color: { argb: "FFFFFF" } };
//       cell.fill = {
//         type: "pattern",
//         pattern: "solid",
//         fgColor: { argb: "4472C4" }
//       };
//       cell.alignment = { horizontal: "center" };
//       applyBorder(cell);
//     });

//     rows.forEach(r => {
//       const row = sheet.addRow(Object.values(r));
//       row.eachCell(cell => {
//         cell.alignment = { horizontal: "center" };
//         applyBorder(cell);
//       });
//     });

//     sheet.columns.forEach(c => (c.width = 22));


//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename=transaction_report_${customerName}.xlsx`
//     );
//     res.setHeader(
//       "Content-Type",
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//     );


//     await workbook.xlsx.write(res);
//     res.end();

//   } catch (err) {
//     console.error("generateTransactionReport error:", err);
//     res.status(500).json({ message: "Report generation failed" });
//   }
// };
// const IST_OFFSET = 5.5 * 60 * 60 * 1000;

// /* ===== IST DATE → UTC RANGE ===== */
// const istDateRangeToUTC = (start, end) => {
//   const s = new Date(start);
//   s.setHours(0, 0, 0, 0);

//   const e = new Date(end);
//   e.setHours(23, 59, 59, 999);

//   return {
//     startUTC: new Date(s.getTime() - IST_OFFSET),
//     endUTC: new Date(e.getTime() - IST_OFFSET)
//   };
// };

// const generateTransactionReport = async (req, res) => {
//   try {
//     const { mobile, start_date, end_date } = req.body;

//     if (!mobile) {
//       return res.status(400).json({ message: "mobile is required" });
//     }

//     /* ===== DATE FILTER (IST) ===== */
//     const dateFilter = {};
//     if (start_date && end_date) {
//       const { startUTC, endUTC } = istDateRangeToUTC(start_date, end_date);
//       dateFilter.createdAt = { $gte: startUTC, $lte: endUTC };
//     }

//     /* ===== CUSTOMER ===== */
//     const user = await User.findOne({ mobile }).lean();
//     const customerName = user?.name || "N/A";

//     /* ===== FETCH DATA ===== */
//     const [payments, coinPayments, sellPayments, goldRates] =
//       await Promise.all([
//         Payment.find({ mobile, ...dateFilter }).lean(),
//         CoinPayment.find({ mobileNumber: mobile, ...dateFilter }).lean(),
//         SellPayment.find({ mobileNumber: mobile, ...dateFilter }).lean(),

//         // GoldPrice uses timestamp (seconds)
//         GoldPrice.find().sort({ timestamp: 1 }).lean() // oldest → newest
//       ]);

//     /* ===== GOLD RATE MATCH (HISTORICAL) ===== */
//     const getGoldRateAtTime = (rates, txDate) => {
//       if (!rates || !rates.length) return "";

//       const txSec = Math.floor(new Date(txDate).getTime() / 1000);

//       let match = null;
//       for (const r of rates) {
//         if (Number(r.timestamp) <= txSec) match = r;
//         else break;
//       }

//       if (!match) match = rates[rates.length - 1];

//       return match.price_gram_24k || "";
//     };

//     /* ===== MERGE TIMELINE ===== */
//     const timeline = [];

//     payments.forEach(p =>
//       timeline.push({ type: "BUY", date: p.createdAt, data: p })
//     );
//     coinPayments.forEach(c =>
//       timeline.push({ type: "COIN", date: c.createdAt, data: c })
//     );
//     sellPayments.forEach(s =>
//       timeline.push({ type: "SELL", date: s.createdAt, data: s })
//     );

//     timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

//     /* ===== PROCESS TRANSACTIONS ===== */
//     let runningGold = 0;
//     let slNo = 1;
//     const rows = [];

//     for (const tx of timeline) {
//       const goldRate = getGoldRateAtTime(goldRates, tx.date);
//       const beforeGold = Number(runningGold.toFixed(6));

//       let bought = "", sold = "", coin = "";
//       let goldCost = "", gst = "", gateway = "", others = "";
//       let totalAmount = "", thruGateway = "", fromWallet = "";
//       let txnChargeGms = 0;

//       /* ===== BUY ===== */
//       if (tx.type === "BUY") {
//         bought = Number(tx.data.gram_allocated || tx.data.gram || 0);
//         runningGold += bought;

//         goldCost = tx.data.amount || "";
//         gst = tx.data.taxAmount || "";
//         totalAmount = tx.data.totalWithTax || "";

//         txnChargeGms = goldRate ? Number(gst) / goldRate : 0;
//         runningGold -= txnChargeGms;
//       }

//       /* ===== COIN ===== */
//       if (tx.type === "COIN") {
//         coin = (tx.data.items || []).reduce(
//           (s, i) => s + Number(i.coinGrams || 0) * Number(i.quantity || 1),
//           0
//         );

//         runningGold -= coin;

//         gst = tx.data.taxAmount || "";
//         others = tx.data.deliveryCharge || tx.data.deliveryCharges || "";

//         thruGateway =
//           tx.data.amountPayable ??
//           tx.data.AmountPayable ??
//           tx.data.totalAmount ??
//           "";

//         fromWallet =
//           tx.data.investAmount ??
//           tx.data.InvestAmount ??
//           "";

//         totalAmount = thruGateway || "";

//         txnChargeGms = goldRate
//           ? (Number(gst) + Number(others)) / goldRate
//           : 0;

//         runningGold -= txnChargeGms;
//       }

//       /* ===== SELL ===== */
//       if (tx.type === "SELL") {
//         sold = Number(tx.data.gram || 0);
//         runningGold -= sold;

//         goldCost = tx.data.amount || "";
//         gst = tx.data.taxAmount || "";
//         gateway = tx.data.paymentGatewayCharges || "";
//         others = tx.data.deliveryCharges || "";

//         const totalDeduction =
//           Number(gst) + Number(gateway) + Number(others);

//         txnChargeGms = goldRate ? totalDeduction / goldRate : 0;
//         runningGold -= txnChargeGms;
//       }

//       rows.push({
//         slNo: slNo++,
//         date: new Date(tx.date).toLocaleDateString("en-IN"),
//         time: new Date(tx.date).toLocaleTimeString("en-IN"),
//         goldRate,
//         availableBefore: beforeGold,
//         bought,
//         sold,
//         coin,
//         goldCost,
//         gst,
//         gateway,
//         others,
//         totalAmount,
//         thruGateway,
//         fromWallet,
//         chargesGms: txnChargeGms.toFixed(6),
//         availableAfter: Number(runningGold.toFixed(6))
//       });
//     }

//     /* ===== EXCEL ===== */
//     const workbook = new ExcelJS.Workbook();
//     const sheet = workbook.addWorksheet("Transaction Report");

//     const customerRow = sheet.addRow([`Customer Name : ${customerName}`]);
//     customerRow.getCell(1).font = { bold: true };
//     applyBorder(customerRow.getCell(1));

//     const mobileRow = sheet.addRow([`Mobile Number : ${mobile}`]);
//     mobileRow.getCell(1).font = { bold: true };
//     applyBorder(mobileRow.getCell(1));

//     sheet.addRow([]);

//     const headerRow = sheet.addRow([
//       "Sl No","Date","Time","Gold rate per gm",
//       "Available Gold before","Bought in Gms","Sold in Gms",
//       "Coin Purchased in Gms","Gold Cost","GST",
//       "Gateway Charges","Others","Total Amount",
//       "Thru Payment Gateway","From Wallet",
//       "Transactional charges in Gms","Available Gold after"
//     ]);

//     headerRow.eachCell(cell => {
//       cell.font = { bold: true, color: { argb: "FFFFFF" } };
//       cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "4472C4" } };
//       cell.alignment = { horizontal: "center" };
//       applyBorder(cell);
//     });

//     rows.forEach(r => {
//       const row = sheet.addRow(Object.values(r));
//       row.eachCell(cell => {
//         cell.alignment = { horizontal: "center" };
//         applyBorder(cell);
//       });
//     });

//     sheet.columns.forEach(c => (c.width = 22));

//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename=transaction_report_${customerName}.xlsx`
//     );
//     res.setHeader(
//       "Content-Type",
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//     );

//     await workbook.xlsx.write(res);
//     res.end();

//   } catch (err) {
//     console.error("generateTransactionReport error:", err);
//     res.status(500).json({ message: "Report generation failed" });
//   }
// };

const IST_OFFSET = 5.5 * 60 * 60 * 1000;

/* ===== IST DATE → UTC RANGE ===== */
const istDateRangeToUTC = (start, end) => {
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);

  const e = new Date(end);
  e.setHours(23, 59, 59, 999);

  return {
    startUTC: new Date(s.getTime() - IST_OFFSET),
    endUTC: new Date(e.getTime() - IST_OFFSET)
  };
};

const generateTransactionReport = async (req, res) => {
  try {
    const { mobile, start_date, end_date } = req.body;

    if (!mobile) {
      return res.status(400).json({ message: "mobile is required" });
    }

    /* ===== DATE FILTER (IST) ===== */
    const dateFilter = {};
    if (start_date && end_date) {
      const { startUTC, endUTC } = istDateRangeToUTC(start_date, end_date);
      dateFilter.createdAt = { $gte: startUTC, $lte: endUTC };
    }

    /* ===== CUSTOMER ===== */
    const user = await User.findOne({ mobile }).lean();
    const customerName = user?.name || "N/A";

    /* ===== FETCH DATA ===== */
    const [payments, coinPayments, sellPayments, goldRates] =
      await Promise.all([
        Payment.find({ mobile, ...dateFilter, status: "Payment Confirmed" }).lean(),
        CoinPayment.find({ mobileNumber: mobile, ...dateFilter, status: "Payment Confirmed" }).lean(),
        SellPayment.find({ mobileNumber: mobile, ...dateFilter, paymentStatus: "Approve Confirmed" }).lean(),
        GoldPrice.find().sort({ timestamp: 1 }).lean()
      ]);

    /* ===== GOLD RATE MATCH ===== */
    const getGoldRateAtTime = (rates, txDate) => {
      if (!rates?.length) return "";
      const txSec = Math.floor(new Date(txDate).getTime() / 1000);
      let match = null;

      for (const r of rates) {
        if (Number(r.timestamp) <= txSec) match = r;
        else break;
      }
      if (!match) match = rates[rates.length - 1];
      return match.price_gram_24k || "";
    };

    /* ===== MERGE TIMELINE ===== */
    const timeline = [];

    payments.forEach(p => timeline.push({ type: "BUY", date: p.createdAt, data: p }));
    coinPayments.forEach(c => timeline.push({ type: "COIN", date: c.createdAt, data: c }));
    sellPayments.forEach(s => timeline.push({ type: "SELL", date: s.createdAt, data: s }));

    timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

    /* ===== WALLET STARTS FROM ZERO ===== */
    let runningGold = 0;
    let runningAmount = 0;

    /* ===== PROCESS ===== */
    let slNo = 1;
    const rows = [];

    for (const tx of timeline) {
      const goldRate = getGoldRateAtTime(goldRates, tx.date);
      const beforeGold = Number(runningGold.toFixed(6));

      let bought = "", sold = "", coin = "";
      let goldCost = "", gst = "", gateway = "", others = "";
      let totalAmount = "", thruGateway = "", fromWallet = "";
      let txnChargeGms = "";

      /* ===== BUY ===== */
      if (tx.type === "BUY") {
        bought = Number(tx.data.gram_allocated || tx.data.gram || 0);

        runningGold += bought;
        runningAmount += Number(tx.data.amount || 0);

        goldCost = tx.data.amount || "";
        gst = tx.data.taxAmount || "";
        totalAmount = tx.data.totalWithTax || "";
      }

            /* ===== COIN ===== */
      if (tx.type === "COIN") {

        coin = (tx.data.items || []).reduce(
          (s, i) => s + Number(i.coinGrams || 0) * Number(i.quantity || 1),
          0
        );

        const goldRateAtTx = Number(goldRate || 0);
        const goldCostAmt = goldRateAtTx ? Number((coin * goldRateAtTx).toFixed(2)) : 0;

        const tax = Number(tx.data.taxAmount || 0);
        const delivery = Number(tx.data.deliveryCharge || 0);
        const invest = Number(tx.data.investAmount || 0);

        // proportional wallet reduction (your existing logic)
        const oldAmt = runningAmount;
        const newAmt = Math.max(0, oldAmt - invest);

        if (oldAmt > 0) {
          runningGold = Number((runningGold * (newAmt / oldAmt)).toFixed(6));
        } else {
          runningGold = 0;
        }
        runningAmount = newAmt;

        goldCost = goldCostAmt || "";
        gst = tax || "";
        others = delivery || "";

        thruGateway = Number(tx.data.amountPayable || 0) || "";
        fromWallet = invest || "";

        // ✅ total = gold value + tax + delivery
        totalAmount = (goldCostAmt + tax + delivery) || "";
      }

      /* ===== SELL ===== */
            /* ===== SELL ===== */
      if (tx.type === "SELL") {
        sold = Number(tx.data.gram || 0);

        const amount = Number(tx.data.amount || 0);
        const tax = Number(tx.data.taxAmount || 0);
        const gatewayCharge = Number(tx.data.paymentGatewayCharges || 0);
        const delivery = Number(tx.data.deliveryCharges || 0);

        const totalDeduction = amount + tax + gatewayCharge + delivery;

        const oldAmt = runningAmount;
        const newAmt = Math.max(0, oldAmt - totalDeduction);

        if (oldAmt > 0) {
          runningGold = Number((runningGold * (newAmt / oldAmt)).toFixed(6));
        } else {
          runningGold = 0;
        }

        runningAmount = newAmt;

        goldCost = amount || "";
        gst = tax || "";
        gateway = gatewayCharge || "";
        others = delivery || "";

        // ✅ TOTAL AMOUNT COLUMN
        totalAmount = totalDeduction || "";

        const chargeOnly = tax + gatewayCharge + delivery;

        txnChargeGms = goldRate ? (chargeOnly / goldRate).toFixed(6) : "";
      }

      rows.push({
        slNo: slNo++,
        date: new Date(tx.date).toLocaleDateString("en-IN"),
        time: new Date(tx.date).toLocaleTimeString("en-IN"),
        goldRate,
        availableBefore: beforeGold,
        bought,
        sold,
        coin,
        goldCost,
        gst,
        gateway,
        others,
        totalAmount,
        thruGateway,
        fromWallet,
        chargesGms: txnChargeGms,
        availableAfter: Number(runningGold.toFixed(6))
      });
    }

    /* ===== EXCEL ===== */
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Transaction Report");

    const customerRow = sheet.addRow([`Customer Name : ${customerName}`]);
    customerRow.getCell(1).font = { bold: true };
    applyBorder(customerRow.getCell(1));

    const mobileRow = sheet.addRow([`Mobile Number : ${mobile}`]);
    mobileRow.getCell(1).font = { bold: true };
    applyBorder(mobileRow.getCell(1));

    sheet.addRow([]);

    const headerRow = sheet.addRow([
      "Sl No","Date","Time","Gold rate per gm",
      "Available Gold before","Bought in Gms","Sold in Gms",
      "Coin Purchased in Gms","Gold Cost","GST",
      "Gateway Charges","Others","Total Amount",
      "Thru Payment Gateway","From Wallet",
      "Transactional charges in Gms","Available Gold after"
    ]);

    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: "FFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "4472C4" } };
      cell.alignment = { horizontal: "center" };
      applyBorder(cell);
    });

    rows.forEach(r => {
      const row = sheet.addRow(Object.values(r));
      row.eachCell(cell => {
        cell.alignment = { horizontal: "center" };
        applyBorder(cell);
      });
    });

    sheet.columns.forEach(c => (c.width = 22));

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=transaction_report_${customerName}.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error("generateTransactionReport error:", err);
    res.status(500).json({ message: "Report generation failed" });
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
    generateSellPaymentHistoryReport,
    generateTransactionReport,
};



