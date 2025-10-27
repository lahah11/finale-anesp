const express = require('express');
const { query } = require('../config/database-sqlite');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/roles - Récupérer tous les rôles
router.get('/', auth, async (req, res) => {
  try {
    const roles = await query(`
      SELECT id, role_name, role_code, description, created_at
      FROM institution_roles
      ORDER BY role_name
    `);
    
    res.json(roles.rows || []);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des rôles' });
  }
});

module.exports = router;
