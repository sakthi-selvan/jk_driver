import apiClient from './client';
import { AuthResponse, Driver } from '../types';

export interface DriverOTPAuthResponse extends AuthResponse {
  is_new_driver: boolean;
  is_active: boolean;
  account_status: 'active' | 'pending' | 'incomplete';
}

export interface DriverCompleteRegistrationData {
  name: string;
  email?: string;
  vehicle_number?: string;
  vehicle_type?: string;
  gender?: string;
  license_document: string;
  aadhar_document: string;
  vehicle_image?: string;
}

export const authApi = {
  sendOTP: async (phone: string): Promise<{ message: string; otp_length: number }> => {
    const response = await apiClient.post('/api/auth/driver/send-otp', { phone });
    return response.data;
  },

  verifyOTP: async (phone: string, otp: string): Promise<DriverOTPAuthResponse> => {
    const response = await apiClient.post<DriverOTPAuthResponse>('/api/auth/driver/verify-otp', {
      phone,
      otp,
    });
    return response.data;
  },

  completeRegistration: async (
    data: DriverCompleteRegistrationData
  ): Promise<{ message: string; account_status: string }> => {
    const response = await apiClient.put('/api/auth/driver/complete-registration', data);
    return response.data;
  },

  getProfile: async (): Promise<Driver> => {
    const response = await apiClient.get<Driver>('/api/driver/profile');
    return response.data;
  },

  updateProfile: async (data: Partial<Driver>): Promise<Driver> => {
    const response = await apiClient.put<Driver>('/api/driver/profile', data);
    return response.data;
  },
};
