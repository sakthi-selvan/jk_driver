import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './common/Button';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../constants/theme';
import { driverEnhancedApi } from '../api/driver-enhanced';

interface OTPVerificationModalProps {
  visible: boolean;
  rideId: string;
  onVerified: () => void;
  onClose: () => void;
}

export const OTPVerificationModal: React.FC<OTPVerificationModalProps> = ({
  visible,
  rideId,
  onVerified,
  onClose,
}) => {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    if (!otp || otp.length !== 4) {
      Alert.alert(
        'Invalid OTP',
        'Please enter the complete 4-digit OTP provided by the customer.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setIsLoading(true);
      await driverEnhancedApi.verifyOTP(rideId, otp);

      setOtp('');
      Alert.alert(
        'OTP Verified! ✅',
        'The OTP is correct. You can now start the ride.',
        [{ text: 'OK', onPress: onVerified }]
      );
    } catch (error: any) {
      let errorMessage = 'Invalid OTP. Please try again.';

      if (error.response?.status === 400) {
        errorMessage = 'The OTP you entered is incorrect. Please ask the customer to show you the correct 4-digit code.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Ride not found. Please refresh and try again.';
      } else if (error.response?.status === 409) {
        errorMessage = 'OTP already verified or ride status has changed. Please refresh.';
      } else if (error.message === 'Network Error') {
        errorMessage = 'Network connection error. Please check your internet and try again.';
      }

      Alert.alert('Verification Failed', errorMessage, [{ text: 'Try Again' }]);
      setOtp(''); // Clear incorrect OTP
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setOtp('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Enter Ride OTP</Text>
            <Text style={styles.subtitle}>
              Ask the customer for the 4-digit OTP to verify and start the ride
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>4-Digit OTP</Text>
            <TextInput
              style={styles.otpInput}
              value={otp}
              onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, ''))}
              placeholder="****"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
              textAlign="center"
            />
            <Text style={styles.helperText}>
              Customer will show you this code
            </Text>
          </View>

          <View style={styles.buttons}>
            <Button
              title="Verify & Enable Start"
              onPress={handleVerify}
              loading={isLoading}
              disabled={otp.length !== 4}
              fullWidth
              style={styles.verifyButton}
            />
            <Button
              title="Cancel"
              variant="outline"
              onPress={handleClose}
              fullWidth
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  content: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: Spacing.xl,
  },
  inputLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  otpInput: {
    backgroundColor: Colors.card,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    fontSize: 40,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    letterSpacing: 15,
    marginBottom: Spacing.sm,
  },
  helperText: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  buttons: {
    gap: Spacing.md,
  },
  verifyButton: {
    backgroundColor: Colors.primary,
  },
});
