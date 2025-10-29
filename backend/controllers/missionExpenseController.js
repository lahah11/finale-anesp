const MissionExpenseService = require('../services/missionExpenseService');
const Logger = require('../utils/logger');

const MissionExpenseController = {
  // Récupérer le barème complet
  getExpenseScale: async (req, res) => {
    try {
      const scale = await MissionExpenseService.getExpenseScale();
      res.json(scale);
    } catch (error) {
      Logger.error('Error getting expense scale:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Calculer les frais pour une mission
  calculateExpenses: async (req, res) => {
    try {
      const { grade, destination, duration = 1 } = req.body;
      
      console.log('🔍 Paramètres reçus:', { grade, destination, duration });
      
      if (!grade || !destination) {
        console.log('❌ Paramètres manquants:', { grade, destination });
        return res.status(400).json({ 
          error: 'Grade et destination requis' 
        });
      }

      const result = await MissionExpenseService.calculateMissionExpenses(
        grade, 
        destination, 
        duration
      );
      
      console.log('✅ Résultat calcul:', result);
      res.json(result);
    } catch (error) {
      console.log('❌ Erreur calcul frais:', error);
      Logger.error('Error calculating expenses:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Valider la disponibilité des frais
  validateExpenseAvailability: async (req, res) => {
    try {
      const { grade, destination } = req.query;
      
      if (!grade || !destination) {
        return res.status(400).json({ 
          error: 'Grade et destination requis' 
        });
      }

      const isValid = await MissionExpenseService.validateExpenseAvailability(
        grade, 
        destination
      );
      
      res.json({ 
        grade, 
        destination, 
        available: isValid 
      });
    } catch (error) {
      Logger.error('Error validating expense availability:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Récupérer tous les grades
  getGrades: async (req, res) => {
    try {
      const expenses = await MissionExpenseService.getAllExpenses();
      const grades = expenses.map(exp => ({
        grade: exp.grade,
        newClassification: exp.new_classification
      }));
      res.json(grades);
    } catch (error) {
      Logger.error('Error getting grades:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Récupérer toutes les destinations
  getDestinations: async (req, res) => {
    try {
      const destinations = await MissionExpenseService.getAllDestinations();
      res.json(destinations);
    } catch (error) {
      Logger.error('Error getting destinations:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = MissionExpenseController;
