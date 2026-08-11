import Mapbox from '@rnmapbox/maps';
import {
  getMapboxAccessToken,
  setRuntimeMapboxToken,
  clearRuntimeMapboxToken,
} from './mapbox-config';

let initialized = false;

export function initMapbox(): { ok: boolean; reason?: string } {
  const token = getMapboxAccessToken();
  if (!initialized) {
    initialized = true;
    try {
      Mapbox.setTelemetryEnabled?.(false);
    } catch {
      // ignore
    }
  }

  if (!token) {
    return { ok: false, reason: 'missing_token' };
  }

  try {
    Mapbox.setAccessToken(token);
  } catch (e) {
    console.warn('[Mapbox] setAccessToken failed', e);
    return { ok: false, reason: 'init_failed' };
  }

  return { ok: true };
}

export function applyMapboxAccessToken(token: string): boolean {
  setRuntimeMapboxToken(token);
  try {
    Mapbox.setAccessToken(getMapboxAccessToken());
    initialized = true;
    return true;
  } catch (e) {
    console.warn('[Mapbox] apply token failed', e);
    return false;
  }
}

export function resetMapboxRuntimeToken(): void {
  clearRuntimeMapboxToken();
  const env = getMapboxAccessToken();
  if (env) {
    try {
      Mapbox.setAccessToken(env);
    } catch {
      // ignore
    }
  }
}

export const MAP_SURFACE_VIEW = false;

export function mapboxTokenPresent(): boolean {
  const t = getMapboxAccessToken();
  return Boolean(t && t.length > 10);
}
