
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ah_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ah_token');
      localStorage.removeItem('ah_user');
    }

    return Promise.reject(err);
  }
);

export const errText = (e) =>
  e?.response?.data?.error ||
  e?.response?.data?.message ||
  e?.message ||
  'Something went wrong';

export default api;
