// Get allotment history for a mobile number

// Set allotment: deduct grams and amount for a mobile

// New payment API for mobile/JWT/gram/amount

const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const productController = require("../controllers/productController");
const goldpriceController = require("../controllers/goldpriceController");
const paymentController = require("../controllers/paymentController");
const auth = require("../middlewares/auth");
const addressController = require("../controllers/addressController");
const coinController = require("../controllers/coinPayment");
const multer = require("multer");
const path = require("path");

// Multer config for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });
const supportController = require("../controllers/supportController");

router.post("/createSupport", supportController.createSupport);
router.post("/getSupport", supportController.getSupport);
router.post("/updateSupport", supportController.updateSupport);
router.delete("/deleteSupport", supportController.deleteSupport);
// On-Boarding STARTS
router.post("/user-login", userController.userLogin);
router.post("/generate-otp", userController.generateOtp);
// router.post('/resend-otp', userController.resendOtp);
router.post("/verify-otp", userController.verifyOtp);
router.post("/resendOtp", userController.resendOtp);
router.post("/deliveryAddress", addressController.deliveryAddress);
// On-Boarding ENDS

// App DashBoard STARTS
router.get("/getCurrentRate", goldpriceController.getCurrentRate);
router.get("/get-products", productController.getProducts);
// App DashBoard ENDS

// App Payment STARTS
// router.post('/create-payment', auth, paymentController.createPayment);
router.post("/getpaymenthistory", auth, paymentController.getPaymentHistory);
router.post("/getPaymentHistoryAdmin",paymentController.getPaymentHistoryAdmin);
router.post("/convert-gram-to-amount", paymentController.convertGramToAmount);
router.post("/newPayment", auth, paymentController.mobilePayment);
router.post("/cancelPayment",  paymentController.cancelPayment);
router.get(
  "/getAllCancelledPayments",
  paymentController.getAllCancelledPayments
);
router.get("/getAllApprovedPayments", paymentController.getAllApprovedPayments);
router.get("/getFullPayment", paymentController.getFullPayment);
router.post("/setAllotment", paymentController.setAllotment);
router.get("/getByUserAllotment", paymentController.getByUserAllotment);

// App Payment ENDS

// Catalog Payment and Allotment STARTS
const catalogCtrl = require("../controllers/catalogController");

router.post("/catalogPayment", catalogCtrl.createCatalogPayment); // Step1
router.post("/updateCatalog", catalogCtrl.updateCatalog);
router.post("/cancelCatalogPayment", catalogCtrl.cancelCatalogPayment);
router.get(
  "/getAllCancelCatalogPayments",
  catalogCtrl.getAllCancelCatalogPayments
);
router.get("/getAllCatalogApprovePayments", catalogCtrl.getAllCatalogApprovePayments);
router.get("/getCatalogPayment", catalogCtrl.getCatalogPayments); // Step2
router.post("/setCatalogAllotment", catalogCtrl.setCatalogAllotment); // Step3
router.post("/getbyUserCatalog", catalogCtrl.getUserCatalog); // Step4
router.post("/approveCatalogPayment", catalogCtrl.approveCatalogPayment);
router.post("/catalogPayment1",catalogCtrl.createCatalogPayment1)

// Catalog Payment and Allotment ENDS

// Admin API STARTS
router.post(
  "/create-products",
  upload.single("image"),
  productController.createProduct
);
router.put(
  "/update-products/:id",
  upload.single("image"),
  productController.updateProduct
);
router.delete("/delete-products/:id", productController.deleteProduct);
router.get("/get-users", userController.getAllUsers);
router.get("/getRate", goldpriceController.fetchAndStoreGoldRate);
router.get("/getAllCurrentRate", goldpriceController.getAllCurrentRate);
router.get("/getAllPayments", paymentController.getAllPayments);
router.post("/approve-payment", paymentController.approvePayment);
router.get("/getProductCount", productController.getProductCount);
// Admin API ENDS

// Tax and Delivery Charge APIs STARTS
const taxController = require("../controllers/taxController");
const deliveryChargeController = require("../controllers/deliveryChargeController");

router.post("/createTax", taxController.createTax);
router.get("/getTax", taxController.getTax);
router.put("/updateTax",  taxController.updateTax);
router.delete("/deleteTax",  taxController.deleteTax);

router.post("/createDeliveryCharge",  deliveryChargeController.createDeliveryCharge);
router.get("/getDeliveryCharge", deliveryChargeController.getDeliveryCharge);
router.put("/updateDeliveryCharge",  deliveryChargeController.updateDeliveryCharge);
router.delete("/deleteDeliveryCharge",  deliveryChargeController.deleteDeliveryCharge);
// Tax and Delivery Charge APIs ENDS

// Address APIs STARTS
router.post("/addDeliveryAddress", auth, addressController.addDeliveryAddress);
router.post("/getDeliveryAddress", addressController.getDeliveryAddress);
router.put("/updateDeliveryAddress", auth, addressController.updateDeliveryAddress);
router.post("/deleteDeliveryAddress", auth, addressController.deleteDeliveryAddress);
// Address APIs ENDS

//coinpayment starts
router.post('/createCoinPayment', coinController.createCoinPayment);
router.get('/getAllCoinPayment', coinController.getAllCoinPayment);
// router.get('/getPendingCoinPayments', coinController.getPendingCoinPayments);
router.get('/getApprovedCoinPayments', coinController.getApprovedCoinPayments);
router.get('/getCancelledCoinPayments', coinController.getCancelledCoinPayments);
router.post('/setCoinAllotment', coinController.setCoinAllotment);
router.get('/getCoinPaymentById/:id', coinController.getCoinPaymentById);
router.patch('/approveCoinPayment/:id', coinController.approveCoinPayment);
router.patch('/cancelCoinPayment/:id', coinController.cancelCoinPayment);
router.post('/createCoinPayment1', coinController.createCoinPayment1);
router.get('/getCoinPaymentHistory/:mobileNumber', coinController.getCoinPaymentHistory);

// List all files in uploads directory
const fs = require("fs");
router.get("/uploads", (req, res) => {
  fs.readdir("uploads", (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Unable to list files." });
    }
    res.json({ files });
  });
});

module.exports = router;
