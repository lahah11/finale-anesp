const EngineerService = require('../services/engineerService');

const engineerController = {
  // Récupérer tous les ingénieurs
  getAllEngineers: async (req, res) => {
    try {
      const engineers = await EngineerService.getAllEngineers();
      res.json(engineers);
    } catch (error) {
      console.error('Error getting engineers:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des ingénieurs' });
    }
  },

  // Récupérer un ingénieur par ID
  getEngineerById: async (req, res) => {
    try {
      const { id } = req.params;
      const engineer = await EngineerService.getEngineerById(id);
      
      if (!engineer) {
        return res.status(404).json({ error: 'Ingénieur non trouvé' });
      }
      
      res.json(engineer);
    } catch (error) {
      console.error('Error getting engineer:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération de l\'ingénieur' });
    }
  },

  // Récupérer un ingénieur par ID utilisateur
  getEngineerByUserId: async (req, res) => {
    try {
      const { userId } = req.params;
      const engineer = await EngineerService.getEngineerByUserId(userId);
      
      if (!engineer) {
        return res.status(404).json({ error: 'Ingénieur non trouvé pour cet utilisateur' });
      }
      
      res.json(engineer);
    } catch (error) {
      console.error('Error getting engineer by user ID:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération de l\'ingénieur' });
    }
  },

  // Créer un nouvel ingénieur
  createEngineer: async (req, res) => {
    try {
      const engineerData = req.body;
      
      // Validation des champs requis
      if (!engineerData.nni || !engineerData.first_name || !engineerData.last_name || 
          !engineerData.position || !engineerData.department) {
        return res.status(400).json({ 
          error: 'Les champs NNI, prénom, nom, poste et département sont requis' 
        });
      }
      
      const engineerId = await EngineerService.createEngineer(engineerData);
      res.status(201).json({ 
        message: 'Ingénieur créé avec succès', 
        id: engineerId 
      });
    } catch (error) {
      console.error('Error creating engineer:', error);
      res.status(500).json({ error: 'Erreur lors de la création de l\'ingénieur' });
    }
  },

  // Mettre à jour un ingénieur
  updateEngineer: async (req, res) => {
    try {
      const { id } = req.params;
      const engineerData = req.body;
      
      const success = await EngineerService.updateEngineer(id, engineerData);
      if (success) {
        res.json({ message: 'Ingénieur mis à jour avec succès' });
      } else {
        res.status(404).json({ error: 'Ingénieur non trouvé' });
      }
    } catch (error) {
      console.error('Error updating engineer:', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'ingénieur' });
    }
  },

  // Désactiver un ingénieur
  deactivateEngineer: async (req, res) => {
    try {
      const { id } = req.params;
      
      const success = await EngineerService.deactivateEngineer(id);
      if (success) {
        res.json({ message: 'Ingénieur désactivé avec succès' });
      } else {
        res.status(404).json({ error: 'Ingénieur non trouvé' });
      }
    } catch (error) {
      console.error('Error deactivating engineer:', error);
      res.status(500).json({ error: 'Erreur lors de la désactivation de l\'ingénieur' });
    }
  }
};

module.exports = engineerController;
