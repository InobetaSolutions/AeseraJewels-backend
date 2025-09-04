// Get allotment history for a mobile number
// exports.getByUserAllotment = async (req, res) => {
//   try {
//     const { mobile } = req.query;
//     if (!mobile) {
//       return res.status(400).json({ error: 'Mobile is required.' });
//     }
//     const Allotment = require('../models/Allotment');
//     const allotments = await Allotment.find({ mobile }).sort({ timestamp: -1 });
//     // Calculate total grams and amount for this user
//     const payments = await Payment.find({ mobile });
//     const totalAmountRaw = payments.reduce((sum, p) => sum + (p.amount || 0) + (p.amount_allocated || 0), 0);
//     const totalGramsRaw = payments.reduce((sum, p) => sum + (p.gram || 0) + (p.gram_allocated || 0), 0);
//     console.log('Total Amount Raw:', totalAmountRaw, 'Total Grams Raw:', totalGramsRaw);
//     // For each allotment, calculate proportional amount reduced
//     const allotmentsWithAmount = allotments.map(a => {
//       let amountReduced = 0;
//       if (totalGramsRaw > 0) {
//         amountReduced = (totalAmountRaw * a.gram) / totalGramsRaw;
//       }
//       return { ...a._doc, amountReduced: amountReduced.toFixed(2) };
//     });
//     res.json({ mobile, allotments: allotmentsWithAmount });
//   } catch (err) {
//     res.status(500).json({ error: "Server error." });
//   }
// };
exports.getByUserAllotment = async (req, res) => {
  try {
    const { mobile } = req.query;
    if (!mobile) {
      return res.status(400).json({ error: "Mobile is required." });
    }

    const Allotment = require("../models/Allotment");
    const allotments = await Allotment.find({ mobile }).sort({ timestamp: -1 });

    // Get payments of this mobile
    const payments = await Payment.find({ mobile });

    // Only use real deposited amount
    const totalAmountRaw = payments.reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    );

    // But grams include both direct grams and allocated grams
    const totalGramsRaw = payments.reduce(
      (sum, p) => sum + (p.gram || 0) + (p.gram_allocated || 0),
      0
    );

    // For each allotment, calculate proportional reduced amount
    const allotmentsWithAmount = allotments.map((a) => {
      let amountReduced = 0;
      if (totalGramsRaw > 0) {
        amountReduced = (totalAmountRaw * a.gram) / totalGramsRaw;
      }
      return {
        ...a._doc,
        amountReduced: Number(amountReduced.toFixed(2)),
      };
    });

    res.json({ mobile, allotments: allotmentsWithAmount });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
};

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
    // const payments2 = await Payment.find({ mobile });
    // console.log("Payments for mobile:", mobile, payments2);
    //     // ✅ Only consider Approved payments
    const payments = await Payment.find({ mobile, status: "Approved" });
    if (payments.length === 0) {
      return res
        .status(400)
        .json({ error: "No approved payments found for this mobile." });
    }
    // console.log("Payments for mobile:", mobile, payments);

    // Get total grams available after previous allotments
    // const payments = await Payment.find({ mobile });
    const totalGramsRaw = payments.reduce(
      (sum, p) => sum + (p.gram || 0) + (p.gram_allocated || 0),
      0
    );
    const allotments = await Allotment.find({ mobile });
    const totalAllotted = allotments.reduce((sum, a) => sum + (a.gram || 0), 0);
    const totalGramsAvailable = totalGramsRaw - totalAllotted;

    if (gram > totalGramsAvailable) {
      return res.status(400).json({ error: "Not enough grams to allot." });
    }

    // Record the allotment
    await Allotment.create({ mobile, gram });

    // Calculate new totals after allotment
    const updatedPayments = await Payment.find({ mobile });

    // Only sum real deposited amounts (ignore amount_allocated)
    const totalAmountRaw = updatedPayments.reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    );

    const totalGramsRaw2 = updatedPayments.reduce(
      (sum, p) => sum + (p.gram || 0) + (p.gram_allocated || 0),
      0
    );
    const allotments2 = await Allotment.find({ mobile });
    const totalAllotted2 = allotments2.reduce(
      (sum, a) => sum + (a.gram || 0),
      0
    );

    const totalGrams2 = totalGramsRaw2 - totalAllotted2;

    // Proportional remaining amount
    const totalAmount2 =
      totalGramsRaw2 > 0 ? (totalAmountRaw * totalGrams2) / totalGramsRaw2 : 0;

    return res.json({
      message: "Allotment recorded",
      mobile,
      gram,
      totalGrams: Number(totalGrams2.toFixed(3)),
      totalAmount: Number(totalAmount2.toFixed(2)),
    });
  } catch (err) {
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
    const allotments = await Allotment.find({ mobile }).sort({ timestamp: -1 });

    // Get payments of this mobile
    const payments = await Payment.find({ mobile });

    // Only use real deposited amount
    const totalAmountRaw = payments.reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    );

    // But grams include both direct grams and allocated grams
    const totalGramsRaw = payments.reduce(
      (sum, p) => sum + (p.gram || 0) + (p.gram_allocated || 0),
      0
    );

    // For each allotment, calculate proportional reduced amount
    const allotmentsWithAmount = allotments.map((a) => {
      let amountReduced = 0;
      if (totalGramsRaw > 0) {
        amountReduced = (totalAmountRaw * a.gram) / totalGramsRaw;
      }
      return {
        ...a._doc,
        amountReduced: Number(amountReduced.toFixed(2)),
      };
    });

    res.json({ mobile, allotments: allotmentsWithAmount });
  } catch (err) {
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

// exports.getPaymentHistory = async (req, res) => {
//   try {
//     const { mobile } = req.body;
//     if (!mobile) {
//       return res.status(400).json({ error: "Mobile is required." });
//     }
//     const payments = await Payment.find({ mobile }).sort({ timestamp: -1 });
//     // const totalAmountRaw = payments.reduce((sum, p) => sum + (p.amount || 0) + (p.amount_allocated || 0), 0);
//     const totalAmountRaw = payments.reduce(
//       (sum, p) => sum + (p.amount || 0),
//       0
//     );

//     const totalGramsRaw = payments.reduce(
//       (sum, p) => sum + (p.gram || 0) + (p.gram_allocated || 0),
//       0
//     );
//     // Subtract allotted grams
//     const Allotment = require("../models/Allotment");
//     const allotments = await Allotment.find({ mobile });
//     const totalAllotted = allotments.reduce((sum, a) => sum + (a.gram || 0), 0);
//     const totalGrams = totalGramsRaw - totalAllotted;
//     // Proportionally reduce totalAmount
//     const totalAmount =
//       totalGramsRaw > 0 ? (totalAmountRaw * totalGrams) / totalGramsRaw : 0;
//     const formatted = payments.map((p) => ({ ...p._doc, gold: p.gold || 0 }));
//     res.json({ totalAmount, totalGrams, payments: formatted });
//   } catch (err) {
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

    // Fetch both where mobile is the number OR others is the number
    const payments = await Payment.find({
      $or: [{ mobile }, { others: mobile }],
    }).sort({ timestamp: -1 });

    // Raw totals (include both direct + others)
    const totalAmountRaw = payments.reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    );

    const totalGramsRaw = payments.reduce(
      (sum, p) => sum + (p.gram || 0) + (p.gram_allocated || 0),
      0
    );

    // Subtract allotments
    const Allotment = require("../models/Allotment");
    const allotments = await Allotment.find({ mobile });
    const totalAllotted = allotments.reduce((sum, a) => sum + (a.gram || 0), 0);

    const totalGrams = totalGramsRaw - totalAllotted;

    // Proportionally adjust amount
    const totalAmount =
      totalGramsRaw > 0 ? (totalAmountRaw * totalGrams) / totalGramsRaw : 0;

    const formatted = payments.map((p) => ({
      ...p._doc,
      gold: p.gold || 0,
    }));

    res.json({ totalAmount, totalGrams, payments: formatted });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
};

// Approve payment by ObjectId

exports.approvePayment = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Payment id is required." });
    }
    let payment = await Payment.findOne({ _id: id, status: "Pending" });
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
    payment.status = "Approved";
    await payment.save();
    res.json({
      message: "Payment Approved",
      payment: { ...payment._doc, gold: payment.gold || 0 },
    });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
};
const Payment = require("../models/Payment");

// Create a new payment
// exports.createPayment = async (req, res) => {
//   try {
//     const { mobile, amount } = req.body;
//     if (!mobile || !amount) {
//       return res.status(400).json({ error: "Mobile and amount are required." });
//     }
//     // Get current gold rate (price per gram)
//     const GoldPrice = require("../models/GoldPrice");
//     const lastRate = await GoldPrice.findOne().sort({ timestamp: -1 });
//     if (!lastRate || !lastRate.price_gram_24k) {
//       return res
//         .status(500)
//         .json({ error: "Current gold rate not available." });
//     }
//     const goldRate = lastRate.price_gram_24k;
//     // Calculate gold allocated
//     const goldAllocated = parseFloat((amount / goldRate).toFixed(4));
//     // Calculate running total for this mobile
//     const previousPayments = await Payment.find({ mobile });
//     const runningTotal =
//       previousPayments.reduce((sum, p) => sum + (p.amount || 0), 0) +
//       Number(amount);
//     const payment = new Payment({
//       mobile,
//       amount,
//       gold: goldAllocated,
//       totalAmount: runningTotal,
//     });
//     await payment.save();
//     res.status(201).json(payment);
//   } catch (err) {
//     res.status(500).json({ error: "Server error." });
//   }
// };

// exports.getAllPayments = async (req, res) => {
//   try {
//     const payments = await Payment.aggregate([
//       { $sort: { timestamp: -1 } },
//       {
//         $lookup: {
//           from: "users", // collection name in MongoDB (lowercase + plural)
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
//       { $project: { user: 0 } }, // hide user array
//     ]);

//     res.json(payments.map((p) => ({ ...p, gold: p.gold || 0 })));
//   } catch (err) {
//     res.status(500).json({ error: "Server error." });
//   }
// };
{}
exports.getAllPayments = async (req, res) => {
  try {
    const Payment = require("../models/Payment");
    const Allotment = require("../models/Allotment");

    const payments = await Payment.aggregate([
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

    // enrich with totals per mobile
    const enriched = [];
    for (const p of payments) {
      const mobile = p.mobile;

      // fetch all payments for this mobile
      const userPayments = await Payment.find({ mobile, status: "Approved" });
      const totalAmountRaw = userPayments.reduce(
        (sum, x) => sum + (x.amount || 0),
        0
      );
      const totalGramsRaw = userPayments.reduce(
        (sum, x) => sum + (x.gram || 0) + (x.gram_allocated || 0),
        0
      );

      const allotments = await Allotment.find({ mobile });
      const totalAllotted = allotments.reduce(
        (sum, a) => sum + (a.gram || 0),
        0
      );

      const totalGrams = totalGramsRaw - totalAllotted;

      // proportional adjustment
      const totalAmount =
        totalGramsRaw > 0
          ? Number(((totalAmountRaw * totalGrams) / totalGramsRaw).toFixed(2))
          : 0;

      enriched.push({
        ...p,
        totalAllotted,
        // totalAmountRaw,
        // totalGramsRaw,
        totalGrams: Number(totalGrams.toFixed(3)),
        totalAmount,
        gold: p.gold || 0,
      });
    }

    res.json(enriched);
  } catch (err) {
    console.error(err);
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
//     const { mobile, others, amount, gram_allocated, gram, amount_allocated } =
//       req.body;
//     if (!mobile) {
//       return res.status(400).json({ error: "Mobile is required." });
//     }
//     // Check if both mobile and others (if provided) exist in User collection
//     const User = require("../models/User");
//     const mobileUser = await User.findOne({ mobile });
//     if (!mobileUser) {
//       return res.status(400).json({
//         error: `Mobile number ${mobile} does not exist.Please Register Mobile First`,
//       });
//     }
//     let othersUser = null;
//     // if (others && others.trim() !== "") {
//     // othersUser = await User.findOne({ mobile: others });
//     // if (!othersUser) {
//     //   return res
//     //     .status(400)
//     //     .json({
//     //       error: `Others number ${others} does not exist.Please Register Mobile First`,
//     //     });
//     // }
//     // }
//     // If 'others' is provided and not empty, store payment under 'others' as mobile
//     const storeMobile = others && others.trim() !== "" ? others : mobile;
//     const target = storeMobile;
//     let paymentData = {
//       mobile: storeMobile, // store under 'others' if provided, else 'mobile'
//       others,
//       target, // for whom the payment is tracked
//       amount,
//       gram_allocated,
//       gram,
//       amount_allocated,
//       status: "Pending",
//       timestamp: new Date(),
//       paid_by: req.user?.mobile,
//     };
//     // If 'others' is provided and not empty, store payment under 'others' as target

//     // Calculate running total for the storage mobile
//     const Payment = require("../models/Payment");
//     const previousPayments = await Payment.find({ mobile: storeMobile });
//     //  const runningTotal =
//     //     previousPayments.reduce((sum, p) => sum + (p.amount || 0), 0) +
//     //     Number(amount || 0);
//     const runningTotal =
//       previousPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0) +
//       Number(amount || 0) +
//       Number(amount_allocated || 0);

//     paymentData.totalAmount = runningTotal;
//     const payment = new Payment(paymentData);
//     await payment.save();
//     res.status(201).json({
//       mobile: payment.mobile,
//       others: payment.others,
//       amount: payment.amount,
//       totalAmount: paymentData.totalAmount,
//       timestamp: payment.timestamp,
//       status: payment.status,
//       gram: payment.gram,
//       amount_allocated: payment.amount_allocated,
//       gram_allocated: payment.gram_allocated,
//       _id: payment._id,
//     });
//   } catch (err) {
//     res.status(500).json({ error: "Server error." });
//   }
// };
{
}
// exports.mobilePayment = async (req, res) => {
//   try {
//     const { mobile, others, amount, gram_allocated, gram, amount_allocated } =
//       req.body;

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

//     // Always store under the main mobile
//     let paymentData = {
//       mobile, // ✅ always the main mobile
//       others: others || "", // just store who else is involved
//       amount,
//       gram_allocated,
//       gram,
//       amount_allocated,
//       status: "Pending",
//       timestamp: new Date(),
//       paid_by: req.user?.mobile, // who actually paid
//     };

//     const Payment = require("../models/Payment");

//     // Calculate running total for this mobile
//     const previousPayments = await Payment.find({ mobile });
//     const runningTotal =
//       previousPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0) +
//       Number(amount || 0) +
//       Number(amount_allocated || 0);

//     paymentData.totalAmount = runningTotal;

//     const payment = new Payment(paymentData);
//     await payment.save();

//     res.status(201).json({
//       mobile: payment.mobile,
//       others: payment.others,
//       amount: payment.amount,
//       totalAmount: paymentData.totalAmount,
//       timestamp: payment.timestamp,
//       status: payment.status,
//       gram: payment.gram,
//       amount_allocated: payment.amount_allocated,
//       gram_allocated: payment.gram_allocated,
//       _id: payment._id,
//     });
//   } catch (err) {
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

    // Always store under the main mobile
    let paymentData = {
      mobile,
      others: others || "",
      amount: effectiveAmount, // ✅ always have a usable amount
      gram_allocated,
      gram,
      amount_allocated,
      status: "Pending",
      timestamp: new Date(),
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

    res.status(201).json({
      mobile: payment.mobile,
      others: payment.others,
      amount: payment.amount,
      totalAmount: paymentData.totalAmount,
      timestamp: payment.timestamp,
      status: payment.status,
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

