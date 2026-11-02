import axios from 'axios';

// Get API Base URL with seamless local dev & production fallback
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    const cleaned = import.meta.env.VITE_API_URL.replace(/\/$/, '');
    return cleaned.endsWith('/api') ? cleaned : `${cleaned}/api`;
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:5000/api';
  }
  return 'https://nx-workos-server.vercel.app/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nx_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for automatic 401 handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized, clear token if session expired
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('nx_token');
        localStorage.removeItem('nx_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
