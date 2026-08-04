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
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
let ImagePicker: any = null;
try {
  ImagePicker = require('expo-image-picker');
} catch (e) {
  // Not available in Expo Go
}
import { useAuthStore } from '../../src/store/authStore';
import { Button } from '../../src/components/common/Button';
import { Input } from '../../src/components/common/Input';
import { Card } from '../../src/components/common/Card';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../src/constants/theme';
import {
  validatePhone,
  validateEmail,
  validatePassword,
  validateName,
} from '../../src/utils/validation';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [licenseImage, setLicenseImage] = useState<string | null>(null);
  const [aadharImage, setAadharImage] = useState<string | null>(null);
  const [errors, setErrors] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    documents: '',
  });

  const { register, isLoading, error, clearError } = useAuthStore();

  const pickImage = async (type: 'license' | 'aadhar') => {
    if (!ImagePicker) {
      Alert.alert('Not Available', 'Image picker requires a development build. Please use a dev build to upload documents.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to photos to upload documents.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      if (type === 'license') {
        setLicenseImage(base64);
      } else {
        setAadharImage(base64);
      }
    }
  };

  const takePhoto = async (type: 'license' | 'aadhar') => {
    if (!ImagePicker) {
      Alert.alert('Not Available', 'Camera requires a development build. Please use a dev build to upload documents.');
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      if (type === 'license') {
        setLicenseImage(base64);
      } else {
        setAadharImage(base64);
      }
    }
  };

  const showImageOptions = (type: 'license' | 'aadhar') => {
    if (!ImagePicker) {
      Alert.alert('Development Build Required', 'Document upload requires a development build (not Expo Go). The upload will work in your production APK.');
      return;
    }
    Alert.alert(
      type === 'license' ? 'Upload License' : 'Upload Aadhar Card',
      'Choose an option',
      [
        { text: 'Camera', onPress: () => takePhoto(type) },
        { text: 'Gallery', onPress: () => pickImage(type) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const validateForm = (): boolean => {
    const newErrors = {
      name: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
      documents: '',
    };
    let isValid = true;

    if (!validateName(name)) {
      newErrors.name = 'Name must be at least 2 characters';
      isValid = false;
    }

    if (!validatePhone(phone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
      isValid = false;
    }

    if (email && !validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    if (!validatePassword(password)) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    if (!licenseImage || !aadharImage) {
      newErrors.documents = 'Both License and Aadhar Card are required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      clearError();
      await register(name, phone, email, password, vehicleNumber, vehicleType, licenseImage || undefined, aadharImage || undefined);
      Alert.alert(
        'Registration Submitted',
        'Your account has been created. It will be activated after admin verifies your documents.',
        [{ text: 'OK', onPress: () => router.replace('/login') }]
      );
    } catch (err) {
      Alert.alert('Registration Failed', error || 'Please try again');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="person-add" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Join as Driver</Text>
            <Text style={styles.subtitle}>Start your journey with JK Taxi</Text>
          </View>

          <Card elevated style={styles.formCard}>
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
              icon="person-outline"
              error={errors.name}
            />

            <Input
              label="Phone Number"
              placeholder="Enter your phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={10}
              icon="call-outline"
              error={errors.phone}
            />

            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              icon="mail-outline"
              error={errors.email}
            />

            <Input
              label="Vehicle Number"
              placeholder="e.g., KA01AB1234"
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
              autoCapitalize="characters"
              icon="car-outline"
            />

            <Input
              label="Vehicle Type"
              placeholder="e.g., Sedan, Hatchback, SUV"
              value={vehicleType}
              onChangeText={setVehicleType}
              icon="car-sport-outline"
            />

            {/* Document Upload Section */}
            <View style={styles.docSection}>
              <Text style={styles.docSectionTitle}>Documents</Text>
              <Text style={styles.docSectionSubtitle}>
                Upload clear photos of your documents for verification
              </Text>

              {/* License Upload */}
              <TouchableOpacity
                style={[styles.uploadBox, licenseImage && styles.uploadBoxDone]}
                onPress={() => showImageOptions('license')}
              >
                {licenseImage ? (
                  <View style={styles.uploadedContainer}>
                    <Image source={{ uri: licenseImage }} style={styles.uploadedImage} />
                    <View style={styles.uploadedBadge}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      <Text style={styles.uploadedText}>License uploaded</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Ionicons name="card-outline" size={32} color="#666" />
                    <Text style={styles.uploadLabel}>Driving License</Text>
                    <Text style={styles.uploadHint}>Tap to upload</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Aadhar Upload */}
              <TouchableOpacity
                style={[styles.uploadBox, aadharImage && styles.uploadBoxDone]}
                onPress={() => showImageOptions('aadhar')}
              >
                {aadharImage ? (
                  <View style={styles.uploadedContainer}>
                    <Image source={{ uri: aadharImage }} style={styles.uploadedImage} />
                    <View style={styles.uploadedBadge}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      <Text style={styles.uploadedText}>Aadhar uploaded</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Ionicons name="id-card-outline" size={32} color="#666" />
                    <Text style={styles.uploadLabel}>Aadhar Card</Text>
                    <Text style={styles.uploadHint}>Tap to upload</Text>
                  </View>
                )}
              </TouchableOpacity>

              {errors.documents ? (
                <Text style={styles.docError}>{errors.documents}</Text>
              ) : null}
            </View>

            <Input
              label="Password"
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              icon="lock-closed-outline"
              error={errors.password}
            />

            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              icon="lock-closed-outline"
              error={errors.confirmPassword}
            />

            <Button
              title="Sign Up"
              onPress={handleRegister}
              loading={isLoading}
              fullWidth
              style={styles.registerButton}
            />
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Button
              title="Login"
              variant="ghost"
              size="small"
              onPress={() => router.back()}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  formCard: {
    marginBottom: Spacing.lg,
  },
  registerButton: {
    marginTop: Spacing.md,
  },
  // Document upload section
  docSection: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  docSectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  docSectionSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
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
  uploadPlaceholder: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  uploadLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: '#333',
    marginTop: Spacing.sm,
  },
  uploadHint: {
    fontSize: FontSizes.sm,
    color: '#999',
    marginTop: 4,
  },
  uploadedContainer: {
    alignItems: 'center',
  },
  uploadedImage: {
    width: '100%',
    height: 120,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  uploadedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  uploadedText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: '#10B981',
  },
  docError: {
    fontSize: FontSizes.sm,
    color: '#EF4444',
    marginTop: -Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  footerText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
});
