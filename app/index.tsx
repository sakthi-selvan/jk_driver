import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import Mapbox from '@rnmapbox/maps';
import { useAuthStore } from '../src/store/authStore';
import { useStatusStore } from '../src/store/statusStore';
import { driverEnhancedApi } from '../src/api/driver-enhanced';
import { OTPVerificationModal } from '../src/components/OTPVerificationModal';
import { DriverDrawer } from '../src/components/DriverDrawer';
import { CancelRideModal } from '../src/components/CancelRideModal';
import { PaymentCollectionModal } from '../src/components/PaymentCollectionModal';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../src/constants/theme';
import { EnhancedRide } from '../src/types/enhanced';
import { MAPBOX_ACCESS_TOKEN, MAP_STYLES, ANIMATION_DURATION } from '../src/config/mapbox-config';
import { driverLocationService } from '../src/services/locationTracking';
import { rideRealtime } from '../src/services/realtime';
import { RouteProgressLayers } from '../src/components/map/RouteProgressLayers';
import {
  estimateRemainingMinutes,
  remainingDistanceMeters,
  splitRouteProgress,
  type LngLat,
} from '../src/utils/routeProgress';
import { BottomNav } from '../src/components/navigation/BottomNav';

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { driver, logout } = useAuthStore();
  const { isOnline, toggleStatus, isUpdating, fetchCurrentStatus } = useStatusStore();
  const insets = useSafeAreaInsets();

  const [drawerOpen, setDrawerOpen] = useState(false);

  const [activeRide, setActiveRide] = useState<EnhancedRide | null>(null);
  const [availableRides, setAvailableRides] = useState<EnhancedRide[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [completedRideFare, setCompletedRideFare] = useState(0);
  const [completedRideId, setCompletedRideId] = useState('');

  // Map state — keep full polyline; progress dims travelled vs remaining (Google Maps style)
  const [driverLoc, setDriverLoc] = useState({ latitude: 12.9716, longitude: 77.5946 });
  const [routeCoords, setRouteCoords] = useState<LngLat[] | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [userHeading, setUserHeading] = useState(0);
  const [followUser, setFollowUser] = useState(true);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
  const hasInitializedCameraRef = useRef(false);
  const rejectedRideIdsRef = useRef<Set<string>>(new Set());
  const fetchingRouteRef = useRef(false);
  const lastRerouteAtRef = useRef(0);

  // Initialize location and fetch current online status from server
  useEffect(() => {
    initLocation();
    fetchCurrentStatus();
  }, []);

  // Ride polling and location push when online
  useEffect(() => {
    if (isOnline) {
      loadRides();
      startLocationPush();
      const token = useAuthStore.getState().accessToken;
      if (token) {
        rideRealtime.connect(token, activeRide?.id || null);
        const unsub = rideRealtime.onEvent((event, data) => {
          if (
            event === 'ride_offer' ||
            event === 'ride_created' ||
            event === 'ride_accepted' ||
            event === 'ride_cancelled' ||
            event === 'ride_reassigned' ||
            event === 'ride_taken' ||
            event === 'offer_expired'
          ) {
            if (event === 'ride_taken' || event === 'offer_expired') {
              const takenId = data?.ride_id;
              if (takenId) {
                setAvailableRides((prev) => prev.filter((r) => String(r.id) !== String(takenId)));
              }
            }
            loadRides();
          }
        });
        const interval = setInterval(loadRides, 15000); // slower poll; WS wakes sooner
        return () => {
          clearInterval(interval);
          unsub();
          rideRealtime.disconnect();
          stopLocationPush();
        };
      }
      const interval = setInterval(loadRides, 8000);
      return () => {
        clearInterval(interval);
        stopLocationPush();
      };
    } else {
      setActiveRide(null);
      setAvailableRides([]);
      stopLocationPush();
      rideRealtime.disconnect();
    }
  }, [isOnline]);

  useEffect(() => {
    driverLocationService.setActiveRideId(activeRide?.id || null);
    if (activeRide?.id) {
      rideRealtime.subscribeRide(activeRide.id);
    }
  }, [activeRide?.id]);

  // Route tracking when active ride
  useEffect(() => {
    if (activeRide && (activeRide.status === 'accepted' || activeRide.status === 'started')) {
      hasInitializedCameraRef.current = false;
      setFollowUser(true);
      fetchRoute(true);
      setTimeout(() => {
        hasInitializedCameraRef.current = true;
        setFollowUser(true);
      }, 3000);
    } else {
      setRouteCoords(null);
      setRouteInfo(null);
      hasInitializedCameraRef.current = false;
      setFollowUser(true);
    }
  }, [activeRide?.status, activeRide?.id]);

  // Off-route → refetch Directions; on-route → progress split only (no full redraw)
  useEffect(() => {
    if (!activeRide || !routeCoords || !hasInitializedCameraRef.current) return;
    const split = splitRouteProgress(routeCoords, driverLoc);
    if (!split?.offRoute) return;
    const now = Date.now();
    if (now - lastRerouteAtRef.current < 8000) return;
    lastRerouteAtRef.current = now;
    fetchRoute(false);
  }, [driverLoc.latitude, driverLoc.longitude, routeCoords, activeRide?.id]);

  const initLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setDriverLoc({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      if (loc.coords.heading !== null && loc.coords.heading !== undefined) {
        setUserHeading(loc.coords.heading);
      }
    } catch {}
  };

  const startLocationPush = () => {
    driverLocationService.setActiveRideId(activeRide?.id || null);
    driverLocationService.start().catch(() => undefined);
    // Smooth nav UI: high-frequency local GPS for route progress
    if (!locationWatchRef.current) {
      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 4,
        },
        (loc) => {
          setDriverLoc({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          if (loc.coords.heading != null) {
            setUserHeading(loc.coords.heading);
          }
        }
      ).then((sub) => {
        locationWatchRef.current = sub;
      }).catch(() => undefined);
    }
    if (locationIntervalRef.current) return;
    const push = async () => {
      try {
        await driverLocationService.pushOnce();
      } catch {}
    };
    push();
    locationIntervalRef.current = setInterval(push, 10000);
  };

  const stopLocationPush = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    if (locationWatchRef.current) {
      locationWatchRef.current.remove();
      locationWatchRef.current = null;
    }
    driverLocationService.stop().catch(() => undefined);
  };

  const fetchRoute = async (fitCamera: boolean = false) => {
    if (!activeRide || fetchingRouteRef.current) return;
    fetchingRouteRef.current = true;
    try {
      let destLat: number, destLng: number;
      if (activeRide.status === 'accepted') {
        destLat = activeRide.pickup_lat;
        destLng = activeRide.pickup_lng;
      } else {
        destLat = activeRide.dropoff_lat || activeRide.pickup_lat;
        destLng = activeRide.dropoff_lng || activeRide.pickup_lng;
      }

      const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${driverLoc.longitude},${driverLoc.latitude};${destLng},${destLat}?geometries=geojson&overview=full&access_token=${MAPBOX_ACCESS_TOKEN}`;

      const resp = await fetch(url);
      const data = await resp.json();

      if (data.routes?.[0]) {
        const route = data.routes[0];
        setRouteCoords(route.geometry.coordinates as LngLat[]);
        setRouteInfo({
          distance: route.distance / 1000,
          duration: route.duration / 60,
        });

        if (cameraRef.current && fitCamera) {
          const coords = route.geometry.coordinates as LngLat[];
          const lngs = coords.map((c) => c[0]);
          const lats = coords.map((c) => c[1]);
          const ne = [Math.max(...lngs), Math.max(...lats)];
          const sw = [Math.min(...lngs), Math.min(...lats)];
          cameraRef.current.fitBounds(ne, sw, [100, 60, 300, 60], 1500);
        }
      }
    } catch (error) {
      console.log('Error fetching route:', error);
    } finally {
      fetchingRouteRef.current = false;
    }
  };

  const loadRides = async () => {
    try {
      const active = await driverEnhancedApi.getActiveRide();
      setActiveRide(active);
      setAvailableRides([]);
    } catch (e: any) {
      if (e.response?.status === 404) {
        setActiveRide(null);
        // No active ride - fetch available rides (exclude locally rejected ones)
        try {
          const available = await driverEnhancedApi.getAvailableRides();
          const filtered = available.filter((r: any) => !rejectedRideIdsRef.current.has(r.id));
          setAvailableRides(filtered);
        } catch {
          setAvailableRides([]);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptRide = async (rideId: string) => {
    try {
      const ride = await driverEnhancedApi.acceptRide(rideId);
      setActiveRide(ride);
      setAvailableRides([]);
    } catch (e: any) {
      if (e.response?.status === 409) {
        Alert.alert('Already Taken', 'This ride was accepted by another driver.');
      } else {
        Alert.alert('Error', e.response?.data?.detail || 'Failed to accept ride');
      }
      loadRides();
    }
  };

  const handleRejectRide = async (rideId: string) => {
    // Track locally so it doesn't reappear on next poll
    rejectedRideIdsRef.current.add(rideId);
    setAvailableRides(prev => prev.filter(r => r.id !== rideId));

    // Tell backend so it won't show this ride to this driver again
    try {
      await driverEnhancedApi.declineRide(rideId);
    } catch {
      // Ignore errors - local tracking is enough
    }
  };

  const handleToggleStatus = async () => {
    if (isOnline && activeRide) {
      Alert.alert('Cannot Go Offline', 'Complete your active ride first.');
      return;
    }

    Alert.alert(
      isOnline ? 'Go Offline?' : 'Go Online?',
      isOnline
        ? 'You will stop receiving ride requests.'
        : 'You will start receiving ride requests.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isOnline ? 'Go Offline' : 'Go Online',
          onPress: async () => {
            try {
              await toggleStatus();
            } catch {
              Alert.alert('Error', 'Failed to update status.');
            }
          }
        },
      ]
    );
  };

  const handleVerifyOTP = () => setShowOTPModal(true);

  const handleOTPVerified = () => {
    setShowOTPModal(false);
    loadRides();
  };

  const handleStartRide = async () => {
    if (!activeRide) return;
    if (!activeRide.otp_verified) {
      setShowOTPModal(true);
      return;
    }
    try {
      const ride = await driverEnhancedApi.startRide(activeRide.id);
      setActiveRide(ride);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to start ride');
    }
  };

  const showPaymentCollection = (rideId: string, fare: number) => {
    setCompletedRideId(rideId);
    setCompletedRideFare(fare);
    setShowPaymentModal(true);
  };

  const handlePaymentComplete = () => {
    setShowPaymentModal(false);
    setActiveRide(null);
    setRouteCoords(null);
    loadRides();
  };

  const handleCompleteRide = async () => {
    if (!activeRide) return;
    Alert.alert('Complete Ride', 'Have you reached the destination?', [
      { text: 'Not Yet', style: 'cancel' },
      { text: 'Yes, Complete', onPress: async () => {
        try {
          await driverEnhancedApi.completeRide(activeRide.id);
          showPaymentCollection(activeRide.id, activeRide.fare);
        } catch (e: any) {
          const detail = e.response?.data?.detail || 'Failed to complete';
          Alert.alert('Cannot Complete', detail);
        }
      }},
    ]);
  };

  const handleNavigate = () => {
    if (!activeRide) return;
    const lat = activeRide.status === 'accepted' ? activeRide.pickup_lat : (activeRide.dropoff_lat || activeRide.pickup_lat);
    const lng = activeRide.status === 'accepted' ? activeRide.pickup_lng : (activeRide.dropoff_lng || activeRide.pickup_lng);
    const url = Platform.select({
      ios: `maps://app?daddr=${lat},${lng}`,
      android: `google.navigation:q=${lat},${lng}`,
    });
    if (url) Linking.openURL(url).catch(() => {});
  };

  const handleCallCustomer = () => {
    if (!activeRide) return;
    const phoneNumber = (activeRide as any).customer_phone || activeRide.customer?.phone || activeRide.passenger_phone || '';
    if (!phoneNumber) {
      Alert.alert('Error', 'Customer phone number not available');
      return;
    }
    const phoneUrl = Platform.select({
      ios: `telprompt:${phoneNumber}`,
      android: `tel:${phoneNumber}`,
    });
    if (phoneUrl) {
      Linking.openURL(phoneUrl).catch(() => {
        Alert.alert('Error', 'Unable to make call');
      });
    }
  };

  const handleCancelRide = () => {
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async (reason: string, customReason?: string) => {
    if (!activeRide) return;
    try {
      await driverEnhancedApi.cancelRide(activeRide.id, reason, customReason);

      // Clear ride state immediately
      setShowCancelModal(false);
      setActiveRide(null);
      setRouteCoords(null);
      setRouteInfo(null);

      Alert.alert('Ride Cancelled', 'The ride has been cancelled successfully.');

      // Reload rides after a short delay to allow backend to process
      setTimeout(() => {
        loadRides();
      }, 500);
    } catch (e: any) {
      // If it's a 404, the ride was already cancelled/doesn't exist
      if (e.response?.status === 404) {
        setShowCancelModal(false);
        setActiveRide(null);
        setRouteCoords(null);
        setRouteInfo(null);
        Alert.alert('Ride Cancelled', 'The ride has been cancelled.');
        setTimeout(() => loadRides(), 500);
      } else {
        Alert.alert('Error', e.response?.data?.detail || 'Failed to cancel ride');
        throw e;
      }
    }
  };

  // Google Maps progress: grey behind, blue ahead
  const progress = routeCoords
    ? splitRouteProgress(routeCoords, driverLoc)
    : null;
  const travelledCoords = progress && progress.travelled.length >= 2 ? progress.travelled : null;
  const remainingCoords =
    progress && progress.remaining.length >= 2
      ? progress.remaining
      : routeCoords;

  const liveRouteInfo = (() => {
    if (!routeInfo || !progress) return routeInfo;
    const remKm = remainingDistanceMeters(progress.remaining) / 1000;
    const remMin = estimateRemainingMinutes(routeInfo.duration, progress.fraction);
    return { distance: remKm, duration: remMin };
  })();

  // Overview handler: show full route
  const handleOverview = () => {
    if (!routeCoords || !cameraRef.current) return;
    setFollowUser(false);
    const lngs = routeCoords.map((c) => c[0]);
    const lats = routeCoords.map((c) => c[1]);
    const ne = [Math.max(...lngs), Math.max(...lats)];
    const sw = [Math.min(...lngs), Math.min(...lats)];
    cameraRef.current.fitBounds(ne, sw, [150, 80, 320, 80], 1500);
  };

  // Recenter handler: follow driver
  const handleRecenter = () => {
    setFollowUser(true);
    if (cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [driverLoc.longitude, driverLoc.latitude],
        zoomLevel: 16,
        pitch: activeRide ? 60 : 0,
        heading: activeRide ? userHeading : 0,
        animationDuration: 1000,
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Map - Google Maps style */}
      <Mapbox.MapView
        style={styles.map}
        styleURL="mapbox://styles/mapbox/streets-v12"
        compassEnabled={false}
        attributionEnabled={true}
        logoEnabled={false}
        onTouchStart={() => setFollowUser(false)}
      >
        <Mapbox.Camera
          ref={cameraRef}
          zoomLevel={16}
          centerCoordinate={[driverLoc.longitude, driverLoc.latitude]}
          animationDuration={800}
          followUserLocation={followUser}
          followUserMode={followUser && activeRide ? "course" : "normal"}
          followZoomLevel={followUser && activeRide ? 17 : 15}
          followPitch={followUser && activeRide ? 50 : 0}
        />

        {/* Blue dot with direction arrow */}
        <Mapbox.LocationPuck
          puckBearingEnabled
          puckBearing="course"
        />

        {/* Google Maps–style route progress: grey travelled + blue remaining */}
        <RouteProgressLayers
          travelled={travelledCoords}
          remaining={remainingCoords}
          idPrefix="driver-home"
        />

        {/* Pickup marker */}
        {activeRide && activeRide.status === 'accepted' && (
          <Mapbox.PointAnnotation
            id="pickupPin"
            coordinate={[activeRide.pickup_lng, activeRide.pickup_lat]}
          >
            <View style={styles.gmapPin}>
              <View style={[styles.gmapPinDot, { backgroundColor: '#0F9D58' }]} />
            </View>
          </Mapbox.PointAnnotation>
        )}

        {/* Dropoff marker */}
        {activeRide && activeRide.status === 'started' && activeRide.dropoff_lat && activeRide.dropoff_lng && (
          <Mapbox.PointAnnotation
            id="dropoffPin"
            coordinate={[activeRide.dropoff_lng, activeRide.dropoff_lat]}
          >
            <View style={styles.gmapPin}>
              <View style={[styles.gmapPinDot, { backgroundColor: '#EA4335' }]} />
            </View>
          </Mapbox.PointAnnotation>
        )}
      </Mapbox.MapView>

      {/* Map Control Buttons - Right side */}
      <View style={[styles.mapControls, { bottom: activeRide ? 300 : 80 }]}>
        {/* Overview button - show full route */}
        {activeRide && routeCoords && (
          <TouchableOpacity style={styles.mapControlBtn} onPress={handleOverview}>
            <Ionicons name="expand" size={22} color="#333" />
          </TouchableOpacity>
        )}
        {/* Recenter button - follow driver */}
        {!followUser && (
          <TouchableOpacity style={styles.mapControlBtn} onPress={handleRecenter}>
            <Ionicons name="navigate" size={22} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Hamburger Menu Button - Top Left */}
      <TouchableOpacity
        style={[styles.hamburgerBtn, { top: insets.top + 12, left: 16 }]}
        onPress={() => setDrawerOpen(true)}
      >
        <Ionicons name="menu" size={28} color="#333" />
      </TouchableOpacity>

      {/* Transparent Status Badge - Top Center (Always visible) */}
      <TouchableOpacity
        style={[styles.transparentStatusBadge, { top: insets.top + 12 }]}
        onPress={handleToggleStatus}
        disabled={isUpdating}
        activeOpacity={0.7}
      >
        <View style={[styles.statusBadgeDot, isOnline && styles.statusBadgeDotActive]} />
        <Text style={[styles.statusBadgeText, isOnline && styles.statusBadgeTextActive]}>
          {isUpdating ? 'Updating...' : isOnline ? 'Online' : 'Offline'}
        </Text>
      </TouchableOpacity>

      {/* Offline overlay */}
      {!isOnline && (
        <View style={styles.offlineOverlay}>
          <View style={styles.offlineCard}>
            <Ionicons name="moon-outline" size={36} color="#666" />
            <Text style={styles.offlineTitle}>You are Offline</Text>
            <Text style={styles.offlineSubtext}>Go online to receive ride requests</Text>
            <TouchableOpacity style={styles.goOnlineBtn} onPress={handleToggleStatus}>
              <Text style={styles.goOnlineBtnText}>Go Online</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}


      {/* Active ride bottom panel - scrollable, compact */}
      {activeRide && (
        <View style={[styles.activeRidePanel, { paddingBottom: insets.bottom + 8 }]}>
          {/* Drag handle */}
          <View style={styles.dragHandle} />

          <ScrollView
            style={styles.panelScroll}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            bounces={false}
          >
            {/* Route Info - Distance & Time */}
            {liveRouteInfo && (
              <View style={styles.rideRouteInfo}>
                <Ionicons name="navigate" size={16} color="#1A73E8" />
                <Text style={styles.rideRouteText}>
                  {liveRouteInfo.distance.toFixed(1)} km • {Math.ceil(liveRouteInfo.duration)} min
                </Text>
                <Text style={styles.rideRouteTo}>
                  {activeRide.status === 'accepted' ? 'to pickup' : 'to dropoff'}
                </Text>
              </View>
            )}

            {/* Status banner */}
            <View style={styles.statusBanner}>
              <View style={[styles.statusDot, {
                backgroundColor: activeRide.status === 'accepted' ? '#3B82F6' : '#8B5CF6'
              }]} />
              <Text style={styles.statusText}>
                {activeRide.status === 'accepted'
                  ? (activeRide.otp_verified ? 'Ready to Start' : 'Heading to Pickup')
                  : 'Trip In Progress'}
              </Text>
            </View>

            {/* Customer info with name and call button */}
            <View style={styles.customerSection}>
              <View style={styles.customerRow}>
                <View style={styles.customerAvatar}>
                  <Ionicons name="person" size={18} color="#FFF" />
                </View>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>
                    {activeRide.booking_for_self === false && activeRide.passenger_name
                      ? activeRide.passenger_name
                      : (activeRide as any).customer_name || activeRide.customer?.name || 'Customer'}
                  </Text>
                  <Text style={styles.customerMeta}>
                    {activeRide.payment_method === 'cash' ? 'Cash' : 'Online'} • ₹{Math.round(activeRide.fare)}
                  </Text>
                </View>
                <TouchableOpacity style={styles.callBtn} onPress={handleCallCustomer}>
                  <Ionicons name="call" size={18} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.navBtn} onPress={handleNavigate}>
                  <Ionicons name="navigate" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Location summary */}
            <View style={styles.activeLocations}>
              {activeRide.status === 'accepted' && (
                <View style={styles.activeLocRow}>
                  <View style={[styles.locDot, { backgroundColor: '#4CAF50' }]} />
                  <Text style={styles.activeLocText} numberOfLines={1}>{String(activeRide.pickup_location)}</Text>
                </View>
              )}
              {activeRide.status === 'started' && activeRide.dropoff_location && (
                <View style={styles.activeLocRow}>
                  <View style={[styles.locDot, { backgroundColor: '#F44336' }]} />
                  <Text style={styles.activeLocText} numberOfLines={1}>{String(activeRide.dropoff_location)}</Text>
                </View>
              )}
            </View>

            {/* Action buttons */}
            {activeRide.status === 'accepted' && !activeRide.otp_verified && (
              <>
                <TouchableOpacity style={styles.otpBtn} onPress={handleVerifyOTP}>
                  <Ionicons name="shield-checkmark" size={18} color="#FFF" />
                  <Text style={styles.otpBtnText}>Verify OTP</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelRide}>
                  <Ionicons name="close-circle" size={18} color="#EF4444" />
                  <Text style={styles.cancelBtnText}>Cancel Ride</Text>
                </TouchableOpacity>
              </>
            )}
            {activeRide.status === 'accepted' && activeRide.otp_verified && (
              <>
                <TouchableOpacity style={styles.startBtn} onPress={handleStartRide}>
                  <Ionicons name="play-circle" size={18} color="#FFF" />
                  <Text style={styles.startBtnText}>Start Ride</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelRide}>
                  <Ionicons name="close-circle" size={18} color="#EF4444" />
                  <Text style={styles.cancelBtnText}>Cancel Ride</Text>
                </TouchableOpacity>
              </>
            )}
            {activeRide.status === 'started' && (
              <TouchableOpacity style={styles.completeBtn} onPress={handleCompleteRide}>
                <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                <Text style={styles.completeBtnText}>End Ride</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}

      {/* Available Ride Card - shown when no active ride */}
      {isOnline && !activeRide && availableRides.length > 0 && (
        <View style={[styles.rideRequestCard, { bottom: insets.bottom + 16 }]}>
          <View style={styles.rideRequestHeader}>
            <View style={styles.rideRequestBadge}>
              <Ionicons name="car" size={14} color="#FFF" />
              <Text style={styles.rideRequestBadgeText}>
                {availableRides[0].distance_km?.toFixed(1)} km • {Math.round(availableRides[0].eta_minutes)} min
              </Text>
            </View>
            <Text style={styles.rideRequestFare}>₹{Math.round(availableRides[0].fare)}</Text>
          </View>

          <View style={styles.rideLocations}>
            <View style={styles.rideLocRow}>
              <View style={[styles.locDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.rideLocText} numberOfLines={1}>{String(availableRides[0].pickup_location)}</Text>
            </View>
            {availableRides[0].dropoff_location && (
              <View style={styles.rideLocRow}>
                <View style={[styles.locDot, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.rideLocText} numberOfLines={1}>{String(availableRides[0].dropoff_location)}</Text>
              </View>
            )}
          </View>

          <View style={styles.rideRequestMeta}>
            <Text style={styles.metaText}>{availableRides[0].vehicle_category}</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>{availableRides[0].trip_type?.replace('_', ' ')}</Text>
            {availableRides.length > 1 && (
              <>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.metaText}>{availableRides.length} rides available</Text>
              </>
            )}
          </View>

          <View style={styles.rideRequestActions}>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectRide(availableRides[0].id)}>
              <Ionicons name="close" size={22} color="#EF4444" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptRide(availableRides[0].id)}>
              <Ionicons name="checkmark" size={22} color="#FFF" />
              <Text style={styles.acceptBtnText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* No rides available indicator */}
      {isOnline && !activeRide && availableRides.length === 0 && (
        <View style={styles.noRideBadge}>
          <Text style={styles.noRideText}>Searching for rides...</Text>
        </View>
      )}

      {/* OTP Modal */}
      {activeRide && (
        <OTPVerificationModal
          visible={showOTPModal}
          rideId={activeRide.id}
          onVerified={handleOTPVerified}
          onClose={() => setShowOTPModal(false)}
        />
      )}

      {/* Cancel Ride Modal */}
      <CancelRideModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleConfirmCancel}
      />

      {/* Payment Collection Modal */}
      <PaymentCollectionModal
        visible={showPaymentModal}
        rideId={completedRideId}
        fare={completedRideFare}
        onComplete={handlePaymentComplete}
      />

      {/* Drawer Menu */}
      <DriverDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        isOnline={isOnline}
      />

      <BottomNav hidden={!!activeRide || !isOnline} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  // Map control buttons
  mapControls: {
    position: 'absolute',
    right: 16,
    gap: 10,
    zIndex: 100,
  },
  mapControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },

  // Google Maps style pin
  gmapPin: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gmapPinDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },

  // Hamburger button - top left
  hamburgerBtn: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 100,
  },

  // Transparent status badge - top center
  transparentStatusBadge: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusBadgeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#94A3B8',
    marginRight: 8,
  },
  statusBadgeDotActive: {
    backgroundColor: Colors.primary,
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  statusBadgeTextActive: {
    color: Colors.primaryDark,
  },


  // Route info

  // Offline
  offlineOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  offlineCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 32, alignItems: 'center', width: '100%', borderTopWidth: 4, borderTopColor: Colors.primary },
  offlineTitle: { fontSize: 22, fontWeight: '700', color: '#0F172A', marginTop: 12 },
  offlineSubtext: { fontSize: 14, color: '#64748B', marginTop: 4, textAlign: 'center' },
  goOnlineBtn: { backgroundColor: Colors.primary, paddingHorizontal: 36, paddingVertical: 14, borderRadius: 999, marginTop: 20 },
  goOnlineBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Ride request card
  rideRequestCard: { position: 'absolute', left: 16, right: 16, backgroundColor: '#FFF', borderRadius: 20, padding: 18, shadowColor: '#0F172A', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 12, borderTopWidth: 3, borderTopColor: Colors.primary },
  rideRequestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  rideRequestBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  rideRequestBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  rideRequestFare: { fontSize: 22, fontWeight: '700', color: Colors.primary },
  rideRequestLocations: { marginBottom: 10 },
  rideLocRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  locDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  rideLocText: { fontSize: 14, color: '#333', flex: 1 },
  rideRequestMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 6 },
  metaText: { fontSize: 12, color: '#666', textTransform: 'capitalize', marginLeft: 2 },
  metaDot: { marginHorizontal: 4, color: '#CCC' },
  rideRequestActions: { flexDirection: 'row', gap: 12 },
  rejectBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EF4444' },
  acceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, gap: 6 },
  acceptBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Active ride panel - compact, scrollable
  activeRidePanel: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: 280, backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 8, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 10, borderTopWidth: 3, borderTopColor: Colors.primary },

  // Panel scroll
  panelScroll: { flexGrow: 0 },

  // Drag handle
  dragHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#DDD', alignSelf: 'center', marginBottom: 10 },

  // Route info in bottom panel
  rideRouteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 10,
    gap: 5,
  },
  rideRouteText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A73E8',
  },
  rideRouteTo: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },

  statusBanner: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 13, fontWeight: '600', color: '#333' },

  // Customer section
  customerSection: { marginBottom: 10 },
  customerRow: { flexDirection: 'row', alignItems: 'center' },
  customerAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  customerInfo: { flex: 1, marginLeft: 10 },
  customerName: { fontSize: 15, fontWeight: '700', color: '#000', marginBottom: 2 },
  customerMeta: { fontSize: 12, color: '#666' },
  callBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  navBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },

  activeLocations: { marginBottom: 10 },
  activeLocRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  activeLocText: { fontSize: 12, color: '#333', flex: 1, marginLeft: 8 },

  // Action buttons
  otpBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F59E0B', borderRadius: 10, paddingVertical: 12, gap: 6, marginBottom: 6 },
  otpBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3B82F6', borderRadius: 10, paddingVertical: 12, gap: 6, marginBottom: 6 },
  startBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', borderRadius: 10, paddingVertical: 12, gap: 6 },
  completeBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: 10, paddingVertical: 12, gap: 6, borderWidth: 1.5, borderColor: '#EF4444' },
  cancelBtnText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },

  rideLocations: { marginBottom: 10 },
  noRideBadge: { position: 'absolute', bottom: 32, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  noRideText: { fontSize: 14, color: '#666', fontWeight: '600' },

});
