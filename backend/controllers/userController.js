const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { validationResult } = require('express-validator');

const userController = {
  // Get all users (for super admin)
  getAllUsers: async (req, res) => {
    try {
      const result = await query(`
        SELECT u.id, u.username, u.email, u.role, u.institution_id, u.institution_role_id, u.is_active, u.created_at,
               i.name as institution_name,
               ir.role_name, ir.role_code
        FROM users u
        LEFT JOIN institutions i ON u.institution_id = i.id
        LEFT JOIN institution_roles ir ON u.institution_role_id = ir.id
        ORDER BY u.created_at DESC
      `);

      res.json(result.rows || []);
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get users by institution
  getByInstitution: async (req, res) => {
    try {
      const institutionId = req.user.role === 'super_admin' 
        ? req.params.institutionId 
        : req.user.institution_id;

      const result = await query(
        `SELECT id, username, email, role, is_active, created_at 
         FROM users 
         WHERE institution_id = ? OR (institution_id IS NULL AND role = 'super_admin')
         ORDER BY created_at DESC`,
        [institutionId]
      );

      res.json(result.rows || []);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Create user
  create: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, email, password, role, institution_id } = req.body;

      // WORKFLOW VALIDATION
      if (req.user.role === 'super_admin') {
        // Super Admin can only create admin_local users and MUST specify institution_id
        if (role !== 'admin_local') {
          return res.status(403).json({ error: 'Super Admin can only create Admin Local users' });
        }
        
        if (!institution_id) {
          return res.status(400).json({ error: 'Institution ID is required when creating Admin Local users' });
        }
        
        // Verify institution exists
        const institutionCheck = await query('SELECT id FROM institutions WHERE id = ?', [institution_id]);
        if (institutionCheck.rows.length === 0) {
          return res.status(400).json({ error: 'Institution not found' });
        }
      } else if (req.user.role === 'admin_local') {
        // Admin Local can create hr, dg, msgg, agent, police for their institution only
        const allowedRoles = ['hr', 'dg', 'msgg', 'agent', 'police'];
        if (!allowedRoles.includes(role)) {
          return res.status(403).json({ error: 'Admin Local can only create HR, DG, MSGG, Agent, or Police users' });
        }
        
        // Must use their own institution_id
        if (institution_id && institution_id !== req.user.institution_id) {
          return res.status(403).json({ error: 'Cannot create user for different institution' });
        }
      } else {
        return res.status(403).json({ error: 'Insufficient permissions to create users' });
      }

      // Determine the final institution_id
      let finalInstitutionId;
      if (req.user.role === 'super_admin') {
        finalInstitutionId = institution_id; // Required for super_admin
      } else {
        finalInstitutionId = req.user.institution_id; // Use admin_local's institution
      }

      // Check if username/email already exists
      const existingUser = await query(
        'SELECT id FROM users WHERE username = ? OR email = ?',
        [username, email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const result = await query(
        `INSERT INTO users (username, email, password, role, institution_id) 
         VALUES (?, ?, ?, ?, ?)`,
        [username, email, hashedPassword, role, finalInstitutionId]
      );

      // Récupérer l'utilisateur créé
      const newUser = await query(
        'SELECT id, username, email, role, institution_id, created_at FROM users WHERE id = ?',
        [result.lastID || result.lastInsertRowid]
      );

      res.status(201).json({
        message: 'User created successfully',
        user: newUser.rows[0]
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update user
  update: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { username, email, role, is_active } = req.body;

      // Check if user exists and belongs to same institution
      const existingUser = await query(
        'SELECT institution_id FROM users WHERE id = ?',
        [id]
      );

      if (existingUser.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (req.user.role !== 'super_admin' && 
          existingUser.rows[0].institution_id !== req.user.institution_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await query(
        `UPDATE users SET username = ?, email = ?, role = ?, is_active = ?, updated_at = datetime('now') 
         WHERE id = ?`,
        [username, email, role, is_active, id]
      );

      // Récupérer l'utilisateur mis à jour
      const result = await query(
        'SELECT id, username, email, role, is_active, institution_id, updated_at FROM users WHERE id = ?',
        [id]
      );

      res.json({
        message: 'User updated successfully',
        user: result.rows[0]
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete user
  delete: async (req, res) => {
    try {
      const { id } = req.params;

      // Check if user exists and belongs to same institution
      const existingUser = await query(
        'SELECT institution_id FROM users WHERE id = ?',
        [id]
      );

      if (existingUser.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (req.user.role !== 'super_admin' && 
          existingUser.rows[0].institution_id !== req.user.institution_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await query('DELETE FROM users WHERE id = ?', [id]);

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = userController;