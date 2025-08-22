const GoldPrice = require('../models/GoldPrice');
const axios = require('axios');

// Fetch and store gold price from goldapi.io
exports.fetchAndStoreGoldRate = async (req, res) => {
  try {
    const response = await axios.get('https://www.goldapi.io/api/XAU/INR', {
      headers: { 'x-access-token': 'goldapi-7mbr7usmemt4wxs-io' }
    });
  const { timestamp, price_gram_24k } = response.data;
  const goldPrice = new GoldPrice({ timestamp, price_gram_24k });
  await goldPrice.save();
  // Convert timestamp to IST
  const istDate = new Date(timestamp * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  res.json({ message: 'Gold rate updated', goldPrice, istDate });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch or store gold rate.' });
  }
};

// Get the last stored gold price
exports.getCurrentRate = async (req, res) => {
  try {
    const lastRate = await GoldPrice.findOne().sort({ timestamp: -1 });
    let istDate = null;
    if (lastRate && lastRate.timestamp) {
      istDate = new Date(lastRate.timestamp * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    }
    res.json({ ...lastRate?._doc, istDate });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch current rate.' });
  }
};

// Get all stored gold prices
exports.getAllCurrentRate = async (req, res) => {
  try {
    const allRates = await GoldPrice.find().sort({ timestamp: -1 });
    const allRatesWithIST = allRates.map(rate => ({
      ...rate._doc,
      istDate: new Date(rate.timestamp * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    }));
    res.json(allRatesWithIST);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch all rates.' });
  }
};
