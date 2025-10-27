const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { validationResult } = require('express-validator');

const authController = {
  // Login
  login: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password } = req.body;

      const result = await query(
        `SELECT u.id, u.username, u.email, u.password, u.role, u.institution_id, u.institution_role_id, i.name as institution_name, i.type as institution_type
         FROM users u 
         LEFT JOIN institutions i ON u.institution_id = i.id 
         WHERE u.username = ? AND u.is_active = 1`,
        [username]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: user.id, role: user.role, institutionId: user.institution_id },
        process.env.JWT_SECRET || 'anesp-mission-system-secret-key-2025',
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          institution_id: user.institution_id,
          institution_role_id: user.institution_role_id,
          institution_name: user.institution_name,
          institution_type: user.institution_type
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get current user profile
  getProfile: async (req, res) => {
    try {
      const result = await query(
        `SELECT u.id, u.username, u.email, u.role, u.institution_id, u.institution_role_id, i.name as institution_name, i.type as institution_type
         FROM users u 
         LEFT JOIN institutions i ON u.institution_id = i.id 
         WHERE u.id = ?`,
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Change password
  changePassword: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;

      const result = await query('SELECT password FROM users WHERE id = $1', [req.user.id]);
      const user = result.rows[0];

      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await query(
        'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [hashedPassword, req.user.id]
      );

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = authController;