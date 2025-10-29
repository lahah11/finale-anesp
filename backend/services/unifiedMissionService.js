const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const UnifiedMissionService = {
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

  // Créer une nouvelle mission dans la table unifiée
  createMission: async (missionData, userId, institutionId) => {
    try {
      console.log('🚀 Création de mission dans missions_unified...');
      console.log('📤 Données reçues:', {
        mission_object: missionData.mission_object,
        departure_city: missionData.departure_city,
        departure_city_name: missionData.departure_city_name,
        arrival_city: missionData.arrival_city,
        arrival_city_name: missionData.arrival_city_name,
        participants: missionData.participants?.length || 0
      });

      const missionReference = await UnifiedMissionService.generateMissionReference(institutionId);
      
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
      
      // Insérer dans la table unifiée
      await query(
        `INSERT INTO missions_unified (
          id, mission_reference, institution_id, created_by, mission_object,
          departure_date, return_date, transport_mode,
          departure_city_id, departure_city_name, departure_city_region,
          arrival_city_id, arrival_city_name, arrival_city_region,
          participants_data, participants_count,
          estimated_fuel, fuel_cost, participants_cost, total_mission_cost, mission_fees,
          status, current_step,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          missionId, missionReference, institutionId, userId, missionData.mission_object,
          missionData.departure_date, missionData.return_date, missionData.transport_mode,
          missionData.departure_city, missionData.departure_city_name, departureCityRegion,
          missionData.arrival_city, missionData.arrival_city_name, arrivalCityRegion,
          participantsJson, participantsCount,
          estimatedFuel, fuelCost, participantsCost, totalMissionCost, missionFees,
          'pending_technical', 2,
          new Date().toISOString(), new Date().toISOString()
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

  // Récupérer toutes les missions
  getAllMissions: async () => {
    try {
      const result = await query(`
        SELECT 
          id, mission_reference, mission_object, status, current_step,
          departure_city_name, arrival_city_name,
          vehicle_plate, driver_name,
          participants_count, total_mission_cost,
          created_at, updated_at
        FROM missions_unified 
        ORDER BY created_at DESC
      `);
      return result.rows;
    } catch (error) {
      console.error('❌ Erreur récupération missions:', error);
      throw error;
    }
  },

  // Mettre à jour les moyens logistiques
  updateLogistics: async (missionId, vehicleData, driverData) => {
    try {
      await query(`
        UPDATE missions_unified SET
          vehicle_plate = ?, vehicle_model = ?, vehicle_brand = ?,
          driver_name = ?, driver_phone = ?, driver_license = ?,
          logistics_assigned_by = ?, logistics_assigned_at = ?,
          updated_at = ?
        WHERE id = ?
      `, [
        vehicleData.plate, vehicleData.model, vehicleData.brand,
        driverData.name, driverData.phone, driverData.license,
        driverData.assigned_by, new Date().toISOString(),
        new Date().toISOString(), missionId
      ]);
      
      console.log('✅ Moyens logistiques mis à jour dans missions_unified');
    } catch (error) {
      console.error('❌ Erreur mise à jour logistiques:', error);
      throw error;
    }
  }
};

module.exports = UnifiedMissionService;

