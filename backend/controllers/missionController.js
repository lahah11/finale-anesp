const { query } = require('../config/database');
const { validationResult } = require('express-validator');
const MissionService = require('../services/missionService');
const SimpleUnifiedMissionService = require('../services/simpleUnifiedMissionService');
const DocumentService = require('../services/documentService');
const NotificationService = require('../services/notificationService');
const WorkflowService = require('../services/workflowService');
const EmailNotificationService = require('../services/emailNotificationService');

const missionController = {
  // Créer une nouvelle mission (Ingénieur)
  create: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const missionData = req.body;
      const userId = req.user.id;
      const institutionId = req.user.institution_id;

      // Logs détaillés pour debug
      console.log('🔍 API MissionController.create - Données reçues:');
      console.log(`   - Objet: ${missionData.mission_object}`);
      console.log(`   - Départ: ${missionData.departure_city_name} (ID: ${missionData.departure_city})`);
      console.log(`   - Arrivée: ${missionData.arrival_city_name} (ID: ${missionData.arrival_city})`);
      console.log(`   - Participants: ${missionData.participants?.length || 0}`);
      console.log(`   - User ID: ${userId}`);
      console.log(`   - Institution ID: ${institutionId}`);

      // Utiliser le nouveau service unifié
      const result = await SimpleUnifiedMissionService.createMission(missionData, userId, institutionId);
      
      // Envoyer notification au Directeur Technique
      await NotificationService.createNotification(
        result.technical_validator_id,
        result.mission.id,
        'mission_created',
        'Nouvelle mission à valider',
        `Une nouvelle mission "${result.mission.mission_object}" a été créée et nécessite votre validation.`
      );

      res.status(201).json({
        message: 'Mission créée avec succès',
        mission: result.mission,
        participants: result.participants
      });
    } catch (error) {
      console.error('Create mission error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Obtenir toutes les missions (selon le rôle)
  getAll: async (req, res) => {
    try {
      console.log('📋 Récupération des missions avec système unifié...');
      const userId = req.user.id;
      const userRole = req.user.role;
      const institutionId = req.user.institution_id;
      const institutionRoleId = req.user.institution_role_id;

      // Utiliser le service unifié pour récupérer les missions
      const SimpleUnifiedMissionService = require('../services/simpleUnifiedMissionService');
      const missions = await SimpleUnifiedMissionService.getMissionsByUser(userId, userRole, institutionId, institutionRoleId);
      
      console.log(`✅ ${missions.length} mission(s) récupérée(s) depuis missions_unified`);
      res.json(missions);
    } catch (error) {
      console.error('Get missions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Obtenir une mission par ID
  getById: async (req, res) => {
    try {
      console.log('📋 Récupération d\'une mission par ID avec système unifié...');
      const { id } = req.params;
      const userId = req.user.id;
      const institutionId = req.user.institution_id;

      // Utiliser le service unifié pour récupérer la mission
      const SimpleUnifiedMissionService = require('../services/simpleUnifiedMissionService');
      const mission = await SimpleUnifiedMissionService.getMissionById(id);
      
      if (!mission) {
        console.log(`❌ Mission ${id} non trouvée dans missions_unified`);
        return res.status(404).json({ error: 'Mission not found' });
      }

      console.log(`✅ Mission ${id} récupérée depuis missions_unified`);
      res.json({ mission });
    } catch (error) {
      console.error('Get mission error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Validation technique (Directeur Technique)
  validateTechnical: async (req, res) => {
    try {
      console.log('🔧 Validation technique avec système unifié...');
      const { id } = req.params;
      const { action, rejection_reason } = req.body;
      const userId = req.user.id;

      // Utiliser le service unifié pour la validation technique
      const result = await SimpleUnifiedMissionService.validateTechnical(id, userId, action, rejection_reason);

      // Sécuriser l'envoi de notification (mission et destinataire requis)
      if (action === 'approve' && result?.mission && result?.next_validator_id) {
        await NotificationService.createNotification(
          result.next_validator_id,
          id,
          'mission_technical_validated',
          'Mission validée techniquement',
          `La mission "${result.mission.mission_object}" a été validée techniquement et nécessite l'attribution de moyens.`
        );
        console.log('✅ Notification envoyée au service des moyens généraux');
      }

      console.log(`✅ Validation technique ${action === 'approve' ? 'approuvée' : 'rejetée'} dans missions_unified`);
      res.json({
        message: action === 'approve' ? 'Mission validée techniquement' : 'Mission rejetée',
        mission: result?.mission || null
      });
    } catch (error) {
      console.error('Technical validation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Attribution des moyens (Service Moyens Généraux) - UNIFIÉ
  assignLogistics: async (req, res) => {
    try {
      console.log('🚗 Attribution logistique avec système unifié...');
      const { id } = req.params;
      const { vehicle_id, driver_id, vehicle_plate, vehicle_model, vehicle_brand, driver_name, driver_phone, driver_license } = req.body;
      const userId = req.user.id;

      // Logs détaillés de la charge utile reçue
      console.log('   ▶ Payload reçu pour assign-logistics:');
      console.log(`     - vehicle_id: ${vehicle_id}`);
      console.log(`     - driver_id: ${driver_id}`);
      console.log(`     - vehicle_plate: ${vehicle_plate}`);
      console.log(`     - vehicle_brand: ${vehicle_brand}`);
      console.log(`     - vehicle_model: ${vehicle_model}`);
      console.log(`     - driver_name: ${driver_name}`);
      console.log(`     - driver_phone: ${driver_phone}`);
      console.log(`     - driver_license: ${driver_license}`);
      
      // Utiliser le service unifié pour l'attribution logistique
      const result = await SimpleUnifiedMissionService.assignLogistics(id, userId, vehicle_id, driver_id, {
        vehicle_plate, vehicle_model, vehicle_brand, driver_name, driver_phone, driver_license
      });

      // Log de la mission mise à jour (statut / étape)
      if (result?.mission) {
        console.log('   ✅ Mission mise à jour:');
        console.log(`     - status: ${result.mission.status}`);
        console.log(`     - current_step: ${result.mission.current_step}`);
        console.log(`     - vehicle_id: ${result.mission.vehicle_id}`);
        console.log(`     - driver_id: ${result.mission.driver_id}`);
      }

      // Notifier le DAF (optionnel via service existant)
      if (result?.next_validator_id) {
        await NotificationService.createNotification(
          result.next_validator_id,
          id,
          'mission_logistics_assigned',
          'Moyens attribués à la mission',
          `Les moyens logistiques ont été attribués à la mission "${result.mission.mission_object}" et nécessitent la validation financière.`
        );
      }

      console.log('✅ Attribution logistique réussie dans missions_unified');
      res.json(result);
    } catch (error) {
      console.error('Assign logistics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Validation financière (DAF)
  validateFinance: async (req, res) => {
    try {
      const { id } = req.params;
      const { action, rejection_reason } = req.body;
      const userId = req.user.id;

      // Utiliser le service unifié pour la validation financière
      const result = await SimpleUnifiedMissionService.validateFinance(id, userId, action, rejection_reason);

      if (action === 'approve' && result?.next_validator_id) {
        // Notifier le DG
        await NotificationService.createNotification(
          result.next_validator_id,
          id,
          'mission_finance_validated',
          'Mission validée financièrement',
          `La mission a été validée financièrement et nécessite la validation finale.`
        );
      }

      res.json({
        message: action === 'approve' ? 'Mission validée financièrement' : 'Mission rejetée',
        mission: result.mission
      });
    } catch (error) {
      console.error('Finance validation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Validation finale (DG)
  validateFinal: async (req, res) => {
    try {
      const { id } = req.params;
      const { action, rejection_reason } = req.body;
      const userId = req.user.id;

      const result = await MissionService.validateFinal(id, userId, action, rejection_reason);
      
      if (action === 'approve') {
        let pdfUrl = null;
        
        try {
          // Générer le PDF de l'ordre de mission
          const PDFGenerationService = require('../services/pdfGenerationService');
          const participants = await MissionService.getMissionParticipants(id);
          pdfUrl = await PDFGenerationService.generateMissionOrderPDF(result.mission, participants);
          
          // Mettre à jour la mission avec l'URL du PDF
          await query('UPDATE missions SET stamped_mission_orders_url = ? WHERE id = ?', [pdfUrl, id]);
          
          console.log('📄 PDF de l\'ordre de mission généré:', pdfUrl);
          
          // Envoyer l'ordre de mission avec PDF en pièce jointe
          if (result.mission && participants.length > 0) {
            const EmailNotificationService = require('../services/emailNotificationService');
            const path = require('path');
            const pdfPath = path.join(__dirname, '..', 'uploads', 'orders', path.basename(pdfUrl));
            
            await EmailNotificationService.sendMissionOrderWithPDF(result.mission, participants, pdfPath);
            console.log('📧 Ordre de mission envoyé avec PDF aux participants');
          } else {
            console.log('⚠️ Impossible d\'envoyer l\'email : mission ou participants manquants');
          }
          
        } catch (pdfError) {
          console.error('Erreur génération PDF:', pdfError);
          // Continue même si le PDF échoue
        }
        
        // Notifier tous les participants (notification simple en plus)
        await NotificationService.notifyMissionParticipants(id, 'mission_validated', 'Mission validée', 'Votre mission a été validée et les documents sont disponibles.');
        
        res.json({
          message: 'Mission validée définitivement',
          mission: result.mission,
          pdfUrl: pdfUrl
        });
      } else {
        res.json({
          message: 'Mission rejetée',
          mission: result.mission
        });
      }
    } catch (error) {
      console.error('Final validation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Obtenir les participants d'une mission
  getParticipants: async (req, res) => {
    try {
      const { id } = req.params;
      const participants = await MissionService.getMissionParticipants(id);
      res.json({ participants });
    } catch (error) {
      console.error('Get participants error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Obtenir les véhicules disponibles
  getAvailableVehicles: async (req, res) => {
    try {
      const institutionId = req.user.institution_id;
      const vehicles = await MissionService.getAvailableVehicles(institutionId);
      res.json({ vehicles });
    } catch (error) {
      console.error('Get vehicles error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Obtenir les chauffeurs disponibles
  getAvailableDrivers: async (req, res) => {
    try {
      const institutionId = req.user.institution_id;
      const drivers = await MissionService.getAvailableDrivers(institutionId);
      res.json({ drivers });
    } catch (error) {
      console.error('Get drivers error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Calculer les frais de mission
  calculateCosts: async (req, res) => {
    try {
      const { participants, departure_date, return_date, transport_mode } = req.body;
      const institutionId = req.user.institution_id;
      
      const costs = await MissionService.calculateMissionCosts(participants, departure_date, return_date, transport_mode, institutionId);
      res.json({ costs });
    } catch (error) {
      console.error('Calculate costs error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Calculer l'estimation du carburant
  calculateFuelEstimate: async (req, res) => {
    try {
      const { transport_mode, departure_date, return_date } = req.body;
      const institutionId = req.user.institution_id;
      
      const estimate = await MissionService.calculateFuelEstimate(transport_mode, departure_date, return_date, institutionId);
      res.json({ estimated_fuel: estimate });
    } catch (error) {
      console.error('Calculate fuel estimate error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Workflow: Soumettre une mission pour validation
  submitMission: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const result = await WorkflowService.submitMission(id, userId);
      
      // Envoyer notification au Directeur Technique
      const mission = await MissionService.getMissionById(id);
      const participants = await MissionService.getMissionParticipants(id);
      const technicalValidator = await MissionService.getTechnicalValidator(req.user.institution_id);
      
      if (technicalValidator) {
        await EmailNotificationService.sendMissionCreatedNotification(mission, participants, technicalValidator);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Submit mission error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Workflow: Validation technique
  validateTechnical: async (req, res) => {
    try {
      console.log('🔧 Validation technique avec système unifié...');
      const { id } = req.params;
      const { action, rejection_reason } = req.body;
      const userId = req.user.id;

      const result = await SimpleUnifiedMissionService.validateTechnical(id, userId, action, rejection_reason);

      if (action === 'approve' && result?.mission && result?.next_validator_id) {
        await NotificationService.createNotification(
          result.next_validator_id,
          id,
          'mission_technical_validated',
          'Mission validée techniquement',
          `La mission "${result.mission.mission_object}" a été validée techniquement et nécessite l'attribution de moyens.`
        );
      }

      console.log(`✅ Validation technique ${action === 'approve' ? 'approuvée' : 'rejetée'} dans missions_unified`);
      res.json({
        message: action === 'approve' ? 'Mission validée techniquement' : 'Mission rejetée',
        mission: result?.mission || null
      });
    } catch (error) {
      console.error('Validate technical error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Workflow: Attribution logistique
  assignLogistics: async (req, res) => {
    try {
      console.log('🚗 Attribution logistique avec système unifié...');
      const { id } = req.params;
      const { vehicle_id, driver_id, vehicle_plate, vehicle_model, vehicle_brand, driver_name, driver_phone, driver_license } = req.body;
      const userId = req.user.id;
      
      // Utiliser le service unifié pour l'attribution logistique
      const result = await SimpleUnifiedMissionService.assignLogistics(id, userId, vehicle_id, driver_id, {
        vehicle_plate, vehicle_model, vehicle_brand, driver_name, driver_phone, driver_license
      });
      
      // Notification simple au DAF (sans email)
      if (result?.next_validator_id) {
        await NotificationService.createNotification(
          result.next_validator_id,
          id,
          'mission_logistics_assigned',
          'Moyens attribués à la mission',
          `Les moyens logistiques ont été attribués à la mission et nécessitent la validation financière.`
        );
      }
      
      console.log('✅ Attribution logistique réussie dans missions_unified');
      res.json(result);
    } catch (error) {
      console.error('Assign logistics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },


  // Workflow: Validation finale
  validateFinal: async (req, res) => {
    try {
      const { id } = req.params;
      const { action, rejection_reason } = req.body;
      const userId = req.user.id;
      
      // Utiliser le service unifié pour la validation finale
      const result = await SimpleUnifiedMissionService.validateFinal(id, userId, action, rejection_reason);
      
      if (action === 'approve') {
        // Traitement de la validation finale avec génération PDF et envoi email
        const mission = await SimpleUnifiedMissionService.getMissionById(id);
        await processFinalValidation(id, mission);
      } else {
        // Envoyer notification de refus
        const mission = await SimpleUnifiedMissionService.getMissionById(id);
        const participants = await MissionService.getMissionParticipants(id);
        await EmailNotificationService.sendRejectionNotification(mission, participants, rejection_reason, req.user.username);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Validate final error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Obtenir les missions en attente pour le rôle actuel
  getPendingMissions: async (req, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.institution_role_id;
      const institutionId = req.user.institution_id;
      
      // Récupérer le code du rôle
      const roleResult = await query('SELECT role_code FROM institution_roles WHERE id = ?', [userRole]);
      const roleCode = roleResult.rows[0]?.role_code;
      
      const missions = await WorkflowService.getPendingMissionsForRole(userId, roleCode, institutionId);
      res.json(missions);
    } catch (error) {
      console.error('Get pending missions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Obtenir le statut d'une mission
  getMissionStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const status = await WorkflowService.getMissionStatus(id);
      
      if (!status) {
        return res.status(404).json({ error: 'Mission not found' });
      }
      
      res.json(status);
    } catch (error) {
      console.error('Get mission status error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Obtenir les documents d'une mission
  getDocuments: async (req, res) => {
    try {
      const { id } = req.params;
      const documents = await DocumentService.getMissionDocuments(id);
      res.json({ documents });
    } catch (error) {
      console.error('Get documents error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Télécharger un document
  downloadDocument: async (req, res) => {
    try {
      const { id, documentId } = req.params;
      const document = await DocumentService.getDocumentById(documentId);
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      res.download(document.file_path, document.document_name);
    } catch (error) {
      console.error('Download document error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Validation par le Directeur Général
  validateDG: async (req, res) => {
    try {
      const { id } = req.params;
      const { validated_by, validation_type, status } = req.body;
      const userId = req.user.id;

      // Vérifier que l'utilisateur a le rôle DG
      if (req.user.role !== 'dg') {
        return res.status(403).json({ error: 'Accès refusé. Seul le Directeur Général peut valider.' });
      }

      // Mettre à jour le statut de la mission
      await query(
        'UPDATE missions SET status = ?, validated_by_dg = ?, dg_validated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, userId, id]
      );

      // Créer une notification
      await NotificationService.createNotification(
        req.user.id,
        id,
        'mission_validated_dg',
        'Mission validée par le DG',
        `La mission a été validée par le Directeur Général et transmise au MSGG.`
      );

      res.json({ 
        message: 'Mission validée avec succès',
        status: status 
      });
    } catch (error) {
      console.error('Validate DG error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Refus de mission
  rejectMission: async (req, res) => {
    try {
      const { id } = req.params;
      const { rejected_by, rejection_reason, status } = req.body;
      const userId = req.user.id;

      // Vérifier que l'utilisateur a le rôle DG
      if (req.user.role !== 'dg') {
        return res.status(403).json({ error: 'Accès refusé. Seul le Directeur Général peut refuser.' });
      }

      // Mettre à jour le statut de la mission
      await query(
        'UPDATE missions SET status = ?, rejection_reason = ?, rejected_by = ?, rejected_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, rejection_reason, userId, id]
      );

      // Créer une notification
      await NotificationService.createNotification(
        req.user.id,
        id,
        'mission_rejected',
        'Mission refusée',
        `La mission a été refusée. Motif: ${rejection_reason}`
      );

      res.json({ 
        message: 'Mission refusée',
        status: status,
        rejection_reason: rejection_reason
      });
    } catch (error) {
      console.error('Reject mission error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // (Legacy logistics handlers removed; unified handlers are used above)

  // Upload des documents justificatifs (Ingénieur)
  uploadDocuments: async (req, res) => {
    try {
      console.log('📁 Upload documents - Début');
      console.log('Files:', req.files);
      console.log('User:', req.user);
      
      const { id } = req.params;
      const userId = req.user.id;

      // Vérifier que les fichiers ont été uploadés
      if (!req.files || !req.files.mission_report || !req.files.stamped_mission_orders) {
        console.log('❌ Fichiers manquants');
        return res.status(400).json({ 
          error: 'Les deux fichiers (rapport de mission et ordres cachetés) sont requis' 
        });
      }

      const missionReportFile = req.files.mission_report[0];
      const stampedOrdersFile = req.files.stamped_mission_orders[0];

      // Vérifier que la mission est validée et peut recevoir des documents
      const mission = await query('SELECT * FROM missions WHERE id = ?', [id]);
      if (!mission.rows || mission.rows.length === 0) {
        return res.status(404).json({ error: 'Mission non trouvée' });
      }

      const missionData = mission.rows[0];
      if (missionData.status !== 'validated') {
        return res.status(400).json({ 
          error: 'La mission doit être validée avant de pouvoir uploader des documents' 
        });
      }

      // Vérifier si les documents ont déjà été uploadés
      if (missionData.mission_report_url && missionData.stamped_mission_orders_url) {
        return res.status(400).json({ 
          error: 'Les documents ont déjà été uploadés pour cette mission' 
        });
      }

      // Générer les URLs des fichiers uploadés
      const missionReportUrl = `/uploads/${missionReportFile.filename}`;
      const stampedOrdersUrl = `/uploads/${stampedOrdersFile.filename}`;

      // Mettre à jour la mission avec les documents
      await query(
        `UPDATE missions SET 
         mission_report_url = ?, 
         stamped_mission_orders_url = ?, 
         documents_uploaded_by = ?, 
         documents_uploaded_at = CURRENT_TIMESTAMP,
         status = 'validated',
         current_step = 6
         WHERE id = ?`,
        [missionReportUrl, stampedOrdersUrl, userId, id]
      );

      // Créer une notification pour le Service Moyens Généraux
      const msggUser = await query(
        'SELECT id FROM users WHERE institution_id = ? AND role = "msgg" AND is_active = 1 LIMIT 1',
        [missionData.institution_id]
      );

      if (msggUser.rows && msggUser.rows.length > 0) {
        await query(
          'INSERT INTO notifications (user_id, title, message, type, mission_id, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
          [
            msggUser.rows[0].id,
            'Documents justificatifs uploadés',
            `Les documents justificatifs de la mission ${missionData.mission_reference} ont été uploadés et nécessitent votre vérification.`,
            'documents_uploaded',
            id
          ]
        );
      }

      res.json({
        message: 'Documents uploadés avec succès. La mission est maintenant en attente de vérification.',
        new_status: 'completed',
        files: {
          mission_report: missionReportUrl,
          stamped_mission_orders: stampedOrdersUrl
        }
      });
    } catch (error) {
      console.error('Upload documents error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Vérifier et clôturer la mission (Service Moyens Généraux)
  verifyAndCloseMission: async (req, res) => {
    try {
      const { id } = req.params;
      const { action, verification_notes } = req.body;
      const userId = req.user.id;

      // Vérifier que la mission est en attente de vérification
      const mission = await query('SELECT * FROM missions WHERE id = ?', [id]);
      if (!mission.rows || mission.rows.length === 0) {
        return res.status(404).json({ error: 'Mission non trouvée' });
      }

      const missionData = mission.rows[0];
      if (missionData.status !== 'completed') {
        return res.status(400).json({ 
          error: 'La mission doit être en statut "completed" pour être vérifiée' 
        });
      }

      if (action === 'approve') {
        // Approuver et clôturer la mission
        await query(
          `UPDATE missions SET 
           documents_verified_by = ?, 
           documents_verified_at = CURRENT_TIMESTAMP,
           mission_closed_by = ?, 
           mission_closed_at = CURRENT_TIMESTAMP,
           status = 'closed',
           current_step = 7
           WHERE id = ?`,
          [userId, userId, id]
        );

        // Créer une notification pour l'ingénieur
        await query(
          'INSERT INTO notifications (user_id, title, message, type, mission_id, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
          [
            missionData.created_by,
            'Mission clôturée',
            `La mission ${missionData.mission_reference} a été vérifiée et clôturée avec succès.`,
            'mission_closed',
            id
          ]
        );

        res.json({
          message: 'Mission vérifiée et clôturée avec succès.',
          new_status: 'closed'
        });
      } else if (action === 'reject') {
        // Rejeter les documents et remettre en attente
        await query(
          `UPDATE missions SET 
           documents_verified_by = ?, 
           documents_verified_at = CURRENT_TIMESTAMP,
           status = 'validated',
           current_step = 5
           WHERE id = ?`,
          [userId, id]
        );

        // Créer une notification pour l'ingénieur
        await query(
          'INSERT INTO notifications (user_id, title, message, type, mission_id, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
          [
            missionData.created_by,
            'Documents rejetés',
            `Les documents de la mission ${missionData.mission_reference} ont été rejetés. Veuillez les corriger et les re-uploader.`,
            'documents_rejected',
            id
          ]
        );

        res.json({
          message: 'Documents rejetés. L\'ingénieur doit les corriger et les re-uploader.',
          new_status: 'validated'
        });
      } else {
        return res.status(400).json({ error: 'Action invalide. Utilisez "approve" ou "reject".' });
      }
    } catch (error) {
      console.error('Verify and close mission error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Générer le PDF de l'ordre de mission
  generatePDF: async (req, res) => {
    try {
      console.log('📄 Génération du PDF de l\'ordre de mission...');
      const { id } = req.params;
      const userId = req.user.id;

      // Récupérer la mission depuis missions_unified
      const SimpleUnifiedMissionService = require('../services/simpleUnifiedMissionService');
      const mission = await SimpleUnifiedMissionService.getMissionById(id);
      
      if (!mission) {
        console.log(`❌ Mission ${id} non trouvée dans missions_unified`);
        return res.status(404).json({ error: 'Mission not found' });
      }

      // Récupérer les participants
      const participants = await MissionService.getMissionParticipants(id);

      // Générer le PDF
      const PDFGenerationService = require('../services/pdfGenerationService');
      const pdfUrl = await PDFGenerationService.generateMissionOrderPDF(mission, participants);
      
      console.log('✅ PDF généré avec succès:', pdfUrl);
      
      res.json({
        success: true,
        pdfUrl: pdfUrl,
        message: 'PDF généré avec succès'
      });
    } catch (error) {
      console.error('Generate PDF error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

// Helper function to process final validation
async function processFinalValidation(missionId, mission) {
  try {
    console.log('🔄 Traitement de la validation finale avec système unifié...');
    
    // 1. Générer le PDF de l'ordre de mission
    const PDFGenerationService = require('../services/pdfGenerationService');
    const participants = await MissionService.getMissionParticipants(missionId);
    
    console.log('📄 Génération du PDF...');
    const pdfUrl = await PDFGenerationService.generateMissionOrderPDF(mission, participants);
    
    // 2. Mettre à jour la mission avec l'URL du PDF dans missions_unified
    await query('UPDATE missions_unified SET stamped_mission_orders_url = ? WHERE id = ?', [pdfUrl, missionId]);
    console.log('✅ PDF généré et sauvegardé dans missions_unified:', pdfUrl);
    
    // 3. Envoyer l'ordre de mission avec PDF en pièce jointe
    if (mission && participants.length > 0) {
      const EmailNotificationService = require('../services/emailNotificationService');
      const path = require('path');
      const pdfPath = path.join(__dirname, '..', 'uploads', 'orders', path.basename(pdfUrl));
      
      console.log('📧 Envoi de l\'email avec PDF...');
      await EmailNotificationService.sendMissionOrderWithPDF(mission, participants, pdfPath);
      console.log('✅ Email envoyé avec succès aux participants');
    } else {
      console.log('⚠️ Impossible d\'envoyer l\'email : mission ou participants manquants');
    }
    
    // 4. Notifier tous les participants (notification simple en plus)
    const NotificationService = require('../services/notificationService');
    await NotificationService.notifyMissionParticipants(missionId, 'mission_validated', 'Mission validée', 'Votre mission a été validée et les documents sont disponibles.');
    console.log('✅ Notifications envoyées aux participants');
    
    console.log('🎉 Validation finale traitée avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors du traitement de la validation finale:', error);
    throw error;
  }
}

module.exports = missionController;