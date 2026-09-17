const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  getMyListedProducts,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { verifyToken } = require('../middleware/auth');

// Public endpoints
router.get('/', getProducts);
router.get('/seller/my', verifyToken, getMyListedProducts);
router.get('/:id', getProductById);

// Protected endpoints (Selling & Listing requires login)
router.post('/', verifyToken, createProduct);
router.patch('/:id', verifyToken, updateProduct);
router.delete('/:id', verifyToken, deleteProduct);

module.exports = router;
