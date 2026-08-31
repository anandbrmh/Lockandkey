import axios from 'axios';

// Vite env: VITE_API_URL=http://localhost:5000/api  (include /api prefix)
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  timeout: 30000,
});

// Request interceptor: attach JWT if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: normalize errors, handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message || error.message || 'Request failed';
    // Optionally auto-logout on 401
    if (status === 401) {
      // Avoid clearing on login route itself
      const isAuthRoute = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
      if (!isAuthRoute) {
        // Token expired/invalid — could dispatch logout via event
        window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: message }));
      }
    }
    // Attach normalized message
    error.normalizedMessage = message;
    return Promise.reject(error);
  }
);

export default api;
