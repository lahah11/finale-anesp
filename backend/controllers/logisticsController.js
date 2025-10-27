const { query } = require('../config/database');
const { validationResult } = require('express-validator');

const logisticsController = {
  // Obtenir tous les véhicules d'une institution
  getVehicles: async (req, res) => {
    try {
      const { institutionId } = req.params;
      
      const result = await query(
        'SELECT * FROM vehicles WHERE institution_id = ? ORDER BY license_plate',
        [institutionId]
      );
      
      res.json(result.rows);
    } catch (error) {
      console.error('Get vehicles error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Obtenir tous les chauffeurs d'une institution
  getDrivers: async (req, res) => {
    try {
      const { institutionId } = req.params;
      
      const result = await query(
        'SELECT * FROM drivers WHERE institution_id = ? ORDER BY full_name',
        [institutionId]
      );
      
      res.json(result.rows);
    } catch (error) {
      console.error('Get drivers error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Attribuer les moyens logistiques à une mission
  assignLogistics: async (req, res) => {
    try {
      const { missionId } = req.params;
      const { vehicle_id, driver_id, flight_ticket_pdf } = req.body;
      const userId = req.user.id;

      // Vérifier que la mission existe et est en attente d'attribution logistique
      const missionResult = await query(
        'SELECT * FROM missions WHERE id = ? AND status = ?',
        [missionId, 'pending_logistics']
      );

      if (missionResult.rows.length === 0) {
        return res.status(404).json({ error: 'Mission non trouvée ou non en attente d\'attribution logistique' });
      }

      const mission = missionResult.rows[0];

      // Si c'est une mission par voiture ANESP, vérifier le véhicule et le chauffeur
      if (mission.transport_mode === 'car' && mission.transport_type === 'anesp') {
        if (!vehicle_id || !driver_id) {
          return res.status(400).json({ 
            error: 'Véhicule et chauffeur requis pour une mission par voiture ANESP' 
          });
        }

        // Vérifier que le véhicule existe et est disponible
        const vehicleResult = await query(
          'SELECT * FROM vehicles WHERE id = ? AND institution_id = ?',
          [vehicle_id, mission.institution_id]
        );

        if (vehicleResult.rows.length === 0) {
          return res.status(404).json({ error: 'Véhicule non trouvé' });
        }

        // Vérifier que le chauffeur existe
        const driverResult = await query(
          'SELECT * FROM drivers WHERE id = ? AND institution_id = ?',
          [driver_id, mission.institution_id]
        );

        if (driverResult.rows.length === 0) {
          return res.status(404).json({ error: 'Chauffeur non trouvé' });
        }
      }

      // Si c'est une mission par voie aérienne, vérifier le PDF du billet
      if (mission.transport_mode === 'plane') {
        if (!flight_ticket_pdf) {
          return res.status(400).json({ 
            error: 'PDF du billet d\'avion requis pour une mission par voie aérienne' 
          });
        }
      }

      // Mettre à jour la mission avec les moyens logistiques
      await query(
        `UPDATE missions SET 
          status = ?, 
          current_step = ?, 
          logistics_validated_by = ?, 
          logistics_validated_at = CURRENT_TIMESTAMP,
          assigned_vehicle_id = ?,
          assigned_driver_id = ?,
          flight_ticket_pdf = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [
          'pending_finance', 
          4, 
          userId,
          vehicle_id || null,
          driver_id || null,
          flight_ticket_pdf || null,
          missionId
        ]
      );

      // Enregistrer l'action dans l'audit log
      await query(
        'INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)',
        [
          require('crypto').randomUUID(), 
          userId, 
          'assign_logistics', 
          'mission', 
          missionId, 
          `Moyens logistiques attribués: Véhicule ${vehicle_id || 'N/A'}, Chauffeur ${driver_id || 'N/A'}, Billet ${flight_ticket_pdf ? 'ajouté' : 'N/A'}`
        ]
      );

      res.json({ 
        message: 'Moyens logistiques attribués avec succès',
        mission_id: missionId,
        vehicle_id,
        driver_id,
        flight_ticket_pdf: flight_ticket_pdf ? 'ajouté' : null
      });

    } catch (error) {
      console.error('Assign logistics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = logisticsController;