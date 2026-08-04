import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverEnhancedApi } from '../src/api/driver-enhanced';
import { OTPVerificationModal } from '../src/components/OTPVerificationModal';
import { EnhancedRideCard } from '../src/components/EnhancedRideCard';
import { Button } from '../src/components/common/Button';
import { Card } from '../src/components/common/Card';
import { Colors, Spacing, FontSizes, FontWeights } from '../src/constants/theme';
import { EnhancedRide } from '../src/types/enhanced';

export default function RidesEnhancedScreen() {
  const [availableRides, setAvailableRides] = useState<EnhancedRide[]>([]);
  const [activeRide, setActiveRide] = useState<EnhancedRide | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);

  useEffect(() => {
    loadRides();
    // Poll every 10 seconds for updates
    const interval = setInterval(loadRides, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadRides = async () => {
    try {
      setIsLoading(true);

      // Try to get active ride first
      try {
        const active = await driverEnhancedApi.getActiveRide();
        setActiveRide(active);
        setAvailableRides([]);
      } catch (error: any) {
        // No active ride, get available rides
        if (error.response?.status === 404) {
          const available = await driverEnhancedApi.getAvailableRides();
          setAvailableRides(available);
          setActiveRide(null);
        }
      }
    } catch (error) {
      console.error('Error loading rides:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadRides();
  };

  const handleAcceptRide = async (rideId: string) => {
    try {
      const ride = await driverEnhancedApi.acceptRide(rideId);
      setActiveRide(ride);
      setAvailableRides([]);
      Alert.alert('Success', 'Ride accepted! Now verify OTP to start.');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to accept ride');
    }
  };

  const handleRejectRide = async (rideId: string) => {
    try {
      await driverEnhancedApi.rejectRide(rideId);
      loadRides();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to reject ride');
    }
  };

  const handleVerifyOTP = () => {
    setShowOTPModal(true);
  };

  const handleOTPVerified = async () => {
    setShowOTPModal(false);
    loadRides();
    Alert.alert('OTP Verified', 'You can now start the ride');
  };

  const handleStartRide = async () => {
    if (!activeRide) return;

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
      Alert.alert('Error', error.response?.data?.detail || 'Failed to start ride');
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
              loadRides();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to complete ride');
            }
          },
        },
      ]
    );
  };

  if (isLoading && !isRefreshing) {
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
        <Text style={styles.headerTitle}>
          {activeRide ? 'Active Ride' : 'Available Rides'}
        </Text>
        {availableRides.length > 0 && (
          <Text style={styles.headerSubtitle}>{availableRides.length} rides available</Text>
        )}
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
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
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
