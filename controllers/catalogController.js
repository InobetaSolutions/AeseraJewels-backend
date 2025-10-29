// Cancel Catalog Payment
exports.cancelCatalogPayment = async (req, res) => {
  try {
    const { catalogID, mobileNumber } = req.body;
    if (!catalogID || !mobileNumber) {
      return res
        .status(400)
        .json({
          status: false,
          message: "catalogID and mobileNumber are required",
        });
    }
    const payment = await CatalogPayment.findOneAndUpdate(
      {
        _id: catalogID,
        mobileNumber,
        paymentStatus: { $ne: "Payment Cancelled" },
      },
      { $set: { paymentStatus: "Payment Cancelled" } },
      { new: true }
    );
    if (!payment) {
      return res
        .status(404)
        .json({
          status: false,
          message: "Catalog payment not found or already cancelled",
        });
    }
    const istTimestamp = payment.updatedAt
      ? new Date(payment.updatedAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })
      : null;
    res.status(200).json({
      status: true,
      message: "Catalog payment cancelled",
      data: { ...payment._doc, timestamp: istTimestamp },
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// Get all cancelled catalog payments
exports.getAllCancelCatalogPayments = async (req, res) => {
  try {
    const payments = await CatalogPayment.find({
      paymentStatus: "Payment Cancelled",
    }).sort({ updatedAt: -1 });
    const formatted = payments.map((p) => ({
      ...p._doc,
      timestamp: p.updatedAt
        ? new Date(p.updatedAt).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })
        : null,
    }));
    res.status(200).json({
      status: true,
      message: "Cancelled catalog payments fetched successfully.",
      data: formatted,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// Get all approved catalog payments
exports.getAllCatalogApprovePayments = async (req, res) => {
  try {
    const payments = await CatalogPayment.find({
      paymentStatus: {
        $in: [
          "Payment Approved - Delivery is in Process",
          "Payment Approved - Delivered",
        ],
      },
    }).sort({ updatedAt: -1 });
    const formatted = payments.map((p) => ({
      ...p._doc,
      timestamp: p.updatedAt
        ? new Date(p.updatedAt).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })
        : null,
    }));
    res.status(200).json({
      status: true,
      message: "Approved catalog payments fetched successfully.",
      data: formatted,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
const CatalogPayment = require("../models/CatalogPayment");

exports.createCatalogPayment = async (req, res) => {
  try {
    const newPayment = new CatalogPayment(req.body);
    const saved = await newPayment.save();
    //* console.log("Catalog Payment Created:", saved);
    res
      .status(201)
      .json({ status: true, message: "Catalog Payment Created", data: saved });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
const User =require("../models/User")



exports.createCatalogPayment1 = async (req, res) => {
  try {
    // Accept paidAmount, investAmount, taxAmount, deliveryCharge in the request and sum paid+invest for payment `amount`.
    const { paidAmount = 0, investAmount = 0, taxAmount = 0, deliveryCharge = 0 } = req.body;
    const paid = Number(paidAmount) || 0;
    const invest = Number(investAmount) || 0;
    const tax = Number(taxAmount) || 0;
    const delivery = Number(deliveryCharge) || 0;
    const totalAmount = paid + invest;

    // Build payload and ensure we persist the paid portion into Paidamount field
    const payload = {
      ...req.body,
      amount: totalAmount,
      Paidamount: paid,
      taxAmount: tax,
      deliveryCharge: delivery,
    };

    const newPayment = new CatalogPayment(payload);
    const saved = await newPayment.save();
    
    // Format timestamps to IST (Asia/Kolkata)
    const formatToIST = (date) => {
      return date ? new Date(date).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      }) : null;
    };

    res.status(201).json({ 
      status: true, 
      message: "Catalog Payment Created", 
      data: {
        ...saved._doc,
        taxAmount: tax,
        deliveryCharge: delivery,
        createdAt: formatToIST(saved.createdAt),
        updatedAt: formatToIST(saved.updatedAt),
        // timestamp: formatToIST(saved.createdAt)
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// exports.createCatalogPayment1 = async (req, res) => {
//   try {
//     const newPayment = new CatalogPayment(req.body);
//     const saved = await newPayment.save();
//     //* console.log("Catalog Payment Created:", saved);
//     res
//       .status(201)
//       .json({ status: true, message: "Catalog Payment Created", data: saved });
//   } catch (err) {
//     res.status(500).json({ status: false, message: err.message });
//   }
// };

exports.updateCatalog = async (req, res) => {
  try {
    const { catalogID } = req.body;

    if (!catalogID) {
      return res
        .status(400)
        .json({ status: false, message: "catalogID is required" });
    }

    // update fields from request body
    const updatedCatalog = await CatalogPayment.findByIdAndUpdate(
      catalogID,
      { $set: req.body },
      { new: true } // return updated document
    );

    if (!updatedCatalog) {
      return res
        .status(404)
        .json({ status: false, message: "Catalog not found" });
    }

    res.status(200).json({
      status: true,
      message: "Catalog updated successfully",
      data: updatedCatalog,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

exports.getCatalogPayments = async (req, res) => {
  try {
    const payments = await CatalogPayment.find({
      paymentStatus: "Payment Confirmation Pending",
    });
    // {
    //   allotmentStatus: "Payment Approved - Delivery is in Process",
    // }
    res.status(200).json({
      status: true,
      message: "Catalog Payments Retrieved",
      data: payments,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// exports.getUserCatalog = async (req, res) => {
//   try {
//     const { mobileNumber } = req.body;

//     if (!mobileNumber) {
//       return res
//         .status(400)
//         .json({ status: false, message: "Mobile number required" });
//     }

//     const catalogs = await CatalogPayment.find({ mobileNumber }).sort({ createdAt: -1 });

//     res.status(200).json({
//       status: true,
//       message: "User Catalog Retrieved",
//       data: catalogs,
//     });
//   } catch (err) {
//     res.status(500).json({ status: false, message: err.message });
//   }
// };

exports.getUserCatalog = async (req, res) => {
  try {
    const { mobileNumber } = req.body;

    if (!mobileNumber) {
      return res
        .status(400)
        .json({ status: false, message: "Mobile number required" });
    }

    const catalogs = await CatalogPayment.find({ mobileNumber }).sort({
      createdAt: -1,
    });

    // Add IST timestamp to each catalog
    const catalogsWithTimestamp = catalogs.map((c) => {
      const istTimestamp = c.updatedAt
        ? new Date(c.updatedAt).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })
        : null;
      return {
        ...c._doc,
        timestamp: istTimestamp,
      };
    });

    res.status(200).json({
      status: true,
      message: "User Catalog Retrieved",
      data: catalogsWithTimestamp,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// exports.approveCatalogPayment = async (req, res) => {
//   try {
//     const { mobileNumber, catalogID } = req.body;

//     if (!mobileNumber || !catalogID) {
//       return res.status(400).json({
//         status: false,
//         message: "Mobile number and catalogID are required",
//       });
//     }

//     // Update only if status is allowed
//     const payment = await CatalogPayment.findOneAndUpdate(
//       {
//         _id: catalogID,
//         mobileNumber,
//         paymentStatus: {
//           $in: ["Payment Confirmation Pending", "Payment Cancelled"],
//         },
//       },
//       {
//         $set: { paymentStatus: "Payment Approved - Delivery is in Process" },
//       },
//       { new: true }
//     );

//     if (!payment) {
//       return res.status(404).json({
//         status: false,
//         message: "Catalog payment not found or already approved",
//       });
//     }

//     res.status(200).json({
//       status: true,
//       message: "Payment approved successfully",
//       data: payment,
//     });
//   } catch (err) {
//     res.status(500).json({ status: false, message: err.message });
//   }
// };
{"working code"}
// exports.approveCatalogPayment = async (req, res) => {
//   try {
//     const { mobileNumber, catalogID } = req.body;

//     if (!mobileNumber || !catalogID) {
//       return res.status(400).json({
//         status: false,
//         message: "Mobile number and catalogID are required",
//       });
//     }

//     // Update only if status is allowed
//     const payment = await CatalogPayment.findOneAndUpdate(
//       {
//         _id: catalogID,
//         mobileNumber,
//         paymentStatus: {
//           $in: ["Payment Confirmation Pending", "Payment Cancelled"],
//         },
//       },
//       {
//         $set: { paymentStatus: "Payment Approved - Delivery is in Process" },
//       },
//       { new: true }
//     );

//     if (!payment) {
//       return res.status(404).json({
//         status: false,
//         message: "Catalog payment not found or already approved",
//       });
//     }

//     // If this catalog payment had an investAmount, subtract it from the user's Payment.totalAmount
//     try {
//       const Payment = require("../models/Payment");
//       const invest = Number(payment.investAmount || 0);
//       if (invest > 0) {
//         // Decrease totalAmount for all payments for this mobile
//         await Payment.updateMany({ mobile: mobileNumber }, { $inc: { totalAmount: -invest } });
//         // Ensure we don't leave negative totals
//         await Payment.updateMany({ mobile: mobileNumber, totalAmount: { $lt: 0 } }, { $set: { totalAmount: 0 } });
//       }
//     } catch (e) {
//       // Log error but don't block approval response
//       console.error("Failed to adjust Payment.totalAmount after catalog approval:", e.message);
//     }

//     // Format timestamps to IST (Asia/Kolkata)
//     const formatToIST = (date) => {
//       return date ? new Date(date).toLocaleString("en-IN", {
//         timeZone: "Asia/Kolkata",
//       }) : null;
//     };

//     res.status(200).json({
//       status: true,
//       message: "Payment approved successfully",
//       data: {
//         ...payment._doc,
//         createdAt: formatToIST(payment.createdAt),
//         updatedAt: formatToIST(payment.updatedAt),
//         timestamp: formatToIST(payment.updatedAt)
//       }
//     });
//   } catch (err) {
//     res.status(500).json({ status: false, message: err.message });
//   }
// };


{"ends"}

exports.approveCatalogPayment = async (req, res) => {
  try {
    const { mobileNumber, catalogID } = req.body;

    if (!mobileNumber || !catalogID) {
      return res.status(400).json({
        status: false,
        message: "Mobile number and catalogID are required",
      });
    }

    // Update only if status is allowed
    const payment = await CatalogPayment.findOneAndUpdate(
      {
        _id: catalogID,
        mobileNumber,
        paymentStatus: {
          $in: ["Payment Confirmation Pending", "Payment Cancelled"],
        },
      },
      {
        $set: { paymentStatus: "Payment Approved - Delivery is in Process" },
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({
        status: false,
        message: "Catalog payment not found or already approved",
      });
    }

    // If this catalog payment had an investAmount, subtract it from the user's Payment.totalAmount
    try {
      const Payment = require("../models/Payment");
      const invest = Number(payment.investAmount || 0);
      if (invest > 0) {
        // Decrease totalAmount for all payments for this mobile
        await Payment.updateMany({ mobile: mobileNumber }, { $inc: { totalAmount: -invest } });
        // Ensure we don't leave negative totals
        await Payment.updateMany({ mobile: mobileNumber, totalAmount: { $lt: 0 } }, { $set: { totalAmount: 0 } });

        // Reduce totalGrams by investAmount/goldRate
        const GoldPrice = require("../models/GoldPrice");
        const lastRate = await GoldPrice.findOne().sort({ timestamp: -1 });
        let goldRate = lastRate && lastRate.price_gram_24k ? Number(lastRate.price_gram_24k) : 0;
        if (goldRate > 0) {
          const gramsToReduce = Number((invest / goldRate).toFixed(4));
          await Payment.updateMany({ mobile: mobileNumber }, { $inc: { totalGrams: -gramsToReduce } });
          // Ensure we don't leave negative totalGrams
          await Payment.updateMany({ mobile: mobileNumber, totalGrams: { $lt: 0 } }, { $set: { totalGrams: 0 } });
        }
      }
    } catch (e) {
      // Log error but don't block approval response
      console.error("Failed to adjust Payment totals after catalog approval:", e.message);
    }

    // Format timestamps to IST (Asia/Kolkata)
    const formatToIST = (date) => {
      return date ? new Date(date).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      }) : null;
    };

    res.status(200).json({
      status: true,
      message: "Payment approved successfully",
      data: {
        ...payment._doc,
        createdAt: formatToIST(payment.createdAt),
        updatedAt: formatToIST(payment.updatedAt),
        timestamp: formatToIST(payment.updatedAt)
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};


{
}

// exports.approveCatalogPayment = async (req, res) => {
//   try {
//     const { mobileNumber, catalogID } = req.body;

//     if (!mobileNumber || !catalogID) {
//       return res.status(400).json({
//         status: false,
//         message: "Mobile number and catalogID are required",
//       });
//     }

//     // Update only if status is allowed
//     const payment = await CatalogPayment.findOneAndUpdate(
//       {
//         _id: catalogID,
//         mobileNumber,
//         paymentStatus: {
//           $in: ["Payment Confirmation Pending", "Payment Cancelled"],
//         },
//       },
//       {
//         $set: { paymentStatus: "Payment Approved - Delivery is in Process" },
//       },
//       { new: true }
//     );

//     if (!payment) {
//       return res.status(404).json({
//         status: false,
//         message: "Catalog payment not found or already approved",
//       });
//     }

//     // If this catalog payment had an investAmount, subtract it from the latest Payment totalAmount
//     try {
//       const Payment = require("../models/Payment");
//       const invest = Number(payment.investAmount || 0);
//       if (invest > 0) {
//         // Find the latest confirmed payment
//         const latestPayment = await Payment.findOne({
//           mobile: mobileNumber,
//           status: "Payment Confirmed"
//         }).sort({ createdAt: -1 });

//         if (latestPayment) {
//           // Get current totalAmount and subtract invest amount
//           const currentTotal = Number(latestPayment.totalAmount || 0);
//           const newTotal = Math.max(0, currentTotal - invest); // Ensure it doesn't go below 0
          
//           // Update just this latest payment's totalAmount
//           latestPayment.totalAmount = Number(formatTo2Decimals(newTotal));
//           await latestPayment.save();
//         }
//       }
//     } catch (e) {
//       // Log error but don't block approval response
//       console.error("Failed to adjust Payment.totalAmount after catalog approval:", e.message);
//     }

//     res.status(200).json({
//       status: true,
//       message: "Payment approved successfully",
//       data: payment,
//     });
//   } catch (err) {
//     res.status(500).json({ status: false, message: err.message });
//   }
// };

exports.setCatalogAllotment = async (req, res) => {
  try {
    const { mobileNumber, catalogID } = req.body;

    // First check if payment is approved
    const existingPayment = await CatalogPayment.findOne({
      _id: catalogID,
      mobileNumber,
    });

    if (!existingPayment) {
      return res
        .status(404)
        .json({ status: false, message: "Catalog not found" });
    }

    if (
      existingPayment.paymentStatus !==
      "Payment Approved - Delivery is in Process"
    ) {
      return res.status(400).json({
        status: false,
        message: "Payment must be approved before setting allotment",
      });
    }

    // Update allotment status to "Delivered" since payment is already approved
    const payment = await CatalogPayment.findOneAndUpdate(
      { _id: catalogID, mobileNumber },
      {
        $set: {
          allotmentStatus: "Delivered",
          paymentStatus: "Payment Approved - Delivered",
        },
      },
      { new: true }
    );

    res.status(200).json({
      status: true,
      message: "Allotment status updated to Delivered",
      data: payment,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
