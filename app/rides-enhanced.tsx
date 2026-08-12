import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { formatApiError } from '../src/utils/apiError';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { driverEnhancedApi } from '../src/api/driver-enhanced';
import { OTPVerificationModal } from '../src/components/OTPVerificationModal';
import { EnhancedRideCard } from '../src/components/EnhancedRideCard';
import { Button } from '../src/components/common/Button';
import { Card } from '../src/components/common/Card';
import { Colors, Spacing, FontSizes, FontWeights } from '../src/constants/theme';
import { EnhancedRide } from '../src/types/enhanced';
import { driverLocationService } from '../src/services/locationTracking';
import { sameRideListUi, sameRideUi } from '../src/utils/stableUpdate';
import { rideRealtime } from '../src/services/realtime';
import { rideOfferAlert } from '../src/services/rideOfferAlert';
import { useAuthStore } from '../src/store/authStore';

export default function RidesEnhancedScreen() {
  const [availableRides, setAvailableRides] = useState<EnhancedRide[]>([]);
  const [activeRide, setActiveRide] = useState<EnhancedRide | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const hasLoadedOnceRef = useRef(false);
  const loadInFlight = useRef(false);
  const loadQueued = useRef(false);
  const alarmedOfferIdsRef = useRef<Set<string>>(new Set());

  const setActiveRideStable = useCallback((next: EnhancedRide | null) => {
    setActiveRide((prev) => (sameRideUi(prev, next) ? prev : next));
  }, []);

  const setAvailableRidesStable = useCallback((next: EnhancedRide[]) => {
    setAvailableRides((prev) => (sameRideListUi(prev, next) ? prev : next));
  }, []);

  const loadRides = useCallback(async (opts?: { soft?: boolean; pull?: boolean }) => {
    const soft = opts?.soft ?? hasLoadedOnceRef.current;
    const pull = opts?.pull ?? false;
    if (loadInFlight.current) {
      loadQueued.current = true;
      return;
    }
    loadInFlight.current = true;

    try {
      if (!soft && !pull) setIsLoading(true);

      try {
        const active = await driverEnhancedApi.getActiveRide();
        setActiveRideStable(active);
        setAvailableRidesStable([]);
        alarmedOfferIdsRef.current.clear();
        rideOfferAlert.stop().catch(() => undefined);
      } catch (error: any) {
        if (error.response?.status === 404) {
          setActiveRideStable(null);
          try {
            const available = await driverEnhancedApi.getAvailableRides();
            const next = Array.isArray(available) ? available : [];
            for (const r of next) {
              const id = String(r.id);
              if (!alarmedOfferIdsRef.current.has(id)) {
                alarmedOfferIdsRef.current.add(id);
                rideOfferAlert.playForOffer(id).catch(() => undefined);
              }
            }
            const nextIds = new Set(next.map((r) => String(r.id)));
            for (const id of [...alarmedOfferIdsRef.current]) {
              if (!nextIds.has(id)) alarmedOfferIdsRef.current.delete(id);
            }
            if (next.length === 0) {
              rideOfferAlert.stop().catch(() => undefined);
            }
            setAvailableRides((prev) => (sameRideListUi(prev, next) ? prev : next));
          } catch {
            if (!soft) setAvailableRidesStable([]);
          }
        }
      }
    } catch (error) {
      console.error('Error loading rides:', error);
    } finally {
      loadInFlight.current = false;
      hasLoadedOnceRef.current = true;
      setHasLoadedOnce(true);
      setIsLoading(false);
      setIsRefreshing(false);
      if (loadQueued.current) {
        loadQueued.current = false;
        loadRides({ soft: true });
      }
    }
  }, [setActiveRideStable, setAvailableRidesStable]);

  useEffect(() => {
    loadRides({ soft: false });
    const interval = setInterval(() => loadRides({ soft: true }), 3000);

    const token = useAuthStore.getState().accessToken;
    let unsub: (() => void) | undefined;
    if (token) {
      rideRealtime.connect(token, null);
      unsub = rideRealtime.onEvent((event, data) => {
        if (event === 'socket_open' || event === 'ride_offer' || event === 'offer_expired' || event === 'ride_taken' || event === 'ride_cancelled' || event === 'ride_accepted') {
          if (event === 'ride_offer' && (data?.ride_id || data?.id)) {
            const myId = useAuthStore.getState().driver?.id;
            const offeredTo = data?.offered_driver_id;
            if (!offeredTo || !myId || String(offeredTo) === String(myId)) {
              const id = String(data.ride_id || data.id);
              const isNew = !alarmedOfferIdsRef.current.has(id);
              if (isNew) {
                alarmedOfferIdsRef.current.add(id);
                rideOfferAlert.playForOffer(id).catch(() => undefined);
              }
              setAvailableRides((prev) => {
                if (prev.some((r) => String(r.id) === id)) return prev;
                const stub = {
                  id,
                  user_id: String(data.user_id || ''),
                  status: 'pending',
                  trip_type: data.trip_type || 'one_way',
                  vehicle_category: data.vehicle_category || 'mini',
                  pickup_location: data.pickup_location || 'Pickup',
                  dropoff_location: data.dropoff_location,
                  pickup_lat: Number(data.pickup_lat) || 0,
                  pickup_lng: Number(data.pickup_lng) || 0,
                  dropoff_lat: data.dropoff_lat != null ? Number(data.dropoff_lat) : undefined,
                  dropoff_lng: data.dropoff_lng != null ? Number(data.dropoff_lng) : undefined,
                  stops: Array.isArray(data.stops) ? data.stops : [],
                  is_scheduled: Boolean(data.is_scheduled),
                  booking_for_self: data.booking_for_self !== false,
                  preferences: data.preferences || {
                    ac_preferred: false,
                    pet_friendly: false,
                    silent_ride: false,
                    extra_luggage: false,
                    wheelchair_support: false,
                  },
                  otp_verified: false,
                  fare: Number(data.fare) || 0,
                  base_fare: Number(data.base_fare) || 0,
                  distance_fare: Number(data.distance_fare) || 0,
                  platform_fee: Number(data.platform_fee) || 0,
                  gst: Number(data.gst) || 0,
                  toll_charges: Number(data.toll_charges) || 0,
                  night_charges: Number(data.night_charges) || 0,
                  waiting_charges: Number(data.waiting_charges) || 0,
                  payment_status: data.payment_status || 'pending',
                  payment_method: data.payment_method || 'cash',
                  distance_km: Number(data.distance_km) || 0,
                  eta_minutes: Number(data.eta_minutes) || 0,
                  offer_remaining_seconds:
                    data.offer_remaining_seconds != null
                      ? Number(data.offer_remaining_seconds)
                      : undefined,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                } as EnhancedRide;
                return [stub, ...prev];
              });
            }
          }
          if (event === 'ride_taken' || event === 'offer_expired') {
            const takenId = data?.ride_id;
            if (takenId) {
              alarmedOfferIdsRef.current.delete(String(takenId));
              setAvailableRides((prev) => prev.filter((r) => String(r.id) !== String(takenId)));
              rideOfferAlert.stop().catch(() => undefined);
            }
          }
          loadRides({ soft: true });
        }
      });
    }

    return () => {
      clearInterval(interval);
      unsub?.();
      rideOfferAlert.stop().catch(() => undefined);
    };
  }, [loadRides]);

  // Push location to server when ride is active
  useEffect(() => {
    if (activeRide && (activeRide.status === 'accepted' || activeRide.status === 'started')) {
      driverLocationService.setActiveRideId(activeRide.id);
      driverLocationService.start().catch(() => undefined);
      return () => {
        driverLocationService.stop().catch(() => undefined);
      };
    }
    driverLocationService.setActiveRideId(null);
  }, [activeRide?.id, activeRide?.status]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadRides({ soft: true, pull: true });
  };

  const handleAcceptRide = async (rideId: string) => {
    try {
      await rideOfferAlert.stop().catch(() => undefined);
      alarmedOfferIdsRef.current.clear();
      const ride = await driverEnhancedApi.acceptRide(rideId);
      setActiveRide(ride);
      setAvailableRides([]);
      Alert.alert('Success', 'Ride accepted! Now verify OTP to start.');
    } catch (error: any) {
      Alert.alert('Error', formatApiError(error, 'Failed to accept ride'));
    }
  };

  const handleRejectRide = async (rideId: string) => {
    try {
      alarmedOfferIdsRef.current.delete(String(rideId));
      rideOfferAlert.stop().catch(() => undefined);
      await driverEnhancedApi.declineRide(rideId);
      setAvailableRides((prev) => prev.filter((r) => r.id !== rideId));
      loadRides({ soft: true });
    } catch (error: any) {
      const code = error?.response?.status;
      if (code === 409 || code === 404 || code === 410) {
        setAvailableRides((prev) => prev.filter((r) => r.id !== rideId));
        return;
      }
      Alert.alert('Error', formatApiError(error, 'Failed to decline ride'));
      loadRides({ soft: true });
    }
  };

  const handleVerifyOTP = () => {
    setShowOTPModal(true);
  };

  const handleOTPVerified = async () => {
    setShowOTPModal(false);
    loadRides({ soft: true });
    Alert.alert('OTP Verified', 'You can now start the ride');
  };

  const handleStartRide = async () => {
    if (!activeRide) return;

    if (activeRide.status === 'started') {
      return;
    }

    if (!activeRide.otp_verified) {
      Alert.alert('OTP Required', 'Please verify OTP before starting the ride');
      setShowOTPModal(true);
      return;
    }

    try {
      const ride = await driverEnhancedApi.startRide(activeRide.id);
      setActiveRide(ride);
      Alert.alert('Success', 'Ride started!');
    } catch (error: any) {
      const detail = String(error?.response?.data?.detail || '').toLowerCase();
      if (detail.includes('status: started')) {
        try {
          const active = await driverEnhancedApi.getActiveRide();
          setActiveRide(active);
          return;
        } catch {
          // fall through
        }
      }
      Alert.alert('Error', formatApiError(error, 'Failed to start ride'));
    }
  };

  const handleCompleteRide = async () => {
    if (!activeRide) return;

    Alert.alert(
      'Complete Ride',
      'Are you sure you want to complete this ride?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await driverEnhancedApi.completeRide(activeRide.id);
              Alert.alert('Success', 'Ride completed!');
              loadRides({ soft: true });
            } catch (error: any) {
              Alert.alert('Error', formatApiError(error, 'Failed to complete ride'));
            }
          },
        },
      ]
    );
  };

  if (isLoading && !hasLoadedOnce) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading rides...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {activeRide ? 'Active Ride' : 'Available Rides'}
          </Text>
          {availableRides.length > 0 && (
            <Text style={styles.headerSubtitle}>{availableRides.length} rides available</Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Active Ride */}
        {activeRide && (
          <View style={styles.section}>
            <EnhancedRideCard ride={activeRide} />

            {/* OTP Status */}
            {activeRide.status === 'accepted' && (
              <Card style={styles.otpCard}>
                <View style={styles.otpHeader}>
                  <Text style={styles.otpTitle}>
                    {activeRide.otp_verified ? '✅ OTP Verified' : '🔒 OTP Required'}
                  </Text>
                  {!activeRide.otp_verified && (
                    <Button
                      title="Verify OTP"
                      size="small"
                      onPress={handleVerifyOTP}
                    />
                  )}
                </View>
                {!activeRide.otp_verified && (
                  <Text style={styles.otpSubtext}>
                    Ask customer for 4-digit OTP to start the ride
                  </Text>
                )}
              </Card>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              {activeRide.status === 'accepted' && (
                <Button
                  title="Start Ride"
                  onPress={handleStartRide}
                  fullWidth
                  disabled={!activeRide.otp_verified}
                />
              )}
              {activeRide.status === 'started' && (
                <Button
                  title="Complete Ride"
                  onPress={handleCompleteRide}
                  fullWidth
                />
              )}
            </View>
          </View>
        )}

        {/* Available Rides */}
        {!activeRide && availableRides.length > 0 && (
          <View style={styles.section}>
            {availableRides.map((ride) => (
              <EnhancedRideCard
                key={ride.id}
                ride={ride}
                showActions
                onAccept={() => handleAcceptRide(ride.id)}
                onReject={() => handleRejectRide(ride.id)}
              />
            ))}
          </View>
        )}

        {/* No Rides */}
        {!activeRide && availableRides.length === 0 && (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No rides available</Text>
            <Text style={styles.emptySubtext}>
              Pull down to refresh or wait for new ride requests
            </Text>
          </Card>
        )}
      </ScrollView>

      {/* OTP Verification Modal */}
      {activeRide && (
        <OTPVerificationModal
          visible={showOTPModal}
          rideId={activeRide.id}
          onVerified={handleOTPVerified}
          onClose={() => setShowOTPModal(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  otpCard: {
    marginTop: Spacing.md,
    backgroundColor: Colors.card,
  },
  otpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  otpTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  otpSubtext: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  actions: {
    marginTop: Spacing.lg,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
