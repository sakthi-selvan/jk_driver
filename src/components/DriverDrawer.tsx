import React, { useRef } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity, ScrollView, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../constants/theme';

interface DriverDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
}

export const DriverDrawer: React.FC<DriverDrawerProps> = ({ isOpen, onClose, isOnline }) => {
  const { driver, logout } = useAuthStore();
  const slideAnim = useRef(new Animated.Value(320)).current;

  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isOpen ? 0 : 320,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [isOpen]);

  const handleLogout = async () => {
    onClose();
    await logout();
    router.replace('/login');
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        />
      )}

      {/* Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {(driver?.name || 'D').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{driver?.name || 'Driver'}</Text>
              <Text style={styles.userPhone}>{driver?.phone || ''}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={Colors.ink} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Status Info (Read-only when offline) */}
          <View style={[styles.statusCard, !isOnline && styles.statusCardDisabled]}>
            <View style={styles.statusHeader}>
              <Ionicons
                name={isOnline ? "radio-button-on" : "radio-button-off"}
                size={20}
                color={isOnline ? Colors.success : '#999'}
              />
              <Text style={[styles.statusLabel, !isOnline && styles.statusLabelDisabled]}>
                You are {isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
            {!isOnline && (
              <Text style={styles.statusSubtext}>
                Go online to receive ride requests and access features
              </Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MAIN MENU</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                router.push('/');
              }}
            >
              <View style={styles.menuItemIconContainer}>
                <Ionicons name="home" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.menuItemText}>Home</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                router.push('/rides-enhanced');
              }}
            >
              <View style={styles.menuItemIconContainer}>
                <Ionicons name="list" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.menuItemText}>My Rides</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                router.push('/edit-profile');
              }}
            >
              <View style={styles.menuItemIconContainer}>
                <Ionicons name="person" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.menuItemText}>Profile</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>OTHER</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                router.push('/wallet');
              }}
            >
              <View style={styles.menuItemIconContainer}>
                <Ionicons name="wallet" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.menuItemText}>Wallet & Earnings</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemIconContainer}>
                <Ionicons name="help-circle" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.menuItemText}>Help & Support</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemIconContainer}>
                <Ionicons name="settings" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.menuItemText}>Settings</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out" size={24} color="#E74C3C" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 9998,
  },
  drawer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 320,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  header: {
    backgroundColor: Colors.primarySoft,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  userAvatarText: {
    fontSize: 24,
    fontWeight: FontWeights.bold,
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.ink,
    marginBottom: 4,
  },
  userPhone: {
    fontSize: FontSizes.md,
    color: Colors.inkSecondary,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    right: Spacing.md,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  statusCard: {
    margin: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: '#E8F5E9',
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statusCardDisabled: {
    backgroundColor: '#F5F5F5',
    borderLeftColor: '#999',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: FontSizes.md,
    color: Colors.success,
    fontWeight: FontWeights.bold,
    marginLeft: Spacing.xs,
  },
  statusLabelDisabled: {
    color: '#999',
  },
  statusSubtext: {
    fontSize: FontSizes.xs,
    color: '#666',
    marginTop: Spacing.sm,
  },
  section: {
    marginTop: Spacing.lg,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: '#999',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: '#F8F9FA',
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuItemText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: '#333333',
    fontWeight: FontWeights.medium,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: '#FFF5F5',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  logoutButtonText: {
    fontSize: FontSizes.md,
    color: '#E74C3C',
    fontWeight: FontWeights.semibold,
    marginLeft: Spacing.sm,
  },
});
