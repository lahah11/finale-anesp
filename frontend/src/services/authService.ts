import api from './api';
import Cookies from 'js-cookie';

export const authService = {
  login: async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password });
    const { token, user } = response.data;
    
    console.log('🔑 Token reçu:', token ? 'Oui' : 'Non');
    Cookies.set('token', token, { expires: 1 }); // 1 day
    console.log('🍪 Token stocké:', Cookies.get('token') ? 'Oui' : 'Non');
    return { token, user };
  },

  logout: () => {
    Cookies.remove('token');
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.put('/auth/change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  },

  getToken: () => {
    return Cookies.get('token');
  },

  removeToken: () => {
    Cookies.remove('token');
  }
};