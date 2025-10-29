import api from './api';

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  role: string;
  institution_id?: string; // Make it optional
}

export interface UpdateUserData {
  username: string;
  email: string;
  role: string;
  is_active: boolean;
}

export const userService = {
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  getByInstitution: async (institutionId?: string) => {
    const url = institutionId 
      ? `/users/institution/${institutionId}`
      : '/users/institution';
    const response = await api.get(url);
    return response.data;
  },

  create: async (data: CreateUserData) => {
    // Clean the data - remove institution_id if it's empty or undefined
    const cleanData = { ...data };
    if (!cleanData.institution_id || cleanData.institution_id.trim() === '') {
      delete cleanData.institution_id;
    }
    
    const response = await api.post('/users', cleanData);
    return response.data;
  },

  update: async (id: string, data: UpdateUserData) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
};