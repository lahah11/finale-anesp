import api from './api';

export const missionService = {
  // Créer une mission
  create: async (data: any) => {
    const response = await api.post('/missions', data);
    return response.data;
  },

  // Obtenir toutes les missions
  getAll: async () => {
    const response = await api.get('/missions');
    return response.data;
  },

  // Obtenir les missions par institution
  getByInstitution: async () => {
    const response = await api.get('/missions');
    return response.data;
  },

  // Obtenir une mission par ID (avec option anti-cache)
  getById: async (id: string, opts?: { noCache?: boolean }) => {
    const headers = opts?.noCache
      ? { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache', 'Expires': '0' }
      : undefined;
    const url = opts?.noCache ? `/missions/${id}?t=${Date.now()}` : `/missions/${id}`;
    const response = await api.get(url, { headers });
    return response.data;
  },

  // Validation technique
  validateTechnical: async (id: string, action: string, rejectionReason?: string) => {
    const response = await api.put(`/missions/${id}/validate-technical`, {
      action,
      rejection_reason: rejectionReason
    });
    return response.data;
  },

  // Attribution des moyens logistiques
  assignLogistics: async (id: string, vehicleId: string, driverId: string) => {
    const response = await api.put(`/missions/${id}/assign-logistics`, {
      vehicle_id: vehicleId,
      driver_id: driverId
    });
    return response.data;
  },

  // Validation financière
  validateFinance: async (id: string, action: string, rejectionReason?: string) => {
    const response = await api.put(`/missions/${id}/validate-finance`, {
      action,
      rejection_reason: rejectionReason
    });
    return response.data;
  },

  // Validation financière
  validateFinance: async (id: string, action: string, rejectionReason?: string) => {
    const response = await api.put(`/missions/${id}/validate-finance`, {
      action,
      rejection_reason: rejectionReason
    });
    return response.data;
  },

  // Validation finale
  validateFinal: async (id: string, action: string, rejectionReason?: string) => {
    const response = await api.put(`/missions/${id}/validate-final`, {
      action,
      rejection_reason: rejectionReason
    });
    return response.data;
  },

  // Obtenir les participants d'une mission
  getParticipants: async (id: string) => {
    const response = await api.get(`/missions/${id}/participants`);
    return response.data;
  },

  // Obtenir les véhicules disponibles
  getAvailableVehicles: async () => {
    const response = await api.get('/missions/vehicles/available');
    return response.data;
  },

  // Obtenir les chauffeurs disponibles
  getAvailableDrivers: async () => {
    const response = await api.get('/missions/drivers/available');
    return response.data;
  },

  // Calculer les frais de mission
  calculateCosts: async (data: any) => {
    const response = await api.post('/missions/calculate-costs', data);
    return response.data;
  },

  // Calculer l'estimation du carburant
  calculateFuelEstimate: async (data: any) => {
    const response = await api.post('/missions/calculate-fuel-estimate', data);
    return response.data;
  },

  // Obtenir les documents d'une mission
  getDocuments: async (id: string) => {
    const response = await api.get(`/missions/${id}/documents`);
    return response.data;
  },

  // Télécharger un document
  downloadDocument: async (missionId: string, documentId: string) => {
    const response = await api.get(`/missions/${missionId}/documents/${documentId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Validation par le Directeur Général
  validateMission: async (id: string, data: any) => {
    const response = await api.put(`/missions/${id}/validate-dg`, data);
    return response.data;
  },

  // Refus de mission
  rejectMission: async (id: string, data: any) => {
    const response = await api.put(`/missions/${id}/reject`, data);
    return response.data;
  }
};