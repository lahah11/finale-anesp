import api from './api';

export interface CreateEmployeeData {
  matricule: string;
  full_name: string;
  passport_number?: string;
  position: string;
  email?: string;
  phone?: string;
  institution_id?: string;
}

export const employeeService = {
  getByInstitution: async (institutionId?: string, params?: any) => {
    const url = institutionId
      ? `/employees/institution/${institutionId}`
      : '/employees/institution';
    const response = await api.get(url, { params });
    return response.data;
  },

  // **NEW: Get available employees**
  getAvailableEmployees: async () => {
    const response = await api.get('/employees/available');
    return response.data;
  },

  // **NEW: End current mission**
  endCurrentMission: async (id: string, reason?: string) => {
    const response = await api.post(`/employees/${id}/end-mission`, { reason });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/employees/${id}`);
    return response.data;
  },

  create: async (data: CreateEmployeeData) => {
    const response = await api.post('/employees', data);
    return response.data;
  },

  update: async (id: string, data: CreateEmployeeData) => {
    const response = await api.put(`/employees/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/employees/${id}`);
    return response.data;
  },

  search: async (query: string) => {
    const response = await api.get(`/employees/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },
};