const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
} = require('../controllers/orderController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// Protected (User)
router.post('/', verifyToken, createOrder);
router.get('/my', verifyToken, getMyOrders);

// Admin
router.get('/', verifyToken, verifyAdmin, getAllOrders);

// Protected (Single order - user or admin)
router.get('/:id', verifyToken, getOrderById);

// Admin status update & delete
router.patch('/:id/status', verifyToken, verifyAdmin, updateOrderStatus);
router.delete('/:id', verifyToken, verifyAdmin, deleteOrder);

module.exports = router;
