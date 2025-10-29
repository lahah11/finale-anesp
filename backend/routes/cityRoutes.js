const express = require('express');
const { query } = require('../config/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Obtenir toutes les villes (sans authentification pour permettre l'accès depuis le frontend)
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM cities ORDER BY name');
    res.json({ cities: result.rows });
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Obtenir les distances entre villes (sans authentification)
router.get('/distances', async (req, res) => {
  try {
    const { from_city, to_city } = req.query;
    
    if (!from_city || !to_city) {
      return res.status(400).json({ error: 'from_city and to_city parameters are required' });
    }
    
    const result = await query(`
      SELECT cd.*, c1.name as from_city_name, c2.name as to_city_name
      FROM city_distances cd
      JOIN cities c1 ON cd.from_city_id = c1.id
      JOIN cities c2 ON cd.to_city_id = c2.id
      WHERE c1.name = ? AND c2.name = ?
    `, [from_city, to_city]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Distance not found between these cities' });
    }
    
    res.json({ distance: result.rows[0] });
  } catch (error) {
    console.error('Error fetching distance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
