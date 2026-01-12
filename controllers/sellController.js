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

// const approveSellPayment = async (req, res) => {
//     try {
//         const { id } = req.body;

//         // Validate ID
//         if (!id) {
//             return res.status(400).json({ message: "Payment ID is required." });
//         }

//         // Find the sell payment
//         const sellPayment = await SellPayment.findById(id);
//         if (!sellPayment) {
//             return res.status(404).json({ message: "Sell payment not found." });
//         }

//         const {
//             mobileNumber,
//             amount,
//             gram, // ONLY for response
//             taxAmount = 0,
//             paymentGatewayCharges = 0,
//             deliveryCharges = 0
//         } = sellPayment;

//         // Validate amount
//         if (!amount || amount <= 0) {
//             return res.status(400).json({ message: "Valid amount is required for approval." });
//         }

//         // Fetch latest confirmed payment
//         const latestPayment = await Payment.findOne({
//             mobile: mobileNumber,
//             status: "Payment Confirmed",
//         }).sort({ createdAt: -1 });

//         if (!latestPayment) {
//             return res.status(404).json({
//                 message: "No confirmed payment found for this mobile number."
//             });
//         }

//         // Old totals
//         const oldTotalAmount = Number(latestPayment.totalAmount || 0);
//         const oldTotalGrams = Number(latestPayment.totalGrams || 0);

//         // Calculate total deductions (amount-based only)
//         const totalDeductions =
//             amount + taxAmount + paymentGatewayCharges + deliveryCharges;

//         // New total amount
//         let newTotalAmount = Math.max(0, oldTotalAmount - totalDeductions);
//         newTotalAmount = Math.round(newTotalAmount);

//         // New total grams (proportional to amount)
//         let newTotalGrams = 0;
//         if (oldTotalAmount > 0 && oldTotalGrams > 0) {
//             newTotalGrams = Math.round(
//                 oldTotalGrams * (newTotalAmount / oldTotalAmount)
//             );
//         }

//         // If amount becomes zero, grams must be zero
//         if (newTotalAmount === 0) {
//             newTotalGrams = 0;
//         }

//         // Update latest payment
//         latestPayment.totalAmount = newTotalAmount;
//         latestPayment.totalGrams = newTotalGrams;
//         await latestPayment.save();

//         // Update sell payment status
//         sellPayment.paymentStatus = "Approve Confirmed";
//         await sellPayment.save();

//         // Final response
//         res.status(200).json({
//             message: "Sell payment approved successfully.",
//             sellPayment: {
//                 ...sellPayment.toObject(),
//                 gram // returned exactly as created
//             },
//             updatedTotals: {
//                 totalAmount: newTotalAmount,
//                 totalGrams: newTotalGrams
//             }
//         });

//     } catch (error) {
//         console.error("Error in approveSellPayment:", error);
//         res.status(500).json({
//             message: "An error occurred while approving the sell payment."
//         });
//     }
// };


const approveSellPayment = async (req, res) => {
  try {
    const { id } = req.body;

    // ----------------- VALIDATION -----------------
    if (!id) {
      return res.status(400).json({ message: "Payment ID is required." });
    }

    const sellPayment = await SellPayment.findById(id);
    if (!sellPayment) {
      return res.status(404).json({ message: "Sell payment not found." });
    }

    const {
      mobileNumber,
      amount,
      gram, // only for response
      taxAmount = 0,
      paymentGatewayCharges = 0,
      deliveryCharges = 0
    } = sellPayment;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valid amount is required." });
    }

    // ----------------- FETCH WALLET -----------------
    const latestPayment = await Payment.findOne({
      mobile: mobileNumber,
      status: "Payment Confirmed",
    }).sort({ createdAt: -1 });

    if (!latestPayment) {
      return res.status(404).json({
        message: "No confirmed payment found for this mobile number."
      });
    }

    // ----------------- WALLET VALUES -----------------
    const oldTotalAmount = Number(latestPayment.totalAmount || 0);
    const oldTotalGrams  = Number(latestPayment.gold || 0); // use gold

    // ----------------- DEDUCTIONS -----------------
    const totalDeductions =
      Number(amount) +
      Number(taxAmount) +
      Number(paymentGatewayCharges) +
      Number(deliveryCharges);

    if (totalDeductions > oldTotalAmount) {
      return res.status(400).json({
        message: "Insufficient wallet balance for this sell."
      });
    }

    // ----------------- NEW WALLET TOTALS -----------------
    const newTotalAmount = Number((oldTotalAmount - totalDeductions).toFixed(2));

    let newTotalGrams = 0;
    if (oldTotalAmount > 0 && oldTotalGrams > 0) {
      newTotalGrams = Number(
        (oldTotalGrams * (newTotalAmount / oldTotalAmount)).toFixed(4)
      );
    }

    if (newTotalAmount <= 0) newTotalGrams = 0;

    // ----------------- UPDATE WALLET -----------------
    latestPayment.totalAmount = newTotalAmount;
    latestPayment.gold = newTotalGrams;        // real wallet grams
    latestPayment.totalGrams = newTotalGrams; // keep in sync for history

    await latestPayment.save();

    // ----------------- UPDATE SELL STATUS -----------------
    sellPayment.paymentStatus = "Approve Confirmed";
    await sellPayment.save();

    // ----------------- RESPONSE -----------------
    return res.status(200).json({
      message: "Sell payment approved successfully.",
      sellPayment: {
        ...sellPayment.toObject(),
        gram // returned exactly as created
      },
      updatedTotals: {
        totalAmount: newTotalAmount,
        totalGrams: newTotalGrams
      }
    });

  } catch (error) {
    console.error("Error in approveSellPayment:", error);
    return res.status(500).json({
      message: "An error occurred while approving the sell payment."
    });
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



// const CoinPayment = require("../models/coinPayment");
// /**
//  * Get gold rate at transaction time
//  */
// const getGoldRateAtTime = (goldRates, createdAt) => {
//   const txnTime = new Date(createdAt).getTime();
//   for (const g of goldRates) {
//     if (g.timestamp * 1000 <= txnTime) {
//       return Number(g.price_gram_24k);
//     }
//   }
//   return 0;
// };




// const generateTransactionReport = async (req, res) => {
//   try {
//     const { mobile, start_date, end_date } = req.body;

//     if (!mobile) {
//       return res.status(400).json({ message: "Mobile number required" });
//     }

//     // Date filter
//     const dateFilter = {};
//     if (start_date) dateFilter.$gte = new Date(start_date);
//     if (end_date) {
//       const end = new Date(end_date);
//       end.setHours(23, 59, 59, 999);
//       dateFilter.$lte = end;
//     }

//     const createdAtFilter =
//       Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

//     // Fetch user
//     const user = await User.findOne({ mobile }).lean();

//     // Fetch data
//     const [payments, coinPayments, sellPayments, goldRates] =
//       await Promise.all([
//         Payment.find({ mobile, ...createdAtFilter }).lean(),
//         CoinPayment.find({ mobileNumber: mobile, ...createdAtFilter }).lean(),
//         SellPayment.find({ mobileNumber: mobile, ...createdAtFilter }).lean(),
//         GoldPrice.find().sort({ timestamp: -1 }).lean(),
//       ]);

//     // Timeline
//     const timeline = [];

//     payments.forEach(p =>
//       timeline.push({ type: "BUY", createdAt: p.createdAt, data: p })
//     );
//     coinPayments.forEach(c =>
//       timeline.push({ type: "COIN", createdAt: c.createdAt, data: c })
//     );
//     sellPayments.forEach(s =>
//       timeline.push({ type: "SELL", createdAt: s.createdAt, data: s })
//     );

//     timeline.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

//     let runningGold = 0;
//     let slNo = 1;
//     const rows = [];

//     for (const tx of timeline) {
//       const goldRate = getGoldRateAtTime(goldRates, tx.createdAt);
//       const beforeGold = Number(runningGold.toFixed(6));

//       let boughtGold = "";
//       let soldGold = "";
//       let coinPurchased = "";
//       let txnChargeGrams = 0;

//       let goldCost = "";
//       let gst = "";
//       let gatewayCharges = "";
//       let others = "";
//       let totalAmount = "";

//       if (tx.type === "BUY") {
//         boughtGold = tx.data.gram_allocated || tx.data.gram || 0;
//         runningGold += Number(boughtGold);

//         goldCost = tx.data.amount || "";
//         gst = tx.data.taxAmount || "";
//         totalAmount = tx.data.totalWithTax || "";

//         txnChargeGrams = goldRate
//           ? Number(tx.data.taxAmount || 0) / goldRate
//           : 0;

//         runningGold -= txnChargeGrams;
//       }

//       if (tx.type === "COIN") {
//         const coinGrams = (tx.data.items || []).reduce(
//           (s, i) => s + Number(i.coinGrams || 0) * Number(i.quantity || 1),
//           0
//         );

//         coinPurchased = coinGrams;
//         runningGold -= coinGrams;

//         gst = tx.data.taxAmount || "";
//         others = tx.data.deliveryCharge || "";
//         totalAmount = tx.data.amountPayable || "";

//         const charges =
//           Number(tx.data.taxAmount || 0) +
//           Number(tx.data.deliveryCharge || 0);

//         txnChargeGrams = goldRate ? charges / goldRate : 0;
//         runningGold -= txnChargeGrams;
//       }

//       if (tx.type === "SELL") {
//         soldGold = tx.data.gram || 0;
//         runningGold -= Number(soldGold);

//         goldCost = tx.data.amount || "";
//         gst = tx.data.taxAmount || "";
//         gatewayCharges = tx.data.paymentGatewayCharges || "";
//         others = tx.data.deliveryCharges || "";

//         const charges =
//           Number(tx.data.taxAmount || 0) +
//           Number(tx.data.paymentGatewayCharges || 0) +
//           Number(tx.data.deliveryCharges || 0);

//         txnChargeGrams = goldRate ? charges / goldRate : 0;
//         runningGold -= txnChargeGrams;
//       }

//       rows.push([
//         slNo++,
//         new Date(tx.createdAt).toLocaleDateString("en-IN"),
//         new Date(tx.createdAt).toLocaleTimeString("en-IN"),
//         goldRate || "",
//         beforeGold,
//         boughtGold,
//         soldGold,
//         coinPurchased,
//         goldCost,
//         gst,
//         gatewayCharges,
//         others,
//         totalAmount,
//         "",
//         "",
//         txnChargeGrams.toFixed(6),
//         Number(runningGold.toFixed(6)),
//       ]);
//     }

//     // EXCEL
//     const workbook = new ExcelJS.Workbook();
//     const sheet = workbook.addWorksheet("Gold Transaction Report");

//     sheet.addRow([`Customer Name : ${user?.name || "-"}`]);
//     sheet.addRow([`Mobile Number : ${mobile}`]);
//     sheet.addRow([]);

//     const headerRow = sheet.addRow([
//       "Sl No",
//       "Date",
//       "Time",
//       "Gold rate per gm",
//       "Available Gold before",
//       "Bought in gms",
//       "Sold in gms",
//       "Coin Purchased in gms",
//       "Gold Cost",
//       "GST",
//       "Gateway Charges",
//       "Others",
//       "Total Amount",
//       "Thru Payment Gateway",
//       "From Wallet",
//       "Transactional charges in gms",
//       "Available Gold after",
//     ]);

//     // Styles
//     const headerStyle = {
//       font: { bold: true, color: { argb: "FFFFFFFF" } },
//       fill: {
//         type: "pattern",
//         pattern: "solid",
//         fgColor: { argb: "4472C4" },
//       },
//       alignment: { vertical: "middle", horizontal: "center" },
//       border: {
//         top: { style: "medium" },
//         left: { style: "medium" },
//         bottom: { style: "medium" },
//         right: { style: "medium" },
//       },
//     };

//     headerRow.eachCell(cell => (cell.style = headerStyle));

//     rows.forEach(r => {
//       const row = sheet.addRow(r);
//       row.eachCell(cell => {
//         cell.alignment = { horizontal: "center", vertical: "middle" };
//         cell.border = {
//           top: { style: "thin" },
//           left: { style: "thin" },
//           bottom: { style: "thin" },
//           right: { style: "thin" },
//         };
//       });
//     });

//     sheet.columns.forEach(col => (col.width = 20));

//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename=transaction_report_${mobile}.xlsx`
//     );
//     res.setHeader(
//       "Content-Type",
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//     );

//     await workbook.xlsx.write(res);
//     res.end();
//   } catch (err) {
//     console.error("generateTransactionReport error:", err);
//     res.status(500).json({ message: "Failed to generate report" });
//   }
// };



// module.exports = {
//     createSellPayment,
//     approveSellPayment,
//     cancelSellPayment,
//     getAllSellPaymentHistoryForAdmin,
//     getAllSellPaymentHistoryForUser,
//     getApprovedSellPayment,
//     createOtherCharges,
//     getOtherCharges,
//     updateOtherCharges,
//     deleteOtherCharges,
//     generateSellPaymentHistoryReport,
//     generateTransactionReport,
// };



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

const generateTransactionReport = async (req, res) => {
  try {
    const { mobile, start_date, end_date } = req.body;

    if (!mobile) {
      return res.status(400).json({ message: "mobile is required" });
    }

    const startDate = start_date ? new Date(start_date) : null;
    const endDate = end_date ? new Date(end_date) : null;

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = { $gte: startDate, $lte: endDate };
    }

    /* ===== FETCH CUSTOMER ===== */
    const user = await User.findOne({ mobile }).lean();
    const customerName = user?.name || "N/A";

    /* ===== FETCH DATA ===== */
    const [payments, coinPayments, sellPayments, goldRates] =
      await Promise.all([
        Payment.find({ mobile, ...dateFilter }).lean(),
        CoinPayment.find({ mobileNumber: mobile, ...dateFilter }).lean(),
        SellPayment.find({ mobileNumber: mobile, ...dateFilter }).lean(),
        GoldPrice.find().sort({ timestamp: -1 }).lean()
      ]);

    /* ===== MERGE TIMELINE ===== */
    const timeline = [];

    payments.forEach(p =>
      timeline.push({ type: "BUY", date: p.createdAt, data: p })
    );
    coinPayments.forEach(c =>
      timeline.push({ type: "COIN", date: c.createdAt, data: c })
    );
    sellPayments.forEach(s =>
      timeline.push({ type: "SELL", date: s.createdAt, data: s })
    );

    timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

    /* ===== PROCESS TRANSACTIONS ===== */
    let runningGold = 0;
    let slNo = 1;
    const rows = [];

    for (const tx of timeline) {
      const goldRate = getGoldRateAtTime(goldRates, tx.date);
      const beforeGold = Number(runningGold.toFixed(6));

      let bought = "", sold = "", coin = "";
      let goldCost = "", gst = "", gateway = "", others = "";
      let totalAmount = "", txnChargeGms = 0;

      if (tx.type === "BUY") {
        bought = Number(tx.data.gram_allocated || tx.data.gram || 0);
        runningGold += bought;

        goldCost = tx.data.amount || "";
        gst = tx.data.taxAmount || "";
        totalAmount = tx.data.totalWithTax || "";

        txnChargeGms = goldRate ? gst / goldRate : 0;
        runningGold -= txnChargeGms;
      }

      if (tx.type === "COIN") {
        coin = (tx.data.items || []).reduce(
          (s, i) => s + Number(i.coinGrams || 0) * Number(i.quantity || 1),
          0
        );

        runningGold -= coin;

        gst = tx.data.taxAmount || "";
        others = tx.data.deliveryCharge || "";
        totalAmount = tx.data.amountPayable || "";

        txnChargeGms = goldRate
          ? (Number(gst) + Number(others)) / goldRate
          : 0;

        runningGold -= txnChargeGms;
      }

      if (tx.type === "SELL") {
        sold = Number(tx.data.gram || 0);
        runningGold -= sold;

        goldCost = tx.data.amount || "";
        gst = tx.data.taxAmount || "";
        gateway = tx.data.paymentGatewayCharges || "";
        others = tx.data.deliveryCharges || "";

        txnChargeGms = goldRate
          ? (Number(gst) + Number(gateway) + Number(others)) / goldRate
          : 0;

        runningGold -= txnChargeGms;
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
        thruGateway: "",
        fromWallet: "",
        chargesGms: txnChargeGms.toFixed(6),
        availableAfter: Number(runningGold.toFixed(6))
      });
    }

    /* ===== EXCEL ===== */
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Transaction Report");

    // Customer Name (ONLY COLUMN A)
    const customerRow = sheet.addRow([`Customer Name : ${customerName}`]);
    const customerCell = customerRow.getCell(1);
    customerCell.font = { bold: true };
    applyBorder(customerCell);

    // Mobile Number (ONLY COLUMN A)
    const mobileRow = sheet.addRow([`Mobile Number : ${mobile}`]);
    const mobileCell = mobileRow.getCell(1);
    mobileCell.font = { bold: true };
    applyBorder(mobileCell);

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
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "4472C4" }
      };
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