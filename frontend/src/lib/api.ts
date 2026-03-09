import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

// In production behind nginx, use relative /api path
// In development, use the full URL
const getApiUrl = () => {
  // Check if we're in browser
  if (typeof window !== 'undefined') {
    // In production, use relative path (nginx will proxy)
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl === '/api' || !envUrl) {
      return '/api';
    }
    return envUrl;
  }
  // Server-side rendering - use environment variable or default
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
};

const API_URL = getApiUrl();

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = Cookies.get('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      Cookies.remove('token');
      Cookies.remove('user');
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export const setAuthToken = (token: string) => {
  Cookies.set('token', token, { expires: 0.5, sameSite: 'None', secure: true }); // 12 hours
};

export const removeAuthToken = () => {
  Cookies.remove('token');
  Cookies.remove('user');
};

export const getAuthToken = () => {
  return Cookies.get('token');
};

export const setUserData = (user: any) => {
  Cookies.set('user', JSON.stringify(user), { expires: 0.5, sameSite: 'None', secure: true });
};

export const getUserData = () => {
  const userData = Cookies.get('user');
  return userData ? JSON.parse(userData) : null;
};

export const isAuthenticated = () => {
  return !!getAuthToken();
};

export default api;
