import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './common/Card';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../constants/theme';
import { EnhancedRide } from '../types/enhanced';

interface EnhancedRideCardProps {
  ride: EnhancedRide;
  onAccept?: () => void;
  onReject?: () => void;
  showActions?: boolean;
}

export const EnhancedRideCard: React.FC<EnhancedRideCardProps> = ({
  ride,
  onAccept,
  onReject,
  showActions = false,
}) => {
  const getTripTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      one_way: 'One Way',
      round_trip: 'Round Trip',
      rental: 'Rental',
      outstation: 'Outstation',
      airport_pickup: 'Airport Pickup',
      airport_drop: 'Airport Drop',
    };
    return labels[type] || type;
  };

  const getVehicleCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      mini: 'Mini',
      sedan: 'Sedan',
      suv: 'SUV',
      premium: 'Premium',
    };
    return labels[category] || category;
  };

  return (
    <Card elevated style={styles.card}>
      {/* Header with Trip Type and Vehicle */}
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{getTripTypeLabel(ride.trip_type)}</Text>
          </View>
          <View style={[styles.badge, styles.vehicleBadge]}>
            <Text style={styles.badgeText}>{getVehicleCategoryLabel(ride.vehicle_category)}</Text>
          </View>
        </View>
        <View style={styles.fareContainer}>
          <Text style={styles.fareAmount}>₹{ride.fare.toFixed(0)}</Text>
          <Text style={styles.fareLabel}>{ride.distance_km.toFixed(1)}km</Text>
        </View>
      </View>

      {typeof ride.offer_remaining_seconds === 'number' && (
        <View style={styles.offerTimer}>
          <Ionicons name="timer-outline" size={14} color={Colors.warning} />
          <Text style={styles.offerTimerText}>
            Offer expires in {Math.max(0, Math.ceil(ride.offer_remaining_seconds / 60))} min
          </Text>
        </View>
      )}

      {/* Passenger Info (if booking for someone else) */}
      {!ride.booking_for_self && (
        <View style={styles.passengerInfo}>
          <Ionicons name="person-circle-outline" size={20} color={Colors.warning} />
          <View style={styles.passengerDetails}>
            <Text style={styles.passengerLabel}>Passenger:</Text>
            <Text style={styles.passengerName}>{ride.passenger_name}</Text>
            <Text style={styles.passengerPhone}>{ride.passenger_phone}</Text>
          </View>
        </View>
      )}

      {/* Locations */}
      <View style={styles.locations}>
        <View style={styles.locationRow}>
          <Ionicons name="radio-button-on" size={16} color={Colors.success} />
          <Text style={styles.locationText} numberOfLines={1}>
            {typeof ride.pickup_location === 'string' ? ride.pickup_location : ride.pickup_location.address}
          </Text>
        </View>

        {ride.stops && ride.stops.length > 0 && (
          <View style={styles.stopsContainer}>
            <Ionicons name="ellipsis-vertical" size={16} color={Colors.textMuted} />
            <Text style={styles.stopsText}>{ride.stops.length} stop(s)</Text>
          </View>
        )}

        {ride.dropoff_location && (
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color={Colors.error} />
            <Text style={styles.locationText} numberOfLines={1}>
              {typeof ride.dropoff_location === 'string' ? ride.dropoff_location : ride.dropoff_location.address}
            </Text>
          </View>
        )}
      </View>

      {/* Preferences */}
      {Object.values(ride.preferences).some((v) => v) && (
        <View style={styles.preferences}>
          <Text style={styles.preferencesLabel}>Preferences:</Text>
          <View style={styles.preferencesRow}>
            {ride.preferences.ac_preferred && (
              <View style={styles.preferenceTag}>
                <Ionicons name="snow" size={12} color={Colors.primary} />
                <Text style={styles.preferenceText}>AC</Text>
              </View>
            )}
            {ride.preferences.pet_friendly && (
              <View style={styles.preferenceTag}>
                <Ionicons name="paw" size={12} color={Colors.primary} />
                <Text style={styles.preferenceText}>Pet</Text>
              </View>
            )}
            {ride.preferences.silent_ride && (
              <View style={styles.preferenceTag}>
                <Ionicons name="volume-mute" size={12} color={Colors.primary} />
                <Text style={styles.preferenceText}>Silent</Text>
              </View>
            )}
            {ride.preferences.extra_luggage && (
              <View style={styles.preferenceTag}>
                <Ionicons name="bag-handle" size={12} color={Colors.primary} />
                <Text style={styles.preferenceText}>Luggage</Text>
              </View>
            )}
            {ride.preferences.wheelchair_support && (
              <View style={styles.preferenceTag}>
                <Ionicons name="accessibility" size={12} color={Colors.primary} />
                <Text style={styles.preferenceText}>Wheelchair</Text>
              </View>
            )}
            {(ride.preferences as any).women_driver && (
              <View style={styles.preferenceTag}>
                <Ionicons name="woman" size={12} color={Colors.primary} />
                <Text style={styles.preferenceText}>Women</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Driver Notes */}
      {ride.driver_notes && (
        <View style={styles.notes}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.info} />
          <Text style={styles.notesText}>{ride.driver_notes}</Text>
        </View>
      )}

      {/* Passenger Notes */}
      {ride.passenger_notes && (
        <View style={styles.notes}>
          <Ionicons name="chatbox-outline" size={16} color={Colors.warning} />
          <Text style={styles.notesText}>{ride.passenger_notes}</Text>
        </View>
      )}

      {/* Scheduled */}
      {ride.is_scheduled && ride.scheduled_datetime && (
        <View style={styles.scheduled}>
          <Ionicons name="time-outline" size={16} color={Colors.warning} />
          <Text style={styles.scheduledText}>
            Scheduled: {new Date(ride.scheduled_datetime).toLocaleString()}
          </Text>
        </View>
      )}

      {/* Actions */}
      {showActions && (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={onReject}>
            <Text style={styles.rejectText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.acceptButton]} onPress={onAccept}>
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flex: 1,
  },
  badge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  vehicleBadge: {
    backgroundColor: Colors.info + '20',
  },
  badgeText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },
  fareContainer: {
    alignItems: 'flex-end',
  },
  fareAmount: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  fareLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  offerTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  offerTimerText: {
    fontSize: FontSizes.xs,
    color: Colors.warning,
    fontWeight: FontWeights.medium,
  },
  passengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '10',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  passengerDetails: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  passengerLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  passengerName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  passengerPhone: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  locations: {
    marginBottom: Spacing.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  locationText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  stopsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    marginBottom: Spacing.sm,
  },
  stopsText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginLeft: Spacing.xs,
    fontStyle: 'italic',
  },
  preferences: {
    marginBottom: Spacing.md,
  },
  preferencesLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  preferencesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  preferenceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  preferenceText: {
    fontSize: FontSizes.xs,
    color: Colors.text,
    marginLeft: 4,
  },
  notes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.card,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  notesText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  scheduled: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '10',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  scheduledText: {
    fontSize: FontSizes.sm,
    color: Colors.warning,
    marginLeft: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  actionButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: Colors.error + '20',
    borderWidth: 1,
    borderColor: Colors.error,
  },
  acceptButton: {
    backgroundColor: Colors.primary,
  },
  rejectText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.error,
  },
  acceptText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
});
