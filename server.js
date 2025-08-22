require('dotenv').config();
const express = require('express');
const app = express();
const apiRoutes = require('./routes/api');
const connectDB = require('./config/database.config');

// Connect to MongoDB
connectDB();


// Start gold price cron job
require('./goldrate.cron');

app.use(express.json());
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
