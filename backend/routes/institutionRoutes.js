const express = require('express');
const { body } = require('express-validator');
const institutionController = require('../controllers/institutionController');
const { auth, authorize } = require('../middleware/auth');
const { upload, processImage } = require('../middleware/upload');
const PermissionService = require('../services/permissionService');

const router = express.Router();

// Get all institutions (Super Admin only)
router.get('/', 
  auth, 
  authorize('super_admin'), 
  institutionController.getAll
);

// Get single institution
router.get('/:id', 
  auth, 
  institutionController.getById
);

// Create institution (Super Admin only)
router.post('/', [
  auth,
  authorize('super_admin'),
  upload.single('logo'),
  body('name').trim().notEmpty().withMessage('Institution name is required'),
  body('type').isIn(['ministerial', 'etablissement']).withMessage('Type must be ministerial or etablissement'),
  body('header_text').optional().trim(),
  body('footer_text').optional().trim(),
  body('address').optional().trim(),
  body('contact_phone').optional().trim(),
  body('contact_email').optional().isEmail().withMessage('Valid email required'),
  body('website').optional().isURL().withMessage('Valid URL required'),
  body('establishment_date').optional().isISO8601().withMessage('Valid date required'),
  // Admin user validation
  body('admin_username').trim().notEmpty().withMessage('Admin username is required'),
  body('admin_email').isEmail().withMessage('Valid admin email required'),
  body('admin_password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], processImage, institutionController.create);

// Update institution
router.put('/:id', [
  auth,
  authorize('super_admin', 'admin_local'),
  upload.single('logo'),
  body('name').trim().notEmpty().withMessage('Institution name is required'),
  body('type').isIn(['ministerial', 'etablissement']).withMessage('Type must be ministerial or etablissement'),
  body('header_text').optional().trim(),
  body('footer_text').optional().trim()
], processImage, institutionController.update);

// Delete institution (Super Admin only)
router.delete('/:id', 
  auth, 
  authorize('super_admin'), 
  institutionController.delete
);

// Get institution roles
router.get('/:id/roles', 
  auth, 
  PermissionService.requirePermission('institution_manage'),
  institutionController.getRoles
);

// Get role permissions
router.get('/:id/roles/:roleId/permissions', 
  auth, 
  PermissionService.requirePermission('institution_manage'),
  institutionController.getRolePermissions
);

// Update role permissions
router.put('/:id/roles/:roleId/permissions', 
  auth, 
  PermissionService.requirePermission('institution_manage'),
  institutionController.updateRolePermissions
);

// Get institution workflow
router.get('/:id/workflow', 
  auth, 
  PermissionService.requirePermission('institution_manage'),
  institutionController.getWorkflow
);

// Update institution workflow
router.put('/:id/workflow', 
  auth, 
  PermissionService.requirePermission('institution_manage'),
  institutionController.updateWorkflow
);

module.exports = router;