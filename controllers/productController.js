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
    const { tagid, description, goldtype, price, grams } = req.body;
    const image = req.file ? req.file.filename : null;
    // Validation error: remove uploaded file
    if (!image || !tagid || !price || !grams) {
      if (image) {
        fs.unlink(path.join('uploads', image), () => {});
      }
      return res.status(400).json({ error: 'Image, tagid, price, and grams are required.' });
    }

    const product = new Product({ image, tagid, description, goldtype, price, grams });
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

// ✅ Update Product
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params; // product id from URL
    const { tagid, description, goldtype, price, grams } = req.body;
    const newImage = req.file ? req.file.filename : null;

    // Find existing product
    const product = await Product.findById(id);
    if (!product) {
      // remove uploaded file if product not found
      if (newImage) fs.unlink(path.join("uploads", newImage), () => {});
      return res.status(404).json({ error: "Product not found" });
    }

    // If new image uploaded, remove old one
    if (newImage && product.image) {
      fs.unlink(path.join("uploads", product.image), () => {});
      product.image = newImage;
    }

    // Update other fields if provided
    if (tagid) product.tagid = tagid;
    if (description) product.description = description;
    if (goldtype) product.goldtype = goldtype;
    if (price) product.price = price;
    if (grams) product.grams = grams;

    await product.save();
    res.json({ message: "Product updated", product });
  } catch (err) {
    // remove uploaded new file if error
    if (req.file && req.file.filename) {
      fs.unlink(path.join("uploads", req.file.filename), () => {});
    }
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Delete Product
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Remove image file if exists
    if (product.image) {
      fs.unlink(path.join("uploads", product.image), () => {});
    }

    res.json({ message: "Product deleted", product });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
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
