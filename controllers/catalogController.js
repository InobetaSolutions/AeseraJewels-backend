
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

    res.status(200).json({
      status: true,
      message: "Payment approved successfully",
      data: payment,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

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
