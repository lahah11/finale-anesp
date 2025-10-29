import axios from 'axios';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token');
    console.log('📤 Requête vers:', config.url, 'Token:', token ? 'Présent' : 'Absent');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Ne pas rediriger automatiquement, laisser le composant gérer
      console.log('Token expiré ou invalide');
      return Promise.reject(error);
    }

    const message = error.response?.data?.error || 'Une erreur est survenue';
    toast.error(message);

    return Promise.reject(error);
  }
);

export default api;