import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN, MAP_STYLES, MAP_PADDING, ANIMATION_DURATION } from '../../config/mapbox-config';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants/theme';
import { RouteProgressLayers } from './RouteProgressLayers';
import {
  estimateRemainingMinutes,
  remainingDistanceMeters,
  splitRouteProgress,
  type LngLat,
} from '../../utils/routeProgress';

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

interface DriverMapViewProps {
  pickup: Location;
  dropoff: Location;
  driverLocation?: Location;
  showRoute?: boolean;
  onRouteReady?: (distance: number, duration: number) => void;
}

interface RouteData {
  coordinates: LngLat[];
  distance: number;
  duration: number;
}

/**
 * DriverMapView - Map with Google Maps–style travelled/remaining progress.
 */
export const DriverMapView: React.FC<DriverMapViewProps> = ({
  pickup,
  dropoff,
  driverLocation,
  showRoute = true,
  onRouteReady,
}) => {
  const cameraRef = useRef<Mapbox.Camera>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const lastFetchRef = useRef(0);

  useEffect(() => {
    if (showRoute) {
      fetchRoute(false);
    }
  }, [pickup.latitude, pickup.longitude, dropoff.latitude, dropoff.longitude, showRoute]);

  useEffect(() => {
    if (routeData && cameraRef.current) {
      const coordinates = [...routeData.coordinates];
      if (driverLocation) {
        coordinates.push([driverLocation.longitude, driverLocation.latitude]);
      }

      const lngs = coordinates.map((c) => c[0]);
      const lats = coordinates.map((c) => c[1]);

      cameraRef.current.fitBounds(
        [Math.max(...lngs), Math.max(...lats)],
        [Math.min(...lngs), Math.min(...lats)],
        [MAP_PADDING.top, MAP_PADDING.right, MAP_PADDING.bottom, MAP_PADDING.left],
        ANIMATION_DURATION
      );
    }
  }, [routeData]);

  const fetchRoute = async (fromDriver = false) => {
    setIsLoading(true);
    try {
      const origin = fromDriver && driverLocation ? driverLocation : pickup;
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${origin.longitude},${origin.latitude};${dropoff.longitude},${dropoff.latitude}?geometries=geojson&overview=full&steps=true&access_token=${MAPBOX_ACCESS_TOKEN}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates as LngLat[];

        setRouteData({
          coordinates,
          distance: route.distance,
          duration: route.duration,
        });
        lastFetchRef.current = Date.now();

        if (onRouteReady) {
          onRouteReady(route.distance / 1000, route.duration / 60);
        }
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const progress = useMemo(() => {
    if (!routeData || !driverLocation) return null;
    return splitRouteProgress(routeData.coordinates, driverLocation);
  }, [routeData, driverLocation?.latitude, driverLocation?.longitude]);

  useEffect(() => {
    if (!progress?.offRoute || !driverLocation) return;
    if (Date.now() - lastFetchRef.current < 8000) return;
    lastFetchRef.current = Date.now();
    fetchRoute(true);
  }, [progress?.offRoute, driverLocation?.latitude, driverLocation?.longitude]);

  const travelled =
    progress && progress.travelled.length >= 2 ? progress.travelled : null;
  const remaining =
    progress && progress.remaining.length >= 2
      ? progress.remaining
      : routeData?.coordinates || null;

  const remKm = progress
    ? remainingDistanceMeters(progress.remaining) / 1000
    : routeData
      ? routeData.distance / 1000
      : 0;
  const remMin = progress && routeData
    ? estimateRemainingMinutes(routeData.duration / 60, progress.fraction)
    : routeData
      ? routeData.duration / 60
      : 0;

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={MAP_STYLES.NAVIGATION_DAY}
        compassEnabled
        attributionEnabled={true}
        logoEnabled={false}
      >
        <Mapbox.Camera ref={cameraRef} animationDuration={ANIMATION_DURATION} />

        <Mapbox.UserLocation visible showsUserHeadingIndicator androidRenderMode="gps" />

        <Mapbox.PointAnnotation
          id="pickup"
          coordinate={[pickup.longitude, pickup.latitude]}
          title="Pickup Location"
        >
          <View style={[styles.marker, styles.pickupMarker]}>
            <Text style={styles.markerText}>P</Text>
          </View>
        </Mapbox.PointAnnotation>

        <Mapbox.PointAnnotation
          id="dropoff"
          coordinate={[dropoff.longitude, dropoff.latitude]}
          title="Drop-off Location"
        >
          <View style={[styles.marker, styles.dropoffMarker]}>
            <Text style={styles.markerText}>D</Text>
          </View>
        </Mapbox.PointAnnotation>

        {driverLocation && (
          <Mapbox.PointAnnotation
            id="driver"
            coordinate={[driverLocation.longitude, driverLocation.latitude]}
            title="Your Location"
          >
            <View style={[styles.marker, styles.driverMarker]}>
              <Text style={styles.markerText}>🚗</Text>
            </View>
          </Mapbox.PointAnnotation>
        )}

        <RouteProgressLayers
          travelled={travelled}
          remaining={remaining}
          idPrefix="driver-map"
        />
      </Mapbox.MapView>

      {routeData && (
        <View style={styles.routeInfoContainer}>
          <Text style={styles.routeInfoText}>
            {remKm.toFixed(1)} km • {Math.round(remMin)} min
          </Text>
        </View>
      )}

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#4285F4" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pickupMarker: {
    backgroundColor: '#0F9D58',
  },
  dropoffMarker: {
    backgroundColor: '#EA4335',
  },
  driverMarker: {
    backgroundColor: '#1A73E8',
  },
  markerText: {
    color: '#FFFFFF',
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
  routeInfoContainer: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#E8EAED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  routeInfoText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: '#1A73E8',
    textAlign: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: '#FFF',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
