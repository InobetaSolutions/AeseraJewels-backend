require('dotenv').config();
const express = require('express');
const app = express();
const apiRoutes = require('./routes/api');
 const mongoose = require("mongoose");
// const connectDB = require('./config/database.config');

// // Connect to MongoDB
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


////////////////////////
//  require("dotenv").config();
//  const express = require("express");
//  const bodyParser = require("body-parser");
//  const cors = require("cors");
//  const path = require("path");
//  const http = require("http");
//  const mongoose = require("mongoose");
//  const jwt = require("jsonwebtoken");
//  // Initialize the Express application
//  const app = express();
//  app.use(cors());
//  app.use(bodyParser.json());
//  app.use(bodyParser.json({ limit: "70mb" }));
//  app.use(
//    bodyParser.urlencoded({
//      limit: "70mb",
//      extended: false,
//      parameterLimit: 1000000,
//    })
//  );
//  // Additional CORS headers (optional)
//  app.use(function (req, res, next) {
//    res.header("Access-Control-Allow-Origin", "*");
//    res.header("Access-Control-Allow-Methods", "GET,PUT,DELETE,OPTIONS,PATCH");
//    res.header("Access-Control-Allow-Headers", "Content-Type");
//    next();
//  });
//  // Serve static files
//  const staticPath = path.join(__dirname, "/public");
//  app.use(express.static(staticPath));
//  // Database connection
//  const dbConfig = require("./config/database.config.js");
//  mongoose.Promise = global.Promise;
//  mongoose
//    .connect(dbConfig.url, {
//      useNewUrlParser: true,
//    })
//    .then(() => {
//      console.log("Database Connected Successfully!!");
//    })
//    .catch((err) => {
//      console.log("Could not connect to the database", err);
//      process.exit();
//    });
//  // Routing
//  const router = require("./app/routers/index");
//  app.use("/", router);
//  app.get("/", (req, res) => {
//    res.json({ message: "This is for testing" });
//  });
//  app.post("/Generate", (req, res) => {
//    const user = {
//      username: "Mahesh",
//      email: "mahivarun2709vm@gmail.com",
//    };
//    jwt.sign({ user }, "secretkey", (err, token) => {
//      res.json({ " Token": token });
//    });
//  });
//  // Start the server
//  const server = http.createServer(app);
//  server.listen(5001, () => {
//    console.log("Server is listening on port 5001");
//  });