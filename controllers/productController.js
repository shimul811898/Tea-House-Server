const Product = require('../models/Product');

// @desc    Get all products with filters, search, and sorting
// @route   GET /api/products
const getProducts = async (req, res, next) => {
  try {
    const { category, search, featured, sort, limit, sellerId } = req.query;
    const filter = {};

    if (category && category !== 'All') {
      filter.category = new RegExp(`^${category.trim()}$`, 'i');
    }

    if (sellerId) {
      filter.sellerId = sellerId;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { category: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    if (featured !== undefined) {
      filter.featured = featured === 'true';
    }

    let query = Product.find(filter);

    // Sorting options
    if (sort === 'price-asc') {
      query = query.sort({ price: 1 });
    } else if (sort === 'price-desc') {
      query = query.sort({ price: -1 });
    } else if (sort === 'rating') {
      query = query.sort({ rating: -1 });
    } else {
      query = query.sort({ createdAt: -1 });
    }

    if (limit) {
      query = query.limit(parseInt(limit, 10));
    }

    const products = await query;
    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product by ID (Public)
// @route   GET /api/products/:id
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit / Save Sell Details (Create a product listing)
// @route   POST /api/products
// @access  Private (Authenticated User or Admin)
const createProduct = async (req, res, next) => {
  try {
    const { name, description, price, image, category, rating, stock, featured } = req.body;

    if (!name || !description || price === undefined || !image || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, description, price, image, category.',
      });
    }

    if (Number(price) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be greater than 0.',
      });
    }

    // Associate product with authenticated user's account
    const product = await Product.create({
      name: name.trim(),
      description: description.trim(),
      price: Number(price),
      image: image.trim(),
      category: category.trim(),
      rating: rating ? Number(rating) : 5.0,
      stock: stock !== undefined ? Math.max(1, Number(stock)) : 10,
      featured: req.user.role === 'admin' ? Boolean(featured) : false,
      sellerId: req.user._id,
      sellerName: req.user.name || 'Tea Enthusiast',
      sellerEmail: req.user.email,
    });

    res.status(201).json({
      success: true,
      message: 'Sell details submitted and product listed successfully!',
      product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user's listed products (Sell Details)
// @route   GET /api/products/seller/my
// @access  Private (Authenticated User)
const getMyListedProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ sellerId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a product (Owner or Admin)
// @route   PATCH /api/products/:id
// @access  Private
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check ownership or admin
    if (
      req.user.role !== 'admin' &&
      (!product.sellerId || product.sellerId.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to update this product listing.',
      });
    }

    // Regular users cannot modify featured status
    const updateData = { ...req.body };
    if (req.user.role !== 'admin') {
      delete updateData.featured;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Product listing updated successfully!',
      product: updatedProduct,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a product (Owner or Admin)
// @route   DELETE /api/products/:id
// @access  Private
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check ownership or admin
    if (
      req.user.role !== 'admin' &&
      (!product.sellerId || product.sellerId.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to delete this product listing.',
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Product listing deleted successfully!',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  getMyListedProducts,
  updateProduct,
  deleteProduct,
};
