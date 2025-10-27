const { query } = require('../config/database');
const SimpleUnifiedMissionService = require('./simpleUnifiedMissionService');

const WorkflowService = {
  submitMission: async (missionId, userId) => {
    await query(
      'UPDATE missions_unified SET status = ?, current_step = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['pending_technical', 2, missionId]
    );

    await query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [userId, 'mission_submitted', 'mission', missionId, 'Mission soumise pour validation technique']
    );

    return { success: true, message: 'Mission soumise pour validation technique' };
  },

  validateTechnical: (missionId, userId, action, rejectionReason) =>
    SimpleUnifiedMissionService.validateTechnical(missionId, userId, action, rejectionReason),

  assignLogistics: (missionId, userId, payload) =>
    SimpleUnifiedMissionService.assignLogistics(missionId, userId, payload),

  validateFinance: (missionId, userId, action, rejectionReason) =>
    SimpleUnifiedMissionService.validateFinance(missionId, userId, action, rejectionReason),

  validateFinal: (missionId, userId, action, rejectionReason) =>
    SimpleUnifiedMissionService.validateFinal(missionId, userId, action, rejectionReason),

  getMissionStatus: async (missionId) => {
    const result = await query(
      'SELECT status, current_step, mission_reference, mission_object FROM missions_unified WHERE id = ?',
      [missionId]
    );

    if (!result.rows.length) {
      return null;
    }

    const mission = result.rows[0];
    const stepNames = {
      1: "Création par l'ingénieur",
      2: 'Validation technique',
      3: 'Attribution logistique',
      4: 'Validation financière',
      5: 'Validation finale',
      6: 'Mission validée',
      7: 'Mission archivée'
    };

    return {
      ...mission,
      current_step_name: stepNames[mission.current_step] || 'Inconnu',
      workflow_completed: ['validated', 'archived'].includes(mission.status)
    };
  },

  getPendingMissionsForRole: async (userId, roleCode, institutionId) => {
    const statusByRole = {
      'directeur_technique': 'pending_technical',
      'role-msgg': 'pending_logistics',
      'role-daf': 'pending_finance',
      'directeur_general': 'pending_dg'
    };

    const status = statusByRole[roleCode];
    if (!status) return [];

    const result = await query(
      'SELECT * FROM missions_unified WHERE institution_id = ? AND status = ?',
      [institutionId, status]
    );
    return result.rows;
  }
};

module.exports = WorkflowService;
