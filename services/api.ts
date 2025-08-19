import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

interface ErrorResponse {
  detail?: string;
  [key: string]: any;
}

interface RetryConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

const API_CONFIG = {
  BASE_URL: (Constants.expoConfig?.extra as any)?.API_URL || (Constants.expoConfig?.extra as any)?.API_BASE_URL || 'http://192.168.43.250:8001/api/v1',
  TIMEOUT: Constants.expoConfig?.extra?.API_TIMEOUT || 30000,
  AUTH_TOKEN_KEY: Constants.expoConfig?.extra?.AUTH_TOKEN_KEY || 'access_token',
  REFRESH_TOKEN_KEY: Constants.expoConfig?.extra?.REFRESH_TOKEN_KEY || 'refresh_token'
};

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync(API_CONFIG.AUTH_TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ErrorResponse>) => {
    const originalRequest = error.config as RetryConfig;
    const status = error.response?.status;

    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await SecureStore.getItemAsync(API_CONFIG.REFRESH_TOKEN_KEY);
        if (!refreshToken) throw new Error('No refresh token available');

        const response = await axios.post(`${API_CONFIG.BASE_URL}/auth/token/refresh/`, { refresh: refreshToken });
        const { access, refresh } = response.data as { access: string; refresh?: string };

        await Promise.all([
          SecureStore.setItemAsync(API_CONFIG.AUTH_TOKEN_KEY, access),
          refresh ? SecureStore.setItemAsync(API_CONFIG.REFRESH_TOKEN_KEY, refresh) : Promise.resolve(),
        ]);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        await Promise.all([
          SecureStore.deleteItemAsync(API_CONFIG.AUTH_TOKEN_KEY),
          SecureStore.deleteItemAsync(API_CONFIG.REFRESH_TOKEN_KEY),
        ]);
        return Promise.reject(refreshError);
      }
    }

    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timeout. Please check your internet connection.';
    } else if (!error.response) {
      error.message = 'Network error. Please check your internet connection.';
    }

    return Promise.reject(error);
  }
);

export const authService = {
  async login(email: string, password: string, role?: string) {
    if (!email || !password) throw new Error('Email and password are required');
    const response = await api.post('/auth/token/', { email, password, ...(role && { role }) });
    const { access, refresh, user } = response.data as { access: string; refresh: string; user?: any };
    if (!access) throw new Error('No access token received');
    await Promise.all([
      SecureStore.setItemAsync(API_CONFIG.AUTH_TOKEN_KEY, access),
      refresh ? SecureStore.setItemAsync(API_CONFIG.REFRESH_TOKEN_KEY, refresh) : Promise.resolve(),
      user ? SecureStore.setItemAsync('user', JSON.stringify(user)) : Promise.resolve(),
    ]);
    return { accessToken: access, refreshToken: refresh, user: user || { email } };
  },

  async register(data: { email: string; password: string; role: 'client'|'designer'; firstName?: string; lastName?: string; phoneNumber?: string }) {
    const body = {
      email: data.email,
      password: data.password,
      password2: data.password,
      first_name: data.firstName || data.email.split('@')[0],
      last_name: data.lastName || '',
      user_type: data.role,
      phone: data.phoneNumber || '',
    };
    const res = await api.post('/auth/register/', body);
    const { access, refresh, user } = res.data as { access: string; refresh: string; user?: any };
    await Promise.all([
      SecureStore.setItemAsync(API_CONFIG.AUTH_TOKEN_KEY, access),
      SecureStore.setItemAsync(API_CONFIG.REFRESH_TOKEN_KEY, refresh),
      user ? SecureStore.setItemAsync('user', JSON.stringify(user)) : Promise.resolve(),
    ]);
    return { access, refresh, user };
  },

  async logout() {
    await Promise.all([
      SecureStore.deleteItemAsync(API_CONFIG.AUTH_TOKEN_KEY),
      SecureStore.deleteItemAsync(API_CONFIG.REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync('user'),
    ]);
  },

  async getCurrentUser() {
    const userData = await SecureStore.getItemAsync('user');
    return userData ? JSON.parse(userData) : null;
  },

  async isAuthenticated() {
    const token = await SecureStore.getItemAsync(API_CONFIG.AUTH_TOKEN_KEY);
    return !!token;
  },
};

export { api };
export default api;