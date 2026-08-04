import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../constants/theme';
import { driverEnhancedApi } from '../api/driver-enhanced';

interface PaymentCollectionModalProps {
  visible: boolean;
  rideId: string;
  fare: number;
  onComplete: () => void;
}

export const PaymentCollectionModal: React.FC<PaymentCollectionModalProps> = ({
  visible,
  rideId,
  fare,
  onComplete,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCollectOnline = async () => {
    try {
      setIsProcessing(true);
      const orderData = await driverEnhancedApi.createPaymentOrder(rideId);
      const RazorpayCheckout = require('react-native-razorpay').default;

      const options = {
        description: 'JK Taxi - Ride Payment',
        image: 'https://jktaxitamilnadu.com/icon.png',
        currency: orderData.currency,
        key: orderData.key_id,
        amount: orderData.amount,
        name: 'JK Taxi',
        order_id: orderData.order_id,
        theme: { color: '#8B5CF6' },
      };

      const paymentResult = await RazorpayCheckout.open(options);
      await driverEnhancedApi.verifyPayment(rideId, {
        razorpay_order_id: orderData.order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature,
      });

      Alert.alert('Payment Collected', `₹${Math.round(fare)} received via online payment!`);
      onComplete();
    } catch (error: any) {
      if (error?.code === 'PAYMENT_CANCELLED') {
        setIsProcessing(false);
        return;
      }
      Alert.alert('Payment Failed', error?.description || error?.message || 'Please try again or collect cash');
      setIsProcessing(false);
    }
  };

  const handleCashCollected = async () => {
    try {
      setIsProcessing(true);
      await driverEnhancedApi.markCashPayment(rideId);
      Alert.alert('Cash Collected', `₹${Math.round(fare)} recorded as cash payment.`);
      onComplete();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to record payment');
      setIsProcessing(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Payment Collection?',
      'Payment will remain pending. You can collect later.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', onPress: onComplete },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
            <Text style={styles.title}>Ride Completed!</Text>
            <Text style={styles.subtitle}>Collect payment from customer</Text>
          </View>

          {/* Fare Display */}
          <View style={styles.fareCard}>
            <Text style={styles.fareLabel}>Total Fare</Text>
            <Text style={styles.fareAmount}>₹{Math.round(fare)}</Text>
          </View>

          {/* Payment Options */}
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[styles.optionButton, styles.onlineButton]}
              onPress={handleCollectOnline}
              disabled={isProcessing}
            >
              <Ionicons name="card" size={24} color={Colors.white} />
              <Text style={styles.optionButtonText}>Collect Online (Razorpay)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, styles.cashButton]}
              onPress={handleCashCollected}
              disabled={isProcessing}
            >
              <Ionicons name="cash" size={24} color={Colors.white} />
              <Text style={styles.optionButtonText}>Cash Collected</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={isProcessing}
            >
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  fareCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  fareLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  fareAmount: {
    fontSize: 40,
    fontWeight: FontWeights.bold,
    color: Colors.success,
  },
  optionsContainer: {
    gap: Spacing.md,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  onlineButton: {
    backgroundColor: Colors.primary,
  },
  cashButton: {
    backgroundColor: Colors.success,
  },
  optionButtonText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  skipButton: {
    alignItems: 'center',
    padding: Spacing.md,
  },
  skipButtonText: {
    fontSize: FontSizes.md,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
});
