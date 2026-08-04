import apiClient from './client';
import { Ride, DriverStatusUpdate, Earnings } from '../types';

export const ridesApi = {
  // Update driver status (online/offline)
  updateStatus: async (data: DriverStatusUpdate): Promise<any> => {
    const response = await apiClient.put('/api/driver/status', data);
    return response.data;
  },

  // Get available rides
  getAvailableRides: async (): Promise<Ride[]> => {
    const response = await apiClient.get<Ride[]>('/api/driver/rides/available');
    return response.data;
  },

  // Accept ride
  acceptRide: async (rideId: string): Promise<Ride> => {
    const response = await apiClient.post<Ride>(`/api/driver/rides/${rideId}/accept`);
    return response.data;
  },

  // Reject ride
  rejectRide: async (rideId: string): Promise<any> => {
    const response = await apiClient.post(`/api/driver/rides/${rideId}/reject`);
    return response.data;
  },

  // Start ride
  startRide: async (rideId: string): Promise<Ride> => {
    const response = await apiClient.post<Ride>(`/api/driver/rides/${rideId}/start`);
    return response.data;
  },

  // Complete ride
  completeRide: async (rideId: string): Promise<Ride> => {
    const response = await apiClient.post<Ride>(`/api/driver/rides/${rideId}/complete`);
    return response.data;
  },

  // Get ride history
  getRideHistory: async (): Promise<Ride[]> => {
    const response = await apiClient.get<Ride[]>('/api/driver/rides/history');
    return response.data;
  },

  // Get earnings
  getEarnings: async (): Promise<Earnings> => {
    const response = await apiClient.get<Earnings>('/api/driver/earnings');
    return response.data;
  },
};
