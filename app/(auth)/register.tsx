import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import { formatApiError } from '../../src/utils/apiError';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
let ImagePicker: any = null;
try {
  ImagePicker = require('expo-image-picker');
} catch {
  // Expo Go may not have it
}
import { useAuthStore } from '../../src/store/authStore';
import { Button } from '../../src/components/common/Button';
import { Input } from '../../src/components/common/Input';
import { Card } from '../../src/components/common/Card';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../src/constants/theme';
import { validateEmail, validateName } from '../../src/utils/validation';

const VEHICLE_TYPES = ['Auto', 'Bike', 'Mini', 'Sedan', 'SUV'];
const STEPS = ['Profile', 'Vehicle', 'Documents'] as const;

export default function RegisterScreen() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleImage, setVehicleImage] = useState<string | null>(null);
  const [licenseImage, setLicenseImage] = useState<string | null>(null);
  const [aadharImage, setAadharImage] = useState<string | null>(null);
  const [errors, setErrors] = useState({ name: '', email: '', vehicle: '', documents: '' });

  const { completeRegistration, isLoading, error, clearError, logout, accessToken } = useAuthStore();

  // Must arrive via OTP (token in memory)
  if (!accessToken) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.gate}>
          <Text style={styles.gateTitle}>Verify your phone first</Text>
          <Text style={styles.gateSub}>Sign in with OTP, then complete your captain profile.</Text>
          <Button title="Go to login" onPress={() => router.replace('/(auth)/login')} fullWidth />
        </View>
      </SafeAreaView>
    );
  }

  const pickImage = async (type: 'license' | 'aadhar' | 'vehicle', source: 'camera' | 'gallery') => {
    if (!ImagePicker) {
      Alert.alert('Not available', 'Document upload needs a development / production build.');
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
      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      if (type === 'license') setLicenseImage(base64);
      else if (type === 'aadhar') setAadharImage(base64);
      else setVehicleImage(base64);
    }
  };

  const showImageOptions = (type: 'license' | 'aadhar' | 'vehicle') => {
    const title =
      type === 'license' ? 'Upload License' : type === 'aadhar' ? 'Upload Aadhar' : 'Vehicle photo';
    Alert.alert(title, 'Choose an option', [
      { text: 'Camera', onPress: () => pickImage(type, 'camera') },
      { text: 'Gallery', onPress: () => pickImage(type, 'gallery') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const validateStep = (): boolean => {
    const next = { name: '', email: '', vehicle: '', documents: '' };
    let ok = true;
    if (step === 0) {
      if (!validateName(name)) {
        next.name = 'Enter your full name';
        ok = false;
      }
      if (email && !validateEmail(email)) {
        next.email = 'Enter a valid email';
        ok = false;
      }
    }
    if (step === 1) {
      if (!vehicleNumber.trim() || vehicleNumber.trim().length < 4) {
        next.vehicle = 'Enter a valid vehicle number';
        ok = false;
      }
      if (!vehicleType) {
        next.vehicle = next.vehicle || 'Select a vehicle type';
        ok = false;
      }
      if (!vehicleImage) {
        next.vehicle = next.vehicle || 'Add a clear photo of your vehicle';
        ok = false;
      }
    }
    if (step === 2) {
      if (!licenseImage || !aadharImage) {
        next.documents = 'Both License and Aadhar are required';
        ok = false;
      }
    }
    setErrors(next);
    return ok;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    if (!validateStep() || !licenseImage || !aadharImage) return;
    try {
      clearError();
      await completeRegistration({
        name: name.trim(),
        email: email.trim() || undefined,
        gender: gender || undefined,
        vehicle_number: vehicleNumber.trim().toUpperCase(),
        vehicle_type: vehicleType,
        license_document: licenseImage,
        aadhar_document: aadharImage,
        vehicle_image: vehicleImage || undefined,
      });
      Alert.alert(
        'Submitted for approval',
        'Your captain profile is ready. An admin will verify your documents before you can go online.',
        [
          {
            text: 'OK',
            onPress: async () => {
              await logout();
              router.replace('/(auth)/login');
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert(
        'Could not submit',
        formatApiError(err, 'Please try again')
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Captain signup</Text>
            <Text style={styles.subtitle}>Step {step + 1} of {STEPS.length} · {STEPS[step]}</Text>
            <View style={styles.progressRow}>
              {STEPS.map((label, i) => (
                <View key={label} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
              ))}
            </View>
          </View>

          <Card elevated style={styles.formCard}>
            {step === 0 && (
              <>
                <Input
                  label="Full name"
                  placeholder="As on your license"
                  value={name}
                  onChangeText={setName}
                  icon="person-outline"
                  error={errors.name}
                />
                <Input
                  label="Email (optional)"
                  placeholder="you@email.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  icon="mail-outline"
                  error={errors.email}
                />
                <Text style={styles.chipLabel}>Gender (optional)</Text>
                <View style={styles.chipRow}>
                  {['male', 'female', 'other'].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.chip, gender === g && styles.chipActive]}
                      onPress={() => setGender(g)}
                    >
                      <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {step === 1 && (
              <>
                <Input
                  label="Vehicle number"
                  placeholder="e.g. TN01AB1234"
                  value={vehicleNumber}
                  onChangeText={setVehicleNumber}
                  autoCapitalize="characters"
                  icon="car-outline"
                  error={errors.vehicle}
                />
                <Text style={styles.chipLabel}>Vehicle type</Text>
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
                <Text style={styles.chipLabel}>Vehicle photo (shown to riders)</Text>
                <TouchableOpacity
                  style={[styles.uploadBox, vehicleImage && styles.uploadBoxDone]}
                  onPress={() => showImageOptions('vehicle')}
                >
                  {vehicleImage ? (
                    <View style={styles.uploadedContainer}>
                      <Image source={{ uri: vehicleImage }} style={styles.uploadedImage} />
                      <Text style={styles.uploadedText}>Vehicle photo added</Text>
                    </View>
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <Ionicons name="camera-outline" size={32} color="#666" />
                      <Text style={styles.uploadLabel}>Vehicle photo</Text>
                      <Text style={styles.uploadHint}>Riders use this + plate at pickup</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </>
            )}

            {step === 2 && (
              <>
                <Text style={styles.docTitle}>Upload KYC documents</Text>
                <Text style={styles.docSub}>Clear photos help us approve you faster</Text>

                <TouchableOpacity
                  style={[styles.uploadBox, licenseImage && styles.uploadBoxDone]}
                  onPress={() => showImageOptions('license')}
                >
                  {licenseImage ? (
                    <View style={styles.uploadedContainer}>
                      <Image source={{ uri: licenseImage }} style={styles.uploadedImage} />
                      <Text style={styles.uploadedText}>License uploaded</Text>
                    </View>
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <Ionicons name="card-outline" size={32} color="#666" />
                      <Text style={styles.uploadLabel}>Driving License</Text>
                      <Text style={styles.uploadHint}>Tap to upload</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.uploadBox, aadharImage && styles.uploadBoxDone]}
                  onPress={() => showImageOptions('aadhar')}
                >
                  {aadharImage ? (
                    <View style={styles.uploadedContainer}>
                      <Image source={{ uri: aadharImage }} style={styles.uploadedImage} />
                      <Text style={styles.uploadedText}>Aadhar uploaded</Text>
                    </View>
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <Ionicons name="id-card-outline" size={32} color="#666" />
                      <Text style={styles.uploadLabel}>Aadhar Card</Text>
                      <Text style={styles.uploadHint}>Tap to upload</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {errors.documents ? <Text style={styles.docError}>{errors.documents}</Text> : null}
              </>
            )}

            <View style={styles.navRow}>
              {step > 0 ? (
                <Button title="Back" variant="ghost" onPress={() => setStep((s) => s - 1)} style={styles.navBtn} />
              ) : (
                <View style={styles.navBtn} />
              )}
              <Button
                title={step === STEPS.length - 1 ? 'Submit for approval' : 'Continue'}
                onPress={handleNext}
                loading={isLoading}
                style={styles.navBtnPrimary}
              />
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: Spacing.lg },
  gate: { flex: 1, justifyContent: 'center', padding: Spacing.xl },
  gateTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  gateSub: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  header: { marginTop: Spacing.md, marginBottom: Spacing.lg },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  progressRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.md },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
  },
  progressDotActive: { backgroundColor: Colors.primary },
  formCard: { marginBottom: Spacing.lg },
  chipLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: '#F5F3FF',
  },
  chipText: { fontSize: FontSizes.sm, color: '#555', fontWeight: '600' },
  chipTextActive: { color: Colors.primary },
  docTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  docSub: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    marginTop: 4,
  },
  uploadBox: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: '#FAFAFA',
  },
  uploadBoxDone: {
    borderColor: '#10B981',
    borderStyle: 'solid',
    backgroundColor: '#F0FDF4',
  },
  uploadPlaceholder: { alignItems: 'center', paddingVertical: Spacing.md },
  uploadLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: '#333',
    marginTop: Spacing.sm,
  },
  uploadHint: { fontSize: FontSizes.sm, color: '#999', marginTop: 4 },
  uploadedContainer: { alignItems: 'center' },
  uploadedImage: {
    width: '100%',
    height: 120,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  uploadedText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: '#10B981',
  },
  docError: { fontSize: FontSizes.sm, color: '#EF4444', marginBottom: Spacing.sm },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: Spacing.sm },
  navBtn: { flex: 1 },
  navBtnPrimary: { flex: 2 },
});
