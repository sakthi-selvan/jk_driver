import { create } from 'zustand';
import { formatApiError } from '../utils/apiError';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Driver } from '../types';
import { authApi, DriverCompleteRegistrationData, DriverOTPAuthResponse } from '../api/auth';
import { setApiToken, clearApiToken } from '../api/client';

interface AuthState {
  driver: Driver | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;

  otpSent: boolean;
  otpPhone: string | null;
  isNewDriver: boolean;
  accountStatus: 'active' | 'pending' | 'incomplete' | null;

  sendOTP: (phone: string) => Promise<void>;
  verifyOTP: (phone: string, otp: string) => Promise<DriverOTPAuthResponse>;
  completeRegistration: (data: DriverCompleteRegistrationData) => Promise<void>;
  logout: () => Promise<void>;
  loadDriver: () => Promise<void>;
  clearError: () => void;
  resetOTPState: () => void;
}

async function persistSession(accessToken: string, refreshToken: string, driver?: Driver | null) {
  setApiToken(accessToken);
  try {
    await AsyncStorage.setItem('access_token', accessToken);
    await AsyncStorage.setItem('refresh_token', refreshToken);
    if (driver) {
      await AsyncStorage.setItem('driver', JSON.stringify(driver));
    }
  } catch (storageError) {
    console.log('⚠️  Storage error:', storageError);
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  driver: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: true,
  error: null,
  otpSent: false,
  otpPhone: null,
  isNewDriver: false,
  accountStatus: null,

  sendOTP: async (phone: string) => {
    try {
      set({ isLoading: true, error: null });
      await authApi.sendOTP(phone);
      set({ otpSent: true, otpPhone: phone, isLoading: false });
    } catch (error: any) {
      set({
        error: formatApiError(error, 'Failed to send OTP'),
        isLoading: false,
      });
      throw error;
    }
  },

  verifyOTP: async (phone: string, otp: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authApi.verifyOTP(phone, otp);

      await persistSession(response.access_token, response.refresh_token);

      set({
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        isNewDriver: response.is_new_driver,
        accountStatus: response.account_status,
      });

      if (response.account_status === 'active') {
        const driver = await authApi.getProfile();
        try {
          await AsyncStorage.setItem('driver', JSON.stringify(driver));
        } catch {}
        set({
          driver,
          isAuthenticated: true,
          isLoading: false,
          otpSent: false,
          otpPhone: null,
        });
      } else {
        // pending or incomplete — keep tokens, not fully authenticated for home
        set({
          isAuthenticated: false,
          isLoading: false,
          otpSent: false,
          otpPhone: null,
        });
      }

      return response;
    } catch (error: any) {
      set({
        error: formatApiError(error, 'Invalid OTP'),
        isLoading: false,
      });
      throw error;
    }
  },

  completeRegistration: async (data: DriverCompleteRegistrationData) => {
    try {
      set({ isLoading: true, error: null });
      await authApi.completeRegistration(data);
      set({
        isLoading: false,
        isNewDriver: false,
        accountStatus: 'pending',
        isAuthenticated: false,
      });
    } catch (error: any) {
      set({
        error: formatApiError(error, 'Registration failed'),
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
      otpSent: false,
      otpPhone: null,
      isNewDriver: false,
      accountStatus: null,
      error: null,
    });
  },

  loadDriver: async () => {
    try {
      set({ isInitializing: true });
      const token = await AsyncStorage.getItem('access_token');
      const driverStr = await AsyncStorage.getItem('driver');

      if (token && driverStr) {
        const driver = JSON.parse(driverStr) as Driver;
        setApiToken(token);
        if (driver.is_active) {
          set({
            driver,
            accessToken: token,
            isAuthenticated: true,
            isInitializing: false,
            accountStatus: 'active',
          });
          return;
        }
      }
      set({ isInitializing: false, isAuthenticated: false });
    } catch (error) {
      console.log('⚠️  Storage error during load:', error);
      set({ isInitializing: false });
    }
  },

  clearError: () => set({ error: null }),

  resetOTPState: () =>
    set({
      otpSent: false,
      otpPhone: null,
      error: null,
    }),
}));
