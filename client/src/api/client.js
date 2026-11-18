import axios from 'axios';

// Get API Base URL with seamless local dev, mobile network & production fallback
const getApiBaseUrl = () => {
  // If running in browser
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // 1. If running on Vercel or any HTTPS domain -> use Vercel backend directly
    if (hostname.includes('vercel.app') || protocol === 'https:') {
      return 'https://nx-workos-server.vercel.app/api';
    }

    // 2. If running locally via LAN IP (e.g. mobile testing on 10.x.x.x or 192.168.x.x)
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:5000/api`;
    }
  }

  // 3. If running in Vite DEV mode on localhost -> use local backend port 5000
  if (import.meta.env.DEV) {
    const localUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const cleaned = localUrl.replace(/\/$/, '');
    if (cleaned.includes('vercel.app')) {
      return 'http://localhost:5000/api';
    }
    return cleaned.endsWith('/api') ? cleaned : `${cleaned}/api`;
  }

  // 4. Default fallback to Vercel production backend
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
