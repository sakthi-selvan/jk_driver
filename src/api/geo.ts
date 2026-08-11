import apiClient from './client';

export const geoApi = {
  async getMapboxToken(): Promise<{ access_token: string; style_url?: string }> {
    const response = await apiClient.get<{ access_token: string; style_url?: string }>(
      '/api/v2/geo/mapbox-token'
    );
    return response.data;
  },

  async directions(opts: {
    from: { latitude: number; longitude: number };
    to: { latitude: number; longitude: number };
    profile?: string;
  }) {
    const response = await apiClient.get('/api/v2/geo/directions', {
      params: {
        from_lat: opts.from.latitude,
        from_lng: opts.from.longitude,
        to_lat: opts.to.latitude,
        to_lng: opts.to.longitude,
        profile: opts.profile,
      },
    });
    return response.data as {
      coordinates: [number, number][];
      distance_m: number;
      duration_s: number;
      source: string;
    };
  },
};
