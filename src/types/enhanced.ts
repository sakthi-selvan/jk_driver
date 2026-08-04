// Enhanced driver types for V2 API

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

export interface VehicleType {
  id: string;
  name: string;
  category: string;
}

export interface EnhancedRide {
  id: string;
  user_id: string;
  driver_id?: string;
  trip_type: string;
  vehicle_category: string;
  pickup_location: Location | string;
  dropoff_location?: Location | string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat?: number;
  dropoff_lng?: number;
  stops: Array<{
    address: string;
    latitude: number;
    longitude: number;
  }>;
  is_scheduled: boolean;
  scheduled_datetime?: string;
  booking_for_self: boolean;
  passenger_name?: string;
  passenger_phone?: string;
  passenger_notes?: string;
  preferences: {
    ac_preferred: boolean;
    pet_friendly: boolean;
    silent_ride: boolean;
    extra_luggage: boolean;
    wheelchair_support: boolean;
  };
  driver_notes?: string;
  ride_otp?: string | null;
  otp_verified: boolean;
  otp?: string | null; // Alias for ride_otp (never shown to drivers)
  status: string;
  fare: number;
  base_fare: number;
  distance_fare: number;
  platform_fee: number;
  gst: number;
  toll_charges: number;
  night_charges: number;
  waiting_charges: number;
  payment_status: string;
  payment_method: string;
  transaction_id?: string;
  distance_km: number;
  distance?: number; // Alias for distance_km
  eta_minutes: number;
  trip_distance_km?: number;
  route_source?: string | null;
  offer_ttl_seconds?: number;
  offer_remaining_seconds?: number;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  vehicle_type?: VehicleType;
}

export interface VerifyOTPRequest {
  ride_id: string;
  otp: string;
}
