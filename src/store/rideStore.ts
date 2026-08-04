import { create } from 'zustand';
import { Ride, Earnings } from '../types';
import { ridesApi } from '../api/rides';

interface RideState {
  availableRides: Ride[];
  activeRide: Ride | null;
  rideHistory: Ride[];
  earnings: Earnings | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadAvailableRides: () => Promise<void>;
  acceptRide: (rideId: string) => Promise<void>;
  rejectRide: (rideId: string) => Promise<void>;
  startRide: (rideId: string) => Promise<void>;
  completeRide: (rideId: string) => Promise<void>;
  loadRideHistory: () => Promise<void>;
  loadEarnings: () => Promise<void>;
  clearError: () => void;
}

export const useRideStore = create<RideState>((set, get) => ({
  availableRides: [],
  activeRide: null,
  rideHistory: [],
  earnings: null,
  isLoading: false,
  error: null,

  loadAvailableRides: async () => {
    try {
      set({ isLoading: true, error: null });
      const rides = await ridesApi.getAvailableRides();
      set({ availableRides: rides, isLoading: false });
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to load available rides';
      set({ error: errorMsg, isLoading: false, availableRides: [] });
    }
  },

  acceptRide: async (rideId: string) => {
    try {
      set({ isLoading: true, error: null });
      const ride = await ridesApi.acceptRide(rideId);
      set({
        activeRide: ride,
        availableRides: get().availableRides.filter((r) => r.id !== rideId),
        isLoading: false,
      });
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to accept ride';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  rejectRide: async (rideId: string) => {
    try {
      await ridesApi.rejectRide(rideId);
      set({
        availableRides: get().availableRides.filter((r) => r.id !== rideId),
      });
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to reject ride';
      set({ error: errorMsg });
    }
  },

  startRide: async (rideId: string) => {
    try {
      set({ isLoading: true, error: null });
      const ride = await ridesApi.startRide(rideId);
      set({ activeRide: ride, isLoading: false });
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to start ride';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  completeRide: async (rideId: string) => {
    try {
      set({ isLoading: true, error: null });
      await ridesApi.completeRide(rideId);
      set({ activeRide: null, isLoading: false });
      // Reload earnings after completing ride
      get().loadEarnings();
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to complete ride';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  loadRideHistory: async () => {
    try {
      set({ isLoading: true, error: null });
      const history = await ridesApi.getRideHistory();
      set({ rideHistory: history, isLoading: false });
    } catch (error: any) {
      set({ error: 'Failed to load ride history', isLoading: false });
    }
  },

  loadEarnings: async () => {
    try {
      const earnings = await ridesApi.getEarnings();
      set({ earnings });
    } catch (error: any) {
      set({ error: 'Failed to load earnings' });
    }
  },

  clearError: () => set({ error: null }),
}));
