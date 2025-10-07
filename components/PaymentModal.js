import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  createPaymentIntent, 
  processStripePayment, 
  initializeStripe,
  PaymentService 
} from '../services/PaymentService';

// Conditionally import Stripe components for mobile only
let CardField;
if (Platform.OS !== 'web') {
  try {
    const stripe = require('@stripe/stripe-react-native');
    CardField = stripe.CardField;
  } catch (error) {
    console.warn('Stripe React Native not available:', error);
  }
}

const PaymentModal = ({ visible, onClose, onPaymentSuccess, onPaymentError, orderData, amount }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [stripeInitialized, setStripeInitialized] = useState(false);

  // Initialize Stripe when modal opens
  useEffect(() => {
    if (visible && Platform.OS !== 'web') {
      initializeStripeService();
    }
  }, [visible]);

  const initializeStripeService = async () => {
    try {
      await initializeStripe();
      setStripeInitialized(true);
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
      Alert.alert('Payment Error', 'Failed to initialize payment system. Please try again.');
    }
  };

  const createPaymentIntentForOrder = async () => {
    try {
      setIsProcessing(true);
      
      // Validate amount
      PaymentService.validatePaymentAmount(amount);
      
      // Create payment intent
      const intent = await createPaymentIntent(
        amount,
        'usd',
        orderData?.customerId,
        orderData
      );
      
      setPaymentIntent(intent);
      return intent;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      Alert.alert('Payment Error', error.message || 'Failed to prepare payment. Please try again.');
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const processPayment = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Mobile App Required', 
        'Real payments are only available in the mobile app. Please download the app to complete your order.'
      );
      return;
    }

    if (!stripeInitialized) {
      Alert.alert('Payment Error', 'Payment system not ready. Please wait and try again.');
      return;
    }

    try {
      setIsProcessing(true);

      // Create payment intent if not already created
      let intent = paymentIntent;
      if (!intent) {
        intent = await createPaymentIntentForOrder();
        if (!intent) return;
      }

      // Process payment with Stripe
      const paymentResult = await processStripePayment(
        intent.client_secret,
        {
          type: 'Card',
        }
      );

      if (paymentResult.status === 'Succeeded') {
        onPaymentSuccess({
          id: paymentResult.id,
          amount: amount,
          currency: 'usd',
          status: 'succeeded',
          paymentMethod: paymentResult.paymentMethod
        });
        
        // Reset state
        setPaymentIntent(null);
      } else {
        throw new Error('Payment was not successful');
      }
      
    } catch (error) {
      console.error('Payment processing error:', error);
      onPaymentError(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.title}>Payment</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Total Amount</Text>
            <Text style={styles.amountValue}>${(amount || 0).toFixed(2)}</Text>
          </View>

          <View style={styles.form}>
            {Platform.OS === 'web' ? (
              <View style={styles.webNotice}>
                <Ionicons name="phone-portrait" size={24} color="#666" />
                <Text style={styles.webNoticeText}>
                  Real payments are only available in the mobile app
                </Text>
                <Text style={styles.webNoticeSubtext}>
                  Download the mobile app to complete your order securely
                </Text>
              </View>
            ) : stripeInitialized ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Payment Information</Text>
                {CardField ? (
                  <CardField
                    postalCodeEnabled={true}
                    placeholders={{
                      number: '4242 4242 4242 4242',
                    }}
                    cardStyle={{
                      backgroundColor: '#FFFFFF',
                      textColor: '#000000',
                    }}
                    style={styles.cardField}
                    onCardChange={(cardDetails) => {
                      console.log('Card details:', cardDetails);
                    }}
                  />
                ) : (
                  <View style={styles.cardFieldFallback}>
                    <Text style={styles.cardFieldFallbackText}>
                      Stripe payment form not available
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#34A853" />
                <Text style={styles.loadingText}>Initializing secure payment...</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.payButton, 
              (isProcessing || Platform.OS === 'web' || !stripeInitialized) && styles.payButtonDisabled
            ]}
            onPress={Platform.OS === 'web' ? () => Alert.alert('Mobile App Required', 'Please use the mobile app for payments') : processPayment}
            disabled={isProcessing || Platform.OS === 'web' || !stripeInitialized}
          >
            {isProcessing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.payButtonText}>
                {Platform.OS === 'web' 
                  ? 'Use Mobile App to Pay' 
                  : `Pay ${PaymentService.formatAmount(amount || 0)}`
                }
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.securityNote}>
            🔒 {Platform.OS === 'web' 
              ? 'Secure payments available in mobile app' 
              : 'Your payment is secured by Stripe'
            }
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  amountContainer: {
    backgroundColor: '#F3F4F6',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#34A853',
  },
  form: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  payButton: {
    backgroundColor: '#34A853',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  payButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  securityNote: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  webNotice: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginBottom: 20,
  },
  webNoticeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
    marginTop: 8,
  },
  webNoticeSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  cardField: {
    width: '100%',
    height: 50,
    marginVertical: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  cardFieldFallback: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardFieldFallbackText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default PaymentModal;
