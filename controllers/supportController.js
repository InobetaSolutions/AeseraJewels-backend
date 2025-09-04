const Support = require("../models/support");

exports.createSupport = async (req, res) => {
  try {
    const { mobile, email } = req.body;

    if (!mobile || !email) {
      return res.status(400).json({ error: "Mobile and email are required." });
    }

    const support = new Support({ mobile, email });
    await support.save();

    res.status(201).json({
      message: "Support record created successfully",
      data: support,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
};

exports.getSupport = async (req, res) => {
  try {
    const supports = await Support.find().sort({ createdAt: -1 });

    res.json({
      message: "Support records fetched successfully",
      data: supports,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
};

exports.getSupportById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Support ID is required." });
    }

    const support = await Support.findById(id);
    if (!support) {
      return res.status(404).json({ error: "Support record not found." });
    }

    res.json({
      message: "Support record fetched successfully",
      data: support,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
};