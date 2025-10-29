import api from './api';

export const institutionService = {
  getAll: async () => {
    const response = await api.get('/institutions');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/institutions/${id}`);
    return response.data;
  },

  create: async (data: FormData) => {
    const response = await api.post('/institutions', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  update: async (id: string, data: FormData) => {
    const response = await api.put(`/institutions/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/institutions/${id}`);
    return response.data;
  },
};