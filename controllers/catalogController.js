const CatalogPayment = require("../models/CatalogPayment");

exports.createCatalogPayment = async (req, res) => {
  try {
    const newPayment = new CatalogPayment(req.body);
    const saved = await newPayment.save();
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
    const payments = await CatalogPayment.find({allotmentStatus: "Approved"});
    res.status(200).json({
      status: true,
      message: "Catalog Payments Retrieved",
      data: payments,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

exports.setCatalogAllotment = async (req, res) => {
  try {
    const { mobileNumber, catalogID } = req.body;

    const payment = await CatalogPayment.findOneAndUpdate(
      { _id: catalogID, mobileNumber },
      { $set: { allotmentStatus: "Approved" } }, // ✅ Now Approved instead of true
      { new: true }
    );

    if (!payment) {
      return res
        .status(404)
        .json({ status: false, message: "Catalog not found" });
    }

    res.status(200).json({
      status: true,
      message: "Allotment status updated to Approved",
      data: payment,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

exports.getUserCatalog = async (req, res) => {
  try {
    const { mobileNumber } = req.body;

    if (!mobileNumber) {
      return res
        .status(400)
        .json({ status: false, message: "Mobile number required" });
    }

    const catalogs = await CatalogPayment.find({ mobileNumber });

    res.status(200).json({
      status: true,
      message: "User Catalog Retrieved",
      data: catalogs,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
