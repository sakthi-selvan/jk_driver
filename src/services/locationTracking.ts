/**
 * Driver location publisher.
 * Uses foreground watch + enriched payloads (accuracy/heading/speed/sequence).
 * For true background tracking, add expo-task-manager and wire startLocationUpdatesAsync.
 */
import * as Location from 'expo-location';
import { driverEnhancedApi } from '../api/driver-enhanced';

let sequence = 0;
let activeRideId: string | null = null;
let subscription: Location.LocationSubscription | null = null;
let started = false;

async function publishCoords(coords: Location.LocationObjectCoords) {
  sequence += 1;
  try {
    await driverEnhancedApi.updateLocation({
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy ?? undefined,
      heading: coords.heading ?? undefined,
      speed: coords.speed ?? undefined,
      sequence,
      ride_id: activeRideId || undefined,
      recorded_at: new Date().toISOString(),
    });
  } catch {
    // network failures are expected offline; UI keeps last known location
  }
}

export const driverLocationService = {
  setActiveRideId(rideId: string | null) {
    activeRideId = rideId;
  },

  async start() {
    if (started) return;
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') {
      throw new Error('Foreground location permission required');
    }

    subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 15,
      },
      (loc) => {
        publishCoords(loc.coords);
      }
    );
    started = true;
  },

  async stop() {
    started = false;
    activeRideId = null;
    if (subscription) {
      subscription.remove();
      subscription = null;
    }
  },

  async pushOnce() {
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    await publishCoords(loc.coords);
    return loc;
  },
};
