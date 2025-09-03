const GramConversion = require('../models/GramConversion');
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

const deliveryAddress = require('../models/deliveryAddress');
const jwt = require('jsonwebtoken');

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