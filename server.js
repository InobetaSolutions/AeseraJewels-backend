require('dotenv').config();
const express = require('express');
const app = express();
const apiRoutes = require('./routes/api');
 const mongoose = require("mongoose");
// const connectDB = require('./config/database.config');

// Connect to MongoDB
// connectDB();
 const dbConfig = require("./config/database.config");
 mongoose.Promise = global.Promise;
 mongoose
   .connect(dbConfig.url, {
     useNewUrlParser: true,
   })
   .then(() => {
     console.log("Database Connected Successfully!!");
   })
   .catch((err) => {
     console.log("Could not connect to the database", err);
     process.exit();
   });
const cors = require('cors');
app.use(cors());


// Start gold price cron job
require('./goldrate.cron');
app.use('/api/uploads', express.static('uploads'));

app.use(express.json());
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
