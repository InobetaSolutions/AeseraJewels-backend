// Get payment history for a mobile number
exports.getPaymentHistory = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) {
      return res.status(400).json({ error: 'Mobile is required.' });
    }
    const payments = await Payment.find({ mobile }).sort({ timestamp: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};
// Approve payment by ObjectId
exports.approvePayment = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'Payment id is required.' });
    }
    const payment = await Payment.findOneAndUpdate(
      { _id: id, status: 'pending' },
      { status: 'approved' },
      { new: true }
    );
    if (!payment) {
      return res.status(404).json({ error: 'No pending payment found for this id.' });
    }
    res.json({ message: 'Payment Approved', payment });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};
const Payment = require('../models/Payment');

// Create a new payment
exports.createPayment = async (req, res) => {
  try {
    const { mobile, amount } = req.body;
    if (!mobile || !amount) {
      return res.status(400).json({ error: 'Mobile and amount are required.' });
    }
    const payment = new Payment({ mobile, amount });
    await payment.save();
    res.status(201).json(payment);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get all payments
exports.getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find().sort({ timestamp: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};
