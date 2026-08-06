import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { BottomNav } from '../src/components/navigation/BottomNav';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../src/constants/theme';

export default function ProfileScreen() {
  const { driver, logout, loadDriver } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDriver();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const MenuItem = ({
    icon,
    title,
    subtitle,
    onPress,
    iconColor,
    iconBg,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    iconColor?: string;
    iconBg?: string;
  }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIconContainer, { backgroundColor: iconBg || '#F0F9FF' }]}>
        <Ionicons name={icon} size={22} color={iconColor || Colors.primary} />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CCC" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(driver?.name || 'D').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{driver?.name || 'Captain'}</Text>
            <Text style={styles.profilePhone}>{driver?.phone || 'N/A'}</Text>
            <Text style={styles.profileMeta}>
              {[driver?.vehicle_type, driver?.vehicle_number, driver?.gender]
                .filter(Boolean)
                .join(' · ') || 'Complete your profile'}
            </Text>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={() => router.push('/edit-profile')}>
            <Ionicons name="create-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.menuSection}>
            <MenuItem
              icon="person-outline"
              title="Edit Profile"
              subtitle="Name, gender, vehicle photo & plate"
              onPress={() => router.push('/edit-profile')}
              iconColor="#8B5CF6"
              iconBg="#F3E8FF"
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="play-circle-outline"
              title="Ride flow preview"
              subtitle="Accept → pickup → OTP → complete (demo)"
              onPress={() => router.push('/ride-ui-preview')}
              iconColor="#0D9488"
              iconBg="#CCFBF1"
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="wallet-outline"
              title="Wallet & Earnings"
              subtitle="Trips, payouts, incentives"
              onPress={() => router.push('/wallet')}
              iconColor="#3B82F6"
              iconBg="#DBEAFE"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.menuSection}>
            <MenuItem
              icon="notifications-outline"
              title="Notifications"
              subtitle="Ride offers, SMS, earnings alerts"
              onPress={() => router.push('/notifications')}
              iconColor="#F59E0B"
              iconBg="#FEF3C7"
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="shield-outline"
              title="Privacy & Safety"
              subtitle="Location sharing, data controls"
              onPress={() => router.push('/privacy')}
              iconColor="#EF4444"
              iconBg="#FEE2E2"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.menuSection}>
            <MenuItem
              icon="help-circle-outline"
              title="Help Center"
              subtitle="FAQs for captains"
              onPress={() => router.push('/help-center')}
              iconColor="#8B5CF6"
              iconBg="#F3E8FF"
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="chatbubble-outline"
              title="Contact Support"
              subtitle="Chat with our team"
              onPress={() => router.push('/contact-support')}
              iconColor="#06B6D4"
              iconBg="#CFFAFE"
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="document-text-outline"
              title="Terms & Privacy Policy"
              subtitle="Legal information"
              onPress={() => router.push('/terms')}
              iconColor="#6B7280"
              iconBg="#F3F4F6"
            />
          </View>
        </View>

        <View style={styles.appInfoCard}>
          <Text style={styles.appName}>JK Taxi Captain</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: Colors.ink },
  scrollView: { flex: 1 },
  profileCard: {
    backgroundColor: '#FFF',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: FontWeights.bold, color: '#FFF' },
  profileInfo: { flex: 1, marginLeft: Spacing.md },
  profileName: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: Colors.ink },
  profilePhone: { fontSize: FontSizes.sm, color: Colors.inkSecondary, marginTop: 2 },
  profileMeta: { fontSize: FontSizes.xs, color: Colors.inkMuted, marginTop: 4 },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { marginTop: Spacing.lg, paddingHorizontal: Spacing.md },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  menuSection: {
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: { flex: 1, marginLeft: Spacing.md },
  menuTitle: { fontSize: FontSizes.md, fontWeight: FontWeights.semibold, color: Colors.ink },
  menuSubtitle: { fontSize: FontSizes.sm, color: Colors.inkMuted, marginTop: 2 },
  menuDivider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 72 },
  appInfoCard: { alignItems: 'center', marginTop: Spacing.xl, padding: Spacing.lg },
  appName: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: Colors.ink },
  appVersion: { fontSize: FontSizes.sm, color: Colors.inkMuted, marginTop: 4 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: '#FEE2E2',
    gap: 8,
  },
  logoutText: { fontSize: FontSizes.md, fontWeight: FontWeights.semibold, color: '#EF4444' },
});
