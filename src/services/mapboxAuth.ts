import AsyncStorage from '@react-native-async-storage/async-storage';
import { geoApi } from '../api/geo';
import { applyMapboxAccessToken, mapboxTokenPresent } from '../config/initMapbox';

const CACHE_KEY = 'mapbox_public_token';

export async function ensureMapboxTokenAfterAuth(): Promise<boolean> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached && cached.startsWith('pk.')) {
      applyMapboxAccessToken(cached);
    }
  } catch {
    // ignore
  }

  try {
    const { access_token } = await geoApi.getMapboxToken();
    if (access_token?.startsWith('pk.')) {
      applyMapboxAccessToken(access_token);
      try {
        await AsyncStorage.setItem(CACHE_KEY, access_token);
      } catch {
        // ignore
      }
      return true;
    }
  } catch (e) {
    console.warn('[Mapbox] failed to load token from backend', e);
  }

  return mapboxTokenPresent();
}

export async function clearCachedMapboxToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}
