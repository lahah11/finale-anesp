import api from './api';

export interface CreateSignatureData {
  signed_by: string;
  title: string;
  role: string;
  institution_id?: string;
}

export const signatureService = {
  getByInstitution: async (institutionId?: string) => {
    const url = institutionId 
      ? `/signatures/institution/${institutionId}`
      : '/signatures/institution';
    const response = await api.get(url);
    return response.data;
  },

  create: async (data: FormData) => {
    const response = await api.post('/signatures', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  update: async (id: string, data: FormData) => {
    const response = await api.put(`/signatures/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/signatures/${id}`);
    return response.data;
  },
};