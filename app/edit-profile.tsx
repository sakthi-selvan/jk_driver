import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../src/store/authStore';
import { authApi } from '../src/api/auth';
import { Button } from '../src/components/common/Button';
import { Card } from '../src/components/common/Card';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../src/constants/theme';
import { BottomNav } from '../src/components/navigation/BottomNav';

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'] as const;

export default function EditProfileScreen() {
  const { driver } = useAuthStore();
  const [name, setName] = useState(driver?.name || '');
  const [email, setEmail] = useState(driver?.email || '');
  const [gender, setGender] = useState(driver?.gender || '');
  const [vehicleNumber, setVehicleNumber] = useState(driver?.vehicle_number || '');
  const [vehicleType, setVehicleType] = useState(driver?.vehicle_type || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    if (!vehicleNumber.trim() || !vehicleType.trim()) {
      Alert.alert('Error', 'Vehicle details are required');
      return;
    }

    try {
      setIsLoading(true);
      const updatedDriver = await authApi.updateProfile({
        name: name.trim(),
        email: email.trim() || undefined,
        gender: gender || undefined,
        vehicle_number: vehicleNumber.trim().toUpperCase(),
        vehicle_type: vehicleType.trim(),
      });

      const { driver: currentDriver } = useAuthStore.getState();
      const updatedDriverData = { ...currentDriver, ...updatedDriver };
      try {
        await AsyncStorage.setItem('driver', JSON.stringify(updatedDriverData));
      } catch {
        /* memory store still updated */
      }
      useAuthStore.setState({ driver: updatedDriverData });

      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Button
              title=""
              variant="ghost"
              icon={<Ionicons name="arrow-back" size={24} color={Colors.text} />}
              onPress={() => router.back()}
              style={styles.backButton}
            />
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <View style={styles.backButton} />
          </View>

          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={50} color={Colors.primary} />
            </View>
          </View>

          <Card elevated style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={driver?.phone}
                editable={false}
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.helperText}>Phone number cannot be changed</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gender</Text>
              <Text style={styles.helperText}>
                Required for women-only trip matching. Choose Female to receive those offers.
              </Text>
              <View style={styles.genderRow}>
                {GENDERS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderChip, gender === g && styles.genderChipActive]}
                    onPress={() => setGender(g)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[styles.genderChipText, gender === g && styles.genderChipTextActive]}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.sectionHeader}>
              <Ionicons name="car-sport" size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Vehicle Information *</Text>
            </View>
            <Text style={styles.sectionDescription}>Required for ride assignments</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vehicle Number *</Text>
              <TextInput
                style={styles.input}
                value={vehicleNumber}
                onChangeText={setVehicleNumber}
                placeholder="e.g., KA01AB1234"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
                maxLength={15}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vehicle Type *</Text>
              <TextInput
                style={styles.input}
                value={vehicleType}
                onChangeText={setVehicleType}
                placeholder="e.g., Sedan, SUV, Bike, Auto"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
              />
            </View>
          </Card>

          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={isLoading}
            fullWidth
            style={styles.saveButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  keyboardView: { flex: 1 },
  scrollContent: { padding: Spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  backButton: { width: 40 },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  avatarSection: { alignItems: 'center', marginBottom: Spacing.xl },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  formCard: { marginBottom: Spacing.lg },
  inputGroup: { marginBottom: Spacing.lg },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  disabledInput: { opacity: 0.5, backgroundColor: Colors.card },
  helperText: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genderChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  genderChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '18',
  },
  genderChipText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.textSecondary,
  },
  genderChipTextActive: { color: Colors.primary },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  sectionDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  saveButton: { marginBottom: Spacing.xl },
});
