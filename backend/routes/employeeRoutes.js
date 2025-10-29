const express = require('express');
const { body } = require('express-validator');
const employeeController = require('../controllers/employeeController');
const { auth, authorize, institutionAccess } = require('../middleware/auth');

const router = express.Router();

// Get employees by institution with pagination
router.get('/institution/:institutionId?',
  auth,
  institutionAccess,
  employeeController.getByInstitution
);

// **NEW: Get available employees (not on active missions)**
router.get('/available',
  auth,
  employeeController.getAvailableEmployees
);

// **NEW: End current mission for employee**
router.post('/:id/end-mission', [
  auth,
  authorize('admin_local', 'hr', 'dg'),
  body('reason').optional().trim()
], employeeController.endCurrentMission);

// Search employees
router.get('/search',
  auth,
  employeeController.search
);

// Get single employee
router.get('/:id',
  auth,
  employeeController.getById
);

// Create employee
router.post('/', [
  auth,
  authorize('admin_local', 'hr'),
  body('matricule').trim().notEmpty().withMessage('Matricule is required'),
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('passport_number').optional().trim(),
  body('position').trim().notEmpty().withMessage('Position is required'),
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('phone').optional().trim(),
  body('institution_id').optional().isUUID().withMessage('Invalid institution ID')
], employeeController.create);

// Update employee
router.put('/:id', [
  auth,
  authorize('admin_local', 'hr'),
  body('matricule').trim().notEmpty().withMessage('Matricule is required'),
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('passport_number').optional().trim(),
  body('position').trim().notEmpty().withMessage('Position is required'),
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('phone').optional().trim()
], employeeController.update);

// Delete employee
router.delete('/:id',
  auth,
  authorize('admin_local', 'hr'),
  employeeController.delete
);

module.exports = router;