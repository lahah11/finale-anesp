const express = require('express');
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { auth, authorize, institutionAccess } = require('../middleware/auth');

const router = express.Router();

// Get all users (for admin)
router.get('/', 
  auth, 
  authorize('super_admin', 'admin_local'), 
  userController.getAllUsers
);

// Get users by institution
router.get('/institution/:institutionId?', 
  auth, 
  authorize('super_admin', 'admin_local'), 
  institutionAccess,
  userController.getByInstitution
);

// Create user
// Update the validation to make institution_id optional
router.post('/', [
  auth,
  authorize('super_admin', 'admin_local'),
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin_local', 'hr', 'dg', 'msgg', 'agent', 'police']).withMessage('Invalid role'),
  body('institution_id').optional().isUUID().withMessage('Invalid institution ID') // Make it optional
], userController.create);

// Update user
router.put('/:id', [
  auth,
  authorize('super_admin', 'admin_local'),
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('role').isIn(['admin_local', 'hr', 'dg', 'msgg', 'agent', 'police']).withMessage('Invalid role'),
  body('is_active').isBoolean().withMessage('is_active must be boolean')
], userController.update);

// Delete user
router.delete('/:id', 
  auth, 
  authorize('super_admin', 'admin_local'), 
  userController.delete
);

module.exports = router;