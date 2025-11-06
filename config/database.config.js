// const mongoose = require('mongoose');

// const connectDB = async () => {
//   try {
//     await mongoose.connect("mongodb://localhost:27017/aeserajewels" || process.env.MONGODB_URI, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     });
//     console.log('MongoDB connected');
//   } catch (err) {
//     console.error('MongoDB connection error:', err);
//     process.exit(1);
//   }
// };

// module.exports = connectDB;

module.exports = {
  url: "mongodb://127.0.0.1:27017/aeserajewels",
};
 