import api from './api';

export interface Vehicle {
  id: string;
  brand?: string;
  model?: string;
  license_plate?: string;
  year?: number;
  is_available?: boolean;
}

export interface Driver {
  id: string;
  full_name?: string;
  name?: string;
  license_number?: string;
  license_type?: string;
  phone?: string;
  phone_number?: string;
  is_available?: boolean;
}

interface AssignLogisticsPayload {
  vehicle_id?: string;
  driver_id?: string;
  vehicle_plate?: string | null;
  vehicle_model?: string | null;
  vehicle_brand?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  driver_license?: string | null;
  flight_ticket_pdf?: string | null;
  airline_name?: string | null;
  flight_number?: string | null;
  ticket_reference?: string | null;
  travel_agency?: string | null;
  accommodation_details?: string | null;
  local_transport_details?: string | null;
  logistics_notes?: string | null;
}

const logisticsService = {
  getVehicles: async (institutionId: string) => {
    try {
      const response = await api.get(`/logistics/institution/${institutionId}/vehicles`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des véhicules:', error);
      throw error;
    }
  },

  getDrivers: async (institutionId: string) => {
    try {
      const response = await api.get(`/logistics/institution/${institutionId}/drivers`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des chauffeurs:', error);
      throw error;
    }
  },

  uploadTicket: async (missionId: string, file: File) => {
    const formData = new FormData();
    formData.append('ticket', file);

    const response = await api.post(`/missions/${missionId}/upload-ticket`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data as { message: string; ticket_url: string };
  },

  assignLogistics: async (missionId: string, assignment: AssignLogisticsPayload) => {
    const response = await api.put(`/missions/${missionId}/assign-logistics`, assignment);
    return response.data;
  }
};

export default logisticsService;