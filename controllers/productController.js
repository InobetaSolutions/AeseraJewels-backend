// Get product count
exports.getProductCount = async (req, res) => {
  try {
    const count = await Product.countDocuments();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};
const Product = require('../models/Product');

// Create a new product (accepts form-data, image as file)
const fs = require('fs');
const path = require('path');
exports.createProduct = async (req, res) => {
  try {
    const { tagid, description, goldtype, price } = req.body;
    const image = req.file ? req.file.filename : null;
    // Validation error: remove uploaded file
    if (!image || !tagid || !price) {
      if (image) {
        fs.unlink(path.join('uploads', image), () => {});
      }
      return res.status(400).json({ error: 'Image, tagid, and price are required.' });
    }
    // Check for duplicate tagid
    // const existingProduct = await Product.findOne({ tagid });
    // if (existingProduct) {
    //   if (image) {
    //     fs.unlink(path.join('uploads', image), () => {});
    //   }
    //   return res.status(409).json({ error: 'Product already exists in database.' });
    // }
    const product = new Product({ image, tagid, description, goldtype, price });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    // On error, remove uploaded file if present
    if (req.file && req.file.filename) {
      fs.unlink(path.join('uploads', req.file.filename), () => {});
    }
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get all products
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};
