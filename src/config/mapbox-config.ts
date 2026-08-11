// Mapbox Configuration for JK Taxi Driver
let runtimeAccessToken = '';
const envToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

export function getMapboxAccessToken(): string {
  return runtimeAccessToken || envToken || '';
}

export function setRuntimeMapboxToken(token: string | null | undefined): void {
  const next = (token || '').trim();
  if (next.length > 10) runtimeAccessToken = next;
}

export function clearRuntimeMapboxToken(): void {
  runtimeAccessToken = '';
}

/** @deprecated Prefer getMapboxAccessToken() */
export const MAPBOX_ACCESS_TOKEN = envToken;

export const DEFAULT_CENTER = {
  latitude: 12.9716,
  longitude: 77.5946,
};

export const MAP_STYLES = {
  STREETS: 'mapbox://styles/mapbox/streets-v12',
  DARK: 'mapbox://styles/mapbox/dark-v11',
  LIGHT: 'mapbox://styles/mapbox/light-v11',
  NAVIGATION_DAY: 'mapbox://styles/mapbox/navigation-day-v1',
  NAVIGATION_NIGHT: 'mapbox://styles/mapbox/navigation-night-v1',
  SATELLITE: 'mapbox://styles/mapbox/satellite-streets-v12',
};

export const ZOOM_LEVELS = {
  DEFAULT: 14,
  PICKUP: 16,
  ROUTE: 12,
  CITY: 11,
  MARKER: 15,
};

export const ANIMATION_DURATION = 1000;

export const NAVIGATION_MODE: 'external_maps' | 'embedded' = 'embedded';

export const MAP_PADDING = {
  top: 100,
  right: 50,
  bottom: 300,
  left: 50,
};
