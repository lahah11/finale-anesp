import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const logisticsService = {
  // Valider une mission côté logistique
  validateLogistics: async (missionId: string, data: {
    action: 'approve' | 'reject';
    rejection_reason?: string;
    vehicle_id?: string;
    driver_id?: string;
    ticket_file?: string;
  }) => {
    const token = Cookies.get('token');
    const response = await axios.put(
      `${API_BASE_URL}/missions/${missionId}/validate-logistics`,
      data,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  },

  // Obtenir les véhicules disponibles
  getVehicles: async (institutionId: string) => {
    const token = Cookies.get('token');
    
    try {
      const response = await axios.get(
        `${API_BASE_URL}/logistics/institution/${institutionId}/vehicles`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Erreur lors de la récupération des véhicules:', error);
      throw error;
    }
  },

  // Obtenir les chauffeurs disponibles
  getDrivers: async (institutionId: string) => {
    const token = Cookies.get('token');
    
    try {
      const response = await axios.get(
        `${API_BASE_URL}/logistics/institution/${institutionId}/drivers`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Erreur lors de la récupération des chauffeurs:', error);
      throw error;
    }
  },

  // Uploader un billet de transport
  uploadTicket: async (missionId: string, file: File) => {
    const token = Cookies.get('token');
    const formData = new FormData();
    formData.append('ticket', file);
    
    const response = await axios.post(
      `${API_BASE_URL}/missions/${missionId}/upload-ticket`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  },

  // Assigner les moyens logistiques à une mission (PUT aligné backend)
  assignLogistics: async (missionId: string, assignment: {
    vehicle_id?: string;
    driver_id?: string;
    flight_ticket_pdf?: string;
  }) => {
    const token = Cookies.get('token');
    const response = await axios.put(
      `${API_BASE_URL}/missions/${missionId}/assign-logistics`,
      assignment,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }
};

export default logisticsService;