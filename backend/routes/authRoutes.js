const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], authController.login);

// router.get('/verify', auth, authController.verify);

//  router.post('/logout', auth, authController.logout);

// Get profile
router.get('/profile', auth, authController.getProfile);

// Change password
router.put('/change-password', [
  auth,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], authController.changePassword);

module.exports = router;