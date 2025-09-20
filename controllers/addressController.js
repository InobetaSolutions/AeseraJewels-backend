const GramConversion = require('../models/GramConversion');
const User = require('../models/User');
const deliveryAddress = require("../models/deliveryAddress");
const jwt = require("jsonwebtoken");

exports.convertGramToAmount = async (req, res) => {
  const { grams, mobile } = req.body;
  if (!grams || isNaN(grams) || !mobile) {
    return res.status(400).json({ error: 'Grams and mobile are required.' });
  }
  try {
    const GoldPrice = require('../models/GoldPrice');
    const lastRate = await GoldPrice.findOne().sort({ timestamp: -1 });
    if (!lastRate || !lastRate.price_gram_24k) {
      return res.status(500).json({ error: 'Current gold rate not available.' });
    }
    const goldRate = lastRate.price_gram_24k;
    const amount = parseFloat((grams * goldRate).toFixed(2));
    // Store conversion in DB
    const conversion = new GramConversion({ mobile, grams, goldRate, amount });
    await conversion.save();
    res.json({ grams, goldRate, amount, mobile });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};


exports.deliveryAddress = async (req, res) => {
  const { address, city, postalCode, mobile } = req.body;
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (!address || !city || !postalCode || !mobile || !token) {
    return res.status(400).json({ error: 'Address, City, Postal Code, Mobile, and JWT are required.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    if (decoded.mobile !== mobile) {
      return res.status(401).json({ error: 'JWT does not match mobile.' });
    }
    const deliveryaddress = new deliveryAddress({ mobile, address, city, postalCode });
    await deliveryaddress.save();
    res.status(201).json({ message: 'Address stored successfully.', deliveryaddress });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired JWT.' });
  }
};

// add deliveryAddress new apis

exports.addDeliveryAddress = async (req, res) => {
  const { userid, name, address, city, postalCode } = req.body;
  if (!userid || !name || !address || !city || !postalCode) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  const user = await User.findById(userid);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  try {
    const deliveryaddress = new deliveryAddress({ userid, name, address, city, postalCode });
    await deliveryaddress.save();
    res.status(201).json({ status: 'true', message: 'Address added successfully.', data: deliveryaddress });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

// get deliveryAddress
exports.getDeliveryAddress = async (req, res) => {
  const { userid } = req.body;
  if (!userid) {
    return res.status(400).json({ error: 'Userid is required.' });
  }
  const user = await User.findById(userid);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  try {
    const deliveryaddresses = await deliveryAddress.find({ userid });
    res.status(200).json({ status: 'true', message: 'Delivery addresses retrieved successfully.', data: deliveryaddresses });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

// update deliveryAddress
exports.updateDeliveryAddress = async (req, res) => {
  const { addressId, name, address, city, postalCode } = req.body;
  if (!addressId || !name || !address || !city || !postalCode) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  try {
    const deliveryaddress = await deliveryAddress.findByIdAndUpdate(
      addressId,
      { name, address, city, postalCode },
      { new: true }
    );
    if (!deliveryaddress) {
      return res.status(404).json({ error: 'Address not found.' });
    }
    
    res.json({ status: 'true', message: 'Address updated successfully.', data:deliveryaddress });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

// delete deliveryAddress
exports.deleteDeliveryAddress = async (req, res) => {
  const { addressId } = req.body;
  if (!addressId) {
    return res.status(400).json({ error: 'Address ID is required.' });
  }
  try {
    const deliveryaddress = await deliveryAddress.findByIdAndDelete(addressId);
    if (!deliveryaddress) {
      return res.status(404).json({ error: 'Address not found.' });
    }
    res.json({ status: 'true', message: 'Address deleted successfully.', data: deliveryaddress });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};
