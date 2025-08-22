const cron = require('node-cron');
const axios = require('axios');
const GoldPrice = require('./models/GoldPrice');

// Schedule to fetch and store gold price every 30 minutes
cron.schedule('*/360 * * * *', async () => {
  try {
    const response = await axios.get('https://www.goldapi.io/api/XAU/INR', {
      headers: { 'x-access-token': 'goldapi-7mbr7usmemt4wxs-io' }
    });
    const { timestamp, price_gram_24k } = response.data;
    
  const istDate = new Date(timestamp * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
//   res.json({ message: 'Gold rate updated', goldPrice, istDate });
    const goldPrice = new GoldPrice({ timestamp, price_gram_24k,istDate});
    await goldPrice.save();
    console.log('Gold rate updated:', goldPrice);
  } catch (err) {
    console.error('Failed to fetch or store gold rate:', err.message);
  }
});
