const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'shimul181163@gmail.com';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const GOOGLE_REDIRECT_URI = `${CLIENT_URL}/api/auth/callback/google`;

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const googleOAuthClient = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET || 'teahouse_super_secret_jwt_key_2027',
    { expiresIn: '7d' }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword, image } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password.',
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password confirmation does not match password.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const assignedRole = normalizedEmail === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user';

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      image: image || '',
      role: assignedRole,
      authProvider: 'local',
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message:
          'This account was registered using Google. Please click "Continue with Google".',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Enforce admin role for designated admin email
    if (normalizedEmail === ADMIN_EMAIL.toLowerCase() && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Google Sign-In using real Google ID token (credential)
// @route   POST /api/auth/google
const googleAuth = async (req, res, next) => {
  try {
    const { idToken, email, name, image, googleId } = req.body;

    let payload = null;

    // --- Verify real Google ID token if provided ---
    if (idToken) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken,
          audience: GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
      } catch (verifyError) {
        console.warn('Google ID token verification failed:', verifyError.message);
        // Fall through to email-based flow if verification fails
      }
    }

    // Use verified payload or fall back to provided fields
    const googleEmail = (payload?.email || email || '').toLowerCase().trim();
    const googleName = payload?.name || name || googleEmail.split('@')[0];
    const googleImage = payload?.picture || image || '';
    const googleSub = payload?.sub || googleId || '';

    if (!googleEmail) {
      return res.status(400).json({
        success: false,
        message: 'Google email is required.',
      });
    }

    const isSystemAdmin = googleEmail === ADMIN_EMAIL.toLowerCase();

    let user = await User.findOne({ email: googleEmail });

    if (user) {
      // Update Google details if needed
      let updated = false;
      if (!user.image && googleImage) { user.image = googleImage; updated = true; }
      if (googleSub && !user.googleId) { user.googleId = googleSub; updated = true; }
      if (isSystemAdmin && user.role !== 'admin') { user.role = 'admin'; updated = true; }
      if (updated) await user.save();
    } else {
      // Create new Google user account
      user = await User.create({
        name: googleName,
        email: googleEmail,
        image: googleImage,
        googleId: googleSub,
        authProvider: 'google',
        role: isSystemAdmin ? 'admin' : 'user',
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: `Welcome, ${user.name}! Authenticated via Google.`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Google OAuth consent screen URL
// @route   GET /api/auth/google/url
const getGoogleAuthUrl = (req, res) => {
  try {
    const url = googleOAuthClient.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
    });
    res.status(200).json({ success: true, url });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Handle Google OAuth callback code redirect
// @route   GET /api/auth/callback/google
const googleCallback = async (req, res, next) => {
  try {
    const { code, error } = req.query;

    if (error) {
      return res.redirect(`${CLIENT_URL}/login?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return res.redirect(`${CLIENT_URL}/login?error=no_code_provided`);
    }

    // Exchange authorization code for tokens
    const { tokens } = await googleOAuthClient.getToken(code);
    googleOAuthClient.setCredentials(tokens);

    let googleEmail = '';
    let googleName = '';
    let googleImage = '';
    let googleSub = '';

    if (tokens.id_token) {
      const ticket = await googleClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      googleEmail = (payload?.email || '').toLowerCase().trim();
      googleName = payload?.name || googleEmail.split('@')[0];
      googleImage = payload?.picture || '';
      googleSub = payload?.sub || '';
    }

    if (!googleEmail) {
      return res.redirect(`${CLIENT_URL}/login?error=email_not_found`);
    }

    const isSystemAdmin = googleEmail === ADMIN_EMAIL.toLowerCase();

    let user = await User.findOne({ email: googleEmail });
    if (user) {
      let updated = false;
      if (!user.image && googleImage) { user.image = googleImage; updated = true; }
      if (googleSub && !user.googleId) { user.googleId = googleSub; updated = true; }
      if (isSystemAdmin && user.role !== 'admin') { user.role = 'admin'; updated = true; }
      if (updated) await user.save();
    } else {
      user = await User.create({
        name: googleName,
        email: googleEmail,
        image: googleImage,
        googleId: googleSub,
        authProvider: 'google',
        role: isSystemAdmin ? 'admin' : 'user',
      });
    }

    const token = generateToken(user);

    // Redirect to client callback page with token
    const targetPath = user.role === 'admin' ? '/admin' : '/dashboard';
    return res.redirect(
      `${CLIENT_URL}/auth/callback?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(targetPath)}`
    );
  } catch (err) {
    console.error('Google callback error:', err);
    return res.redirect(`${CLIENT_URL}/login?error=${encodeURIComponent(err.message || 'oauth_failed')}`);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
const logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
};

// @desc    Get current authenticated user
// @route   GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PATCH /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, image } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (image !== undefined) user.image = image;

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully!',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        image: updatedUser.image,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  googleAuth,
  getGoogleAuthUrl,
  googleCallback,
  logout,
  getMe,
  updateProfile,
};
