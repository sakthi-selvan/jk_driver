import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN } from '../config/mapbox-config';
import { RouteProgressLayers } from './map/RouteProgressLayers';
import {
  splitRouteProgress,
  type LngLat,
} from '../utils/routeProgress';

interface NavigationMapProps {
  driverLocation: { latitude: number; longitude: number };
  destinationLocation: { latitude: number; longitude: number };
  routeCoordinates?: number[][];
  showPickupMarker?: boolean;
  showDropoffMarker?: boolean;
  pickupCoords?: { latitude: number; longitude: number };
  dropoffCoords?: { latitude: number; longitude: number };
  onRouteUpdate?: (coords: number[][], distance: number, duration: number) => void;
}

export const NavigationMap: React.FC<NavigationMapProps> = ({
  driverLocation,
  destinationLocation,
  routeCoordinates,
  showPickupMarker = true,
  showDropoffMarker = false,
  pickupCoords,
  dropoffCoords,
  onRouteUpdate,
}) => {
  const cameraRef = useRef<Mapbox.Camera>(null);
  const mapRef = useRef<Mapbox.MapView>(null);
  const [fullRoute, setFullRoute] = useState<LngLat[] | null>(
    (routeCoordinates as LngLat[] | undefined) || null
  );
  const fetchingRef = useRef(false);
  const lastRerouteAtRef = useRef(0);
  const lastDestRef = useRef(`${destinationLocation.latitude},${destinationLocation.longitude}`);

  const fetchRoute = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${driverLocation.longitude},${driverLocation.latitude};${destinationLocation.longitude},${destinationLocation.latitude}?geometries=geojson&overview=full&steps=true&banner_instructions=true&voice_instructions=true&access_token=${MAPBOX_ACCESS_TOKEN}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.routes?.[0]) {
        const route = data.routes[0];
        const coords = route.geometry.coordinates as LngLat[];
        setFullRoute(coords);
        onRouteUpdate?.(coords, route.distance / 1000, route.duration / 60);

        if (cameraRef.current) {
          const lngs = coords.map((c) => c[0]);
          const lats = coords.map((c) => c[1]);
          const ne = [Math.max(...lngs), Math.max(...lats)];
          const sw = [Math.min(...lngs), Math.min(...lats)];
          cameraRef.current.fitBounds(ne, sw, [150, 60, 450, 60], 1500);
        }
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    } finally {
      fetchingRef.current = false;
    }
  };

  // Fresh route when destination changes
  useEffect(() => {
    const key = `${destinationLocation.latitude},${destinationLocation.longitude}`;
    if (key !== lastDestRef.current || !fullRoute) {
      lastDestRef.current = key;
      fetchRoute();
    }
  }, [destinationLocation.latitude, destinationLocation.longitude]);

  // Sync external coordinates if parent provides them
  useEffect(() => {
    if (routeCoordinates && routeCoordinates.length >= 2) {
      setFullRoute(routeCoordinates as LngLat[]);
    }
  }, [routeCoordinates]);

  const progress = useMemo(
    () => (fullRoute ? splitRouteProgress(fullRoute, driverLocation) : null),
    [fullRoute, driverLocation.latitude, driverLocation.longitude]
  );

  // Off-route → re-fetch
  useEffect(() => {
    if (!progress?.offRoute) return;
    const now = Date.now();
    if (now - lastRerouteAtRef.current < 8000) return;
    lastRerouteAtRef.current = now;
    fetchRoute();
  }, [progress?.offRoute, driverLocation.latitude, driverLocation.longitude]);

  const travelled = progress && progress.travelled.length >= 2 ? progress.travelled : null;
  const remaining =
    progress && progress.remaining.length >= 2 ? progress.remaining : fullRoute;

  return (
    <Mapbox.MapView
      ref={mapRef}
      style={styles.map}
      styleURL="mapbox://styles/mapbox/navigation-day-v1"
      compassEnabled
      compassViewPosition={3}
      compassViewMargins={{ x: 16, y: 120 }}
      attributionEnabled={true}
      logoEnabled={false}
      pitchEnabled={true}
      rotateEnabled={true}
    >
      <Mapbox.Camera
        ref={cameraRef}
        zoomLevel={14}
        centerCoordinate={[driverLocation.longitude, driverLocation.latitude]}
        animationDuration={1500}
        pitch={60}
        heading={0}
        followUserLocation={true}
        followUserMode="course"
      />

      <Mapbox.LocationPuck
        pulsing={{ isEnabled: true }}
        puckBearingEnabled
        puckBearing="course"
      />

      <RouteProgressLayers
        travelled={travelled}
        remaining={remaining}
        idPrefix="nav-map"
      />

      {showPickupMarker && pickupCoords && (
        <Mapbox.PointAnnotation
          id="pickupMarker"
          coordinate={[pickupCoords.longitude, pickupCoords.latitude]}
        >
          <Mapbox.Callout title="Pickup Location" />
        </Mapbox.PointAnnotation>
      )}

      {showDropoffMarker && dropoffCoords && (
        <Mapbox.PointAnnotation
          id="dropoffMarker"
          coordinate={[dropoffCoords.longitude, dropoffCoords.latitude]}
        >
          <Mapbox.Callout title="Dropoff Location" />
        </Mapbox.PointAnnotation>
      )}
    </Mapbox.MapView>
  );
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
