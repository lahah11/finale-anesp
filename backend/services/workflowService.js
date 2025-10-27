const { query } = require('../config/database');

const WorkflowService = {
  // Étape 1: L'ingénieur soumet la mission pour validation
  submitMission: async (missionId, userId) => {
    try {
      await query(
        'UPDATE missions SET status = ?, current_step = ? WHERE id = ?',
        ['pending_technical', 2, missionId]
      );
      
      // Log de l'action
      await query(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
        [userId, 'mission_submitted', 'mission', missionId, 'Mission soumise pour validation technique']
      );
      
      return { success: true, message: 'Mission soumise pour validation technique' };
    } catch (error) {
      console.error('Submit mission error:', error);
      throw error;
    }
  },

  // Étape 2: Le Directeur Technique valide ou refuse
  validateTechnical: async (missionId, userId, action, rejectionReason = null) => {
    try {
      if (action === 'approve') {
        await query(
          'UPDATE missions SET status = ?, current_step = ?, technical_validated_by = ?, technical_validated_at = ? WHERE id = ?',
          ['pending_logistics', 3, userId, new Date().toISOString(), missionId]
        );
        
        await query(
          'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
          [userId, 'mission_technical_approved', 'mission', missionId, 'Validation technique approuvée']
        );
        
        return { success: true, message: 'Mission validée techniquement', nextStep: 'logistics' };
      } else {
        await query(
          'UPDATE missions SET status = ?, current_step = ?, technical_validated_by = ?, technical_validated_at = ?, technical_rejection_reason = ? WHERE id = ?',
          ['rejected', 2, userId, new Date().toISOString(), rejectionReason, missionId]
        );
        
        await query(
          'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
          [userId, 'mission_technical_rejected', 'mission', missionId, `Refus technique: ${rejectionReason}`]
        );
        
        return { success: true, message: 'Mission refusée techniquement', nextStep: 'rejected' };
      }
    } catch (error) {
      console.error('Validate technical error:', error);
      throw error;
    }
  },

  // Étape 3: Service des Moyens Généraux attribue véhicule et chauffeur
  assignLogistics: async (missionId, userId, vehicleId, driverId) => {
    try {
      // Récupérer les informations du véhicule et du chauffeur
      const vehicleResult = await query('SELECT * FROM vehicles WHERE id = ?', [vehicleId]);
      const driverResult = await query('SELECT * FROM drivers WHERE id = ?', [driverId]);
      
      const vehicle = vehicleResult.rows[0];
      const driver = driverResult.rows[0];
      
      // Mettre à jour la mission avec les informations unifiées
      await query(
        `UPDATE missions SET 
         logistics_validated_by = ?, logistics_validated_at = ?, 
         assigned_vehicle_id = ?, assigned_driver_id = ?,
         vehicle_plate = ?, vehicle_model = ?, vehicle_brand = ?,
         driver_name = ?, driver_phone = ?, driver_license = ?,
         status = ?, current_step = ?
         WHERE id = ?`,
        [
          userId, new Date().toISOString(), vehicleId, driverId,
          vehicle?.matricule || vehicle?.registration_number || vehicle?.plate,
          vehicle?.model || vehicle?.modele,
          vehicle?.brand || vehicle?.marque,
          driver?.name || driver?.full_name || driver?.driver_name,
          driver?.phone || driver?.phone_number || driver?.mobile,
          driver?.license || driver?.license_number,
          'pending_finance', 4, missionId
        ]
      );
      
      // Marquer le véhicule et le chauffeur comme indisponibles
      await query('UPDATE vehicles SET is_available = 0 WHERE id = ?', [vehicleId]);
      await query('UPDATE drivers SET is_available = 0, current_mission_id = ? WHERE id = ?', [missionId, driverId]);
      
      await query(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
        [userId, 'mission_logistics_assigned', 'mission', missionId, `Véhicule ${vehicleId} et chauffeur ${driverId} assignés`]
      );
      
      return { success: true, message: 'Moyens logistiques attribués', nextStep: 'finance' };
    } catch (error) {
      console.error('Assign logistics error:', error);
      throw error;
    }
  },

  // Étape 4: DAF valide la dotation financière
  validateFinance: async (missionId, userId, action, rejectionReason = null) => {
    try {
      if (action === 'approve') {
        await query(
          'UPDATE missions SET status = ?, current_step = ?, finance_validated_by = ?, finance_validated_at = ? WHERE id = ?',
          ['pending_dg', 5, userId, new Date().toISOString(), missionId]
        );
        
        await query(
          'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
          [userId, 'mission_finance_approved', 'mission', missionId, 'Validation financière approuvée']
        );
        
        return { success: true, message: 'Dotation financière validée', nextStep: 'dg' };
      } else {
        await query(
          'UPDATE missions SET status = ?, current_step = ?, finance_validated_by = ?, finance_validated_at = ?, finance_rejection_reason = ? WHERE id = ?',
          ['rejected', 4, userId, new Date().toISOString(), rejectionReason, missionId]
        );
        
        await query(
          'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
          [userId, 'mission_finance_rejected', 'mission', missionId, `Refus financier: ${rejectionReason}`]
        );
        
        return { success: true, message: 'Dotation financière refusée', nextStep: 'rejected' };
      }
    } catch (error) {
      console.error('Validate finance error:', error);
      throw error;
    }
  },

  // Étape 5: DG valide définitivement et envoie l'ordre de mission
  validateFinal: async (missionId, userId, action, rejectionReason = null) => {
    try {
      if (action === 'approve') {
        await query(
          'UPDATE missions SET status = ?, current_step = ?, dg_validated_by = ?, dg_validated_at = ? WHERE id = ?',
          ['validated', 6, userId, new Date().toISOString(), missionId]
        );
        
        await query(
          'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
          [userId, 'mission_final_approved', 'mission', missionId, 'Validation finale approuvée - Ordre de mission émis']
        );
        
        return { success: true, message: 'Mission validée définitivement - Ordre de mission émis', nextStep: 'completed' };
      } else {
        await query(
          'UPDATE missions SET status = ?, current_step = ?, dg_validated_by = ?, dg_validated_at = ?, dg_rejection_reason = ? WHERE id = ?',
          ['rejected', 5, userId, new Date().toISOString(), rejectionReason, missionId]
        );
        
        await query(
          'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
          [userId, 'mission_final_rejected', 'mission', missionId, `Refus final: ${rejectionReason}`]
        );
        
        return { success: true, message: 'Mission refusée définitivement', nextStep: 'rejected' };
      }
    } catch (error) {
      console.error('Validate final error:', error);
      throw error;
    }
  },

  // Obtenir le statut actuel d'une mission
  getMissionStatus: async (missionId) => {
    try {
      const result = await query(
        'SELECT status, current_step, mission_reference, mission_object FROM missions WHERE id = ?',
        [missionId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const mission = result.rows[0];
      const stepNames = {
        1: 'Création par l\'ingénieur',
        2: 'Validation technique',
        3: 'Attribution logistique',
        4: 'Validation financière',
        5: 'Validation finale',
        6: 'Mission validée'
      };
      
      return {
        ...mission,
        current_step_name: stepNames[mission.current_step] || 'Inconnu',
        workflow_completed: mission.status === 'validated'
      };
    } catch (error) {
      console.error('Get mission status error:', error);
      throw error;
    }
  },

  // Obtenir les missions en attente pour un rôle spécifique
  getPendingMissionsForRole: async (userId, userRole, institutionId) => {
    try {
      let statusFilter = '';
      let stepFilter = '';
      
      switch (userRole) {
        case 'directeur_technique':
          statusFilter = 'pending_technical';
          stepFilter = '2';
          break;
        case 'msgg':
          statusFilter = 'pending_logistics';
          stepFilter = '3';
          break;
        case 'daf':
          statusFilter = 'pending_finance';
          stepFilter = '4';
          break;
        case 'dg':
          statusFilter = 'pending_dg';
          stepFilter = '5';
          break;
        default:
          return [];
      }
      
      const result = await query(
        `SELECT m.*, u.username as created_by_name 
         FROM missions m 
         JOIN users u ON m.created_by = u.id 
         WHERE m.institution_id = ? AND m.status = ? AND m.current_step = ? 
         ORDER BY m.created_at DESC`,
        [institutionId, statusFilter, stepFilter]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Get pending missions error:', error);
      throw error;
    }
  }
};

module.exports = WorkflowService;


