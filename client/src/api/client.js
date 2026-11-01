import axios from 'axios';

// Dynamic API base URL: defaults to /api proxy locally, or VITE_API_URL when set
const apiBase = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

const api = axios.create({
  baseURL: apiBase,
  timeout: 15000,
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
