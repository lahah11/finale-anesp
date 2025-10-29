const { query } = require('../config/database');

const MissionExpenseService = {
  // Récupérer tous les frais par grade
  getAllExpenses: async () => {
    const result = await query('SELECT * FROM mission_expenses ORDER BY grade');
    return result.rows;
  },

  // Récupérer les frais pour un grade spécifique
  getExpensesByGrade: async (grade) => {
    const result = await query('SELECT * FROM mission_expenses WHERE grade = ?', [grade]);
    return result.rows.length > 0 ? result.rows[0] : null;
  },

  // Récupérer toutes les destinations
  getAllDestinations: async () => {
    const result = await query('SELECT * FROM mission_destinations ORDER BY destination_name');
    return result.rows;
  },

  // Calculer les frais selon le grade et la destination
  calculateMissionExpenses: async (grade, destinationType, duration = 1) => {
    try {
      const expenses = await MissionExpenseService.getExpensesByGrade(grade);
      if (!expenses) {
        throw new Error(`Grade ${grade} non trouvé`);
      }

      let amount = 0;
      let currency = 'UM';

      switch (destinationType.toLowerCase()) {
        case 'national':
          amount = expenses.national_um * duration;
          currency = 'UM';
          break;
        case 'europe':
          amount = expenses.europe_eur * duration;
          currency = 'EUR';
          break;
        case 'america':
          amount = expenses.america_usd * duration;
          currency = 'USD';
          break;
        case 'asia_oceania':
          amount = expenses.asia_oceania_usd * duration;
          currency = 'USD';
          break;
        case 'africa':
          amount = expenses.africa_eur * duration;
          currency = 'EUR';
          break;
        default:
          throw new Error(`Type de destination ${destinationType} non reconnu`);
      }

      return {
        grade,
        destinationType,
        duration,
        amount,
        currency,
        dailyRate: amount / duration,
        gradeInfo: {
          oldClassification: expenses.grade,
          newClassification: expenses.new_classification
        }
      };

    } catch (error) {
      console.error('Erreur calcul frais mission:', error);
      throw error;
    }
  },

  // Obtenir le barème complet formaté
  getExpenseScale: async () => {
    try {
      const expenses = await MissionExpenseService.getAllExpenses();
      const destinations = await MissionExpenseService.getAllDestinations();

      return {
        grades: expenses.map(exp => ({
          grade: exp.grade,
          newClassification: exp.new_classification,
          national: { amount: exp.national_um, currency: 'UM' },
          europe: { amount: exp.europe_eur, currency: 'EUR' },
          america: { amount: exp.america_usd, currency: 'USD' },
          asiaOceania: { amount: exp.asia_oceania_usd, currency: 'USD' },
          africa: { amount: exp.africa_eur, currency: 'EUR' }
        })),
        destinations: destinations.map(dest => ({
          name: dest.destination_name,
          type: dest.destination_type,
          currency: dest.currency
        }))
      };

    } catch (error) {
      console.error('Erreur récupération barème:', error);
      throw error;
    }
  },

  // Valider si un grade a des frais pour une destination
  validateExpenseAvailability: async (grade, destinationType) => {
    try {
      const expenses = await MissionExpenseService.getExpensesByGrade(grade);
      if (!expenses) return false;

      switch (destinationType.toLowerCase()) {
        case 'national':
          return expenses.national_um !== null;
        case 'europe':
          return expenses.europe_eur !== null;
        case 'america':
          return expenses.america_usd !== null;
        case 'asia_oceania':
          return expenses.asia_oceania_usd !== null;
        case 'africa':
          return expenses.africa_eur !== null;
        default:
          return false;
      }
    } catch (error) {
      console.error('Erreur validation frais:', error);
      return false;
    }
  }
};

module.exports = MissionExpenseService;

