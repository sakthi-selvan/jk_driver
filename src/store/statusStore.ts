import { create } from 'zustand';
import { ridesApi } from '../api/rides';
import apiClient from '../api/client';

interface StatusState {
  isOnline: boolean;
  isUpdating: boolean;
  error: string | null;

  // Actions
  toggleStatus: () => Promise<void>;
  setOnlineStatus: (status: boolean) => Promise<void>;
  fetchCurrentStatus: () => Promise<void>;
}

export const useStatusStore = create<StatusState>((set, get) => ({
  isOnline: false,
  isUpdating: false,
  error: null,

  fetchCurrentStatus: async () => {
    try {
      const response = await apiClient.get('/api/driver/profile');
      const driver = response.data;
      set({ isOnline: driver.is_online });
    } catch (error) {
      // If can't fetch, keep current state
    }
  },

  toggleStatus: async () => {
    const newStatus = !get().isOnline;
    try {
      set({ isUpdating: true, error: null });
      await ridesApi.updateStatus({ is_online: newStatus });
      set({ isOnline: newStatus, isUpdating: false });
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to update status';
      set({ error: errorMsg, isUpdating: false });
      throw error;
    }
  },

  setOnlineStatus: async (status: boolean) => {
    try {
      set({ isUpdating: true, error: null });
      await ridesApi.updateStatus({ is_online: status });
      set({ isOnline: status, isUpdating: false });
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to update status';
      set({ error: errorMsg, isUpdating: false });
      throw error;
    }
  },
}));
