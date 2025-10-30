// Get all cancelled payments
exports.getAllCancelledPayments = async (req, res) => {
  try {
    const Payment = require("../models/Payment");
    const payments = await Payment.find({ status: "Payment Cancelled" }).sort({
      timestamp: -1,
    });
    // Format all payment timestamps to IST using updatedAt
    const formatted = payments.map((p) => ({
      ...p._doc,
      timestamp: p.updatedAt
        ? new Date(p.updatedAt).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })
        : null,
    }));
    res.json({
      success: true,
      message: "Cancelled payments fetched successfully.",
      data: formatted,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
};
// Get all approved payments
exports.getAllApprovedPayments = async (req, res) => {
  try {
    const Payment = require("../models/Payment");
    const payments = await Payment.find({ status: "Payment Confirmed" }).sort({
      timestamp: -1,
    });
    // Format all payment timestamps to IST using updatedAt
    const formatted = payments.map((p) => ({
      ...p._doc,
      timestamp: p.updatedAt
        ? new Date(p.updatedAt).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })
        : null,
    }));
    res.json({
      success: true,
      message: "Approved payments fetched successfully.",
      data: formatted,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
};
// Cancel payment by ObjectId
exports.cancelPayment = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Payment id is required." });
    }
    let payment = await Payment.findOne({
      _id: id,
      status: { $ne: "Payment Cancelled" },
    });
    if (!payment) {
      return res
        .status(404)
        .json({ error: "No payment found for this id or already cancelled." });
    }
    payment.status = "Payment Cancelled";
    await payment.save();
    // Format timestamp to IST (Asia/Kolkata)
    // const istTimestamp = payment.timestamp
    //   ? new Date(payment.timestamp).toLocaleString("en-IN", {
    //       timeZone: "Asia/Kolkata",
    //     })
    //   : null;
    const istTimestamp = payment.updatedAt
      ? new Date(payment.updatedAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })
      : null;

    res.json({
      success: true,
      message: "Payment Cancelled",
      payment: {
        ...payment._doc,
        timestamp: istTimestamp,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
};

// Get allotment history for a mobile number
exports.setAllotment = async (req, res) => {
  try {
    const Allotment = require("../models/Allotment");
    const Payment = require("../models/Payment");
    const { mobile, gram } = req.body;

    if (!mobile || !gram || isNaN(gram) || gram <= 0) {
      return res
        .status(400)
        .json({ error: "Mobile and valid gram are required." });
    }

    // Helper function to handle decimal precision
    const roundToDecimal = (num, decimals = 4) => {
      return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
    };

    // ✅ Only consider Approved payments
    const payments = await Payment.find({
      mobile,
      status: "Payment Confirmed",
    });

    if (payments.length === 0) {
      return res
        .status(400)
        .json({ error: "No approved payments found for this mobile." });
    }

    // Get total grams available after previous allotments
    const totalGramsRaw = roundToDecimal(
      payments.reduce(
        (sum, p) => sum + (p.gram || 0) + (p.gram_allocated || 0),
        0
      )
    );
    console.log("Total grams raw for mobile:", mobile, totalGramsRaw);

    const allotments = await Allotment.find({ mobile });
    console.log("Allotments for mobile:", mobile, allotments);

    const totalAllotted = roundToDecimal(
      allotments.reduce((sum, a) => sum + (a.gram || 0), 0)
    );
    console.log("Total allotted for mobile:", mobile, totalAllotted);

    const totalGramsAvailable = roundToDecimal(totalGramsRaw - totalAllotted);
    console.log(
      "Total grams available for mobile:",
      mobile,
      totalGramsAvailable
    );

    // Convert input gram to same precision
    const requestedGram = roundToDecimal(parseFloat(gram));

    // Check if enough grams available with tolerance for floating point errors
    const tolerance = 0.0001; // Very small tolerance for comparison
    if (requestedGram > totalGramsAvailable + tolerance) {
      return res.status(400).json({
        error: "Not enough grams to allot.",
        details: {
          requested: requestedGram,
          available: totalGramsAvailable,
          totalRaw: totalGramsRaw,
          totalAllotted: totalAllotted,
        },
      });
    }

    // If requesting almost all remaining grams, adjust to exact remaining amount
    let gramToAllot = requestedGram;
    if (Math.abs(requestedGram - totalGramsAvailable) <= tolerance) {
      gramToAllot = totalGramsAvailable;
      console.log("Adjusting gram to exact available:", gramToAllot);
    }

    // Record the allotment with rounded value
    await Allotment.create({ mobile, gram: gramToAllot });

    // Calculate new totals after allotment
    const updatedPayments = await Payment.find({
      mobile,
      status: "Payment Confirmed",
    });

    // Only sum real deposited amounts (ignore amount_allocated)
    const totalAmountRaw = roundToDecimal(
      updatedPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    );
    console.log("Total amount raw for mobile:", mobile, totalAmountRaw);

    const totalGramsRaw2 = roundToDecimal(
      updatedPayments.reduce(
        (sum, p) => sum + (p.gram || 0) + (p.gram_allocated || 0),
        0
      )
    );
    console.log("Total grams raw2 for mobile:", mobile, totalGramsRaw2);

    const allotments2 = await Allotment.find({ mobile });
    console.log("Allotments2 for mobile:", mobile, allotments2);

    const totalAllotted2 = roundToDecimal(
      allotments2.reduce((sum, a) => sum + (a.gram || 0), 0)
    );
    console.log("Total allotted2 for mobile:", mobile, totalAllotted2);

    const totalGrams2 = roundToDecimal(totalGramsRaw2 - totalAllotted2);
    console.log("Total grams2 for mobile:", mobile, totalGrams2);

    // Proportional remaining amount
    const totalAmount2 =
      totalGramsRaw2 > 0
        ? roundToDecimal((totalAmountRaw * totalGrams2) / totalGramsRaw2, 2)
        : 0;
    console.log("Total amount2 for mobile:", mobile, totalAmount2);

    return res.json({
      message: "Allotment recorded",
      mobile,
      gram: gramToAllot,
      totalGrams: totalGrams2,
      totalAmount: totalAmount2,
    });
  } catch (err) {
    console.error("Allotment error:", err);
    res.status(500).json({ error: "Server error." });
  }
};

exports.getByUserAllotment = async (req, res) => {
  try {
    const { mobile } = req.query;
    if (!mobile) {
      return res.status(400).json({ error: "Mobile is required." });
    }

    const Allotment = require("../models/Allotment");
    const Payment = require("../models/Payment");

    // Fetch allotments (latest first)
    const allotments = await Allotment.find({ mobile }).sort({ timestamp: -1 });

    // Fetch payments of this mobile
    const payments = await Payment.find({ mobile }).sort({ timestamp: 1 });

    // Only use real deposited amount
    const totalAmountRaw = payments.reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    );

    // Grams include both direct grams and allocated grams
    const totalGramsRaw = payments.reduce(
      (sum, p) => sum + (p.gram || 0) + (p.gram_allocated || 0),
      0
    );

    // Get last status (or default "Pending" if none found)
    const lastStatus =
      payments.length > 0
        ? payments[payments.length - 1].status
        : "Payment Confirmation Pending";

    // For each allotment, calculate proportional reduced amount + add status
    const allotmentsWithAmount = allotments.map((a) => {
      let amountReduced = 0;
      if (totalGramsRaw > 0) {
        amountReduced = (totalAmountRaw * a.gram) / totalGramsRaw;
      }
      // Format allotment timestamp to IST
      const istTimestamp = a.timestamp
        ? new Date(a.timestamp).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })
        : null;
      return {
        ...a._doc,
        amountReduced: Number(amountReduced.toFixed(2)),
        status: lastStatus,
        timestamp: istTimestamp,
      };
    });
    res.json({ mobile, allotments: allotmentsWithAmount });
  } catch (err) {
    console.error("Error in getByUserAllotment:", err);
    res.status(500).json({ error: "Server error." });
  }
};

// Get full payment summary for a mobile number
exports.getFullPayment = async (req, res) => {
  try {
    const mobiles = await Payment.distinct("mobile");
    const Allotment = require("../models/Allotment");
    const results = [];

    for (const mobile of mobiles) {
      const payments = await Payment.find({ mobile });

      // Use only actual cash amount, not allocated conversions
      const totalAmountRaw = payments.reduce(
        (sum, p) => sum + (p.amount || 0),
        0
      );

      const totalGramsRaw = payments.reduce(
        (sum, p) => sum + (p.gram || 0) + (p.gram_allocated || 0),
        0
      );

      const allotments = await Allotment.find({ mobile });
      const totalAllotted = allotments.reduce(
        (sum, a) => sum + (a.gram || 0),
        0
      );

      const totalGramsFinal = totalGramsRaw - totalAllotted;

      const totalAmountFinal =
        totalGramsRaw > 0
          ? (totalAmountRaw * totalGramsFinal) / totalGramsRaw
          : 0;

      results.push({
        mobile,
        totalAmount: Number(totalAmountFinal.toFixed(2)),
        totalGrams: Number(totalGramsFinal.toFixed(3)),
      });
    }

    res.json({ summary: results });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
};

// both approved + cancelled payments for a mobile

// exports.getPaymentHistory = async (req, res) => {
//   try {
//     const { mobile } = req.body;
//     if (!mobile) {
//       return res.status(400).json({ error: "Mobile is required." });
//     }

//     const Payment = require("../models/Payment");

//     // Fetch both where mobile is the number OR others is the number
//     const payments = await Payment.find({
//       $or: [{ mobile }, { others: mobile }],
//     }).sort({ timestamp: -1 });

//     // Raw totals (include both direct + others)
//     const totalAmountRaw = payments.reduce(
//       (sum, p) => sum + (p.amount || 0),
//       0
//     );

//     const totalGramsRaw = payments.reduce(
//       (sum, p) => sum + (p.gram || 0) + (p.gram_allocated || 0),
//       0
//     );

//     // Subtract allotments
//     const Allotment = require("../models/Allotment");
//     const allotments = await Allotment.find({ mobile });
//     const totalAllotted = allotments.reduce((sum, a) => sum + (a.gram || 0), 0);

//     const totalGrams = totalGramsRaw - totalAllotted;

//     // Proportionally adjust amount
//     const totalAmount =
//       totalGramsRaw > 0 ? (totalAmountRaw * totalGrams) / totalGramsRaw : 0;

//     const formatted = payments.map((p) => ({
//       ...p._doc,
//       gold: p.gold || 0,
//       timestamp: p.timestamp
//         ? new Date(p.timestamp).toLocaleString("en-IN", {
//             timeZone: "Asia/Kolkata",
//           })
//         : null,
//     }));
//     res.json({ totalAmount, totalGrams, payments: formatted });
//   } catch (err) {
//     res.status(500).json({ error: "Server error." });
//   }
// };

// Get payment history (approved + cancelled) for a mobile, total grams + total amount when approved only
// exports.getPaymentHistory = async (req, res) => {
//   try {
//     const { mobile } = req.body;
//     if (!mobile) {
//       return res.status(400).json({ error: "Mobile is required." });
//     }

//     const Payment = require("../models/Payment");

//     // Fetch all payments for display (both where mobile is the number OR others is the number)
//     const payments = await Payment.find({
//       $or: [{ mobile }, { others: mobile }],
//     }).sort({ timestamp: -1 });

//     // Only include confirmed payments for totals
//     const confirmedPayments = payments.filter(
//       (p) => p.status === "Payment Confirmed"
//     );

//     // Raw totals (include both direct + others, but only confirmed)
//     const totalAmountRaw = confirmedPayments.reduce(
//       (sum, p) => sum + (p.amount || 0),
//       0
//     );

//     const totalGramsRaw = confirmedPayments.reduce(
//       (sum, p) => sum + (p.gram || 0) + (p.gram_allocated || 0),
//       0
//     );

//     // Subtract allotments
//     const Allotment = require("../models/Allotment");
//     const allotments = await Allotment.find({ mobile });
//     const totalAllotted = allotments.reduce((sum, a) => sum + (a.gram || 0), 0);

//     const totalGrams = totalGramsRaw - totalAllotted;

//     // Proportionally adjust amount
//     const totalAmount =
//       totalGramsRaw > 0 ? (totalAmountRaw * totalGrams) / totalGramsRaw : 0;

//     const formatted = payments.map((p) => ({
//       ...p._doc,
//       gold: p.gold || 0,
//       timestamp: p.timestamp
//         ? new Date(p.timestamp).toLocaleString("en-IN", {
//             timeZone: "Asia/Kolkata",
//           })
//         : null,
//     }));
//     res.json({ totalAmount, totalGrams, payments: formatted });
//   } catch (err) {
//     res.status(500).json({ error: "Server error." });
//   }
// };

// {"working code starts"}

// exports.getPaymentHistory = async (req, res) => {
//   try {
//     const { mobile } = req.body;
//     if (!mobile) {
//       return res.status(400).json({ error: "Mobile is required." });
//     }

//     const Payment = require("../models/Payment");

//     // Fetch all payments for display (both where mobile is the number OR others is the number)
//     const payments = await Payment.find({
//       $or: [{ mobile }, { others: mobile }],
//     }).sort({ timestamp: -1 });

//     // Find the latest confirmed payment
//     const latestConfirmedPayment = payments.find(p => p.status === "Payment Confirmed");
//     const latestTotalAmount = latestConfirmedPayment ? latestConfirmedPayment.totalAmount || 0 : 0;

//     const formatted = payments.map((p) => ({
//       ...p._doc,
//       gold: p.gold || 0,
//       // Only include totalAmount if payment is confirmed
//       totalAmount: p.status === "Payment Confirmed" ? Number(formatTo2Decimals(p.totalAmount || 0)) : 0,
//       totalGrams: Number(formatTo3Decimals(p.totalGrams || 0)),
//       timestamp: p.timestamp
//         ? new Date(p.timestamp).toLocaleString("en-IN", {
//             timeZone: "Asia/Kolkata",
//           })
//         : null,
//     }));

//     // Only return totalAmount if there is a confirmed payment
//     res.json({
//       totalAmount: Number(formatTo2Decimals(latestTotalAmount)),
//       payments: formatted,
//     });
//   } catch (err) {
//     console.error("Error in getPaymentHistory:", err);
//     res.status(500).json({ error: "Server error." });
//   }
// };

// {"working code ends"}


// exports.getPaymentHistory = async (req, res) => {
//   try {
//     const { mobile } = req.body;
//     if (!mobile) {
//       return res.status(400).json({ error: "Mobile is required." });
//     }

//     const Payment = require("../models/Payment");

//     // Fetch all payments for display (both where mobile is the number OR others is the number)
//     const payments = await Payment.find({
//       $or: [{ mobile }, { others: mobile }],
//     }).sort({ timestamp: -1 });

//     // Find the latest confirmed payment
//     const latestConfirmedPayment = payments.find(p => p.status === "Payment Confirmed");
//     const latestTotalAmount = latestConfirmedPayment ? latestConfirmedPayment.totalAmount || 0 : 0;
//     const latestTotalGrams = latestConfirmedPayment ? latestConfirmedPayment.totalGrams || 0 : 0;

//     const formatted = payments.map((p) => ({
//       ...p._doc,
//       gold: p.gold || 0,
//       // totalAmount: p.status === "Payment Confirmed" ? Number(formatTo2Decimals(p.totalAmount || 0)) : 0,
//       // totalGrams: Number(formatTo3Decimals(p.totalGrams || 0)),
//       totalWithTax: p.totalWithTax !== undefined
//         ? Number(p.totalWithTax)
//         : Number(p.amount || 0) + Number(p.taxAmount || 0) + Number(p.deliveryCharge || 0),
//       timestamp: p.timestamp
//         ? new Date(p.timestamp).toLocaleString("en-IN", {
//             timeZone: "Asia/Kolkata",
//           })
//         : null,
//     }));

//     // Return both totalAmount and totalGrams from the latest confirmed payment
//     res.json({
//       totalAmount: Number(formatTo2Decimals(latestTotalAmount)),
//       totalGrams: Number(formatTo3Decimals(latestTotalGrams)),
//       payments: formatted,
//     });
//   } catch (err) {
//     console.error("Error in getPaymentHistory:", err);
//     res.status(500).json({ error: "Server error." });
//   }
// };

exports.getPaymentHistory = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) {
      return res.status(400).json({ error: "Mobile is required." });
    }

    const Payment = require("../models/Payment");

    // Get all payments for this mobile
    const payments = await Payment.find({ mobile }).sort({ createdAt: -1 });

    // Find the latest confirmed payment for totals
    const latestConfirmed = payments.find(p => p.status === "Payment Confirmed");

    const latestTotalAmount = latestConfirmed ? Number(latestConfirmed.totalAmount || 0) : 0;
    const latestTotalGrams = latestConfirmed ? Number(latestConfirmed.totalGrams || 0) : 0;

    // Format payments with IST timestamp
    const formatted = payments.map((p) => ({
      ...p._doc,
      timestamp: p.updatedAt
        ? new Date(p.updatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
        : null,
      totalAmount: Number(p.totalAmount || 0),
      totalGrams: Number(p.totalGrams || 0),
    }));

    res.json({
      totalAmount: latestTotalAmount,
      totalGrams: latestTotalGrams,
      payments: formatted,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
};

// Approve payment by ObjectId

// exports.approvePayment = async (req, res) => {
//   try {
//     const { id } = req.body;
//     if (!id) {
//       return res.status(400).json({ error: "Payment id is required." });
//     }
//     let payment = await Payment.findOne({
//       _id: id,
//       status: { $in: ["Payment Confirmation Pending", "Payment Cancelled"] },
//     });
//     if (!payment) {
//       return res
//         .status(404)
//         .json({ error: "No pending payment found for this id." });
//     }
//     // Allocate gold on approval
//     const GoldPrice = require("../models/GoldPrice");
//     const lastRate = await GoldPrice.findOne().sort({ timestamp: -1 });
//     if (!lastRate || !lastRate.price_gram_24k) {
//       return res
//         .status(500)
//         .json({ error: "Current gold rate not available." });
//     }
//     const goldRate = lastRate.price_gram_24k;
//     const goldAllocated = parseFloat((payment.amount / goldRate).toFixed(4));
//     payment.gold = goldAllocated;
//     payment.status = "Payment Confirmed";
//     await payment.save();
//     // Format timestamp to IST (Asia/Kolkata)
//     // const istTimestamp = payment.timestamp
//     //   ? new Date(payment.timestamp).toLocaleString("en-IN", {
//     //       timeZone: "Asia/Kolkata",
//     //     })
//     //   : null;
//     const istTimestamp = payment.updatedAt
//       ? new Date(payment.updatedAt).toLocaleString("en-IN", {
//           timeZone: "Asia/Kolkata",
//         })
//       : null;

//     res.json({
//       message: "Payment Approved",
//       payment: {
//         ...payment._doc,
//         gold: payment.gold || 0,
//         timestamp: istTimestamp,
//       },
//     });
//   } catch (err) {
//     res.status(500).json({ error: "Server error." });
//   }
// };
{}
// exports.approvePayment = async (req, res) => {
//   try {
//     const { id } = req.body;
//     if (!id) {
//       return res.status(400).json({ error: "Payment id is required." });
//     }
//     let payment = await Payment.findOne({
//       _id: id,
//       status: { $in: ["Payment Confirmation Pending", "Payment Cancelled"] },
//     });
//     if (!payment) {
//       return res
//         .status(404)
//         .json({ error: "No pending payment found for this id." });
//     }
//     // Allocate gold on approval
//     const GoldPrice = require("../models/GoldPrice");
//     const lastRate = await GoldPrice.findOne().sort({ timestamp: -1 });
//     if (!lastRate || !lastRate.price_gram_24k) {
//       return res
//         .status(500)
//         .json({ error: "Current gold rate not available." });
//     }
//     const goldRate = lastRate.price_gram_24k;
//     const goldAllocated = parseFloat((payment.amount / goldRate).toFixed(4));
//     payment.gold = goldAllocated;
//     payment.status = "Payment Confirmed";
    
//     // Recalculate running totalAmount including this payment and all previous confirmed payments
//     try {
//       // Get the previous confirmed payment's totalAmount
//       const previousConfirmed = await Payment.findOne({
//         mobile: payment.mobile,
//         status: "Payment Confirmed",
//         _id: { $ne: payment._id }
//       }).sort({ createdAt: -1 });

//       // Get previous totalAmount (or 0 if no previous payment)
//       const previousTotal = previousConfirmed ? Number(previousConfirmed.totalAmount || 0) : 0;
      
//       // Calculate current payment's amount (regular or allocated)
//       const currentAmount = Number(payment.amount || 0);
//       const currentAllocatedAmount = Number(payment.amount_allocated || 0);
//       const paymentAmount = currentAmount > 0 ? currentAmount : currentAllocatedAmount;
      
//       // New total is previous total plus current payment
//       payment.totalAmount = Number(formatTo2Decimals(previousTotal + paymentAmount));
        
//     } catch (e) {
//       // If something goes wrong computing totals, still save payment with its own amount as totalAmount
//       console.error("Failed to compute totalAmount:", e.message);
//       payment.totalAmount = Number(payment.amount || 0);
//     }

//     await payment.save();
//     // Format timestamp to IST (Asia/Kolkata)
//     // const istTimestamp = payment.timestamp
//     //   ? new Date(payment.timestamp).toLocaleString("en-IN", {
//     //       timeZone: "Asia/Kolkata",
//     //     })
//     //   : null;
//     const istTimestamp = payment.updatedAt
//       ? new Date(payment.updatedAt).toLocaleString("en-IN", {
//           timeZone: "Asia/Kolkata",
//         })
//       : null;

//     res.json({
//       message: "Payment Approved",
//       payment: {
//         ...payment._doc,
//         gold: payment.gold || 0,
//         // Return stored totals (if present) formatted
//         totalAmount:
//           payment.totalAmount !== undefined
//             ? Number(formatTo2Decimals(payment.totalAmount))
//             : 0,
//         totalGrams:
//           payment.totalGrams !== undefined
//             ? Number(formatTo3Decimals(payment.totalGrams))
//             : undefined,
//         timestamp: istTimestamp,
//       },
//     });
//   } catch (err) {
//     res.status(500).json({ error: "Server error." });
//   }
// };
{}

exports.approvePayment = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Payment id is required." });
    }
    let payment = await Payment.findOne({
      _id: id,
      status: { $in: ["Payment Confirmation Pending", "Payment Cancelled"] },
    });
    if (!payment) {
      return res
        .status(404)
        .json({ error: "No pending payment found for this id." });
    }
    // Allocate gold on approval
    const GoldPrice = require("../models/GoldPrice");
    const lastRate = await GoldPrice.findOne().sort({ timestamp: -1 });
    if (!lastRate || !lastRate.price_gram_24k) {
      return res
        .status(500)
        .json({ error: "Current gold rate not available." });
    }
    const goldRate = lastRate.price_gram_24k;
    const goldAllocated = parseFloat((payment.amount / goldRate).toFixed(4));
    payment.gold = goldAllocated;
    payment.status = "Payment Confirmed";
    
    // Recalculate running totalAmount and totalGrams including this payment and all previous confirmed payments
    try {
      // Get the previous confirmed payment's totalAmount and totalGrams
      const previousConfirmed = await Payment.findOne({
        mobile: payment.mobile,
        status: "Payment Confirmed",
        _id: { $ne: payment._id }
      }).sort({ createdAt: -1 });

      // Get previous totals (or 0 if no previous payment)
      const previousTotal = previousConfirmed ? Number(previousConfirmed.totalAmount || 0) : 0;
      const previousTotalGrams = previousConfirmed ? Number(previousConfirmed.totalGrams || 0) : 0;
      
      // Calculate current payment's amount (regular or allocated)
      const currentAmount = Number(payment.amount || 0);
      const currentAllocatedAmount = Number(payment.amount_allocated || 0);
      const paymentAmount = currentAmount > 0 ? currentAmount : currentAllocatedAmount;
      
      // Calculate current payment's grams (regular + allocated)
      const currentGram = Number(payment.gram || 0);
      const currentGramAllocated = Number(payment.gram_allocated || 0);
      const paymentGrams = currentGram + currentGramAllocated;
      
      // New totals are previous totals plus current payment
      payment.totalAmount = Number(formatTo2Decimals(previousTotal + paymentAmount));
      payment.totalGrams = Number(formatTo3Decimals(previousTotalGrams + paymentGrams));
          const totalWithTax = Number(payment.amount || 0) + Number(payment.taxAmount || 0) + Number(payment.deliveryCharge || 0);
    res.json({
      message: "Payment Approved",
      payment: {
        ...payment._doc,
        gold: payment.gold || 0,
        totalAmount:
          payment.totalAmount !== undefined
            ? Number(formatTo2Decimals(payment.totalAmount))
            : 0,
        totalGrams:
          payment.totalGrams !== undefined
            ? Number(formatTo3Decimals(payment.totalGrams))
            : undefined,
        totalWithTax: totalWithTax,
        
      },
    });  
    } catch (e) {
      // If something goes wrong computing totals, still save payment with its own values
      console.error("Failed to compute totals:", e.message);
      payment.totalAmount = Number(payment.amount || 0);
      payment.totalGrams = Number((payment.gram || 0) + (payment.gram_allocated || 0));
    }

    await payment.save();
    // Format timestamp to IST (Asia/Kolkata)
    // const istTimestamp = payment.timestamp
    //   ? new Date(payment.timestamp).toLocaleString("en-IN", {
    //       timeZone: "Asia/Kolkata",
    //     })
    //   : null;
    const istTimestamp = payment.updatedAt
      ? new Date(payment.updatedAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })
      : null;

    // Calculate totalWithTax for response
    // const totalWithTax = Number(payment.amount || 0) + Number(payment.taxAmount || 0) + Number(payment.deliveryCharge || 0);
    // res.json({
    //   message: "Payment Approved",
    //   payment: {
    //     ...payment._doc,
    //     gold: payment.gold || 0,
    //     totalAmount:
    //       payment.totalAmount !== undefined
    //         ? Number(formatTo2Decimals(payment.totalAmount))
    //         : 0,
    //     totalGrams:
    //       payment.totalGrams !== undefined
    //         ? Number(formatTo3Decimals(payment.totalGrams))
    //         : undefined,
    //     totalWithTax: totalWithTax,
    //     timestamp: istTimestamp,
    //   },
    // });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
};



const Payment = require("../models/Payment");
{} 

// status: "Payment Confirmation Pending" get all pending payments
// exports.getAllPayments = async (req, res) => {
//   try {
//     const Payment = require("../models/Payment");
//     const Allotment = require("../models/Allotment");

//     const payments = await Payment.aggregate([
//       // Add filter for pending status only
//       { $match: { status: "Payment Confirmation Pending" } },
//       { $sort: { timestamp: -1 } },
//       {
//         $lookup: {
//           from: "users",
//           localField: "mobile",
//           foreignField: "mobile",
//           as: "user",
//         },
//       },
//       {
//         $addFields: {
//           name: { $arrayElemAt: ["$user.name", 0] },
//         },
//       },
//       { $project: { user: 0 } },
//     ]);

//     // enrich with totals per mobile
//     const enriched = [];
//     for (const p of payments) {
//       const mobile = p.mobile;

//       // fetch all payments for this mobile
//       const userPayments = await Payment.find({
//         mobile,
//         status: "Payment Confirmed",
//       });
//       const totalAmountRaw = userPayments.reduce(
//         (sum, x) => sum + (x.amount || 0),
//         0
//       );
//       const totalGramsRaw = userPayments.reduce(
//         (sum, x) => sum + (x.gram || 0) + (x.gram_allocated || 0),
//         0
//       );

//       const allotments = await Allotment.find({ mobile });
//       const totalAllotted = allotments.reduce(
//         (sum, a) => sum + (a.gram || 0),
//         0
//       );

//       const totalGrams = totalGramsRaw - totalAllotted;

//       // proportional adjustment
//       const totalAmount =
//         totalGramsRaw > 0
//           ? Number(((totalAmountRaw * totalGrams) / totalGramsRaw).toFixed(2))
//           : 0;

//       enriched.push({
//         ...p,
//         totalAllotted,
//         // totalAmountRaw,
//         // totalGramsRaw,
//         totalGrams: Number(totalGrams.toFixed(3)),
//         totalAmount,
//         gold: p.gold || 0,
//       });
//     }

//     // Format all payment timestamps to IST
//     res.json(
//       enriched.map((p) => ({
//         ...p,
//         timestamp: p.timestamp
//           ? new Date(p.timestamp).toLocaleString("en-IN", {
//               timeZone: "Asia/Kolkata",
//             })
//           : null,
//       }))
//     );
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Server error." });
//   }
// };

exports.getAllPayments = async (req, res) => {
  try {
    const Payment = require("../models/Payment");
    const Allotment = require("../models/Allotment");

    const payments = await Payment.aggregate([
      { $match: { status: "Payment Confirmation Pending" } },
      { $sort: { timestamp: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "mobile",
          foreignField: "mobile",
          as: "user",
        },
      },
      {
        $addFields: {
          name: { $arrayElemAt: ["$user.name", 0] },
        },
      },
      { $project: { user: 0 } },
    ]);

    const enriched = [];
    for (const p of payments) {
      const mobile = p.mobile;

      // fetch confirmed payments
      const userPayments = await Payment.find({
        mobile,
        status: "Payment Confirmed",
      });

      const totalAmountRaw = userPayments.reduce(
        (sum, x) => sum + (x.amount || 0),
        0
      );
      const totalGramsRaw = userPayments.reduce(
        (sum, x) => sum + (x.gram || 0) + (x.gram_allocated || 0),
        0
      );

      const allotments = await Allotment.find({ mobile });
      const totalAllottedRaw = allotments.reduce(
        (sum, a) => sum + (a.gram || 0),
        0
      );

      const totalGrams = totalGramsRaw - totalAllottedRaw;

      // proportional adjustment (2 decimals for money is enough)
      const totalAmount =
        totalGramsRaw > 0
          ? Number(((totalAmountRaw * totalGrams) / totalGramsRaw).toFixed(2))
          : 0;

      enriched.push({
        ...p,
        totalAllotted: Number(formatTo3Decimals(totalAllottedRaw)), // ✅ truncated
        totalGrams: Number(formatTo3Decimals(totalGrams)), // ✅ truncated
        totalAmount,
        gold: p.gold || 0,
      });
    }

    res.json(
      enriched.map((p) => ({
        ...p,
        totalWithTax: p.totalWithTax !== undefined
          ? Number(p.totalWithTax)
          : Number(p.amount || 0) + Number(p.taxAmount || 0) + Number(p.deliveryCharge || 0),
        timestamp: p.timestamp
          ? new Date(p.timestamp).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
            })
          : null,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
};

// helper: truncate to 3 decimals, keep as number
function formatTo3Decimals(num) {
  if (num == null) return 0;
  return Math.floor(Number(num) * 1000) / 1000;
}

exports.convertGramToAmount = async (req, res) => {
  const { grams } = req.body;
  if (!grams || isNaN(grams)) {
    return res
      .status(400)
      .json({ error: "Grams is required and must be a number." });
  }
  try {
    const lastRate = await GoldPrice.findOne().sort({ timestamp: -1 });
    if (!lastRate || !lastRate.price_gram_24k) {
      return res
        .status(500)
        .json({ error: "Current gold rate not available." });
    }
    const goldRate = lastRate.price_gram_24k;
    const amount = parseFloat((grams * goldRate).toFixed(2));
    res.json({ grams, goldRate, amount });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
};

exports.convertGramToAmount = async (req, res) => {
  const { grams } = req.body;
  if (!grams || isNaN(grams)) {
    return res
      .status(400)
      .json({ error: "Grams is required and must be a number." });
  }
  try {
    const lastRate = await GoldPrice.findOne().sort({ timestamp: -1 });
    if (!lastRate || !lastRate.price_gram_24k) {
      return res
        .status(500)
        .json({ error: "Current gold rate not available." });
    }
    const goldRate = lastRate.price_gram_24k;
    const amount = parseFloat((grams * goldRate).toFixed(2));
    res.json({ grams, goldRate, amount });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
};

// exports.mobilePayment = async (req, res) => {
//   try {
//     const {
//       mobile,
//       others,
//       amount = 0,
//       gram_allocated = 0,
//       gram = 0,
//       amount_allocated = 0,
//       taxAmount=0,
//       deliveryCharge = 0,
//       totalWithTax=0
//     } = req.body;

//     if (!mobile) {
//       return res.status(400).json({ error: "Mobile is required." });
//     }

//     // Validate mobile user
//     const User = require("../models/User");
//     const mobileUser = await User.findOne({ mobile });
//     if (!mobileUser) {
//       return res.status(400).json({
//         error: `Mobile number ${mobile} does not exist. Please register mobile first.`,
//       });
//     }

//     const Payment = require("../models/Payment");

//     // ✅ Normalize amount
//     let effectiveAmount = Number(amount);
//     if (effectiveAmount === 0 && gram > 0) {
//       // If payment is given in grams, fallback to amount_allocated
//       effectiveAmount = Number(amount_allocated) || 0;
//     }

//     // Always store under the main mobile
//     let paymentData = {
//       mobile,
//       others: others || "",
//       amount: effectiveAmount, // ✅ always have a usable amount
//       gram_allocated,
//       gram,
//       amount_allocated,
//       status: "Payment Confirmation Pending",
//       taxAmount,
//       deliveryCharge,
//       totalWithTax,
//       // timestamp: new Date(),
//       paid_by: req.user?.mobile,
//     };

//     // Calculate running total for this mobile
//     const previousPayments = await Payment.find({ mobile });
//     const runningTotal =
//       previousPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0) +
//       Number(effectiveAmount || 0);

//     paymentData.totalAmount = runningTotal;

//     const payment = new Payment(paymentData);
//     await payment.save();

//     // Format timestamp to IST (Asia/Kolkata)
//     // const istTimestamp = new Date(payment.timestamp).toLocaleString("en-IN", {
//     //   timeZone: "Asia/Kolkata",
//     // });
//     const istTimestamp = payment.createdAt
//       ? new Date(payment.createdAt).toLocaleString("en-IN", {
//           timeZone: "Asia/Kolkata",
//         })
//       : null;

//     res.status(201).json({
//       mobile: payment.mobile,
//       others: payment.others,
//       amount: payment.amount,
//       totalAmount: paymentData.totalAmount,
//       timestamp: istTimestamp,
//       status: payment.status,
//       taxAmount:payment.taxAmount,
//       deliveryCharge:payment.deliveryCharge,
//       totalWithTax:payment.totalAmount,
//       gram: payment.gram,
//       amount_allocated: payment.amount_allocated,
//       gram_allocated: payment.gram_allocated,
//       _id: payment._id,
//     });
//   } catch (err) {
//     console.error("Error in mobilePayment:", err);
//     res.status(500).json({ error: "Server error." });
//   }
// };

// ✅ Truncate to 3 decimals and pad with zeros

function formatTo3Decimals(num) {
  if (num == null) return "0.000";
  const truncated = Math.floor(Number(num) * 1000) / 1000;
  return truncated.toFixed(3); // ensures padding
}
function formatTo2Decimals(num) {
  if (num == null) return "0.00";
  const truncated = Math.floor(Number(num) * 100) / 100;
  return truncated.toFixed(2); // ensures padding
}
// exports.mobilePayment = async (req, res) => {
//   try {
//     const {
//       mobile,
//       others,
//       amount = 0,
//       gram_allocated = 0,
//       gram = 0,
//       amount_allocated = 0,
//     } = req.body;

//     if (!mobile) {
//       return res.status(400).json({ error: "Mobile is required." });
//     }

//     // Validate mobile user
//     const User = require("../models/User");
//     const mobileUser = await User.findOne({ mobile });
//     if (!mobileUser) {
//       return res.status(400).json({
//         error: `Mobile number ${mobile} does not exist. Please register mobile first.`,
//       });
//     }

//     const Payment = require("../models/Payment");

//     // ✅ Normalize amount
//     let effectiveAmount = Number(amount);
//     let effectiveAmountAllocated = 0;
    
//     // Only use amount_allocated if we have gram but no amount
//     if (effectiveAmount === 0 && gram > 0) {
//       effectiveAmount = 0;
//       effectiveAmountAllocated = Number(amount_allocated) || 0;
//     }

//     // ✅ Apply 3-decimal formatting
//     effectiveAmount = Number(formatTo3Decimals(effectiveAmount));

//     let paymentData = {
//       mobile,
//       others: others || "",
//       amount: effectiveAmount,
//       gram_allocated: Number(formatTo3Decimals(gram_allocated)),
//       gram: Number(formatTo3Decimals(gram)),
//       amount_allocated: Number(formatTo2Decimals(effectiveAmountAllocated)), // Only use allocated amount for gram-based payments
//       status: "Payment Confirmation Pending",
//       paid_by: req.user?.mobile,
//     };

//     const payment = new Payment(paymentData);
//     await payment.save();

//     // Format IST timestamp
//     const istTimestamp = payment.createdAt
//       ? new Date(payment.createdAt).toLocaleString("en-IN", {
//           timeZone: "Asia/Kolkata",
//         })
//       : null;

//     // res.status(201).json({
//     //   mobile: payment.mobile,
//     //   others: payment.others,
//     //   amount: formatTo2Decimals(payment.amount),
//     //   totalAmount: formatTo2Decimals(paymentData.totalAmount),
//     //   timestamp: istTimestamp,
//     //   status: payment.status,
//     //   gram: formatTo3Decimals(payment.gram),
//     //   amount_allocated: formatTo2Decimals(payment.amount_allocated),
//     //   gram_allocated: formatTo3Decimals(payment.gram_allocated),
//     //   _id: payment._id,
//     // });
//     res.status(201).json({
//       mobile: payment.mobile,
//       others: payment.others,
//       amount: Number(formatTo2Decimals(payment.amount)), // ✅ number
//       timestamp: istTimestamp,
//       status: payment.status,
//       gram: Number(formatTo3Decimals(payment.gram)), // ✅ number
//       amount_allocated: Number(formatTo2Decimals(payment.amount_allocated)), // ✅ number
//       gram_allocated: Number(formatTo3Decimals(payment.gram_allocated)), // ✅ number
//       _id: payment._id,
//     });

//   } catch (err) {
//     console.error("Error in mobilePayment:", err);
//     res.status(500).json({ error: "Server error." });
//   }
// };


exports.mobilePayment = async (req, res) => {
  try {
    const {
      mobile,
      others,
      amount = 0,
      gram_allocated = 0,
      gram = 0,
      amount_allocated = 0,
      taxAmount = 0,
      deliveryCharge = 0
    } = req.body;

    if (!mobile) {
      return res.status(400).json({ error: "Mobile is required." });
    }

    // Validate mobile user
    const User = require("../models/User");
    const mobileUser = await User.findOne({ mobile });
    if (!mobileUser) {
      return res.status(400).json({
        error: `Mobile number ${mobile} does not exist. Please register mobile first.`,
      });
    }

    const Payment = require("../models/Payment");

    // ✅ Normalize amount
    let effectiveAmount = Number(amount);
    if (effectiveAmount === 0 && gram > 0) {
      // If payment is given in grams, fallback to amount_allocated
      effectiveAmount = Number(amount_allocated) || 0;
    }

    // Calculate totalWithTax (amount + taxAmount + deliveryCharge)
    const totalWithTax = Number(effectiveAmount) + Number(taxAmount) + Number(deliveryCharge);

    // Always store under the main mobile
    let paymentData = {
      mobile,
      others: others || "",
      amount: effectiveAmount, // ✅ always have a usable amount
      gram_allocated,
      gram,
      amount_allocated,
      status: "Payment Confirmation Pending",
      taxAmount,
      deliveryCharge,
      totalWithTax,
      // timestamp: new Date(),
      paid_by: req.user?.mobile,
    };

    // Calculate running total for this mobile
    const previousPayments = await Payment.find({ mobile });
    const runningTotal =
      previousPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0) +
      Number(effectiveAmount || 0);

    paymentData.totalAmount = runningTotal;

    const payment = new Payment(paymentData);
    await payment.save();

    // Format timestamp to IST (Asia/Kolkata)
    const istTimestamp = payment.createdAt
      ? new Date(payment.createdAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })
      : null;

    res.status(201).json({
      mobile: payment.mobile,
      others: payment.others,
      amount: payment.amount,
      totalAmount: paymentData.totalAmount,
      timestamp: istTimestamp,
      status: payment.status,
      taxAmount: payment.taxAmount,
      deliveryCharge: payment.deliveryCharge,
        totalWithTax: totalWithTax,
      gram: payment.gram,
      amount_allocated: payment.amount_allocated,
      gram_allocated: payment.gram_allocated,
      _id: payment._id,
    });
  } catch (err) {
    console.error("Error in mobilePayment:", err);
    res.status(500).json({ error: "Server error." });
  }
};

