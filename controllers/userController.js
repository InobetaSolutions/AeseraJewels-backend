
const User = require('../models/User');
// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    // Attach otp and jwt for each user (otp from memory, jwt from db)
    const usersWithOtpJwt = users.map(user => ({
      _id: user._id,
      mobile: user.mobile,
      name: user.name,
      otp: otpStore[user.mobile] || null,
      jwt: user.jwt || null
    }));
    res.json(usersWithOtpJwt);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};
// User login: check if mobile exists, return OTP and JWT if found
exports.userLogin = async (req, res) => {
  const { mobile } = req.body;
  // const mobileExist = await User.findOne({ mobile });
  // if (mobileExist) {
  //   return res.status(409).json({ error: 'Mobile number already exists.' });
  // }
  if (!mobile) {
    return res.status(400).json({ error: 'Mobile is required.' });
  }
  try {
    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ error: 'Mobile Number not Register. Please Follow Sign up Process.' });
    }
  const otp = generateRandomOtp();
  otpStore[mobile] = otp;
  const token = jwt.sign({ mobile, name: user.name }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '1h' });
  const refreshToken = jwt.sign({ mobile, name: user.name }, process.env.JWT_REFRESH_SECRET || 'refreshsecretkey', { expiresIn: '7d' });
  return res.json({ mobile, otp, token, refreshToken });
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
};
const jwt = require('jsonwebtoken');

// Generate a random 4-digit OTP
function generateRandomOtp() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// In-memory store for OTPs (for demo only; use DB or cache in production)
const otpStore = {};

exports.generateOtp = async (req, res) => {
  const { mobile, name } = req.body;
  const mobileExist = await User.findOne({ mobile });
  if (mobileExist) {
    return res.status(409).json({ error: 'Mobile number already exists.' });
  }
  if (!mobile || !name) {
    return res.status(400).json({ error: 'Mobile and Name are required.' });
  }
  try {
    let user = await User.findOne({ mobile });
    if (!user) {
      user = new User({ mobile, name });
      await user.save();
    }
  const otp = generateRandomOtp();
  otpStore[mobile] = otp;
  const token = jwt.sign({ mobile, name: user.name }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '48h' });
  const refreshToken = jwt.sign({ mobile, name: user.name }, process.env.JWT_REFRESH_SECRET || 'refreshsecretkey', { expiresIn: '7d' });
  res.json({ name:user.name || name, mobile, otp, token, refreshToken });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};


exports.verifyOtp = (req, res) => {
  const { mobile, otp } = req.body;
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (!mobile || !otp || !token) {
    return res.status(400).json({ error: 'Mobile, OTP, and JWT are required.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    if (decoded.mobile !== mobile) {
      return res.status(401).json({ error: 'JWT does not match mobile.' });
    }
    if (otpStore[mobile] && otpStore[mobile] === otp) {
      delete otpStore[mobile]; // OTP used, remove it
      // Find user in DB to get ObjectId
      User.findOneAndUpdate(
        { mobile: decoded.mobile },
        { jwt: token },
        { new: true }
      )
        .then(user => {
          return res.json({
            message: 'User sign up successfully.',
            data: {
              _id: user ? user._id : null,
              mobile: decoded.mobile,
              name: decoded.name,
              token
            }
          });
        })
        .catch(() => {
          return res.status(500).json({ error: 'Server error.' });
        });
    } else {
      return res.status(401).json({ error: 'Invalid OTP.' });
    }
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired JWT.' });
  }
};


//resend otp

exports.resendOtp = async (req, res) => {
  const { mobile } = req.body;
  if (!mobile) {
    return res.status(400).json({ error: 'Mobile is required.' });
  }
  // Generate new OTP and store in memory
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  otpStore[mobile] = otp;
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ mobile }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '1h' });
    res.json({ mobile, otp, token, message: 'OTP resent' });
};
