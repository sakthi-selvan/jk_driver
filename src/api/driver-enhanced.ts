import apiClient from './client';
import { EnhancedRide, VerifyOTPRequest } from '../types/enhanced';

export const driverEnhancedApi = {
  // Update driver location (enriched payload for live tracking)
  updateLocation: async (payload: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    heading?: number;
    speed?: number;
    sequence?: number;
    ride_id?: string;
    recorded_at?: string;
  } | number, longitude?: number): Promise<{ status: string }> => {
    // Back-compat: updateLocation(lat, lng)
    const body =
      typeof payload === 'number'
        ? { latitude: payload, longitude: longitude as number }
        : payload;
    const response = await apiClient.post<{ status: string }>('/api/v2/driver/location', body);
    return response.data;
  },

  // Get available rides
  getAvailableRides: async (): Promise<EnhancedRide[]> => {
    const response = await apiClient.get<EnhancedRide[]>('/api/v2/driver/rides/available');
    return response.data;
  },

  // Accept ride
  acceptRide: async (rideId: string): Promise<EnhancedRide> => {
    const response = await apiClient.post<EnhancedRide>(`/api/v2/driver/rides/${rideId}/accept`);
    return response.data;
  },

  // Verify OTP
  verifyOTP: async (rideId: string, otp: string): Promise<EnhancedRide> => {
    const response = await apiClient.post<EnhancedRide>(
      `/api/v2/driver/rides/${rideId}/verify-otp`,
      {
        ride_id: rideId,
        otp: otp,
      }
    );
    return response.data;
  },

  // Start ride (requires OTP verification)
  startRide: async (rideId: string): Promise<EnhancedRide> => {
    const response = await apiClient.post<EnhancedRide>(`/api/v2/driver/rides/${rideId}/start`);
    return response.data;
  },

  // Complete ride
  completeRide: async (rideId: string): Promise<EnhancedRide> => {
    const response = await apiClient.post<EnhancedRide>(`/api/v2/driver/rides/${rideId}/complete`);
    return response.data;
  },

  // Reject ride (assigned ride)
  rejectRide: async (rideId: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(
      `/api/v2/driver/rides/${rideId}/reject`
    );
    return response.data;
  },

  // Decline ride (pending ride - not interested)
  declineRide: async (rideId: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(
      `/api/v2/driver/rides/${rideId}/decline`
    );
    return response.data;
  },

  // Cancel ride with reason (falls back to reject if cancel endpoint not deployed)
  cancelRide: async (rideId: string, reason: string, customReason?: string): Promise<{ message: string }> => {
    try {
      const response = await apiClient.post<{ message: string }>(
        `/api/v2/driver/rides/${rideId}/cancel`,
        { reason, custom_reason: customReason }
      );
      return response.data;
    } catch (error: any) {
      // If /cancel endpoint doesn't exist (not deployed yet), use /reject
      if (error.response?.status === 404) {
        console.log('ℹ️  [CANCEL] /cancel not available, using /reject fallback');
        const response = await apiClient.post<{ message: string }>(
          `/api/v2/driver/rides/${rideId}/reject`
        );
        return response.data;
      }
      throw error;
    }
  },

  // Get active ride
  getActiveRide: async (): Promise<EnhancedRide> => {
    const response = await apiClient.get<EnhancedRide>('/api/v2/driver/rides/active');
    return response.data;
  },

  // Get ride history
  getRideHistory: async (): Promise<EnhancedRide[]> => {
    const response = await apiClient.get<EnhancedRide[]>('/api/v2/driver/rides/history');
    return response.data;
  },

  // Get ride details
  getRideDetails: async (rideId: string): Promise<EnhancedRide> => {
    const response = await apiClient.get<EnhancedRide>(`/api/v2/driver/rides/${rideId}`);
    return response.data;
  },

  // Get earnings breakdown
  getEarnings: async (): Promise<{
    today: { earnings: number; rides: number };
    week: { earnings: number; rides: number };
    month: { earnings: number; rides: number };
    total: { earnings: number; rides: number; average_fare: number };
  }> => {
    const response = await apiClient.get('/api/v2/driver/earnings');
    return response.data;
  },

  // Create Razorpay order for collecting payment from customer
  createPaymentOrder: async (rideId: string): Promise<{
    order_id: string;
    amount: number;
    currency: string;
    key_id: string;
  }> => {
    const response = await apiClient.post(`/api/v2/bookings/${rideId}/payment/create-order`);
    return response.data;
  },

  // Verify Razorpay payment
  verifyPayment: async (rideId: string, data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }): Promise<{ message: string; transaction_id: string }> => {
    const response = await apiClient.post(`/api/v2/bookings/${rideId}/payment/verify`, {
      ride_id: rideId,
      ...data,
    });
    return response.data;
  },

  // Mark ride as paid by cash
  markCashPayment: async (rideId: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/api/v2/bookings/${rideId}/payment/cash`);
    return response.data;
  },
};
