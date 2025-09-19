// controllers/taxController.js
const Tax = require("../models/Tax");

// Create Tax (only if none exists)
exports.createTax = async (req, res) => {
  try {
    const exists = await Tax.findOne();
    if (exists) {
      return res.status(400).json({ status: false, message: "Tax already exists", data: exists });
    }

    const tax = new Tax(req.body);
    await tax.save();

    res.status(201).json({ status: true, message: "Tax created successfully", data: tax });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Tax
exports.getTax = async (req, res) => {
  try {
    const tax = await Tax.findOne();
    if (!tax) return res.status(404).json({ status: false, message: "No Tax found" });

    res.json({ status: true, message: "Tax fetched successfully", data: tax });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Tax
exports.updateTax = async (req, res) => {
  try {
    const tax = await Tax.findOneAndUpdate({}, req.body, { new: true });
    if (!tax)
      return res.status(404).json({ status: false, message: "No Tax found to update" });

    res.json({ status: true, message: "Tax updated successfully", data: tax });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete Tax
exports.deleteTax = async (req, res) => {
  try {
    const tax = await Tax.findOneAndDelete();
    if (!tax)
      return res.status(404).json({ status: false, message: "No Tax found to delete" });

    res.json({ status: true, message: "Tax deleted successfully", data: tax });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
