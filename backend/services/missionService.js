const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const MissionService = {
  // Générer une référence de mission automatique
  generateMissionReference: async (institutionId) => {
    const year = new Date().getFullYear();
    let count = 1;
    let reference;
    let exists = true;
    
    // Chercher une référence unique
    while (exists) {
      reference = `MIS-${year}-${count.toString().padStart(4, '0')}`;
      const result = await query(
        'SELECT COUNT(*) as count FROM missions WHERE mission_reference = ?',
        [reference]
      );
      exists = result.rows[0].count > 0;
      if (exists) count++;
    }
    
    return reference;
  },

  // Créer une nouvelle mission
  createMission: async (missionData, userId, institutionId) => {
    try {
      const missionReference = await MissionService.generateMissionReference(institutionId);
      
      // Utiliser les valeurs saisies par l'ingénieur
      const estimatedFuel = missionData.estimated_fuel || 0;
      const missionFees = missionData.mission_fees || 0;

      // Insérer la mission avec toutes les informations
      const missionId = require('crypto').randomUUID();
      
      // Préparer les données des participants en JSON
      const participantsJson = JSON.stringify(missionData.participants || []);
      
      // Récupérer les noms des villes depuis les IDs (le frontend envoie des IDs)
      let departureCityName = missionData.departure_city_name;
      let arrivalCityName = missionData.arrival_city_name;
      
      // Si le frontend a envoyé des IDs de villes, récupérer les noms
      if (missionData.departure_city && !departureCityName) {
        try {
          const depCityResult = await query('SELECT name FROM cities WHERE id = ?', [missionData.departure_city]);
          departureCityName = depCityResult.rows[0]?.name;
          console.log(`✅ Ville de départ récupérée: ${departureCityName} (ID: ${missionData.departure_city})`);
        } catch (e) {
          console.warn('⚠️ Impossible de récupérer le nom de la ville de départ:', e.message);
        }
      }
      
      if (missionData.arrival_city && !arrivalCityName) {
        try {
          const arrCityResult = await query('SELECT name FROM cities WHERE id = ?', [missionData.arrival_city]);
          arrivalCityName = arrCityResult.rows[0]?.name;
          console.log(`✅ Ville d'arrivée récupérée: ${arrivalCityName} (ID: ${missionData.arrival_city})`);
        } catch (e) {
          console.warn('⚠️ Impossible de récupérer le nom de la ville d\'arrivée:', e.message);
        }
      }
      
      // Calculer les coûts totaux
      const totalMissionCost = missionData.total_mission_cost || missionFees;
      const fuelCost = missionData.fuel_cost || (estimatedFuel * 200); // 200 MRU par litre
      const participantsCost = missionData.participants_cost || 0;
      
      await query(
        `INSERT INTO missions (
          id, mission_reference, institution_id, created_by, mission_object, 
          departure_date, return_date, transport_mode, estimated_fuel, 
          estimated_costs, status, current_step,
          departure_city, departure_city_name, arrival_city, arrival_city_name,
          vehicle_plate, vehicle_model, vehicle_brand,
          driver_name, driver_phone, driver_license,
          participants_data,
          total_mission_cost, fuel_cost, participants_cost
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          missionId, missionReference, institutionId, userId, missionData.mission_object,
          missionData.departure_date, missionData.return_date, missionData.transport_mode,
          estimatedFuel, missionFees, 'pending_technical', 2,
          missionData.departure_city, departureCityName,
          missionData.arrival_city, arrivalCityName,
          missionData.vehicle_plate,
          missionData.vehicle_model,
          missionData.vehicle_brand,
          missionData.driver_name,
          missionData.driver_phone,
          missionData.driver_license,
          participantsJson,
          totalMissionCost, fuelCost, participantsCost
        ]
      );
      
      // Récupérer la mission créée
      const missionResult = await query('SELECT * FROM missions WHERE id = ?', [missionId]);
      const mission = missionResult.rows[0];

      // Insérer les participants
      const participants = [];
      for (const participant of missionData.participants) {
        const participantId = require('crypto').randomUUID();
        await query(
          `INSERT INTO mission_participants (
            id, mission_id, participant_type, employee_id, external_name, 
            external_firstname, external_nni, external_profession, 
            external_ministry, external_phone, external_email, 
            role_in_mission, daily_allowance, accommodation_allowance, 
            transport_allowance, total_allowance
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            participantId, mission.id, participant.participant_type, participant.employee_id,
            participant.external_name, participant.external_firstname,
            participant.external_nni, participant.external_profession,
            participant.external_ministry, participant.external_phone,
            participant.external_email, participant.role_in_mission,
            participant.daily_allowance, participant.accommodation_allowance,
            participant.transport_allowance, participant.total_allowance
          ]
        );
        
        // Récupérer le participant créé
        const participantResult = await query('SELECT * FROM mission_participants WHERE id = ?', [participantId]);
        participants.push(participantResult.rows[0]);
      }

      // Trouver le Directeur Technique pour la validation
      const technicalValidator = await query(
        'SELECT id FROM users WHERE institution_id = ? AND institution_role_id IN (SELECT id FROM institution_roles WHERE role_code = ?)',
        [institutionId, 'directeur_technique']
      );

      return {
        mission,
        participants,
        missionId: mission.id,
        missionReference: mission.mission_reference,
        technical_validator_id: technicalValidator.rows[0]?.id
      };
    } catch (error) {
      console.error('Create mission error:', error);
      throw error;
    }
  },

  // Obtenir les missions selon le rôle de l'utilisateur
  getMissionsByUser: async (userId, userRole, institutionId, institutionRoleId) => {
    try {
      let sql = `
        SELECT m.*, u.username as created_by_name,
               COUNT(mp.id) as participant_count
        FROM missions m
        LEFT JOIN users u ON m.created_by = u.id
        LEFT JOIN mission_participants mp ON m.id = mp.mission_id
        WHERE m.institution_id = ?
      `;
      let params = [institutionId];

      // Filtrer selon le rôle et l'institution_role_id
      if (userRole === 'agent' && institutionRoleId !== 'role-daf') {
        sql += ' AND m.created_by = ?';
        params.push(userId);
      } else if (userRole === 'admin_local') {
        sql += ' AND m.status IN (?, ?)';
        params.push('pending_technical', 'validated');
      } else if (userRole === 'msgg') {
        sql += ' AND m.status IN (?, ?)';
        params.push('pending_logistics', 'validated');
      } else if (userRole === 'dg' || institutionRoleId === 'role-daf') {
        // Le rôle 'dg' ou l'institution_role_id 'role-daf' peut voir les missions en attente de validation financière ET finale
        // On distingue par le statut : pending_finance (DAF) et pending_dg (DG final)
        // Pour l'instant, on laisse voir les deux, la distinction se fera côté frontend
        sql += ' AND m.status IN (?, ?, ?)';
        params.push('pending_finance', 'pending_dg', 'validated');
      } else if (userRole === 'super_admin') {
        // Super admin voit toutes les missions
        // Pas de filtre supplémentaire
      }

      sql += ' GROUP BY m.id ORDER BY m.created_at DESC';

      const result = await query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('Get missions by user error:', error);
      throw error;
    }
  },

  // Obtenir une mission par ID
  getMissionById: async (missionId, userId, institutionId) => {
    try {
      const result = await query(
        `SELECT m.*, u.username as created_by_name
         FROM missions m
         LEFT JOIN users u ON m.created_by = u.id
         WHERE m.id = ? AND m.institution_id = ?`,
        [missionId, institutionId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const mission = result.rows[0];
      
      // Obtenir les participants
      const participantsResult = await query(
        'SELECT * FROM mission_participants WHERE mission_id = ?',
        [missionId]
      );
      mission.participants = participantsResult.rows;

      return mission;
    } catch (error) {
      console.error('Get mission by ID error:', error);
      throw error;
    }
  },

  // Validation technique
  validateTechnical: async (missionId, userId, action, rejectionReason) => {
    try {
      const updateData = {
        technical_validated_by: userId,
        technical_validated_at: new Date().toISOString(),
        current_step: action === 'approve' ? 3 : 1
      };

      if (action === 'reject') {
        updateData.status = 'rejected';
        updateData.technical_rejection_reason = rejectionReason;
      } else {
        updateData.status = 'pending_logistics';
      }

      await query(
        `UPDATE missions SET 
         technical_validated_by = ?, technical_validated_at = ?, 
         status = ?, current_step = ?, technical_rejection_reason = ?
         WHERE id = ?`,
        [
          updateData.technical_validated_by,
          updateData.technical_validated_at,
          updateData.status,
          updateData.current_step,
          updateData.technical_rejection_reason,
          missionId
        ]
      );
      
      // Récupérer la mission mise à jour
      const result = await query('SELECT * FROM missions WHERE id = ?', [missionId]);

      // Trouver le responsable des moyens généraux
      const logisticsValidator = await query(
        'SELECT id FROM users WHERE institution_id = (SELECT institution_id FROM missions WHERE id = ?) AND institution_role_id IN (SELECT id FROM institution_roles WHERE role_code = ?)',
        [missionId, 'msgg']
      );

      return {
        mission: result.rows[0],
        next_validator_id: logisticsValidator.rows[0]?.id
      };
    } catch (error) {
      console.error('Technical validation error:', error);
      throw error;
    }
  },

  // Attribution des moyens logistiques
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
      
      // Récupérer la mission mise à jour
      const result = await query('SELECT * FROM missions WHERE id = ?', [missionId]);

      // Marquer le véhicule et le chauffeur comme indisponibles
      await query('UPDATE vehicles SET is_available = 0 WHERE id = ?', [vehicleId]);
      await query('UPDATE drivers SET is_available = 0, current_mission_id = ? WHERE id = ?', [missionId, driverId]);

      // Trouver le DAF
      const financeValidator = await query(
        'SELECT id FROM users WHERE institution_id = (SELECT institution_id FROM missions WHERE id = ?) AND institution_role_id IN (SELECT id FROM institution_roles WHERE role_code = ?)',
        [missionId, 'daf']
      );

      return {
        mission: result.rows[0],
        next_validator_id: financeValidator.rows[0]?.id
      };
    } catch (error) {
      console.error('Logistics assignment error:', error);
      throw error;
    }
  },

  // Validation financière
  validateFinance: async (missionId, userId, action, rejectionReason) => {
    try {
      const updateData = {
        finance_validated_by: userId,
        finance_validated_at: new Date().toISOString(),
        current_step: action === 'approve' ? 5 : 1
      };

      if (action === 'reject') {
        updateData.status = 'rejected';
        updateData.finance_rejection_reason = rejectionReason;
      } else {
        updateData.status = 'pending_dg';
      }

      await query(
        `UPDATE missions SET 
         finance_validated_by = ?, finance_validated_at = ?, 
         status = ?, current_step = ?, finance_rejection_reason = ?
         WHERE id = ?`,
        [
          updateData.finance_validated_by,
          updateData.finance_validated_at,
          updateData.status,
          updateData.current_step,
          updateData.finance_rejection_reason,
          missionId
        ]
      );
      
      // Récupérer la mission mise à jour
      const result = await query('SELECT * FROM missions WHERE id = ?', [missionId]);

      // Trouver le DG
      const dgValidator = await query(
        'SELECT id FROM users WHERE institution_id = (SELECT institution_id FROM missions WHERE id = ?) AND institution_role_id IN (SELECT id FROM institution_roles WHERE role_code = ?)',
        [missionId, 'directeur_general']
      );

      return {
        mission: result.rows[0],
        next_validator_id: dgValidator.rows[0]?.id
      };
    } catch (error) {
      console.error('Finance validation error:', error);
      throw error;
    }
  },

  // Validation finale
  validateFinal: async (missionId, userId, action, rejectionReason) => {
    try {
      console.log('🔄 Validation finale avec système unifié...');
      
      const updateData = {
        dg_validated_by: userId,
        dg_validated_at: new Date().toISOString(),
        current_step: action === 'approve' ? 6 : 1
      };

      if (action === 'reject') {
        updateData.status = 'rejected';
        updateData.dg_rejection_reason = rejectionReason;
      } else {
        updateData.status = 'validated';
      }

      // Mettre à jour la table missions_unified
      await query(
        `UPDATE missions_unified SET 
         dg_validated_by = ?, dg_validated_at = ?, 
         status = ?, current_step = ?, dg_rejection_reason = ?
         WHERE id = ?`,
        [
          updateData.dg_validated_by,
          updateData.dg_validated_at,
          updateData.status,
          updateData.current_step,
          updateData.dg_rejection_reason,
          missionId
        ]
      );
      
      // Récupérer la mission mise à jour depuis missions_unified
      const result = await query('SELECT * FROM missions_unified WHERE id = ?', [missionId]);

      if (!result.rows[0]) {
        throw new Error('Mission not found after validation');
      }

      console.log('✅ Validation finale réussie dans missions_unified');
      return {
        mission: result.rows[0]
      };
    } catch (error) {
      console.error('Final validation error:', error);
      throw error;
    }
  },

  // Calculer les frais de mission
  calculateMissionCosts: async (participants, departureDate, returnDate, transportMode, institutionId) => {
    try {
      const startDate = new Date(departureDate);
      const endDate = new Date(returnDate);
      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

      let totalCosts = 0;
      let estimatedFuel = 0;

      // Obtenir les barèmes de frais
      const allowancesResult = await query(
        'SELECT * FROM mission_allowances WHERE institution_id = ? AND is_active = 1',
        [institutionId]
      );
      const allowances = allowancesResult.rows;

      for (const participant of participants) {
        const profileType = participant.participant_type === 'anesp' ? 'engineer' : 'external';
        const allowance = allowances.find(a => a.profile_type === profileType);
        
        if (allowance) {
          const dailyCost = allowance.daily_allowance * daysDiff;
          const accommodationCost = allowance.accommodation_allowance * daysDiff;
          const transportCost = allowance.transport_allowance;
          
          participant.daily_allowance = allowance.daily_allowance;
          participant.accommodation_allowance = allowance.accommodation_allowance;
          participant.transport_allowance = allowance.transport_allowance;
          participant.total_allowance = dailyCost + accommodationCost + transportCost;
          
          totalCosts += participant.total_allowance;
        }
      }

      // Calculer le carburant estimé (simplifié)
      if (transportMode === 'car') {
        estimatedFuel = participants.length * 0.1 * daysDiff; // Estimation basique
      }

      return {
        total_costs: totalCosts,
        estimated_fuel: estimatedFuel,
        distance_km: 0, // À calculer selon les villes
        days: daysDiff
      };
    } catch (error) {
      console.error('Calculate costs error:', error);
      throw error;
    }
  },

  // Calculer l'estimation du carburant
  calculateFuelEstimate: async (transportMode, departureDate, returnDate, institutionId) => {
    try {
      // Calculer le nombre de jours
      const startDate = new Date(departureDate);
      const endDate = new Date(returnDate);
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

      // Estimation basée sur le moyen de transport
      let estimatedFuel = 0;
      
      if (transportMode === 'car') {
        // Estimation pour voiture : 15-25L par jour selon la distance
        estimatedFuel = days * 20; // 20L par jour en moyenne
      } else if (transportMode === 'plane') {
        // Pour l'avion, pas de carburant direct mais on peut estimer les frais
        estimatedFuel = 0;
      } else if (transportMode === 'train') {
        // Pour le train, pas de carburant direct
        estimatedFuel = 0;
      }

      return estimatedFuel;
    } catch (error) {
      console.error('Calculate fuel estimate error:', error);
      throw error;
    }
  },

  // Obtenir les participants d'une mission
  getMissionParticipants: async (missionId) => {
    try {
      const result = await query(
        'SELECT * FROM mission_participants WHERE mission_id = ?',
        [missionId]
      );
      return result.rows;
    } catch (error) {
      console.error('Get participants error:', error);
      throw error;
    }
  },

  // Obtenir les véhicules disponibles
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

  // Obtenir les chauffeurs disponibles
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

  // Obtenir le validateur logistique (Service Moyens Généraux)
  getLogisticsValidator: async (institutionId) => {
    try {
      const result = await query(
        'SELECT * FROM users WHERE institution_id = ? AND role = "msgg" AND is_active = 1 LIMIT 1',
        [institutionId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting logistics validator:', error);
      return null;
    }
  },

  getDGValidator: async (institutionId) => {
    try {
      const result = await query(
        'SELECT * FROM users WHERE institution_id = ? AND role = "dg" AND is_active = 1 LIMIT 1',
        [institutionId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting DG validator:', error);
      return null;
    }
  },

  // Obtenir le validateur financier (DAF)
  getFinanceValidator: async (institutionId) => {
    try {
      const result = await query(
        'SELECT * FROM users WHERE institution_id = ? AND role = "dg" AND is_active = 1 LIMIT 1',
        [institutionId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting finance validator:', error);
      return null;
    }
  }
};

module.exports = MissionService;
