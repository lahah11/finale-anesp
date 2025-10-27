const express = require('express');
const { body } = require('express-validator');
const signatureController = require('../controllers/signatureController');
const { auth, authorize, institutionAccess } = require('../middleware/auth');
const { upload, processImage } = require('../middleware/upload');

const router = express.Router();

// Get signatures by institution
router.get('/institution/:institutionId?', 
  auth, 
  institutionAccess,
  signatureController.getByInstitution
);

// Create signature
router.post('/', [
  auth,
  authorize('admin_local'),
  upload.fields([
    { name: 'signature', maxCount: 1 },
    { name: 'stamp', maxCount: 1 }
  ]),
  body('signed_by').trim().notEmpty().withMessage('Signed by is required'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('role').isIn(['dg', 'msgg']).withMessage('Role must be dg or msgg'),
  body('institution_id').optional().isUUID().withMessage('Invalid institution ID')
], signatureController.create);

// Update signature
router.put('/:id', [
  auth,
  authorize('admin_local'),
  upload.fields([
    { name: 'signature', maxCount: 1 },
    { name: 'stamp', maxCount: 1 }
  ]),
  body('signed_by').trim().notEmpty().withMessage('Signed by is required'),
  body('title').trim().notEmpty().withMessage('Title is required')
], signatureController.update);

// Delete signature
router.delete('/:id', 
  auth, 
  authorize('admin_local'), 
  signatureController.delete
);

module.exports = router;