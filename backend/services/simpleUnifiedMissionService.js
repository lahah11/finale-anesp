const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const SimpleUnifiedMissionService = {
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
        'SELECT COUNT(*) as count FROM missions_unified WHERE mission_reference = ?',
        [reference]
      );
      exists = result.rows[0].count > 0;
      if (exists) count++;
    }
    
    return reference;
  },

  // Créer une nouvelle mission dans la table unifiée (version simplifiée)
  createMission: async (missionData, userId, institutionId) => {
    try {
      console.log('🚀 Création de mission dans missions_unified (version simplifiée)...');
      console.log('📤 Données reçues:', {
        mission_object: missionData.mission_object,
        departure_city: missionData.departure_city,
        departure_city_name: missionData.departure_city_name,
        arrival_city: missionData.arrival_city,
        arrival_city_name: missionData.arrival_city_name,
        participants: missionData.participants?.length || 0
      });

      const missionReference = await SimpleUnifiedMissionService.generateMissionReference(institutionId);
      
      // Utiliser les valeurs saisies par l'ingénieur
      const estimatedFuel = missionData.estimated_fuel || 0;
      const missionFees = missionData.mission_fees || 0;

      // Insérer la mission avec toutes les informations
      const missionId = require('crypto').randomUUID();
      
      // Préparer les données des participants en JSON
      const participantsJson = JSON.stringify(missionData.participants || []);
      const participantsCount = missionData.participants?.length || 0;
      
      // Récupérer les informations des villes
      let departureCityRegion = null;
      let arrivalCityRegion = null;
      
      if (missionData.departure_city) {
        try {
          const depCityResult = await query('SELECT region FROM cities WHERE id = ?', [missionData.departure_city]);
          departureCityRegion = depCityResult.rows[0]?.region || null;
          console.log(`✅ Région de départ récupérée: ${departureCityRegion}`);
        } catch (e) {
          console.warn('⚠️ Impossible de récupérer la région de départ:', e.message);
        }
      }
      
      if (missionData.arrival_city) {
        try {
          const arrCityResult = await query('SELECT region FROM cities WHERE id = ?', [missionData.arrival_city]);
          arrivalCityRegion = arrCityResult.rows[0]?.region || null;
          console.log(`✅ Région d'arrivée récupérée: ${arrivalCityRegion}`);
        } catch (e) {
          console.warn('⚠️ Impossible de récupérer la région d\'arrivée:', e.message);
        }
      }
      
      // Calculer les coûts totaux
      const totalMissionCost = missionData.total_mission_cost || missionFees;
      const fuelCost = missionData.fuel_cost || (estimatedFuel * 200); // 200 MRU par litre
      const participantsCost = missionData.participants_cost || 0;
      
      // Insérer dans la table unifiée avec seulement les colonnes essentielles
      await query(
        `INSERT INTO missions_unified (
          id, mission_reference, institution_id, created_by, mission_object,
          departure_date, return_date, transport_mode,
          departure_city_id, departure_city_name, departure_city_region,
          arrival_city_id, arrival_city_name, arrival_city_region,
          participants_data, participants_count,
          estimated_fuel, fuel_cost, participants_cost, total_mission_cost, mission_fees,
          status, current_step
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          missionId, missionReference, institutionId, userId, missionData.mission_object,
          missionData.departure_date, missionData.return_date, missionData.transport_mode,
          missionData.departure_city, missionData.departure_city_name, departureCityRegion,
          missionData.arrival_city, missionData.arrival_city_name, arrivalCityRegion,
          participantsJson, participantsCount,
          estimatedFuel, fuelCost, participantsCost, totalMissionCost, missionFees,
          'pending_technical', 2
        ]
      );
      
      console.log('✅ Mission créée dans missions_unified avec succès');
      
      // Récupérer la mission créée
      const missionResult = await query('SELECT * FROM missions_unified WHERE id = ?', [missionId]);
      const mission = missionResult.rows[0];

      // Insérer les participants dans mission_participants
      const participants = [];
      for (const participant of missionData.participants || []) {
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

      console.log('🎉 Mission créée avec succès dans missions_unified');
      console.log(`   - ID: ${mission.id}`);
      console.log(`   - Référence: ${mission.mission_reference}`);
      console.log(`   - Villes: ${mission.departure_city_name} → ${mission.arrival_city_name}`);
      console.log(`   - Participants: ${participants.length}`);

      return {
        mission,
        participants,
        missionId: mission.id,
        missionReference: mission.mission_reference,
        technical_validator_id: technicalValidator.rows[0]?.id
      };
    } catch (error) {
      console.error('❌ Erreur création mission unifiée:', error);
      throw error;
    }
  },

  // Récupérer une mission par ID
  getMissionById: async (missionId) => {
    try {
      const result = await query('SELECT * FROM missions_unified WHERE id = ?', [missionId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Erreur récupération mission:', error);
      throw error;
    }
  },

  // Récupérer les missions selon le rôle de l'utilisateur
  getMissionsByUser: async (userId, userRole, institutionId, institutionRoleId) => {
    try {
      console.log('📋 Récupération des missions depuis missions_unified...');
      
      let sql = `
        SELECT m.*, u.username as created_by_name,
               COUNT(mp.id) as participant_count
        FROM missions_unified m
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
        sql += ' AND m.status IN (?, ?, ?, ?)';
        params.push('pending_logistics', 'pending_finance', 'pending_dg', 'validated');
      } else if (userRole === 'super_admin') {
        // Super admin voit toutes les missions
        // Pas de filtre supplémentaire
      } else {
        // Par défaut, voir toutes les missions pour les autres rôles
        console.log(`⚠️ Rôle non reconnu: ${userRole}, institution_role_id: ${institutionRoleId}`);
      }

      sql += ' GROUP BY m.id ORDER BY m.created_at DESC';

      const result = await query(sql, params);
      console.log(`✅ ${result.rows.length} mission(s) récupérée(s) depuis missions_unified`);
      return result.rows;
    } catch (error) {
      console.error('Get missions by user error:', error);
      throw error;
    }
  },

  // Validation technique
  validateTechnical: async (missionId, userId, action, rejectionReason) => {
    try {
      console.log('🔧 Validation technique dans missions_unified...');
      console.log(`   - Mission ID: ${missionId}`);
      console.log(`   - User ID: ${userId}`);
      console.log(`   - Action: ${action}`);
      console.log(`   - Rejection reason: ${rejectionReason || 'N/A'}`);
      
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

      console.log('📊 Données de mise à jour:');
      console.log(`   - Statut: ${updateData.status}`);
      console.log(`   - Étape: ${updateData.current_step}`);
      console.log(`   - Validé par: ${updateData.technical_validated_by}`);
      console.log(`   - Validé le: ${updateData.technical_validated_at}`);

      // Vérifier que la mission existe avant la mise à jour
      const checkMission = await query('SELECT id, mission_reference, status, current_step FROM missions_unified WHERE id = ?', [missionId]);
      if (!checkMission.rows || checkMission.rows.length === 0) {
        throw new Error(`Mission ${missionId} not found`);
      }
      
      console.log('✅ Mission trouvée avant mise à jour:');
      console.log(`   - Référence: ${checkMission.rows[0].mission_reference}`);
      console.log(`   - Statut actuel: ${checkMission.rows[0].status}`);
      console.log(`   - Étape actuelle: ${checkMission.rows[0].current_step}`);

      // Mettre à jour la table missions_unified
      console.log('🔄 Exécution de la requête UPDATE...');
      const updateResult = await query(
        `UPDATE missions_unified SET 
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
      
      console.log(`✅ Requête UPDATE exécutée. Rows affected: ${updateResult.rowsAffected || 'N/A'}`);
      
      // Récupérer la mission mise à jour depuis missions_unified
      console.log('📋 Récupération de la mission mise à jour...');
      const result = await query('SELECT * FROM missions_unified WHERE id = ?', [missionId]);

      if (!result.rows || result.rows.length === 0) {
        throw new Error('Mission not found after validation');
      }

      console.log('✅ Mission mise à jour récupérée:');
      console.log(`   - Référence: ${result.rows[0].mission_reference}`);
      console.log(`   - Nouveau statut: ${result.rows[0].status}`);
      console.log(`   - Nouvelle étape: ${result.rows[0].current_step}`);
      console.log(`   - Validé par: ${result.rows[0].technical_validated_by}`);
      console.log(`   - Validé le: ${result.rows[0].technical_validated_at}`);

      // Trouver le responsable des moyens généraux
      console.log('🔍 Recherche du responsable des moyens généraux...');
      const logisticsValidator = await query(
        'SELECT id FROM users WHERE institution_id = (SELECT institution_id FROM missions_unified WHERE id = ?) AND institution_role_id IN (SELECT id FROM institution_roles WHERE role_code = ?)',
        [missionId, 'role-service_moyens_generaux']
      );

      console.log(`✅ Responsable logistique trouvé: ${logisticsValidator.rows[0]?.id || 'NON TROUVÉ'}`);

      console.log('✅ Validation technique mise à jour dans missions_unified');
      return {
        mission: result.rows[0],
        next_validator_id: logisticsValidator.rows[0]?.id
      };
    } catch (error) {
      console.error('❌ Technical validation error:', error);
      throw error;
    }
  },

  // Attribution logistique
  assignLogistics: async (missionId, userId, vehicleId, driverId, logisticsData) => {
    try {
      console.log('🚗 Attribution logistique dans missions_unified...');
      
      const updateData = {
        logistics_validated_by: userId,
        logistics_validated_at: new Date().toISOString(),
        assigned_vehicle_id: vehicleId,
        assigned_driver_id: driverId,
        vehicle_plate: logisticsData.vehicle_plate,
        vehicle_model: logisticsData.vehicle_model,
        vehicle_brand: logisticsData.vehicle_brand,
        driver_name: logisticsData.driver_name,
        driver_phone: logisticsData.driver_phone,
        driver_license: logisticsData.driver_license,
        status: 'pending_finance',
        current_step: 4
      };

      // Mettre à jour la table missions_unified
      await query(
        `UPDATE missions_unified SET 
         logistics_validated_by = ?, logistics_validated_at = ?, 
         vehicle_id = ?, driver_id = ?,
         vehicle_plate = ?, vehicle_model = ?, vehicle_brand = ?,
         driver_name = ?, driver_phone = ?, driver_license = ?,
         status = ?, current_step = ?
         WHERE id = ?`,
        [
          updateData.logistics_validated_by,
          updateData.logistics_validated_at,
          updateData.assigned_vehicle_id,
          updateData.assigned_driver_id,
          updateData.vehicle_plate,
          updateData.vehicle_model,
          updateData.vehicle_brand,
          updateData.driver_name,
          updateData.driver_phone,
          updateData.driver_license,
          updateData.status,
          updateData.current_step,
          missionId
        ]
      );
      
      // Récupérer la mission mise à jour depuis missions_unified
      const result = await query('SELECT * FROM missions_unified WHERE id = ?', [missionId]);

      // Trouver le responsable financier (DAF)
      const financeValidator = await query(
        'SELECT id FROM users WHERE institution_id = (SELECT institution_id FROM missions_unified WHERE id = ?) AND institution_role_id IN (SELECT id FROM institution_roles WHERE role_code = ?)',
        [missionId, 'role-daf']
      );

      console.log('✅ Attribution logistique mise à jour dans missions_unified');
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
      console.log('💰 Validation financière dans missions_unified...');
      console.log(`   - Mission ID: ${missionId}`);
      console.log(`   - User ID: ${userId}`);
      console.log(`   - Action: ${action}`);
      console.log(`   - Rejection reason: ${rejectionReason || 'N/A'}`);
      
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

      console.log('📊 Données de mise à jour:');
      console.log(`   - Statut: ${updateData.status}`);
      console.log(`   - Étape: ${updateData.current_step}`);
      console.log(`   - Validé par: ${updateData.finance_validated_by}`);
      console.log(`   - Validé le: ${updateData.finance_validated_at}`);

      // Vérifier que la mission existe avant la mise à jour
      const checkMission = await query('SELECT id, mission_reference, status, current_step FROM missions_unified WHERE id = ?', [missionId]);
      if (!checkMission.rows || checkMission.rows.length === 0) {
        throw new Error(`Mission ${missionId} not found`);
      }
      
      console.log('✅ Mission trouvée avant mise à jour:');
      console.log(`   - Référence: ${checkMission.rows[0].mission_reference}`);
      console.log(`   - Statut actuel: ${checkMission.rows[0].status}`);
      console.log(`   - Étape actuelle: ${checkMission.rows[0].current_step}`);

      // Mettre à jour la table missions_unified
      console.log('🔄 Exécution de la requête UPDATE...');
      const updateResult = await query(
        `
        UPDATE missions_unified SET 
          finance_validated_by = ?, 
          finance_validated_at = ?, 
          status = ?, 
          current_step = ?, 
          finance_rejection_reason = ?
        WHERE id = ?
        `,
        [
          updateData.finance_validated_by,
          updateData.finance_validated_at,
          updateData.status,
          updateData.current_step,
          updateData.finance_rejection_reason,
          missionId
        ]
      );

      console.log('✅ Mise à jour exécutée:');
      console.log(`   - Lignes affectées: ${updateResult.changes}`);

      // Récupérer la mission mise à jour
      const result = await query('SELECT * FROM missions_unified WHERE id = ?', [missionId]);

      // Trouver le DG
      const dgValidator = await query(
        'SELECT id FROM users WHERE institution_id = (SELECT institution_id FROM missions_unified WHERE id = ?) AND institution_role_id IN (SELECT id FROM institution_roles WHERE role_code = ?)',
        [missionId, 'directeur_general']
      );

      console.log('✅ Validation financière mise à jour dans missions_unified');
      return {
        mission: result.rows[0],
        next_validator_id: dgValidator.rows[0]?.id
      };
    } catch (error) {
      console.error('Finance validation error:', error);
      throw error;
    }
  },

  // Validation finale (DG)
  validateFinal: async (missionId, userId, action, rejectionReason) => {
    try {
      console.log('🔄 Validation finale dans missions_unified...');
      console.log(`   - Mission ID: ${missionId}`);
      console.log(`   - User ID: ${userId}`);
      console.log(`   - Action: ${action}`);
      console.log(`   - Rejection reason: ${rejectionReason || 'N/A'}`);
      
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

      console.log('📊 Données de mise à jour:');
      console.log(`   - Statut: ${updateData.status}`);
      console.log(`   - Étape: ${updateData.current_step}`);
      console.log(`   - Validé par: ${updateData.dg_validated_by}`);
      console.log(`   - Validé le: ${updateData.dg_validated_at}`);

      // Vérifier que la mission existe avant la mise à jour
      const checkMission = await query('SELECT id, mission_reference, status, current_step FROM missions_unified WHERE id = ?', [missionId]);
      if (!checkMission.rows || checkMission.rows.length === 0) {
        throw new Error(`Mission ${missionId} not found`);
      }
      
      console.log('✅ Mission trouvée avant mise à jour:');
      console.log(`   - Référence: ${checkMission.rows[0].mission_reference}`);
      console.log(`   - Statut actuel: ${checkMission.rows[0].status}`);
      console.log(`   - Étape actuelle: ${checkMission.rows[0].current_step}`);

      // Mettre à jour la table missions_unified
      console.log('🔄 Exécution de la requête UPDATE...');
      const updateResult = await query(
        `
        UPDATE missions_unified SET 
          dg_validated_by = ?, 
          dg_validated_at = ?, 
          status = ?, 
          current_step = ?, 
          dg_rejection_reason = ?
        WHERE id = ?
        `,
        [
          updateData.dg_validated_by,
          updateData.dg_validated_at,
          updateData.status,
          updateData.current_step,
          updateData.dg_rejection_reason,
          missionId
        ]
      );

      console.log('✅ Mise à jour exécutée:');
      console.log(`   - Lignes affectées: ${updateResult.changes}`);

      // Récupérer la mission mise à jour
      const result = await query('SELECT * FROM missions_unified WHERE id = ?', [missionId]);

      console.log('✅ Validation finale mise à jour dans missions_unified');
      return {
        mission: result.rows[0],
        success: true
      };
    } catch (error) {
      console.error('Final validation error:', error);
      throw error;
    }
  }
};

module.exports = SimpleUnifiedMissionService;
