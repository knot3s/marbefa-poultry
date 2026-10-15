import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const client = axios.create({
  baseURL: API_BASE,
});

// Attach JWT token to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 by redirecting to login
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      // Asset base is e.g. /marbefapoultry/dist/ — strip /dist to get app base
      const assetBase = import.meta.env.BASE_URL || '/';
      const appBase = assetBase.replace(/\/dist\/?$/, '/');
      window.location.href = `${appBase}login`.replace(/\/+/g, '/');
    }
    return Promise.reject(error);
  }
);

export default client;

/* ── API helpers ───────────────────────────────────────── */

export const api = {
  // Auth
  login: (data) => client.post('/auth/login/', data),
  register: (data) => client.post('/auth/register/', data),
  me: () => client.get('/auth/me/'),

  // Batches
  batches: () => client.get('/batches/'),
  createBatch: (data) => client.post('/batches/', data),
  updateBatch: (id, data) => client.patch(`/batches/${id}/`, data),
  deleteBatch: (id) => client.delete(`/batches/${id}/`),

  // Daily Logs
  dailyLogs: (params) => client.get('/daily-logs/', { params }),
  dailyLogsByBatch: (batchId) => client.get(`/daily-logs/by_batch/?batch=${batchId}`),
  createDailyLog: (data) => client.post('/daily-logs/', data),
  updateDailyLog: (id, data) => client.patch(`/daily-logs/${id}/`, data),
  deleteDailyLog: (id) => client.delete(`/daily-logs/${id}/`),

  // Alerts
  alerts: (params) => client.get('/alerts/', { params }),
  acknowledgeAlert: (id) => client.post(`/alerts/${id}/acknowledge/`),
  runAnomaly: (data) => client.post('/anomaly/run/', data || {}),

  // KPIs
  kpis: () => client.get('/kpis/'),
  batchKpis: (batchId) => client.get(`/kpis/${batchId}/`),

  // Forecast
  forecast: (batchId, horizon = 7) => client.get(`/forecast/${batchId}/?horizon=${horizon}`),

  // Reports
  reportSummary: (batchId, params) => client.get(`/reports/${batchId}/summary/`, { params }),
  reportCsvUrl: (batchId, params) => {
    const qs = new URLSearchParams(params).toString();
    return `${API_BASE}/reports/${batchId}/csv/${qs ? '?' + qs : ''}`;
  },

  // Users (manager only)
  users: () => client.get('/users/'),
  createUser: (data) => client.post('/users/', data),
  deleteUser: (id) => client.delete(`/users/${id}/`),
};
