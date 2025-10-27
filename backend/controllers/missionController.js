const SimpleUnifiedMissionService = require('../services/simpleUnifiedMissionService');
const NotificationService = require('../services/notificationService');
const DocumentService = require('../services/documentService');
const PDFGenerationService = require('../services/pdfGenerationService');

const missionController = {
  async create(req, res) {
    try {
      const userId = req.user.id;
      const institutionId = req.user.institution_id;
      const { mission, nextValidatorId } = await SimpleUnifiedMissionService.createMission(
        req.body,
        userId,
        institutionId
      );

      if (nextValidatorId) {
        await NotificationService.createNotification(
          nextValidatorId,
          mission.id,
          'mission_created',
          'Nouvelle mission à valider',
          `Une nouvelle mission ${mission.mission_reference} nécessite votre validation.`
        );
      }

      res.status(201).json({ mission });
    } catch (error) {
      console.error('Create mission error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getAll(req, res) {
    try {
      const missions = await SimpleUnifiedMissionService.getMissionsByUser(
        req.user.id,
        req.user.role,
        req.user.institution_id
      );
      res.json({ missions });
    } catch (error) {
      console.error('Get missions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getById(req, res) {
    try {
      const mission = await SimpleUnifiedMissionService.getMissionById(req.params.id);
      if (!mission) {
        return res.status(404).json({ error: 'Mission not found' });
      }
      res.json({ mission });
    } catch (error) {
      console.error('Get mission error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getMissionStatus(req, res) {
    try {
      const status = await SimpleUnifiedMissionService.getMissionStatus(req.params.id);
      if (!status) {
        return res.status(404).json({ error: 'Mission not found' });
      }
      res.json(status);
    } catch (error) {
      console.error('Get mission status error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getParticipants(req, res) {
    try {
      const participants = await SimpleUnifiedMissionService.getMissionParticipants(req.params.id);
      res.json({ participants });
    } catch (error) {
      console.error('Get mission participants error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getMissionHistory(req, res) {
    try {
      const history = await SimpleUnifiedMissionService.getMissionHistory(req.params.id);
      if (!history) {
        return res.status(404).json({ error: 'Mission not found' });
      }
      res.json(history);
    } catch (error) {
      console.error('Get mission history error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getAvailableVehicles(req, res) {
    try {
      const vehicles = await SimpleUnifiedMissionService.getAvailableVehicles(req.user.institution_id);
      res.json({ vehicles });
    } catch (error) {
      console.error('Get vehicles error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getAvailableDrivers(req, res) {
    try {
      const drivers = await SimpleUnifiedMissionService.getAvailableDrivers(req.user.institution_id);
      res.json({ drivers });
    } catch (error) {
      console.error('Get drivers error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async calculateCosts(req, res) {
    try {
      const { participants, departure_date, return_date } = req.body;
      const costs = await SimpleUnifiedMissionService.calculateMissionCosts(
        participants,
        departure_date,
        return_date
      );
      res.json({ costs });
    } catch (error) {
      console.error('Calculate costs error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async calculateFuelEstimate(req, res) {
    try {
      const { transport_mode, departure_date, return_date } = req.body;
      const estimate = await SimpleUnifiedMissionService.calculateFuelEstimate(
        transport_mode,
        departure_date,
        return_date
      );
      res.json({ estimated_fuel: estimate });
    } catch (error) {
      console.error('Calculate fuel estimate error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async validateTechnical(req, res) {
    try {
      const { decision, comment } = req.body;
      const { mission, nextValidatorId } = await SimpleUnifiedMissionService.validateTechnical(
        req.params.id,
        req.user.id,
        decision,
        comment
      );

      if (nextValidatorId) {
        await NotificationService.createNotification(
          nextValidatorId,
          mission.id,
          'mission_pending_logistics',
          'Mission en attente de logistique',
          `La mission ${mission.mission_reference} attend votre intervention.`
        );
      }

      res.json({ mission, nextValidatorId });
    } catch (error) {
      console.error('Technical validation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async assignLogistics(req, res) {
    try {
      const { mission, nextValidatorId } = await SimpleUnifiedMissionService.assignLogistics(
        req.params.id,
        req.user.id,
        req.body
      );

      if (nextValidatorId) {
        await NotificationService.createNotification(
          nextValidatorId,
          mission.id,
          'mission_pending_finance',
          'Mission en attente de validation financière',
          `La mission ${mission.mission_reference} nécessite une validation financière.`
        );
      }

      res.json({ mission, nextValidatorId });
    } catch (error) {
      console.error('Assign logistics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async validateFinance(req, res) {
    try {
      const { decision, comment } = req.body;
      const { mission, nextValidatorId } = await SimpleUnifiedMissionService.validateFinance(
        req.params.id,
        req.user.id,
        decision,
        comment
      );

      if (nextValidatorId) {
        await NotificationService.createNotification(
          nextValidatorId,
          mission.id,
          'mission_pending_final',
          'Mission en attente de validation finale',
          `La mission ${mission.mission_reference} attend la décision de la Direction Générale.`
        );
      }

      res.json({ mission, nextValidatorId });
    } catch (error) {
      console.error('Finance validation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async validateFinal(req, res) {
    try {
      const { decision, comment } = req.body;
      const { mission } = await SimpleUnifiedMissionService.validateFinal(
        req.params.id,
        req.user.id,
        decision,
        comment
      );

      if (mission && mission.status === 'validated') {
        await DocumentService.generateAllDocuments(mission.id, req.user.id);
      }

      res.json({ mission });
    } catch (error) {
      console.error('Final validation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async uploadDocuments(req, res) {
    try {
      const missionReport = req.files?.mission_report?.[0];
      const stampedOrders = req.files?.stamped_mission_orders?.[0];

      if (!missionReport || !stampedOrders) {
        return res.status(400).json({ error: 'Les deux documents sont requis' });
      }

      const mission = await SimpleUnifiedMissionService.uploadSupportingDocuments(
        req.params.id,
        req.user.id,
        {
          mission_report_url: `/uploads/${missionReport.filename}`,
          stamped_orders_url: `/uploads/${stampedOrders.filename}`
        }
      );

      await NotificationService.createNotification(
        mission.created_by,
        mission.id,
        'mission_documents_uploaded',
        'Documents déposés',
        `Les justificatifs de la mission ${mission.mission_reference} sont disponibles pour vérification.`
      );

      res.json({ mission });
    } catch (error) {
      console.error('Upload documents error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async verifyAndCloseMission(req, res) {
    try {
      const { decision, comment } = req.body;
      const result = await SimpleUnifiedMissionService.closeMission(
        req.params.id,
        req.user.id,
        decision,
        comment
      );

      if (result.closed) {
        await NotificationService.createNotification(
          result.mission.created_by,
          result.mission.id,
          'mission_closed',
          'Mission clôturée',
          `La mission ${result.mission.mission_reference} est clôturée.`
        );
      }

      res.json(result);
    } catch (error) {
      console.error('Verify and close mission error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getDocuments(req, res) {
    try {
      const documents = await DocumentService.getMissionDocuments(req.params.id);
      res.json({ documents });
    } catch (error) {
      console.error('Get mission documents error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async downloadDocument(req, res) {
    try {
      const document = await DocumentService.getDocumentById(req.params.documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      res.download(document.file_path, document.document_name || document.file_path.split('/').pop());
    } catch (error) {
      console.error('Download document error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async generatePDF(req, res) {
    try {
      const mission = await SimpleUnifiedMissionService.getMissionById(req.params.id);
      if (!mission) {
        return res.status(404).json({ error: 'Mission not found' });
      }

      const pdfPath = await PDFGenerationService.generateMissionOrderPDF(
        mission,
        mission.participants
      );

      res.json({ pdf: pdfPath });
    } catch (error) {
      console.error('Generate PDF error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = missionController;
