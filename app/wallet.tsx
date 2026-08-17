import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { driverEnhancedApi } from '../src/api/driver-enhanced';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../src/constants/theme';

interface EarningsData {
  today: { earnings: number; rides: number };
  week: { earnings: number; rides: number };
  month: { earnings: number; rides: number };
  total: { earnings: number; rides: number; average_fare: number };
}

type PeriodKey = 'today' | 'week' | 'month' | 'total';

const TABS: { key: PeriodKey; label: string; shortLabel: string }[] = [
  { key: 'today', label: 'Today', shortLabel: 'Today' },
  { key: 'week', label: 'This Week', shortLabel: 'Week' },
  { key: 'month', label: 'This Month', shortLabel: 'Month' },
  { key: 'total', label: 'All Time', shortLabel: 'All' },
];

function formatCurrency(value: number | undefined | null): string {
  const n = Number(value) || 0;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function periodTitle(key: PeriodKey): string {
  switch (key) {
    case 'today':
      return "Today's Earnings";
    case 'week':
      return 'This Week';
    case 'month':
      return 'This Month';
    default:
      return 'Total Earnings';
  }
}

export default function WalletScreen() {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<PeriodKey>('today');
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const summaryCardWidth = useMemo(() => {
    const horizontalPad = Spacing.md * 2;
    const gap = Spacing.sm;
    return Math.floor((screenWidth - horizontalPad - gap) / 2);
  }, [screenWidth]);

  const useShortTabLabels = screenWidth < 360;

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
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEarnings();
  };

  const currentData = earnings ? earnings[activeTab] : null;
  const dailyAvg =
    earnings && earnings.month.rides > 0
      ? Math.round(earnings.month.earnings / Math.max(1, new Date().getDate()))
      : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={Colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Wallet & Earnings
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.earningsCard}>
          <Text style={styles.earningsLabel}>{periodTitle(activeTab)}</Text>
          <Text style={styles.earningsAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
            {formatCurrency(currentData?.earnings)}
          </Text>
          <View style={styles.earningsMetaRow}>
            <View style={styles.earningsMeta}>
              <Ionicons name="car" size={16} color="#FFF" />
              <Text style={styles.earningsMetaText}>{currentData?.rides || 0} rides</Text>
            </View>
            {earnings?.total?.average_fare ? (
              <View style={styles.earningsMeta}>
                <Ionicons name="trending-up" size={16} color="#FFF" />
                <Text style={styles.earningsMetaText} numberOfLines={1}>
                  Avg {formatCurrency(earnings.total.average_fare)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
          style={styles.tabScroll}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
                  {useShortTabLabels ? tab.shortLabel : tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {earnings ? (
          <View style={styles.summaryGrid}>
            {(
              [
                { key: 'today', icon: 'today' as const, color: '#F59E0B', data: earnings.today },
                { key: 'week', icon: 'calendar' as const, color: '#3B82F6', data: earnings.week },
                { key: 'month', icon: 'calendar-outline' as const, color: '#10B981', data: earnings.month },
                { key: 'total', icon: 'wallet' as const, color: Colors.primary, data: earnings.total },
              ] as const
            ).map((item) => (
              <View key={item.key} style={[styles.summaryCard, { width: summaryCardWidth }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
                <Text style={styles.summaryAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {formatCurrency(item.data.earnings)}
                </Text>
                <Text style={styles.summaryLabel} numberOfLines={1}>
                  {TABS.find((t) => t.key === item.key)?.shortLabel}
                </Text>
                <Text style={styles.summaryRides}>{item.data.rides} rides</Text>
              </View>
            ))}
          </View>
        ) : null}

        {earnings ? (
          <View style={styles.statsSection}>
            <Text style={styles.statsSectionTitle}>Quick Stats</Text>

            <View style={styles.statRow}>
              <View style={styles.statIcon}>
                <Ionicons name="speedometer" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.statLabel} numberOfLines={2}>
                Average per ride
              </Text>
              <Text style={styles.statValue}>{formatCurrency(earnings.total.average_fare)}</Text>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statIcon}>
                <Ionicons name="flash" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.statLabel} numberOfLines={2}>
                Total trips completed
              </Text>
              <Text style={styles.statValue}>{earnings.total.rides}</Text>
            </View>

            <View style={[styles.statRow, styles.statRowLast]}>
              <View style={styles.statIcon}>
                <Ionicons name="trending-up" size={20} color="#10B981" />
              </View>
              <Text style={styles.statLabel} numberOfLines={2}>
                Daily average (this month)
              </Text>
              <Text style={styles.statValue}>{formatCurrency(dailyAvg)}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.ink,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  earningsCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  earningsLabel: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: FontWeights.medium,
  },
  earningsAmount: {
    fontSize: FontSizes.xxxl + 4,
    fontWeight: '800',
    color: Colors.white,
    marginTop: Spacing.xs,
  },
  earningsMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  earningsMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
  },
  earningsMetaText: {
    fontSize: FontSizes.xs + 1,
    color: 'rgba(255,255,255,0.92)',
    fontWeight: FontWeights.medium,
    flexShrink: 1,
  },
  tabScroll: {
    flexGrow: 0,
    marginTop: Spacing.md,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSizes.xs + 1,
    fontWeight: FontWeights.semibold,
    color: Colors.inkSecondary,
  },
  tabTextActive: {
    color: Colors.white,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    rowGap: Spacing.sm,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryAmount: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.ink,
    marginTop: Spacing.sm,
    width: '100%',
    textAlign: 'center',
  },
  summaryLabel: {
    fontSize: FontSizes.xs,
    color: Colors.inkSecondary,
    marginTop: Spacing.xs,
  },
  summaryRides: {
    fontSize: FontSizes.xs,
    color: Colors.inkMuted,
    marginTop: 2,
  },
  statsSection: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statsSectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.ink,
    marginBottom: Spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  statRowLast: {
    borderBottomWidth: 0,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statLabel: {
    flex: 1,
    flexShrink: 1,
    fontSize: FontSizes.sm,
    color: Colors.inkSecondary,
    marginRight: Spacing.xs,
  },
  statValue: {
    flexShrink: 0,
    fontSize: FontSizes.sm + 1,
    fontWeight: FontWeights.bold,
    color: Colors.ink,
    textAlign: 'right',
    maxWidth: '38%',
  },
});
