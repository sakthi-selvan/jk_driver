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
  Image,
} from 'react-native';
import { formatApiError } from '../src/utils/apiError';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
let ImagePicker: any = null;
try {
  ImagePicker = require('expo-image-picker');
} catch {
  /* Expo Go */
}
import { useAuthStore } from '../src/store/authStore';
import { authApi } from '../src/api/auth';
import { Button } from '../src/components/common/Button';
import { Card } from '../src/components/common/Card';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../src/constants/theme';
import { BottomNav } from '../src/components/navigation/BottomNav';
import { mediaUrl } from '../src/utils/mediaUrl';

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'] as const;
const VEHICLE_TYPES = ['Auto', 'Bike', 'Mini', 'Sedan', 'SUV'] as const;

export default function EditProfileScreen() {
  const { driver } = useAuthStore();
  const [name, setName] = useState(driver?.name || '');
  const [email, setEmail] = useState(driver?.email || '');
  const [gender, setGender] = useState(driver?.gender || '');
  const [vehicleNumber, setVehicleNumber] = useState(driver?.vehicle_number || '');
  const [vehicleType, setVehicleType] = useState(driver?.vehicle_type || '');
  const [vehicleImage, setVehicleImage] = useState<string | null>(null); // new data URI
  const [isLoading, setIsLoading] = useState(false);

  const existingVehiclePhoto = mediaUrl(driver?.vehicle_image);

  const pickVehiclePhoto = async (source: 'camera' | 'gallery') => {
    if (!ImagePicker) {
      Alert.alert('Not available', 'Photo upload needs a development / production build.');
      return;
    }
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to continue.');
      return;
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.45, base64: true })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.45,
            base64: true,
          });
    if (!result.canceled && result.assets[0]?.base64) {
      setVehicleImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    if (!vehicleNumber.trim() || !vehicleType.trim()) {
      Alert.alert('Error', 'Vehicle number and type are required');
      return;
    }
    if (!vehicleImage && !driver?.vehicle_image) {
      Alert.alert('Vehicle photo needed', 'Add one clear photo of your vehicle so riders can find you.');
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
        ...(vehicleImage ? { vehicle_image: vehicleImage } : {}),
      } as any);

      const { driver: currentDriver } = useAuthStore.getState();
      const updatedDriverData = { ...currentDriver, ...updatedDriver };
      try {
        await AsyncStorage.setItem('driver', JSON.stringify(updatedDriverData));
      } catch {
        /* memory still updated */
      }
      useAuthStore.setState({ driver: updatedDriverData });

      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', formatApiError(error, 'Failed to update profile'));
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
              <View style={styles.chipRow}>
                {GENDERS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.chip, gender === g && styles.chipActive]}
                    onPress={() => setGender(g)}
                  >
                    <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Vehicle (shown to riders)</Text>
            <Text style={styles.sectionDescription}>
              Plate number and photo help customers identify you at pickup. Type controls map icons & offers.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vehicle number *</Text>
              <TextInput
                style={styles.input}
                value={vehicleNumber}
                onChangeText={setVehicleNumber}
                placeholder="e.g. TN01AB1234"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
                maxLength={15}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vehicle type *</Text>
              <View style={styles.chipRow}>
                {VEHICLE_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.chip, vehicleType === t && styles.chipActive]}
                    onPress={() => setVehicleType(t)}
                  >
                    <Text style={[styles.chipText, vehicleType === t && styles.chipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vehicle photo *</Text>
              <TouchableOpacity
                style={[styles.uploadBox, (vehicleImage || existingVehiclePhoto) && styles.uploadDone]}
                onPress={() =>
                  Alert.alert('Vehicle photo', 'Choose source', [
                    { text: 'Camera', onPress: () => pickVehiclePhoto('camera') },
                    { text: 'Gallery', onPress: () => pickVehiclePhoto('gallery') },
                    { text: 'Cancel', style: 'cancel' },
                  ])
                }
              >
                {vehicleImage || existingVehiclePhoto ? (
                  <Image
                    source={{ uri: vehicleImage || existingVehiclePhoto }}
                    style={styles.vehiclePreview}
                  />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Ionicons name="camera-outline" size={28} color="#666" />
                    <Text style={styles.uploadLabel}>Add vehicle photo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </Card>

          <Button title="Save Changes" onPress={handleSave} loading={isLoading} fullWidth style={styles.saveButton} />
        </ScrollView>
      </KeyboardAvoidingView>
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  keyboardView: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  backButton: { width: 40 },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: Colors.text },
  formCard: { marginBottom: Spacing.lg },
  inputGroup: { marginBottom: Spacing.md },
  label: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: Colors.textSecondary, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: FontSizes.md,
    color: Colors.text,
    backgroundColor: '#FFF',
  },
  disabledInput: { backgroundColor: '#F3F4F6', color: Colors.textMuted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: '#F5F3FF' },
  chipText: { fontSize: FontSizes.sm, color: '#555', fontWeight: '600' },
  chipTextActive: { color: Colors.primary },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: Spacing.md },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: Colors.text },
  sectionDescription: { fontSize: FontSizes.sm, color: Colors.textMuted, marginBottom: Spacing.md, marginTop: 4, lineHeight: 18 },
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E0E0E0',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: '#FAFAFA',
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadDone: { borderStyle: 'solid', borderColor: '#10B981' },
  uploadPlaceholder: { alignItems: 'center', padding: Spacing.lg },
  uploadLabel: { marginTop: 8, fontWeight: '600', color: '#555' },
  vehiclePreview: { width: '100%', height: 160 },
  saveButton: { marginBottom: Spacing.xl },
});
