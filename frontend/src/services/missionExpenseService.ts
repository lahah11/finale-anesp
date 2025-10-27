import api from './api';

export interface ExpenseScale {
  grades: Grade[];
  destinations: Destination[];
}

export interface Grade {
  grade: string;
  newClassification: string;
  national: { amount: number; currency: string };
  europe: { amount: number | null; currency: string };
  america: { amount: number | null; currency: string };
  asiaOceania: { amount: number | null; currency: string };
  africa: { amount: number | null; currency: string };
}

export interface Destination {
  name: string;
  type: string;
  currency: string;
}

export interface ExpenseCalculation {
  grade: string;
  destinationType: string;
  duration: number;
  amount: number;
  currency: string;
  dailyRate: number;
  gradeInfo: {
    oldClassification: string;
    newClassification: string;
  };
}

export interface ExpenseValidation {
  grade: string;
  destination: string;
  available: boolean;
}

export const missionExpenseService = {
  // Récupérer le barème complet
  getExpenseScale: async (): Promise<ExpenseScale> => {
    const response = await api.get('/mission-expenses/scale');
    return response.data;
  },

  // Calculer les frais pour une mission
  calculateExpenses: async (grade: string, destination: string, duration: number = 1): Promise<ExpenseCalculation> => {
    const response = await api.post('/mission-expenses/calculate', {
      grade,
      destination,
      duration
    });
    return response.data;
  },

  // Valider la disponibilité des frais
  validateExpenseAvailability: async (grade: string, destination: string): Promise<ExpenseValidation> => {
    const response = await api.get(`/mission-expenses/validate?grade=${grade}&destination=${destination}`);
    return response.data;
  },

  // Récupérer tous les grades
  getGrades: async (): Promise<{ grade: string; newClassification: string }[]> => {
    const response = await api.get('/mission-expenses/grades');
    return response.data;
  },

  // Récupérer toutes les destinations
  getDestinations: async (): Promise<Destination[]> => {
    const response = await api.get('/mission-expenses/destinations');
    return response.data;
  }
};
