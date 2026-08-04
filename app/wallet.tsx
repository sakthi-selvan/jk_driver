import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { driverEnhancedApi } from '../src/api/driver-enhanced';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../src/constants/theme';
import { BottomNav } from '../src/components/navigation/BottomNav';

interface EarningsData {
  today: { earnings: number; rides: number };
  week: { earnings: number; rides: number };
  month: { earnings: number; rides: number };
  total: { earnings: number; rides: number; average_fare: number };
}

export default function WalletScreen() {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'month' | 'total'>('today');

  useEffect(() => {
    loadEarnings();
  }, []);

  const loadEarnings = async () => {
    try {
      const data = await driverEnhancedApi.getEarnings();
      setEarnings(data);
    } catch (error) {
      console.log('Error loading earnings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEarnings();
  };

  const tabs = [
    { key: 'today' as const, label: 'Today' },
    { key: 'week' as const, label: 'This Week' },
    { key: 'month' as const, label: 'This Month' },
    { key: 'total' as const, label: 'All Time' },
  ];

  const currentData = earnings ? earnings[activeTab] : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet & Earnings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Earnings Card */}
        <View style={styles.earningsCard}>
          <Text style={styles.earningsLabel}>
            {activeTab === 'today' ? "Today's Earnings" :
             activeTab === 'week' ? 'This Week' :
             activeTab === 'month' ? 'This Month' : 'Total Earnings'}
          </Text>
          <Text style={styles.earningsAmount}>
            ₹{currentData?.earnings?.toFixed(2) || '0.00'}
          </Text>
          <View style={styles.earningsMetaRow}>
            <View style={styles.earningsMeta}>
              <Ionicons name="car" size={16} color="#FFF" />
              <Text style={styles.earningsMetaText}>{currentData?.rides || 0} rides</Text>
            </View>
            {earnings?.total?.average_fare ? (
              <View style={styles.earningsMeta}>
                <Ionicons name="trending-up" size={16} color="#FFF" />
                <Text style={styles.earningsMetaText}>Avg ₹{earnings.total.average_fare}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Cards */}
        {earnings && (
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Ionicons name="today" size={24} color="#F59E0B" />
              <Text style={styles.summaryAmount}>₹{earnings.today.earnings}</Text>
              <Text style={styles.summaryLabel}>Today</Text>
              <Text style={styles.summaryRides}>{earnings.today.rides} rides</Text>
            </View>

            <View style={styles.summaryCard}>
              <Ionicons name="calendar" size={24} color="#3B82F6" />
              <Text style={styles.summaryAmount}>₹{earnings.week.earnings}</Text>
              <Text style={styles.summaryLabel}>This Week</Text>
              <Text style={styles.summaryRides}>{earnings.week.rides} rides</Text>
            </View>

            <View style={styles.summaryCard}>
              <Ionicons name="calendar-outline" size={24} color="#10B981" />
              <Text style={styles.summaryAmount}>₹{earnings.month.earnings}</Text>
              <Text style={styles.summaryLabel}>This Month</Text>
              <Text style={styles.summaryRides}>{earnings.month.rides} rides</Text>
            </View>

            <View style={styles.summaryCard}>
              <Ionicons name="wallet" size={24} color="#8B5CF6" />
              <Text style={styles.summaryAmount}>₹{earnings.total.earnings}</Text>
              <Text style={styles.summaryLabel}>All Time</Text>
              <Text style={styles.summaryRides}>{earnings.total.rides} rides</Text>
            </View>
          </View>
        )}

        {/* Quick Stats */}
        {earnings && (
          <View style={styles.statsSection}>
            <Text style={styles.statsSectionTitle}>Quick Stats</Text>

            <View style={styles.statRow}>
              <View style={styles.statIcon}>
                <Ionicons name="speedometer" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.statLabel}>Average per ride</Text>
              <Text style={styles.statValue}>₹{earnings.total.average_fare || 0}</Text>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statIcon}>
                <Ionicons name="flash" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.statLabel}>Total trips completed</Text>
              <Text style={styles.statValue}>{earnings.total.rides}</Text>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statIcon}>
                <Ionicons name="trending-up" size={20} color="#10B981" />
              </View>
              <Text style={styles.statLabel}>Daily average (this month)</Text>
              <Text style={styles.statValue}>
                ₹{earnings.month.rides > 0 ? Math.round(earnings.month.earnings / Math.max(1, new Date().getDate())) : 0}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#E0E0E0',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  content: { flex: 1 },

  // Earnings hero card
  earningsCard: {
    margin: 16, padding: 24, borderRadius: 20,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  earningsLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  earningsAmount: { fontSize: 36, fontWeight: '800', color: '#FFF', marginTop: 4 },
  earningsMetaRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
  earningsMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  earningsMetaText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },

  // Tabs
  tabRow: { flexDirection: 'row', marginHorizontal: 16, gap: 8, marginBottom: 16 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0' },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#FFF' },

  // Summary grid
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 16 },
  summaryCard: {
    width: '47%', backgroundColor: '#FFF', borderRadius: 14, padding: 16,
    alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  summaryAmount: { fontSize: 18, fontWeight: '700', color: '#333', marginTop: 8 },
  summaryLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  summaryRides: { fontSize: 11, color: '#999', marginTop: 2 },

  // Stats section
  statsSection: { margin: 16, backgroundColor: '#FFF', borderRadius: 14, padding: 16 },
  statsSectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
  statRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  statIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0F5FF',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  statLabel: { flex: 1, fontSize: 14, color: '#555' },
  statValue: { fontSize: 15, fontWeight: '700', color: '#333' },
});
