import api from './api';

export interface Engineer {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  position: string;
  department: string;
  nni: string;
  grade?: string;
  phone_number?: string;
  email?: string;
  office_location?: string;
  hire_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const engineerService = {
  // Récupérer tous les ingénieurs
  getAllEngineers: async (): Promise<Engineer[]> => {
    const response = await api.get('/engineers');
    return response.data;
  },

  // Récupérer un ingénieur par son ID
  getEngineerById: async (id: string): Promise<Engineer> => {
    const response = await api.get(`/engineers/${id}`);
    return response.data;
  },

  // Récupérer l'ingénieur par son ID utilisateur
  getEngineerByUserId: async (userId: string): Promise<Engineer> => {
    const response = await api.get(`/engineers/by-user/${userId}`);
    return response.data;
  },

  // Créer un ingénieur
  createEngineer: async (engineerData: Partial<Engineer>): Promise<Engineer> => {
    const response = await api.post('/engineers', engineerData);
    return response.data;
  },

  // Mettre à jour un ingénieur
  updateEngineer: async (id: string, engineerData: Partial<Engineer>): Promise<Engineer> => {
    const response = await api.put(`/engineers/${id}`, engineerData);
    return response.data;
  },

  // Supprimer un ingénieur
  deleteEngineer: async (id: string): Promise<void> => {
    await api.delete(`/engineers/${id}`);
  }
};
