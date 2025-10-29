import api from './api';

export const cityService = {
  // Obtenir toutes les villes
  getAllCities: async () => {
    const response = await api.get('/cities');
    return response.data;
  },

  // Obtenir la distance entre deux villes
  getCityDistance: async (fromCity: string, toCity: string) => {
    const response = await api.get(`/cities/distances?from_city=${fromCity}&to_city=${toCity}`);
    return response.data;
  }
};
