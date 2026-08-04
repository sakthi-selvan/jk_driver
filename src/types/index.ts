// Driver types
export interface Driver {
  id: string;
  phone: string;
  name: string;
  email?: string;
  vehicle_number?: string;
  vehicle_type?: string;
  is_online: boolean;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

// Auth types
export interface LoginCredentials {
  phone: string;
  password: string;
}

export interface RegisterData {
  phone: string;
  name: string;
  email?: string;
  password: string;
  vehicle_number?: string;
  vehicle_type?: string;
  license_document?: string;
  aadhar_document?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// Ride types
export enum RideStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  STARTED = 'started',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface Ride {
  id: string;
  user_id: string;
  driver_id?: string;
  pickup_location: string;
  dropoff_location: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  status: RideStatus;
  fare: number;
  payment_status: PaymentStatus;
  payment_method: string;
  transaction_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DriverStatusUpdate {
  is_online: boolean;
}

export interface Earnings {
  total_earnings: number;
  total_rides: number;
  average_fare: number;
}
