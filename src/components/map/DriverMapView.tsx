import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN, MAP_STYLES, MAP_PADDING, ANIMATION_DURATION } from '../../config/mapbox-config';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants/theme';
import { RouteProgressLayers } from './RouteProgressLayers';
import { VehicleMarker, normalizeFleetCategory } from './VehicleMarker';
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
  heading?: number | null;
}

interface DriverMapViewProps {
  pickup: Location;
  dropoff: Location;
  driverLocation?: Location;
  showRoute?: boolean;
  vehicleType?: string | null;
  onRouteReady?: (distance: number, duration: number) => void;
}

interface RouteData {
  coordinates: LngLat[];
  distance: number;
  duration: number;
}

/**
 * DriverMapView — road route with once-per-leg camera framing and top-view vehicle marker.
 */
export const DriverMapView: React.FC<DriverMapViewProps> = ({
  pickup,
  dropoff,
  driverLocation,
  showRoute = true,
  vehicleType,
  onRouteReady,
}) => {
  const cameraRef = useRef<Mapbox.Camera>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const lastFetchRef = useRef(0);
  const framedLegRef = useRef('');
  const category = normalizeFleetCategory(vehicleType);

  useEffect(() => {
    framedLegRef.current = '';
    setRouteData(null);
    if (showRoute) fetchRoute(false, true);
  }, [pickup.latitude, pickup.longitude, dropoff.latitude, dropoff.longitude, showRoute]);

  const frameRoute = (coords: LngLat[], includeDriver?: Location) => {
    if (!cameraRef.current || coords.length < 2) return;
    const points = [...coords];
    if (includeDriver) {
      points.push([includeDriver.longitude, includeDriver.latitude]);
    }
    const lngs = points.map((c) => c[0]);
    const lats = points.map((c) => c[1]);
    cameraRef.current.fitBounds(
      [Math.max(...lngs), Math.max(...lats)],
      [Math.min(...lngs), Math.min(...lats)],
      [MAP_PADDING.top, MAP_PADDING.right, MAP_PADDING.bottom, MAP_PADDING.left],
      ANIMATION_DURATION
    );
  };

  const fetchRoute = async (fromDriver = false, shouldFrame = false) => {
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

        if (shouldFrame) {
          const legKey = `${pickup.latitude},${pickup.longitude}->${dropoff.latitude},${dropoff.longitude}`;
          if (framedLegRef.current !== legKey) {
            framedLegRef.current = legKey;
            frameRoute(coordinates, driverLocation);
          }
        }

        onRouteReady?.(route.distance / 1000, route.duration / 60);
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
    // Rebuild polyline without reframing the camera
    fetchRoute(true, false);
  }, [progress?.offRoute, driverLocation?.latitude, driverLocation?.longitude]);

  // First frame when route arrives if not yet framed
  useEffect(() => {
    if (!routeData) return;
    const legKey = `${pickup.latitude},${pickup.longitude}->${dropoff.latitude},${dropoff.longitude}`;
    if (framedLegRef.current === legKey) return;
    framedLegRef.current = legKey;
    frameRoute(routeData.coordinates, driverLocation);
  }, [routeData]);

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
  const remMin =
    progress && routeData
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
        attributionEnabled
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
          <Mapbox.MarkerView
            key="driver-self-marker"
            id="driver-self"
            coordinate={[driverLocation.longitude, driverLocation.latitude]}
            allowOverlap
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <VehicleMarker
              category={category}
              size={40}
              heading={driverLocation.heading ?? null}
            />
          </Mapbox.MarkerView>
        )}

        <RouteProgressLayers travelled={travelled} remaining={remaining} idPrefix="driver-map" />
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
  container: { flex: 1 },
  map: { flex: 1 },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  pickupMarker: { backgroundColor: '#22C55E' },
  dropoffMarker: { backgroundColor: '#EF4444' },
  markerText: { color: '#FFF', fontWeight: FontWeights.bold, fontSize: 12 },
  routeInfoContainer: {
    position: 'absolute',
    top: Spacing.md,
    alignSelf: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  routeInfoText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: '#111',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: Spacing.lg,
    alignSelf: 'center',
    backgroundColor: '#FFF',
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
});
