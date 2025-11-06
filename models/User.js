const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  mobile: { type: String, required: true, unique: true },
  name: { type: String },
  jwt: { type: String },
});

module.exports = mongoose.model('User', userSchema);
