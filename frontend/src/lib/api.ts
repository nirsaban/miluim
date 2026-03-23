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

// Flag to prevent multiple concurrent redirects
let isRedirecting = false;

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Don't redirect if already on login/auth pages or already redirecting
      const isAuthPage = typeof window !== 'undefined' &&
        window.location.pathname.startsWith('/auth');

      if (!isAuthPage && !isRedirecting) {
        isRedirecting = true;

        // Clear all auth data from cookies
        Cookies.remove('token', { path: '/' });
        Cookies.remove('user', { path: '/' });

        // Also clear localStorage auth state to prevent hydration mismatch
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('auth-storage');
          } catch (e) {
            // Ignore localStorage errors
          }

          // Use replace to prevent back button issues
          window.location.replace('/auth/login');
        }
      }
    }
    return Promise.reject(error);
  }
);

// Reset redirect flag when page loads (for fresh page loads)
if (typeof window !== 'undefined') {
  isRedirecting = false;
}

// Determine if we're on HTTPS
const isSecure = () => typeof window !== 'undefined' && window.location.protocol === 'https:';

export const setAuthToken = (token: string) => {
  // Use 'Lax' for same-origin, secure only on HTTPS
  Cookies.set('token', token, {
    expires: 0.5, // 12 hours
    sameSite: 'Lax',
    secure: isSecure(),
    path: '/',
  });
};

export const removeAuthToken = () => {
  Cookies.remove('token', { path: '/' });
  Cookies.remove('user', { path: '/' });
};

export const getAuthToken = () => {
  return Cookies.get('token');
};

export const setUserData = (user: any) => {
  Cookies.set('user', JSON.stringify(user), {
    expires: 0.5, // 12 hours
    sameSite: 'Lax',
    secure: isSecure(),
    path: '/',
  });
};

export const getUserData = () => {
  const userData = Cookies.get('user');
  return userData ? JSON.parse(userData) : null;
};

export const isAuthenticated = () => {
  return !!getAuthToken();
};

export default api;
