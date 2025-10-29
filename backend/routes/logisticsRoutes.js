const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { auth } = require('../middleware/auth');

// GET /api/logistics/vehicles - Récupérer tous les véhicules de l'institution
router.get('/vehicles', auth, async (req, res) => {
  try {
    console.log('🔍 Debug vehicles GET - req.user:', req.user);
    console.log('🔍 Debug vehicles GET - institutionId:', req.user?.institution_id);
    
    const vehicles = await query(
      'SELECT * FROM vehicles WHERE institution_id = ? ORDER BY created_at DESC',
      [req.user.institution_id]
    );
    
    res.json(vehicles.rows || []);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des véhicules' });
  }
});

// POST /api/logistics/vehicles - Créer un nouveau véhicule
router.post('/vehicles', auth, async (req, res) => {
  try {
    console.log('🔍 Debug vehicles POST - req.user:', req.user);
    console.log('🔍 Debug vehicles POST - institutionId:', req.user?.institution_id);
    console.log('🔍 Debug vehicles POST - req.body:', req.body);
    
    const { license_plate, brand, model, year, color, status } = req.body;
    
    // Vérifier si le véhicule existe déjà
    const existingVehicle = await query(
      'SELECT id FROM vehicles WHERE registration_number = ? AND institution_id = ?',
      [license_plate, req.user.institution_id]
    );
    
    if (existingVehicle.rows && existingVehicle.rows.length > 0) {
      return res.status(400).json({ error: 'Un véhicule avec ce matricule existe déjà' });
    }
    
    // S'assurer que institution_id est disponible
    const institutionId = req.user.institution_id || '32c5a15e4679067315c5d2bab813e6d4'; // ID d'ANESP par défaut
    
    const result = await query(
      `INSERT INTO vehicles (registration_number, license_plate, brand, model, year, color, status, institution_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [license_plate, license_plate, brand, model, year || null, color || null, status || 'available', institutionId]
    );
    
    console.log('🔍 Debug vehicles POST - result:', result);
    console.log('🔍 Debug vehicles POST - lastID:', result.lastID);
    
    // Vérifier si lastID existe, sinon utiliser l'ID généré
    const vehicleId = result.lastID || result.lastInsertRowid;
    console.log('🔍 Debug vehicles POST - vehicleId utilisé:', vehicleId);
    
    if (!vehicleId) {
      console.error('❌ Aucun ID de véhicule retourné par l\'insertion');
      return res.status(500).json({ error: 'Erreur lors de la création du véhicule - ID manquant' });
    }
    
    const newVehicle = await query(
      'SELECT * FROM vehicles WHERE id = ?',
      [vehicleId]
    );
    
    console.log('🔍 Debug vehicles POST - newVehicle:', newVehicle.rows[0]);
    
    if (!newVehicle.rows || newVehicle.rows.length === 0) {
      console.error('❌ Véhicule créé mais non trouvé lors de la récupération');
      return res.status(500).json({ error: 'Véhicule créé mais non trouvé' });
    }
    
    res.status(201).json(newVehicle.rows[0]);
  } catch (error) {
    console.error('Error creating vehicle:', error);
    res.status(500).json({ error: 'Erreur lors de la création du véhicule' });
  }
});

// PUT /api/logistics/vehicles/:id - Modifier un véhicule
router.put('/vehicles/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { license_plate, brand, model, year, color, status } = req.body;
    
    // Vérifier si le véhicule appartient à l'institution
    const vehicle = await query(
      'SELECT id FROM vehicles WHERE id = ? AND institution_id = ?',
      [id, req.user.institution_id]
    );
    
    if (!vehicle.rows || vehicle.rows.length === 0) {
      return res.status(404).json({ error: 'Véhicule non trouvé' });
    }
    
    // Vérifier si le nouveau matricule existe déjà (sauf pour ce véhicule)
    const existingVehicle = await query(
      'SELECT id FROM vehicles WHERE registration_number = ? AND institution_id = ? AND id != ?',
      [license_plate, req.user.institution_id, id]
    );
    
    if (existingVehicle.rows && existingVehicle.rows.length > 0) {
      return res.status(400).json({ error: 'Un véhicule avec ce matricule existe déjà' });
    }
    
    await query(
      `UPDATE vehicles SET 
       registration_number = ?, license_plate = ?, brand = ?, model = ?, year = ?, color = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [license_plate, license_plate, brand, model, year || null, color || null, status, id]
    );
    
    const updatedVehicle = await query(
      'SELECT * FROM vehicles WHERE id = ?',
      [id]
    );
    
    res.json(updatedVehicle.rows[0]);
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({ error: 'Erreur lors de la modification du véhicule' });
  }
});

// DELETE /api/logistics/vehicles/:id - Supprimer un véhicule
router.delete('/vehicles/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier si le véhicule appartient à l'institution
    const vehicle = await query(
      'SELECT id FROM vehicles WHERE id = ? AND institution_id = ?',
      [id, req.user.institution_id]
    );
    
    if (!vehicle.rows || vehicle.rows.length === 0) {
      return res.status(404).json({ error: 'Véhicule non trouvé' });
    }
    
    await query('DELETE FROM vehicles WHERE id = ?', [id]);
    
    res.json({ message: 'Véhicule supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du véhicule' });
  }
});

// GET /api/logistics/drivers - Récupérer tous les chauffeurs de l'institution
router.get('/drivers', auth, async (req, res) => {
  try {
    const drivers = await query(
      'SELECT * FROM drivers WHERE institution_id = ? ORDER BY created_at DESC',
      [req.user.institution_id]
    );
    
    res.json(drivers.rows || []);
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des chauffeurs' });
  }
});

// POST /api/logistics/drivers - Créer un nouveau chauffeur
router.post('/drivers', auth, async (req, res) => {
  try {
    const { full_name, phone_number, license_number, license_type, license_expiry, status } = req.body;
    
    // Vérifier si le chauffeur existe déjà
    const existingDriver = await query(
      'SELECT id FROM drivers WHERE license_number = ? AND institution_id = ?',
      [license_number, req.user.institution_id]
    );
    
    if (existingDriver.rows && existingDriver.rows.length > 0) {
      return res.status(400).json({ error: 'Un chauffeur avec ce numéro de permis existe déjà' });
    }
    
    // S'assurer que institution_id est disponible
    const institutionId = req.user.institution_id || '32c5a15e4679067315c5d2bab813e6d4'; // ID d'ANESP par défaut
    
    const result = await query(
      `INSERT INTO drivers (name, full_name, phone, license_number, license_type, license_expiry_date, status, institution_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [full_name, full_name, phone_number, license_number, license_type || null, license_expiry || null, status || 'available', institutionId]
    );
    
    console.log('🔍 Debug drivers POST - result:', result);
    console.log('🔍 Debug drivers POST - lastID:', result.lastID);
    
    // Vérifier si lastID existe, sinon utiliser l'ID généré
    const driverId = result.lastID || result.lastInsertRowid;
    console.log('🔍 Debug drivers POST - driverId utilisé:', driverId);
    
    if (!driverId) {
      console.error('❌ Aucun ID de chauffeur retourné par l\'insertion');
      return res.status(500).json({ error: 'Erreur lors de la création du chauffeur - ID manquant' });
    }
    
    const newDriver = await query(
      'SELECT * FROM drivers WHERE id = ?',
      [driverId]
    );
    
    console.log('🔍 Debug drivers POST - newDriver:', newDriver.rows[0]);
    
    if (!newDriver.rows || newDriver.rows.length === 0) {
      console.error('❌ Chauffeur créé mais non trouvé lors de la récupération');
      return res.status(500).json({ error: 'Chauffeur créé mais non trouvé' });
    }
    
    res.status(201).json(newDriver.rows[0]);
  } catch (error) {
    console.error('Error creating driver:', error);
    res.status(500).json({ error: 'Erreur lors de la création du chauffeur' });
  }
});

// PUT /api/logistics/drivers/:id - Modifier un chauffeur
router.put('/drivers/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone_number, license_number, license_type, license_expiry, status } = req.body;
    
    // Vérifier si le chauffeur appartient à l'institution
    const driver = await query(
      'SELECT id FROM drivers WHERE id = ? AND institution_id = ?',
      [id, req.user.institution_id]
    );
    
    if (!driver.rows || driver.rows.length === 0) {
      return res.status(404).json({ error: 'Chauffeur non trouvé' });
    }
    
    // Vérifier si le nouveau numéro de permis existe déjà (sauf pour ce chauffeur)
    const existingDriver = await query(
      'SELECT id FROM drivers WHERE license_number = ? AND institution_id = ? AND id != ?',
      [license_number, req.user.institution_id, id]
    );
    
    if (existingDriver.rows && existingDriver.rows.length > 0) {
      return res.status(400).json({ error: 'Un chauffeur avec ce numéro de permis existe déjà' });
    }
    
    await query(
      `UPDATE drivers SET 
       name = ?, full_name = ?, phone = ?, license_number = ?, license_type = ?, license_expiry_date = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [full_name, full_name, phone_number, license_number, license_type || null, license_expiry || null, status, id]
    );
    
    const updatedDriver = await query(
      'SELECT * FROM drivers WHERE id = ?',
      [id]
    );
    
    res.json(updatedDriver.rows[0]);
  } catch (error) {
    console.error('Error updating driver:', error);
    res.status(500).json({ error: 'Erreur lors de la modification du chauffeur' });
  }
});

// DELETE /api/logistics/drivers/:id - Supprimer un chauffeur
router.delete('/drivers/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier si le chauffeur appartient à l'institution
    const driver = await query(
      'SELECT id FROM drivers WHERE id = ? AND institution_id = ?',
      [id, req.user.institution_id]
    );
    
    if (!driver.rows || driver.rows.length === 0) {
      return res.status(404).json({ error: 'Chauffeur non trouvé' });
    }
    
    await query('DELETE FROM drivers WHERE id = ?', [id]);
    
    res.json({ message: 'Chauffeur supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting driver:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du chauffeur' });
  }
});

module.exports = router;