import express from 'express';
import { body } from 'express-validator';
import authService from '../services/authService.js';
import { protect } from '../middleware/auth.js';
import { auditLogger } from '../middleware/security.js';
import { authLimiter, validate } from '../middleware/security.js';

const router = express.Router();

// Register
router.post('/register', 
  authLimiter,
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').optional().isIn(['admin', 'accountant', 'viewer']).withMessage('Invalid role')
  ],
  validate,
  auditLogger('user.register', 'User'),
  async (req, res) => {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'User registered successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Login
router.post('/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').exists().withMessage('Password is required')
  ],
  validate,
  auditLogger('user.login', 'User'),
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json({
        success: true,
        data: result,
        message: 'Login successful'
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Get current user
router.get('/me', protect, (req, res) => {
  res.json({
    success: true,
    data: { user: req.user },
    message: 'User data retrieved successfully'
  });
});

// Logout (for backward compatibility)
router.post('/logout', protect, async (req, res) => {
  try {
    const result = await authService.logout(req.user._id);
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging out'
    });
  }
});

export default router;