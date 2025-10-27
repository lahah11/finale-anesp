const { query } = require('../config/database');

const ACTIVE_MISSION_STATUSES = [
  'pending_technical',
  'pending_logistics',
  'pending_finance',
  'pending_dg',
  'validated'
];

const MissionService = {
  getMissionById: async (missionId, userId = null, institutionId = null) => {
    try {
      const params = [missionId];
      let sql = `
        SELECT m.*, u.username as created_by_name, u.email as created_by_email
        FROM missions_unified m
        LEFT JOIN users u ON m.created_by = u.id
        WHERE m.id = ?
      `;

      if (institutionId) {
        sql += ' AND m.institution_id = ?';
        params.push(institutionId);
      }

      const missionResult = await query(sql, params);
      if (!missionResult.rows.length) {
        return null;
      }

      const mission = missionResult.rows[0];
      const participantsResult = await query(
        `SELECT mp.*, e.full_name AS employee_name, e.position AS employee_position
         FROM mission_participants mp
         LEFT JOIN employees e ON mp.employee_id = e.id
         WHERE mp.mission_id = ?
         ORDER BY mp.created_at ASC`,
        [missionId]
      );

      mission.participants = participantsResult.rows;
      return mission;
    } catch (error) {
      console.error('Get mission by ID error:', error);
      throw error;
    }
  },

  getMissionParticipants: async (missionId) => {
    try {
      const result = await query(
        `SELECT mp.*, e.full_name AS employee_name, e.position AS employee_position
         FROM mission_participants mp
         LEFT JOIN employees e ON mp.employee_id = e.id
         WHERE mp.mission_id = ?
         ORDER BY mp.created_at ASC`,
        [missionId]
      );
      return result.rows;
    } catch (error) {
      console.error('Get participants error:', error);
      throw error;
    }
  },

  getAvailableVehicles: async (institutionId) => {
    try {
      const result = await query(
        'SELECT * FROM vehicles WHERE institution_id = ? AND is_available = 1',
        [institutionId]
      );
      return result.rows;
    } catch (error) {
      console.error('Get vehicles error:', error);
      throw error;
    }
  },

  getAvailableDrivers: async (institutionId) => {
    try {
      const result = await query(
        'SELECT * FROM drivers WHERE institution_id = ? AND is_available = 1',
        [institutionId]
      );
      return result.rows;
    } catch (error) {
      console.error('Get drivers error:', error);
      throw error;
    }
  },

  calculateMissionCosts: async (participants, departureDate, returnDate, transportMode, institutionId) => {
    try {
      const startDate = new Date(departureDate);
      const endDate = new Date(returnDate);
      const daysDiff = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1);

      let totalCosts = 0;
      let estimatedFuel = 0;

      const allowancesResult = await query(
        'SELECT * FROM mission_allowances WHERE institution_id = ? AND is_active = 1',
        [institutionId]
      );
      const allowances = allowancesResult.rows;

      const enrichedParticipants = (participants || []).map((participant) => {
        const profileType = participant.participant_type === 'anesp' ? 'engineer' : 'external';
        const allowance = allowances.find((a) => a.profile_type === profileType);

        if (!allowance) {
          return {
            ...participant,
            daily_allowance: 0,
            accommodation_allowance: 0,
            transport_allowance: 0,
            total_allowance: 0
          };
        }

        const dailyCost = allowance.daily_allowance * daysDiff;
        const accommodationCost = allowance.accommodation_allowance * daysDiff;
        const transportCost = allowance.transport_allowance;
        const totalAllowance = dailyCost + accommodationCost + transportCost;

        totalCosts += totalAllowance;

        return {
          ...participant,
          daily_allowance: allowance.daily_allowance,
          accommodation_allowance: allowance.accommodation_allowance,
          transport_allowance: allowance.transport_allowance,
          total_allowance: totalAllowance
        };
      });

      if (transportMode === 'car') {
        estimatedFuel = enrichedParticipants.length * 0.1 * daysDiff;
      }

      return {
        total_costs: totalCosts,
        estimated_fuel: estimatedFuel,
        distance_km: 0,
        days: daysDiff,
        participants: enrichedParticipants
      };
    } catch (error) {
      console.error('Calculate costs error:', error);
      throw error;
    }
  },

  calculateFuelEstimate: async (transportMode, departureDate, returnDate) => {
    try {
      const startDate = new Date(departureDate);
      const endDate = new Date(returnDate);
      const days = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1);

      if (transportMode === 'car') {
        return days * 20;
      }

      return 0;
    } catch (error) {
      console.error('Calculate fuel estimate error:', error);
      throw error;
    }
  },

  getTechnicalValidator: async (institutionId) => {
    try {
      const result = await query(
        `SELECT u.*
         FROM users u
         JOIN institution_roles ir ON u.institution_role_id = ir.id
         WHERE u.institution_id = ?
           AND ir.role_code = ?
           AND u.is_active = 1
         ORDER BY u.created_at DESC
         LIMIT 1`,
        [institutionId, 'directeur_technique']
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting technical validator:', error);
      return null;
    }
  },

  getFinanceValidator: async (institutionId) => {
    try {
      const result = await query(
        `SELECT u.*
         FROM users u
         JOIN institution_roles ir ON u.institution_role_id = ir.id
         WHERE u.institution_id = ?
           AND ir.role_code = ?
           AND u.is_active = 1
         ORDER BY u.created_at DESC
         LIMIT 1`,
        [institutionId, 'role-daf']
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting finance validator:', error);
      return null;
    }
  },

  getLogisticsValidator: async (institutionId) => {
    try {
      const result = await query(
        `SELECT u.*
         FROM users u
         JOIN institution_roles ir ON u.institution_role_id = ir.id
         WHERE u.institution_id = ?
           AND ir.role_code = ?
           AND u.is_active = 1
         ORDER BY u.created_at DESC
         LIMIT 1`,
        [institutionId, 'role-service_moyens_generaux']
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting logistics validator:', error);
      return null;
    }
  },

  hasActiveMissionForEmployee: async (employeeId) => {
    try {
      const placeholders = ACTIVE_MISSION_STATUSES.map(() => '?').join(', ');
      const result = await query(
        `SELECT 1
         FROM mission_participants mp
         JOIN missions_unified m ON mp.mission_id = m.id
         WHERE mp.employee_id = ?
           AND m.status IN (${placeholders})
           AND m.return_date >= CURRENT_DATE
         LIMIT 1`,
        [employeeId, ...ACTIVE_MISSION_STATUSES]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking active missions for employee:', error);
      throw error;
    }
  }
};

module.exports = MissionService;
