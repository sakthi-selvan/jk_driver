import Mapbox from '@rnmapbox/maps';
import {
  getMapboxAccessToken,
  setRuntimeMapboxToken,
  clearRuntimeMapboxToken,
} from './mapbox-config';

let initialized = false;
let tokenApplied = false;

function isUsableToken(token: string | null | undefined): token is string {
  return Boolean(token && token.length > 10 && !token.startsWith('@'));
}

/**
 * Safe boot init. NEVER call Mapbox native APIs before a valid access token —
 * Android throws MapboxConfigurationException (uncatchable from JS try/catch).
 */
export function initMapbox(): { ok: boolean; reason?: string } {
  const token = getMapboxAccessToken();
  if (!isUsableToken(token)) {
    return { ok: false, reason: 'missing_token' };
  }
  return applyTokenSync(token);
}

function applyTokenSync(token: string): { ok: boolean; reason?: string } {
  try {
    void Mapbox.setAccessToken(token);
    tokenApplied = true;
    initialized = true;
    try {
      Mapbox.setTelemetryEnabled?.(false);
    } catch {
      // ignore
    }
    return { ok: true };
  } catch (e) {
    console.warn('[Mapbox] setAccessToken failed', e);
    return { ok: false, reason: 'init_failed' };
  }
}

export async function applyMapboxAccessToken(token: string): Promise<boolean> {
  if (!isUsableToken(token)) return false;
  setRuntimeMapboxToken(token);
  const next = getMapboxAccessToken();
  if (!isUsableToken(next)) return false;

  try {
    await Mapbox.setAccessToken(next);
    tokenApplied = true;
    initialized = true;
    try {
      Mapbox.setTelemetryEnabled?.(false);
    } catch {
      // ignore
    }
    return true;
  } catch (e) {
    console.warn('[Mapbox] apply token failed', e);
    return false;
  }
}

export function resetMapboxRuntimeToken(): void {
  clearRuntimeMapboxToken();
  tokenApplied = false;
  const env = getMapboxAccessToken();
  if (isUsableToken(env)) {
    applyTokenSync(env);
  }
}

export const MAP_SURFACE_VIEW = false;

export function mapboxTokenPresent(): boolean {
  return isUsableToken(getMapboxAccessToken());
}

export function mapboxTokenConfigured(): boolean {
  return isUsableToken(getMapboxAccessToken());
}
