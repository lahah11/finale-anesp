const { query } = require('../config/database');

/**
 * Service unifié pour récupérer toutes les informations d'une mission
 * Utilise les clés étrangères pour faire des JOIN optimisés
 */
const UnifiedDataService = {
  
  /**
   * Récupérer une mission complète avec toutes ses données liées
   */
  getCompleteMissionData: async (missionId) => {
    try {
      console.log(`🔍 Récupération des données complètes pour la mission ${missionId}...`);
      
      // Requête principale avec tous les JOIN
      const missionResult = await query(`
        SELECT 
          -- Informations de base de la mission
          m.id, m.mission_reference, m.mission_object, m.status, m.current_step,
          m.departure_date, m.return_date, m.transport_mode,
          m.estimated_fuel, m.estimated_costs, m.mission_fees,
          m.total_mission_cost, m.fuel_cost, m.participants_cost,
          m.created_at, m.updated_at,
          
          -- Villes (avec clés étrangères)
          m.departure_city, m.departure_city_name,
          m.arrival_city, m.arrival_city_name,
          dep_city.name as departure_city_full_name,
          dep_city.region as departure_city_region,
          arr_city.name as arrival_city_full_name,
          arr_city.region as arrival_city_region,
          
          -- Créateur de la mission
          m.created_by,
          creator.username as created_by_username,
          creator.email as created_by_email,
          
          -- Institution
          m.institution_id,
          inst.name as institution_name,
          inst.type as institution_type,
          
          -- Véhicule assigné
          m.vehicle_id, m.vehicle_plate, m.vehicle_model, m.vehicle_brand,
          v.registration_number as vehicle_registration,
          v.model as vehicle_model_from_table,
          v.brand as vehicle_brand_from_table,
          v.year as vehicle_year,
          v.color as vehicle_color,
          
          -- Chauffeur assigné
          m.driver_id, m.driver_name, m.driver_phone, m.driver_license,
          d.name as driver_name_from_table,
          d.phone as driver_phone_from_table,
          d.license_number as driver_license_from_table,
          d.license_type as driver_license_type,
          
          -- Participants (JSON)
          m.participants_data,
          
          -- Validations
          m.technical_validated_by, m.technical_validated_at, m.technical_rejection_reason,
          m.logistics_validated_by, m.logistics_validated_at,
          m.finance_validated_by, m.finance_validated_at, m.finance_rejection_reason,
          m.dg_validated_by, m.dg_validated_at, m.dg_rejection_reason
          
        FROM missions m
        
        -- JOIN avec les villes
        LEFT JOIN cities dep_city ON m.departure_city = dep_city.id
        LEFT JOIN cities arr_city ON m.arrival_city = arr_city.id
        
        -- JOIN avec le créateur
        LEFT JOIN users creator ON m.created_by = creator.id
        
        -- JOIN avec l'institution
        LEFT JOIN institutions inst ON m.institution_id = inst.id
        
        -- JOIN avec le véhicule
        LEFT JOIN vehicles v ON m.vehicle_id = v.id
        
        -- JOIN avec le chauffeur
        LEFT JOIN drivers d ON m.driver_id = d.id
        
        WHERE m.id = ?
      `, [missionId]);
      
      if (missionResult.rows.length === 0) {
        throw new Error(`Mission ${missionId} non trouvée`);
      }
      
      const mission = missionResult.rows[0];
      
      // Récupérer les participants détaillés
      const participantsResult = await query(`
        SELECT 
          mp.*,
          e.full_name as employee_full_name,
          e.position as employee_position,
          e.grade as employee_grade
        FROM mission_participants mp
        LEFT JOIN employees e ON mp.employee_id = e.id
        WHERE mp.mission_id = ?
      `, [missionId]);
      
      // Récupérer les notifications
      const notificationsResult = await query(`
        SELECT 
          n.*,
          u.username as user_username
        FROM notifications n
        LEFT JOIN users u ON n.user_id = u.id
        WHERE n.mission_id = ?
        ORDER BY n.created_at DESC
      `, [missionId]);
      
      // Récupérer les documents
      const documentsResult = await query(`
        SELECT * FROM mission_documents 
        WHERE mission_id = ?
        ORDER BY uploaded_at DESC
      `, [missionId]);
      
      // Récupérer les logs d'audit
      const auditLogsResult = await query(`
        SELECT 
          al.*,
          u.username as user_username
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.entity_id = ? AND al.entity_type = 'mission'
        ORDER BY al.created_at DESC
      `, [missionId]);
      
      // Construire l'objet de données unifié
      const unifiedData = {
        // Informations de base
        mission: {
          id: mission.id,
          reference: mission.mission_reference,
          object: mission.mission_object,
          status: mission.status,
          currentStep: mission.current_step,
          departureDate: mission.departure_date,
          returnDate: mission.return_date,
          transportMode: mission.transport_mode,
          estimatedFuel: mission.estimated_fuel,
          estimatedCosts: mission.estimated_costs,
          missionFees: mission.mission_fees,
          totalMissionCost: mission.total_mission_cost,
          fuelCost: mission.fuel_cost,
          participantsCost: mission.participants_cost,
          createdAt: mission.created_at,
          updatedAt: mission.updated_at
        },
        
        // Villes avec toutes les informations
        cities: {
          departure: {
            id: mission.departure_city,
            name: mission.departure_city_name || mission.departure_city_full_name,
            region: mission.departure_city_region
          },
          arrival: {
            id: mission.arrival_city,
            name: mission.arrival_city_name || mission.arrival_city_full_name,
            region: mission.arrival_city_region
          }
        },
        
        // Créateur
        creator: {
          id: mission.created_by,
          username: mission.created_by_username,
          email: mission.created_by_email
        },
        
        // Institution
        institution: {
          id: mission.institution_id,
          name: mission.institution_name,
          type: mission.institution_type
        },
        
        // Véhicule avec toutes les informations
        vehicle: {
          id: mission.vehicle_id,
          plate: mission.vehicle_plate || mission.vehicle_registration,
          model: mission.vehicle_model || mission.vehicle_model_from_table,
          brand: mission.vehicle_brand || mission.vehicle_brand_from_table,
          year: mission.vehicle_year,
          color: mission.vehicle_color
        },
        
        // Chauffeur avec toutes les informations
        driver: {
          id: mission.driver_id,
          name: mission.driver_name || mission.driver_name_from_table,
          phone: mission.driver_phone || mission.driver_phone_from_table,
          license: mission.driver_license || mission.driver_license_from_table,
          licenseType: mission.driver_license_type
        },
        
        // Participants
        participants: participantsResult.rows.map(p => ({
          id: p.id,
          type: p.participant_type,
          employeeId: p.employee_id,
          employeeName: p.employee_full_name,
          employeePosition: p.employee_position,
          employeeGrade: p.employee_grade,
          externalName: p.external_name,
          externalFirstname: p.external_firstname,
          externalNni: p.external_nni,
          externalProfession: p.external_profession,
          externalMinistry: p.external_ministry,
          roleInMission: p.role_in_mission,
          dailyAllowance: p.daily_allowance,
          accommodationAllowance: p.accommodation_allowance,
          transportAllowance: p.transport_allowance,
          totalAllowance: p.total_allowance
        })),
        
        // Notifications
        notifications: notificationsResult.rows.map(n => ({
          id: n.id,
          type: n.notification_type,
          title: n.title,
          message: n.message,
          isRead: n.is_read,
          user: n.user_username,
          createdAt: n.created_at
        })),
        
        // Documents
        documents: documentsResult.rows.map(d => ({
          id: d.id,
          type: d.document_type,
          filename: d.filename,
          filePath: d.file_path,
          uploadedBy: d.uploaded_by,
          uploadedAt: d.uploaded_at
        })),
        
        // Logs d'audit
        auditLogs: auditLogsResult.rows.map(a => ({
          id: a.id,
          action: a.action,
          user: a.user_username,
          details: a.details,
          createdAt: a.created_at
        })),
        
        // Validations
        validations: {
          technical: {
            validatedBy: mission.technical_validated_by,
            validatedAt: mission.technical_validated_at,
            rejectionReason: mission.technical_rejection_reason
          },
          logistics: {
            validatedBy: mission.logistics_validated_by,
            validatedAt: mission.logistics_validated_at
          },
          finance: {
            validatedBy: mission.finance_validated_by,
            validatedAt: mission.finance_validated_at,
            rejectionReason: mission.finance_rejection_reason
          },
          dg: {
            validatedBy: mission.dg_validated_by,
            validatedAt: mission.dg_validated_at,
            rejectionReason: mission.dg_rejection_reason
          }
        }
      };
      
      console.log(`✅ Données complètes récupérées pour la mission ${missionId}`);
      console.log(`   - Participants: ${unifiedData.participants.length}`);
      console.log(`   - Notifications: ${unifiedData.notifications.length}`);
      console.log(`   - Documents: ${unifiedData.documents.length}`);
      console.log(`   - Logs d'audit: ${unifiedData.auditLogs.length}`);
      
      return unifiedData;
      
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des données unifiées:', error);
      throw error;
    }
  },
  
  /**
   * Récupérer toutes les missions avec leurs données liées
   */
  getAllMissionsWithData: async (institutionId = null) => {
    try {
      console.log(`🔍 Récupération de toutes les missions avec données liées...`);
      
      let whereClause = '';
      let params = [];
      
      if (institutionId) {
        whereClause = 'WHERE m.institution_id = ?';
        params = [institutionId];
      }
      
      const missionsResult = await query(`
        SELECT 
          m.id, m.mission_reference, m.mission_object, m.status, m.current_step,
          m.departure_date, m.return_date, m.transport_mode,
          m.departure_city_name, m.arrival_city_name,
          m.vehicle_plate, m.driver_name,
          m.created_at,
          creator.username as created_by_username,
          inst.name as institution_name,
          COUNT(mp.id) as participant_count
        FROM missions m
        LEFT JOIN users creator ON m.created_by = creator.id
        LEFT JOIN institutions inst ON m.institution_id = inst.id
        LEFT JOIN mission_participants mp ON m.id = mp.mission_id
        ${whereClause}
        GROUP BY m.id
        ORDER BY m.created_at DESC
      `, params);
      
      console.log(`✅ ${missionsResult.rows.length} missions récupérées`);
      return missionsResult.rows;
      
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des missions:', error);
      throw error;
    }
  },
  
  /**
   * Récupérer les statistiques complètes
   */
  getCompleteStatistics: async (institutionId = null) => {
    try {
      console.log(`📊 Récupération des statistiques complètes...`);
      
      let whereClause = '';
      let params = [];
      
      if (institutionId) {
        whereClause = 'WHERE m.institution_id = ?';
        params = [institutionId];
      }
      
      const statsResult = await query(`
        SELECT 
          COUNT(*) as total_missions,
          COUNT(CASE WHEN m.status = 'draft' THEN 1 END) as draft_missions,
          COUNT(CASE WHEN m.status = 'pending_technical' THEN 1 END) as pending_technical,
          COUNT(CASE WHEN m.status = 'pending_logistics' THEN 1 END) as pending_logistics,
          COUNT(CASE WHEN m.status = 'pending_finance' THEN 1 END) as pending_finance,
          COUNT(CASE WHEN m.status = 'pending_dg' THEN 1 END) as pending_dg,
          COUNT(CASE WHEN m.status = 'validated' THEN 1 END) as validated_missions,
          COUNT(CASE WHEN m.status = 'rejected' THEN 1 END) as rejected_missions,
          COUNT(CASE WHEN m.departure_city IS NOT NULL THEN 1 END) as missions_with_cities,
          COUNT(CASE WHEN m.vehicle_id IS NOT NULL THEN 1 END) as missions_with_vehicle,
          COUNT(CASE WHEN m.driver_id IS NOT NULL THEN 1 END) as missions_with_driver,
          SUM(m.total_mission_cost) as total_costs,
          SUM(m.fuel_cost) as total_fuel_costs,
          SUM(m.participants_cost) as total_participants_costs
        FROM missions m
        ${whereClause}
      `, params);
      
      const stats = statsResult.rows[0];
      
      console.log(`✅ Statistiques récupérées`);
      return {
        missions: {
          total: stats.total_missions,
          byStatus: {
            draft: stats.draft_missions,
            pendingTechnical: stats.pending_technical,
            pendingLogistics: stats.pending_logistics,
            pendingFinance: stats.pending_finance,
            pendingDg: stats.pending_dg,
            validated: stats.validated_missions,
            rejected: stats.rejected_missions
          },
          withCities: stats.missions_with_cities,
          withVehicle: stats.missions_with_vehicle,
          withDriver: stats.missions_with_driver
        },
        costs: {
          total: stats.total_costs || 0,
          fuel: stats.total_fuel_costs || 0,
          participants: stats.total_participants_costs || 0
        }
      };
      
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des statistiques:', error);
      throw error;
    }
  }
};

module.exports = UnifiedDataService;
