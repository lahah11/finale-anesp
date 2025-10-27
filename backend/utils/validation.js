const { body, param, query } = require('express-validator');

const validationRules = {
  // User validation
  userCreate: [
    body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['super_admin', 'admin_local', 'hr', 'dg', 'msgg', 'agent', 'police']).withMessage('Invalid role'),
    body('institution_id').optional().isUUID().withMessage('Invalid institution ID')
  ],

  userUpdate: [
    param('id').isUUID().withMessage('Invalid user ID'),
    body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('role').isIn(['admin_local', 'hr', 'dg', 'msgg', 'agent', 'police']).withMessage('Invalid role'),
    body('is_active').isBoolean().withMessage('is_active must be boolean')
  ],

  // Institution validation
  institutionCreate: [
    body('name').trim().isLength({ min: 2, max: 255 }).withMessage('Institution name must be 2-255 characters'),
    body('type').isIn(['ministerial', 'etablissement']).withMessage('Type must be ministerial or etablissement'),
    body('header_text').optional().trim().isLength({ max: 500 }).withMessage('Header text too long'),
    body('footer_text').optional().trim().isLength({ max: 500 }).withMessage('Footer text too long')
  ],

  // Employee validation
  employeeCreate: [
    body('matricule').trim().isLength({ min: 1, max: 50 }).withMessage('Matricule required'),
    body('full_name').trim().isLength({ min: 2, max: 255 }).withMessage('Full name must be 2-255 characters'),
    body('passport_number').optional().trim().isLength({ max: 50 }),
    body('position').trim().isLength({ min: 2, max: 255 }).withMessage('Position required'),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().trim().isLength({ max: 20 }),
    body('institution_id').optional().isUUID().withMessage('Invalid institution ID')
  ],

  // Mission validation
  missionCreate: [
    body('employee_id').isUUID().withMessage('Valid employee ID required'),
    body('destination').trim().isLength({ min: 2, max: 255 }).withMessage('Destination required'),
    body('transport_mode').trim().isLength({ min: 2, max: 100 }).withMessage('Transport mode required'),
    body('objective').trim().isLength({ min: 10, max: 1000 }).withMessage('Objective must be 10-1000 characters'),
    body('departure_date').isISO8601().withMessage('Valid departure date required'),
    body('return_date').isISO8601().withMessage('Valid return date required')
      .custom((value, { req }) => {
        if (new Date(value) <= new Date(req.body.departure_date)) {
          throw new Error('Return date must be after departure date');
        }
        if (new Date(value) <= new Date()) {
          throw new Error('Return date must be in the future');
        }
        return true;
      })
  ],

  // Signature validation
  signatureCreate: [
    body('signed_by').trim().isLength({ min: 2, max: 255 }).withMessage('Signed by required'),
    body('title').trim().isLength({ min: 2, max: 255 }).withMessage('Title required'),
    body('role').isIn(['dg', 'msgg']).withMessage('Role must be dg or msgg'),
    body('institution_id').optional().isUUID().withMessage('Invalid institution ID')
  ],

  // Query validation
  pagination: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('status').optional().isIn(['draft', 'pending_dg', 'pending_msgg', 'validated', 'cancelled']).withMessage('Invalid status')
  ],

  // Auth validation
  login: [
    body('username').trim().notEmpty().withMessage('Username required'),
    body('password').notEmpty().withMessage('Password required')
  ],

  changePassword: [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
  ]
};

module.exports = validationRules;