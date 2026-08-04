import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Card } from './common/Card';
import { Button } from './common/Button';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../constants/theme';
import { EnhancedRide } from '../types/enhanced';

interface RideCardProps {
  ride: EnhancedRide;
  showActions?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
}

export const RideCard: React.FC<RideCardProps> = ({
  ride,
  showActions = false,
  onAccept,
  onReject,
}) => {
  const handlePress = () => {
    // Note: ride-details screen should be added to app router
    // For now, this will navigate when the screen exists
    try {
      router.push(`/ride-details?id=${ride.id}` as any);
    } catch (error) {
      console.log('Navigation not available yet');
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Card style={styles.card} elevated>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.customerInfo}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={24} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.customerName}>{ride.passenger_name || ride.customer?.name || 'Customer'}</Text>
              <Text style={styles.customerPhone}>{ride.passenger_phone || ride.customer?.phone || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.fareContainer}>
            <Text style={styles.fareLabel}>Fare</Text>
            <Text style={styles.fareValue}>₹{ride.fare.toFixed(2)}</Text>
          </View>
        </View>

        {/* Locations */}
        <View style={styles.locations}>
          <View style={styles.locationRow}>
            <View style={[styles.locationDot, { backgroundColor: Colors.success }]} />
            <View style={styles.locationText}>
              <Text style={styles.locationLabel}>Pickup</Text>
              <Text style={styles.locationAddress} numberOfLines={1}>
                {typeof ride.pickup_location === 'string' ? ride.pickup_location : ride.pickup_location.address}
              </Text>
            </View>
          </View>

          <View style={styles.locationDivider} />

          <View style={styles.locationRow}>
            <View style={[styles.locationDot, { backgroundColor: Colors.error }]} />
            <View style={styles.locationText}>
              <Text style={styles.locationLabel}>Drop-off</Text>
              <Text style={styles.locationAddress} numberOfLines={1}>
                {ride.dropoff_location
                  ? typeof ride.dropoff_location === 'string'
                    ? ride.dropoff_location
                    : ride.dropoff_location.address
                  : 'Destination'}
              </Text>
            </View>
          </View>
        </View>

        {/* Trip Info */}
        <View style={styles.tripInfo}>
          <View style={styles.infoItem}>
            <Ionicons name="car-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoText}>{ride.vehicle_category || 'Standard'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="navigate-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoText}>{(ride.distance_km || ride.distance || 0).toFixed(1)} km</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoText}>{Math.round(ride.eta_minutes || 0)} min</Text>
          </View>
        </View>

        {/* Actions */}
        {showActions && onAccept && onReject && (
          <View style={styles.actions}>
            <Button
              title="Reject"
              variant="outline"
              size="small"
              onPress={onReject}
              style={styles.actionButton}
            />
            <Button
              title="Accept"
              size="small"
              onPress={onAccept}
              style={[styles.actionButton, { backgroundColor: Colors.success }]}
            />
          </View>
        )}

        {/* Status Badge */}
        {ride.status !== 'requested' && (
          <View style={[
            styles.statusBadge,
            ride.status === 'accepted' ? styles.acceptedBadge :
            ride.status === 'started' ? styles.startedBadge :
            ride.status === 'completed' ? styles.completedBadge :
            styles.acceptedBadge
          ]}>
            <Text style={styles.statusText}>{ride.status.toUpperCase()}</Text>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  customerName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  fareContainer: {
    alignItems: 'flex-end',
  },
  fareLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  fareValue: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  locations: {
    marginBottom: Spacing.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginRight: Spacing.sm,
  },
  locationText: {
    flex: 1,
  },
  locationLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: FontWeights.medium,
  },
  locationDivider: {
    height: 20,
    width: 2,
    backgroundColor: Colors.border,
    marginLeft: 4,
    marginVertical: Spacing.xs,
  },
  tripInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  acceptButton: {
    backgroundColor: Colors.success,
  },
  statusBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  acceptedBadge: {
    backgroundColor: Colors.success,
  },
  startedBadge: {
    backgroundColor: Colors.info,
  },
  completedBadge: {
    backgroundColor: Colors.textMuted,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
});
