import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { formatApiError } from '../src/utils/apiError';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { DriverMapView } from '../src/components/map/DriverMapView';
import { Button } from '../src/components/common/Button';
import { Card } from '../src/components/common/Card';
import { driverEnhancedApi } from '../src/api/driver-enhanced';
import { useAuthStore } from '../src/store/authStore';
import { EnhancedRide } from '../src/types/enhanced';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../src/constants/theme';

export default function RideDetailsScreen() {
  const params = useLocalSearchParams();
  const rideId = params.id as string;
  const driverVehicleType = useAuthStore((s) => s.driver?.vehicle_type);

  const [ride, setRide] = useState<EnhancedRide | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadRideDetails = async () => {
      if (!rideId) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }
      try {
        const data = await driverEnhancedApi.getRideDetails(rideId);
        if (cancelled) return;
        setRide(data);
        setNotFound(false);
        // Stop polling once ride is finished
        if (data.status === 'completed' || data.status === 'cancelled') {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      } catch (error: any) {
        if (cancelled) return;
        const status = error?.response?.status;
        if (status === 404) {
          setNotFound(true);
          setRide(null);
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
        // Expected when ride was removed / never assigned — do not spam console.error
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    setIsLoading(true);
    setNotFound(false);
    loadRideDetails();
    startLocationTracking();

    pollRef.current = setInterval(loadRideDetails, 10000);
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
      locationWatchRef.current?.remove();
      locationWatchRef.current = null;
    };
  }, [rideId]);

  const startLocationTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    setDriverLocation({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    locationWatchRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      (loc) => {
        setDriverLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      }
    );
  };

  const handleCall = (phoneNumber: string) => {
    const phoneUrl = `tel:${phoneNumber}`;
    Linking.canOpenURL(phoneUrl).then((supported) => {
      if (supported) {
        Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Error', 'Phone calls are not supported on this device');
      }
    });
  };

  const handleNavigate = () => {
    if (!ride) return;

    const lat = ride.status === 'accepted' ? ride.pickup_lat : ride.dropoff_lat;
    const lng = ride.status === 'accepted' ? ride.pickup_lng : ride.dropoff_lng;

    if (!lat || !lng) {
      Alert.alert('Error', 'Location coordinates not available');
      return;
    }

    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}`,
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  const handleStartRide = async () => {
    if (!ride) return;

    try {
      const updatedRide = await driverEnhancedApi.startRide(ride.id);
      setRide(updatedRide);
      Alert.alert('Ride Started! 🚗', 'Drive safely to the destination');
    } catch (error: any) {
      Alert.alert('Error', formatApiError(error, 'Failed to start ride'));
    }
  };

  const handleCompleteRide = async () => {
    if (!ride) return;

    Alert.alert(
      'Complete Ride',
      'Have you reached the destination?',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Yes, Complete',
          onPress: async () => {
            try {
              await driverEnhancedApi.completeRide(ride.id);
              Alert.alert('Ride Completed! 🎉', 'Great job!', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error: any) {
              Alert.alert('Error', formatApiError(error, 'Failed to complete ride'));
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading ride details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (notFound || !ride) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ride Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="car-outline" size={48} color="#94A3B8" />
          <Text style={styles.missingTitle}>Ride not available</Text>
          <Text style={styles.missingSub}>
            This trip was cancelled or is no longer assigned to you.
          </Text>
          <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: 16 }} />
        </View>
      </SafeAreaView>
    );
  }

  const pickupLoc = typeof ride.pickup_location === 'string'
    ? { latitude: ride.pickup_lat, longitude: ride.pickup_lng, address: ride.pickup_location }
    : ride.pickup_location;

  const dropoffLoc = ride.dropoff_location && ride.dropoff_lat && ride.dropoff_lng
    ? typeof ride.dropoff_location === 'string'
      ? { latitude: ride.dropoff_lat, longitude: ride.dropoff_lng, address: ride.dropoff_location }
      : ride.dropoff_location
    : { latitude: ride.pickup_lat, longitude: ride.pickup_lng, address: 'Destination' };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride Details</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{ride.status.toUpperCase()}</Text>
        </View>
      </View>

      {/* Map View */}
      <View style={styles.mapContainer}>
        <DriverMapView
          pickup={pickupLoc}
          dropoff={dropoffLoc}
          driverLocation={driverLocation || undefined}
          vehicleType={(ride as any).vehicle_category || (ride as any).vehicle_type || driverVehicleType}
          showRoute
        />
      </View>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Customer Info */}
          <Card style={styles.customerCard}>
            <View style={styles.customerHeader}>
              <View style={styles.customerAvatar}>
                <Ionicons name="person" size={32} color={Colors.primary} />
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{ride.passenger_name || ride.customer?.name || 'Customer'}</Text>
                <Text style={styles.customerPhone}>{ride.passenger_phone || ride.customer?.phone || 'N/A'}</Text>
              </View>
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => handleCall(ride.passenger_phone || ride.customer?.phone || '')}
              >
                <Ionicons name="call" size={24} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </Card>

          {/* Trip Details */}
          <Card style={styles.tripCard}>
            <View style={styles.locationRow}>
              <View style={[styles.locationDot, { backgroundColor: Colors.success }]} />
              <View style={styles.locationContent}>
                <Text style={styles.locationLabel}>Pickup</Text>
                <Text style={styles.locationAddress}>{pickupLoc.address}</Text>
              </View>
            </View>

            <View style={styles.locationDivider} />

            <View style={styles.locationRow}>
              <View style={[styles.locationDot, { backgroundColor: Colors.error }]} />
              <View style={styles.locationContent}>
                <Text style={styles.locationLabel}>Drop-off</Text>
                <Text style={styles.locationAddress}>{dropoffLoc.address}</Text>
              </View>
            </View>
          </Card>

          {/* Ride Info */}
          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="car-outline" size={20} color={Colors.textSecondary} />
                <Text style={styles.infoLabel}>Vehicle</Text>
                <Text style={styles.infoValue}>{ride.vehicle_category || 'Standard'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="cash-outline" size={20} color={Colors.textSecondary} />
                <Text style={styles.infoLabel}>Fare</Text>
                <Text style={styles.infoValue}>₹{ride.fare.toFixed(2)}</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="time-outline" size={20} color={Colors.textSecondary} />
                <Text style={styles.infoLabel}>Distance</Text>
                <Text style={styles.infoValue}>{(ride.distance_km || ride.distance || 0).toFixed(1)} km</Text>
              </View>
            </View>
          </Card>

          {/* OTP Card (if not verified) */}
          {ride.status === 'accepted' && !ride.otp_verified && (
            <Card style={styles.otpCard}>
              <View style={styles.otpHeader}>
                <Ionicons name="lock-closed" size={24} color={Colors.warning} />
                <View style={styles.otpContent}>
                  <Text style={styles.otpTitle}>OTP Verification Required</Text>
                  <Text style={styles.otpText}>
                    Ask the customer for their 4-digit ride OTP, then enter it to start the trip.
                  </Text>
                </View>
              </View>
            </Card>
          )}

          {/* Action Buttons — only for live trips */}
          {(ride.status === 'accepted' || ride.status === 'started') && (
            <View style={styles.actions}>
              <Button
                title="Navigate"
                variant="outline"
                onPress={handleNavigate}
                style={styles.actionButton}
                icon={<Ionicons name="navigate" size={20} color={Colors.primary} />}
              />

              {ride.status === 'accepted' && ride.otp_verified && (
                <Button
                  title="Start Ride"
                  onPress={handleStartRide}
                  style={styles.actionButton}
                  icon={<Ionicons name="play-circle" size={20} color={Colors.white} />}
                />
              )}

              {ride.status === 'started' && (
                <Button
                  title="Complete Ride"
                  onPress={handleCompleteRide}
                  style={styles.actionButton}
                  icon={<Ionicons name="checkmark-circle" size={20} color={Colors.white} />}
                />
              )}
            </View>
          )}
        </ScrollView>
      </View>
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
    paddingHorizontal: Spacing.xl,
  },
  loadingText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  missingTitle: {
    marginTop: Spacing.md,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  missingSub: {
    marginTop: Spacing.xs,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    flex: 1,
    marginLeft: Spacing.md,
  },
  statusBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  mapContainer: {
    height: '40%',
  },
  bottomSheet: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginTop: -20,
  },
  customerCard: {
    marginBottom: Spacing.md,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  customerPhone: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripCard: {
    marginBottom: Spacing.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: Spacing.md,
  },
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  locationAddress: {
    fontSize: FontSizes.md,
    color: Colors.text,
    fontWeight: FontWeights.medium,
  },
  locationDivider: {
    height: 30,
    width: 2,
    backgroundColor: Colors.border,
    marginLeft: 5,
    marginVertical: Spacing.sm,
  },
  infoCard: {
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  infoValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  otpCard: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.warning,
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  otpContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  otpTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  otpText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  otpCode: {
    fontWeight: FontWeights.bold,
    color: Colors.warning,
    fontSize: FontSizes.lg,
  },
  actions: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
});
