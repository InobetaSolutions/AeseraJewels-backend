// controllers/deliveryChargeController.js
const DeliveryCharge = require("../models/Deliverycharge");

// Create DeliveryCharge (only if none exists)
exports.createDeliveryCharge = async (req, res) => {
  try {
    const exists = await DeliveryCharge.findOne();
    if (exists) {
      return res
        .status(400)
        .json({ message: "Delivery charge already exists", data: exists });
    }

    const charge = new DeliveryCharge(req.body);
    await charge.save();

    res
      .status(201)
      .json({ status: true, message: "Delivery charge created successfully", data: charge });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get DeliveryCharge
exports.getDeliveryCharge = async (req, res) => {
  try {
    const charge = await DeliveryCharge.findOne();
    if (!charge)
      return res.status(404).json({ status: false, message: "No Delivery charge found" });

    res.json({ status: true, message: "Delivery charge fetched successfully", data: charge });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update DeliveryCharge
exports.updateDeliveryCharge = async (req, res) => {
  try {
    const charge = await DeliveryCharge.findOneAndUpdate({}, req.body, {
      new: true,
    });
    if (!charge)
      return res
        .status(404)
        .json({ message: "No Delivery charge found to update" });

    res.json({ status: true, message: "Delivery charge updated successfully", data: charge });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete DeliveryCharge
exports.deleteDeliveryCharge = async (req, res) => {
  try {
    const charge = await DeliveryCharge.findOneAndDelete();
    if (!charge)
      return res
        .status(404)
        .json({ message: "No Delivery charge found to delete" });

    res.json({ status: true, message: "Delivery charge deleted successfully", data: charge });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
