import React, { useRef, useState } from 'react';
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
  TextInput,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { Button } from '../../src/components/common/Button';
import { Input } from '../../src/components/common/Input';
import { Card } from '../../src/components/common/Card';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../src/constants/theme';
import { validatePhone } from '../../src/utils/validation';

const SUPPORT_PHONE = '9876543210';
const SUPPORT_EMAIL = 'support@jktaxitamilnadu.com';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [phoneError, setPhoneError] = useState('');
  const [showPendingScreen, setShowPendingScreen] = useState(false);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  const {
    sendOTP,
    verifyOTP,
    otpSent,
    isLoading,
    error,
    clearError,
    resetOTPState,
  } = useAuthStore();

  const handleSendOTP = async () => {
    setPhoneError('');
    if (!validatePhone(phone)) {
      setPhoneError('Please enter a valid 10-digit phone number');
      return;
    }
    try {
      clearError();
      await sendOTP(phone);
      setOtp(['', '', '', '']);
    } catch {
      // store error
    }
  };

  const handleOTPChange = (value: string, index: number) => {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 3) otpRefs.current[index + 1]?.focus();
    if (digit && index === 3) {
      const code = next.join('');
      if (code.length === 4) handleVerifyOTP(code);
    }
  };

  const handleOTPKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (otpCode?: string) => {
    const code = otpCode || otp.join('');
    if (code.length !== 4) return;
    try {
      clearError();
      const result = await verifyOTP(phone, code);
      if (result.account_status === 'active') {
        router.replace('/');
      } else if (result.account_status === 'incomplete' || result.is_new_driver) {
        router.replace('/(auth)/register');
      } else {
        setShowPendingScreen(true);
      }
    } catch {
      setOtp(['', '', '', '']);
      otpRefs.current[0]?.focus();
    }
  };

  const handleChangePhone = () => {
    resetOTPState();
    setOtp(['', '', '', '']);
  };

  if (showPendingScreen) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.pendingContainer}>
          <View style={styles.pendingIconBox}>
            <Ionicons name="hourglass-outline" size={64} color="#F59E0B" />
          </View>
          <Text style={styles.pendingTitle}>Account Pending Approval</Text>
          <Text style={styles.pendingSubtitle}>
            Your documents are under review. You can go online once an admin approves your account.
          </Text>
          <View style={styles.pendingInfoBox}>
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <Text style={styles.pendingInfoText}>
              License and Aadhar must be verified before you can accept rides.
            </Text>
          </View>
          <Text style={styles.contactTitle}>Need help? Contact us</Text>
          <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}>
            <Ionicons name="call" size={22} color="#4CAF50" />
            <View style={styles.contactBtnContent}>
              <Text style={styles.contactBtnLabel}>Call Support</Text>
              <Text style={styles.contactBtnValue}>{SUPPORT_PHONE}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Driver Account Approval`)}
          >
            <Ionicons name="mail" size={22} color="#3B82F6" />
            <View style={styles.contactBtnContent}>
              <Text style={styles.contactBtnLabel}>Email Support</Text>
              <Text style={styles.contactBtnValue}>{SUPPORT_EMAIL}</Text>
            </View>
          </TouchableOpacity>
          <Button
            title="Back"
            variant="ghost"
            onPress={() => {
              setShowPendingScreen(false);
              handleChangePhone();
            }}
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
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/images/jk_taxi_logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>JK Taxi Driver</Text>
            <Text style={styles.subtitle}>
              {otpSent ? 'Enter the OTP sent to your phone' : 'Sign in with your phone number'}
            </Text>
          </View>

          <Card elevated style={styles.formCard}>
            {!otpSent ? (
              <>
                <Input
                  label="Phone Number"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                  icon="call-outline"
                  error={phoneError}
                />
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <Button
                  title="Send OTP"
                  onPress={handleSendOTP}
                  loading={isLoading}
                  fullWidth
                  style={styles.loginButton}
                />
              </>
            ) : (
              <>
                <View style={styles.phoneDisplay}>
                  <Text style={styles.phoneLabel}>OTP sent to</Text>
                  <Text style={styles.phoneNumber}>+91 {phone}</Text>
                  <Button title="Change" variant="ghost" size="small" onPress={handleChangePhone} />
                </View>
                <View style={styles.otpContainer}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => {
                        otpRefs.current[index] = ref;
                      }}
                      style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
                      value={digit}
                      onChangeText={(v) => handleOTPChange(v, index)}
                      onKeyPress={({ nativeEvent }) => handleOTPKeyPress(nativeEvent.key, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      autoFocus={index === 0}
                    />
                  ))}
                </View>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <Button
                  title="Verify OTP"
                  onPress={() => handleVerifyOTP()}
                  loading={isLoading}
                  fullWidth
                  style={styles.loginButton}
                />
                <Button title="Resend OTP" variant="ghost" onPress={handleSendOTP} disabled={isLoading} />
              </>
            )}
          </Card>

          <Text style={styles.hint}>New captain? Verify OTP, then complete your profile & documents.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: Spacing.lg, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  logo: {
    width: 240,
    height: 110,
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
    paddingHorizontal: Spacing.md,
  },
  formCard: { marginBottom: Spacing.lg },
  loginButton: { marginTop: Spacing.md },
  errorText: {
    color: Colors.error || '#EF4444',
    fontSize: FontSizes.sm,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  phoneDisplay: { alignItems: 'center', marginBottom: Spacing.md },
  phoneLabel: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  phoneNumber: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginVertical: 4,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: Spacing.md,
  },
  otpInput: {
    width: 52,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  otpInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: '#F5F3FF',
  },
  hint: {
    textAlign: 'center',
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  pendingContainer: { flex: 1, padding: Spacing.xl, justifyContent: 'center' },
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
  contactBtnContent: { flex: 1, marginLeft: Spacing.md },
  contactBtnLabel: { fontSize: FontSizes.md, fontWeight: FontWeights.semibold, color: '#333' },
  contactBtnValue: { fontSize: FontSizes.sm, color: '#666', marginTop: 2 },
  backBtn: { marginTop: Spacing.xl },
});
