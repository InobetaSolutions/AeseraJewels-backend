const Support = require("../models/support");

exports.createSupport = async (req, res) => {
  try {
    const { mobile, email } = req.body;

    if (!mobile || !email) {
      return res.status(400).json({ error: "Mobile and email are required." });
    }

    // Check if support record already exists
    const existingSupport = await Support.findOne();
    if (existingSupport) {
      return res.status(409).json({ 
        error: "Support record already exists. Only one support record is allowed.",
        data: existingSupport
      });
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
    const support = await Support.findOne();
    
    if (!support) {
      return res.status(404).json({ 
        message: "No support record found" 
      });
    }

    res.status(200).json({
      message: "Support record retrieved successfully",
      data: support,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
};

exports.updateSupport = async (req, res) => {
  try {
    const { mobile, email } = req.body;

    if (!mobile || !email) {
      return res.status(400).json({ error: "Mobile and email are required." });
    }

    // Find and update the single support record
    const support = await Support.findOne();
    
    if (!support) {
      return res.status(404).json({ 
        error: "No support record found to update" 
      });
    }

    // Update fields
    support.mobile = mobile;
    support.email = email;
    await support.save();

    res.status(200).json({
      message: "Support record updated successfully",
      data: support,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
};

exports.deleteSupport = async (req, res) => {
  try {
    const support = await Support.findOne();
    
    if (!support) {
      return res.status(404).json({ 
        message: "No support record found to delete" 
      });
    }

    await Support.deleteOne({ _id: support._id });

    res.status(200).json({
      message: "Support record deleted successfully",
      data: support,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
};
