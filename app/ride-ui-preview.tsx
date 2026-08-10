import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Mapbox from '@rnmapbox/maps';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../src/constants/theme';
import { MAPBOX_ACCESS_TOKEN, MAP_STYLES } from '../src/config/mapbox-config';
import { RouteProgressLayers } from '../src/components/map/RouteProgressLayers';
import { splitRouteProgress } from '../src/utils/routeProgress';
import {
  PREVIEW_PHASES,
  PreviewPhase,
  DRIVER_START,
  PREVIEW_PICKUP,
  PREVIEW_DROPOFF,
  fetchDrivingRoute,
  pointAlongRoute,
  phaseCopy,
  type LngLat,
} from '../src/utils/rideUiPreviewMock';

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

/**
 * Local walkthrough of captain ride flow — no API calls.
 * Offer → to pickup → OTP → on trip → complete.
 */
export default function RideUiPreviewScreen() {
  const [phase, setPhase] = useState<PreviewPhase>('offer');
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toPickupRoute, setToPickupRoute] = useState<LngLat[] | null>(null);
  const [toDropRoute, setToDropRoute] = useState<LngLat[] | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraRef = useRef<Mapbox.Camera>(null);

  const copy = phaseCopy(phase);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [a, b] = await Promise.all([
        fetchDrivingRoute(DRIVER_START, PREVIEW_PICKUP),
        fetchDrivingRoute(PREVIEW_PICKUP, PREVIEW_DROPOFF),
      ]);
      if (cancelled) return;
      setToPickupRoute(a);
      setToDropRoute(b);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeRoute: LngLat[] | null =
    phase === 'accepted' || phase === 'otp'
      ? toPickupRoute
      : phase === 'started' || phase === 'completed'
        ? toDropRoute
        : null;

  const driverLocation = useMemo(() => {
    if (phase === 'offer') {
      return { latitude: DRIVER_START.latitude, longitude: DRIVER_START.longitude, heading: 0 };
    }
    if (phase === 'otp') {
      return pointAlongRoute(toPickupRoute, 1);
    }
    if (phase === 'completed') {
      return pointAlongRoute(toDropRoute, 1);
    }
    return pointAlongRoute(activeRoute, progress);
  }, [phase, progress, activeRoute, toPickupRoute, toDropRoute]);

  const routeProgress = useMemo(() => {
    if (!activeRoute || activeRoute.length < 2) {
      return { travelled: null as LngLat[] | null, remaining: null as LngLat[] | null };
    }
    const split = splitRouteProgress(activeRoute, {
      latitude: driverLocation.latitude,
      longitude: driverLocation.longitude,
    });
    return {
      travelled: split?.travelled ?? null,
      remaining: split?.remaining ?? null,
    };
  }, [activeRoute, driverLocation.latitude, driverLocation.longitude]);

  const stopPlay = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    setPlaying(false);
  };

  const goToPhase = (next: PreviewPhase) => {
    stopPlay();
    setPhase(next);
    setProgress(next === 'completed' || next === 'otp' ? 1 : 0);
  };

  useEffect(() => {
    if (!playing) return;
    if ((phase === 'accepted' && !toPickupRoute) || (phase === 'started' && !toDropRoute)) return;

    tickRef.current = setInterval(() => {
      setProgress((p) => {
        const next = p + 0.02;
        if (next >= 1) {
          stopPlay();
          if (phase === 'accepted') setPhase('otp');
          else if (phase === 'started') setPhase('completed');
          return 1;
        }
        return next;
      });
    }, 120);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [playing, phase, toPickupRoute, toDropRoute]);

  useEffect(() => {
    cameraRef.current?.setCamera({
      centerCoordinate: [driverLocation.longitude, driverLocation.latitude],
      zoomLevel: phase === 'offer' ? 13 : 14.5,
      animationDuration: 600,
    });
  }, [phase, driverLocation.latitude, driverLocation.longitude]);

  const playFromHere = () => {
    if (phase === 'offer') {
      goToPhase('accepted');
      setPlaying(true);
      setProgress(0);
      return;
    }
    if (phase === 'otp') {
      goToPhase('started');
      setPlaying(true);
      setProgress(0);
      return;
    }
    stopPlay();
    setPlaying(true);
    setProgress(0);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Ride flow preview</Text>
          <Text style={styles.sub}>Demo only · Accept → pickup → complete</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {PREVIEW_PHASES.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.chip, phase === p.id && styles.chipActive]}
            onPress={() => goToPhase(p.id)}
          >
            <Text style={[styles.chipText, phase === p.id && styles.chipTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.mapWrap}>
        <Mapbox.MapView
          style={StyleSheet.absoluteFill}
          styleURL={MAP_STYLES.STREETS}
          surfaceView={false}
          compassEnabled={false}
        >
          <Mapbox.Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: [DRIVER_START.longitude, DRIVER_START.latitude],
              zoomLevel: 13,
            }}
          />
          {routeProgress.travelled || routeProgress.remaining ? (
            <RouteProgressLayers
              travelled={routeProgress.travelled}
              remaining={routeProgress.remaining}
              idPrefix="preview"
            />
          ) : null}
          <Mapbox.PointAnnotation id="pickup" coordinate={[PREVIEW_PICKUP.longitude, PREVIEW_PICKUP.latitude]}>
            <View style={[styles.dot, { backgroundColor: '#22C55E' }]} />
          </Mapbox.PointAnnotation>
          <Mapbox.PointAnnotation id="drop" coordinate={[PREVIEW_DROPOFF.longitude, PREVIEW_DROPOFF.latitude]}>
            <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
          </Mapbox.PointAnnotation>
          <Mapbox.PointAnnotation
            id="driver"
            coordinate={[driverLocation.longitude, driverLocation.latitude]}
          >
            <View style={styles.driverDot}>
              <Ionicons name="navigate" size={14} color="#FFF" />
            </View>
          </Mapbox.PointAnnotation>
        </Mapbox.MapView>
      </View>

      <View style={styles.sheet}>
        <Text style={styles.sheetTitle}>{copy.title}</Text>
        <Text style={styles.sheetSub}>{copy.subtitle}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.fare}>{copy.fare}</Text>
          <Text style={styles.meta}>TN 39 AB 4521 · Mini</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={playing ? stopPlay : playFromHere}>
            <Ionicons name={playing ? 'pause' : 'play'} size={18} color={Colors.primary} />
            <Text style={styles.secondaryText}>{playing ? 'Pause' : 'Play flow'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              const idx = PREVIEW_PHASES.findIndex((p) => p.id === phase);
              const next = PREVIEW_PHASES[Math.min(PREVIEW_PHASES.length - 1, idx + 1)];
              goToPhase(next.id);
            }}
          >
            <Text style={styles.primaryText}>{copy.cta}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: 10,
  },
  backBtn: { padding: 8 },
  title: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: Colors.text },
  sub: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  chips: { paddingHorizontal: Spacing.md, gap: 8, paddingBottom: Spacing.sm },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  chipActive: { backgroundColor: '#F3E8FF' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#666' },
  chipTextActive: { color: Colors.primary },
  mapWrap: {
    flex: 1,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    minHeight: 280,
  },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#FFF' },
  driverDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  sheet: {
    margin: Spacing.md,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  sheetTitle: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: Colors.text },
  sheetSub: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: 4 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  fare: { fontSize: 22, fontWeight: '800', color: Colors.primary },
  meta: { fontSize: 12, color: '#666', fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: Spacing.md },
  secondaryBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: '#F5F3FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryText: { color: Colors.primary, fontWeight: '700' },
  primaryBtn: {
    flex: 1.2,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#FFF', fontWeight: '700' },
});
