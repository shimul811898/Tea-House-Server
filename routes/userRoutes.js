const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAdminStats,
  getMyStats,
} = require('../controllers/userController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// Stats
router.get('/stats/admin', verifyToken, verifyAdmin, getAdminStats);
router.get('/stats/my', verifyToken, getMyStats);

// Admin User Management
router.get('/', verifyToken, verifyAdmin, getAllUsers);
router.get('/:id', verifyToken, verifyAdmin, getUserById);
router.patch('/:id', verifyToken, verifyAdmin, updateUser);
router.delete('/:id', verifyToken, verifyAdmin, deleteUser);

module.exports = router;
