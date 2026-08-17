// API Configuration for Driver App
// In Expo SDK 54+, EXPO_PUBLIC_* variables are statically replaced at build time.
// We resolve it here (including mapping localhost -> emulator-friendly URLs).

import { Platform } from 'react-native';

function isLoopbackOrEmulatorHost(url: string) {
  return /localhost|127\.0\.0\.1|10\.0\.2\.2/.test(url);
}

function resolveApiUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  // Default (production)
  if (!configuredUrl) return 'https://api.jktaxitamilnadu.com';

  // If a user set localhost in preview builds, map to Android emulator loopback.
  if (isLoopbackOrEmulatorHost(configuredUrl)) {
    if (Platform.OS === 'android') return 'http://10.0.2.2:8000';
    if (Platform.OS === 'ios') return 'http://127.0.0.1:8000';
  }

  return configuredUrl;
}

const API_URL = resolveApiUrl();

export const API_CONFIG = {
  BASE_URL: API_URL,
  TIMEOUT: 90000,
};

// Debug: Log the resolved API URL
console.log('📡 [DRIVER CONFIG] API_URL resolved to:', API_URL);

// For local dev only — use your machine's LAN IP, not localhost, on a physical device.
// EXPO_PUBLIC_API_URL=http://192.168.x.x:8000
