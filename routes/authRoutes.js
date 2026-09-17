const express = require('express');
const router = express.Router();
const {
  register,
  login,
  googleAuth,
  getGoogleAuthUrl,
  googleCallback,
  logout,
  getMe,
  updateProfile,
} = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/google/url', getGoogleAuthUrl);
router.get('/callback/google', googleCallback);
router.post('/logout', logout);
router.get('/me', verifyToken, getMe);
router.patch('/profile', verifyToken, updateProfile);

module.exports = router;
