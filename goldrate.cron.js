const cron = require('node-cron');
const axios = require('axios');
const GoldPrice = require('./models/GoldPrice');
// *    *    *    *    *  
// │    │    │    │    │
// │    │    │    │    └─ day of week (0 - 7)
// │    │    │    └───── month (1 - 12)
// │    │    └────────── day of month (1 - 31)
// │    └─────────────── hour (0 - 23)
// └──────────────────── minute (0 - 59)

// Schedule to fetch and store gold price every 30 minutes
cron.schedule("0 */24 * * *", async () => {
  try {
    const response = await axios.get("https://www.goldapi.io/api/XAU/INR", {
      headers: {
        "x-access-token":
        // "goldapi-7mbr7usmemt4wxs-io"
        "goldapi-7mbr7usmemif7xq-io"
      },
    });
    const { timestamp, price_gram_24k } = response.data;

    const istDate = new Date(timestamp * 1000).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });
    //   res.json({ message: 'Gold rate updated', goldPrice, istDate });
    const goldPrice = new GoldPrice({ timestamp, price_gram_24k, istDate });
    await goldPrice.save();
    console.log("Gold rate updated:", goldPrice);
  } catch (err) {
    console.error("Failed to fetch or store gold rate:", err.message);
  }
});
