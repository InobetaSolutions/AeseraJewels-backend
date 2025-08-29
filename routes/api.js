const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const productController = require('../controllers/productController');
const goldpriceController = require('../controllers/goldpriceController');
const paymentController = require('../controllers/paymentController');

const multer = require('multer');
const path = require('path');

// Multer config for image upload
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, 'uploads/');
	},
	filename: function (req, file, cb) {
		cb(null, Date.now() + path.extname(file.originalname));
	}
});
const upload = multer({ storage });

router.post('/create-products', upload.single('image'), productController.createProduct);
router.get('/get-products', productController.getProducts);

router.post('/generate-otp', userController.generateOtp);
router.post('/verify-otp', userController.verifyOtp);
router.post('/user-login', userController.userLogin);
router.get('/get-users', userController.getAllUsers);
//gold
router.get('/getRate', goldpriceController.fetchAndStoreGoldRate);
router.get('/getCurrentRate', goldpriceController.getCurrentRate);
router.get('/getAllCurrentRate', goldpriceController.getAllCurrentRate);

//payment
router.post('/create-payment', paymentController.createPayment);
router.get('/getAllPayments', paymentController.getAllPayments);
router.post('/approve-payment', paymentController.approvePayment);
router.post('/getpaymenthistory', paymentController.getPaymentHistory);

// List all files in uploads directory
const fs = require('fs');
router.get('/uploads', (req, res) => {
	fs.readdir('uploads', (err, files) => {
		if (err) {
			return res.status(500).json({ error: 'Unable to list files.' });
		}
		res.json({ files });
	});
});


module.exports = router;
