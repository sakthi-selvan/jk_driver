import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Driver, AuthResponse } from '../types';
import { authApi } from '../api/auth';
import { setApiToken, clearApiToken } from '../api/client';

interface AuthState {
  driver: Driver | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (phone: string, password: string) => Promise<void>;
  register: (name: string, phone: string, email: string, password: string, vehicleNumber?: string, vehicleType?: string, licenseDocument?: string, aadharDocument?: string) => Promise<void>;
  logout: () => Promise<void>;
  loadDriver: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  driver: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (phone: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authApi.login({ phone, password });

      // Set token in memory FIRST before profile request
      setApiToken(response.access_token);

      try {
        await AsyncStorage.setItem('access_token', response.access_token);
        await AsyncStorage.setItem('refresh_token', response.refresh_token);
      } catch (storageError) {
        console.log('⚠️  Storage error (tokens will be in memory only):', storageError);
      }

      // Load driver profile (will now use in-memory token)
      const driver = await authApi.getProfile();
      try {
        await AsyncStorage.setItem('driver', JSON.stringify(driver));
      } catch (storageError) {
        console.log('⚠️  Storage error (driver will be in memory only):', storageError);
      }

      set({
        driver,
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || 'Login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  register: async (name: string, phone: string, email: string, password: string, vehicleNumber?: string, vehicleType?: string, licenseDocument?: string, aadharDocument?: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authApi.register({
        name,
        phone,
        email,
        password,
        vehicle_number: vehicleNumber,
        vehicle_type: vehicleType,
        license_document: licenseDocument,
        aadhar_document: aadharDocument,
      });

      // Set token in memory FIRST before profile request
      setApiToken(response.access_token);

      try {
        await AsyncStorage.setItem('access_token', response.access_token);
        await AsyncStorage.setItem('refresh_token', response.refresh_token);
      } catch (storageError) {
        console.log('⚠️  Storage error (tokens will be in memory only):', storageError);
      }

      // Load driver profile (will now use in-memory token)
      const driver = await authApi.getProfile();
      try {
        await AsyncStorage.setItem('driver', JSON.stringify(driver));
      } catch (storageError) {
        console.log('⚠️  Storage error (driver will be in memory only):', storageError);
      }

      set({
        driver,
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || 'Registration failed',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    clearApiToken();
    try {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'driver']);
    } catch (error) {
      console.log('⚠️  Storage error during logout:', error);
    }
    set({
      driver: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  loadDriver: async () => {
    try {
      set({ isLoading: true });
      const token = await AsyncStorage.getItem('access_token');
      const driverStr = await AsyncStorage.getItem('driver');

      if (token && driverStr) {
        const driver = JSON.parse(driverStr);
        setApiToken(token);
        set({
          driver,
          accessToken: token,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.log('⚠️  Storage error during load:', error);
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
