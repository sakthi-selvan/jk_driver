import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { driverEnhancedApi } from '../src/api/driver-enhanced';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../src/constants/theme';
import { EnhancedRide } from '../src/types/enhanced';
import { sameRideListUi } from '../src/utils/stableUpdate';

function formatWhen(iso?: string) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function statusColor(status: string) {
  if (status === 'completed') return '#10B981';
  if (status === 'cancelled') return '#EF4444';
  return Colors.primary;
}

export default function RideHistoryScreen() {
  const [rides, setRides] = useState<EnhancedRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async (soft = false) => {
    try {
      if (!soft) setLoading(true);
      const data = await driverEnhancedApi.getRideHistory();
      const next = Array.isArray(data) ? data : [];
      setRides((prev) => (sameRideListUi(prev, next) ? prev : next));
    } catch {
      if (!soft) setRides([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Soft reload on focus — keep list visible, refresh in background
      load(true);
    }, [load])
  );

  const renderItem = ({ item }: { item: EnhancedRide }) => {
    const open = expandedId === item.id;
    const customer =
      (item as any).customer_name ||
      item.customer?.name ||
      item.passenger_name ||
      'Customer';
    const phone =
      (item as any).customer_phone ||
      item.customer?.phone ||
      item.passenger_phone ||
      '';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => setExpandedId(open ? null : item.id)}
      >
        <View style={styles.cardTop}>
          <View style={[styles.statusPill, { backgroundColor: statusColor(item.status) + '22' }]}>
            <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
              {item.status}
            </Text>
          </View>
          <Text style={styles.fare}>₹{Math.round(item.fare || 0)}</Text>
        </View>

        <Text style={styles.when}>{formatWhen(item.created_at)}</Text>
        <Text style={styles.customer}>{customer}{phone ? ` · ${phone}` : ''}</Text>

        <View style={styles.locRow}>
          <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.locText} numberOfLines={open ? 3 : 1}>
            {String(item.pickup_location || 'Pickup')}
          </Text>
        </View>
        {item.dropoff_location ? (
          <View style={styles.locRow}>
            <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.locText} numberOfLines={open ? 3 : 1}>
              {String(item.dropoff_location)}
            </Text>
          </View>
        ) : null}

        {open ? (
          <View style={styles.details}>
            <Detail label="Trip" value={(item.trip_type || '—').replace(/_/g, ' ')} />
            <Detail label="Vehicle" value={item.vehicle_category || '—'} />
            <Detail label="Distance" value={`${Number(item.distance_km || 0).toFixed(1)} km`} />
            <Detail label="Payment" value={item.payment_method || '—'} />
            <Detail label="Payment status" value={item.payment_status || '—'} />
            {(item as any).cancellation_reason ? (
              <Detail label="Cancel reason" value={String((item as any).cancellation_reason)} />
            ) : null}
            <Detail label="Ride ID" value={String(item.id)} />
          </View>
        ) : (
          <Text style={styles.tapHint}>Tap for more details</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Ride History</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && rides.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(true);
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="time-outline" size={40} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No ride history yet</Text>
              <Text style={styles.emptySub}>Completed and cancelled trips will show here.</Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFF',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  list: { padding: Spacing.md, paddingBottom: 40, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginTop: 8 },
  emptySub: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },
  card: {
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  fare: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  when: { marginTop: 8, fontSize: 12, color: '#64748B' },
  customer: { marginTop: 2, fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 8 },
  locRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, marginRight: 8 },
  locText: { flex: 1, fontSize: 13, color: '#334155', lineHeight: 18 },
  tapHint: { marginTop: 8, fontSize: 12, color: '#94A3B8' },
  details: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  detailLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  detailValue: { flex: 1, textAlign: 'right', fontSize: 12, color: '#0F172A', textTransform: 'capitalize' },
});
