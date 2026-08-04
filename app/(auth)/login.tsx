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
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { Button } from '../../src/components/common/Button';
import { Input } from '../../src/components/common/Input';
import { Card } from '../../src/components/common/Card';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../src/constants/theme';
import { validatePhone, validatePassword } from '../../src/utils/validation';

const SUPPORT_PHONE = '9876543210';
const SUPPORT_EMAIL = 'support@jktaxitamilnadu.com';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ phone: '', password: '' });
  const [showPendingScreen, setShowPendingScreen] = useState(false);

  const { login, isLoading, error, clearError } = useAuthStore();

  const validateForm = (): boolean => {
    const newErrors = { phone: '', password: '' };
    let isValid = true;

    if (!validatePhone(phone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
      isValid = false;
    }

    if (!validatePassword(password)) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    try {
      clearError();
      await login(phone, password);
      router.replace('/');
    } catch (err: any) {
      const detail = err?.response?.data?.detail || error || '';
      if (detail === 'ACCOUNT_PENDING_APPROVAL' || err?.response?.status === 403) {
        setShowPendingScreen(true);
      } else {
        Alert.alert('Login Failed', 'Please check your credentials');
      }
    }
  };

  const handleCallSupport = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE}`);
  };

  const handleEmailSupport = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Driver Account Approval`);
  };

  // Pending Approval Screen
  if (showPendingScreen) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.pendingContainer}>
          <View style={styles.pendingIconBox}>
            <Ionicons name="hourglass-outline" size={64} color="#F59E0B" />
          </View>

          <Text style={styles.pendingTitle}>Account Pending Approval</Text>
          <Text style={styles.pendingSubtitle}>
            Your account has been created successfully. Our admin team is reviewing your documents.
          </Text>

          <View style={styles.pendingInfoBox}>
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <Text style={styles.pendingInfoText}>
              You will be able to login once your documents (License & Aadhar) are verified and your account is approved by our team.
            </Text>
          </View>

          <Text style={styles.contactTitle}>Need help? Contact us</Text>

          <TouchableOpacity style={styles.contactBtn} onPress={handleCallSupport}>
            <Ionicons name="call" size={22} color="#4CAF50" />
            <View style={styles.contactBtnContent}>
              <Text style={styles.contactBtnLabel}>Call Support</Text>
              <Text style={styles.contactBtnValue}>{SUPPORT_PHONE}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactBtn} onPress={handleEmailSupport}>
            <Ionicons name="mail" size={22} color="#3B82F6" />
            <View style={styles.contactBtnContent}>
              <Text style={styles.contactBtnLabel}>Email Support</Text>
              <Text style={styles.contactBtnValue}>{SUPPORT_EMAIL}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <Button
            title="Back to Login"
            variant="ghost"
            onPress={() => setShowPendingScreen(false)}
            style={styles.backBtn}
          />
        </View>
      </SafeAreaView>
    );
  }

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
              <Ionicons name="car-sport" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.title}>JK Taxi Driver</Text>
            <Text style={styles.subtitle}>Login to start earning</Text>
          </View>

          <Card elevated style={styles.formCard}>
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
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              icon="lock-closed-outline"
              error={errors.password}
            />

            <Button
              title="Login"
              onPress={handleLogin}
              loading={isLoading}
              fullWidth
              style={styles.loginButton}
            />
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account?</Text>
            <Button
              title="Sign Up"
              variant="ghost"
              size="small"
              onPress={() => router.push('/(auth)/register')}
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
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
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
  loginButton: {
    marginTop: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },

  // Pending Approval Screen
  pendingContainer: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
  },
  pendingIconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  pendingTitle: {
    fontSize: 22,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  pendingSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  pendingInfoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  pendingInfoText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: '#1E40AF',
    marginLeft: Spacing.sm,
    lineHeight: 20,
  },
  contactTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  contactBtnContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  contactBtnLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: '#333',
  },
  contactBtnValue: {
    fontSize: FontSizes.sm,
    color: '#666',
    marginTop: 2,
  },
  backBtn: {
    marginTop: Spacing.xl,
  },
});
