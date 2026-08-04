import apiClient from './client';
import { LoginCredentials, RegisterData, AuthResponse, Driver } from '../types';

export const authApi = {
  // Register new driver
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/api/auth/driver/register', data);
    return response.data;
  },

  // Login driver
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/api/auth/driver/login', credentials);
    return response.data;
  },

  // Get driver profile
  getProfile: async (): Promise<Driver> => {
    const response = await apiClient.get<Driver>('/api/driver/profile');
    return response.data;
  },

  // Update driver profile
  updateProfile: async (data: Partial<Driver>): Promise<Driver> => {
    const response = await apiClient.put<Driver>('/api/driver/profile', data);
    return response.data;
  },
};
