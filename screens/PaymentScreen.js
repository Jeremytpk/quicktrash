import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { 
  createPaymentMethod, 
  processStripePayment, 
  initializeStripe,
  PaymentService 
} from '../services/PaymentService';
import PaymentStatusModal from '../components/PaymentStatusModal';

// Conditionally import Stripe components for mobile only
let CardField;
const isWeb = Platform.OS === 'web';

if (!isWeb) {
  try {
    const stripe = require('@stripe/stripe-react-native');
    CardField = stripe.CardField;
  } catch (error) {
    console.warn('Stripe React Native not available:', error);
  }
}

const PaymentScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { orderId } = route.params;

  const [isProcessing, setIsProcessing] = useState(false);
  const [stripeInitialized, setStripeInitialized] = useState(false);
  const [cardValid, setCardValid] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [paymentError, setPaymentError] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        const orderDoc = await getDoc(doc(db, 'jobs', orderId));
        if (orderDoc.exists()) {
          const data = orderDoc.data();
          setOrderData(data);
          setAmount(data.pricing.total);
        } else {
          Alert.alert('Error', 'Order not found.');
          navigation.goBack();
        }
      } catch (error) {
        console.error('Error fetching order:', error);
        Alert.alert('Error', 'Failed to fetch order details.');
        navigation.goBack();
      }
    };

    fetchOrderData();
  }, [orderId]);

  useEffect(() => {
    if (!isWeb) {
      const paymentModeInfo = PaymentService.getPaymentModeInfo();
      console.log(`${paymentModeInfo.icon} Payment Mode: ${paymentModeInfo.mode}`);
      console.log(`📋 Payment Description: ${paymentModeInfo.description}`);

      const stripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || (globalThis?.expo?.extra?.stripePublishableKey);
      console.log('🔑 Stripe Publishable Key:', stripeKey);

      initializeStripeService();
    }
  }, []);

  const initializeStripeService = async () => {
    try {
      console.log('⏳ Initializing Stripe...');
      console.log('🔑 Publishable Key exists:', !!process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY);
      await initializeStripe();
      setStripeInitialized(true);
      console.log('✅ Stripe initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Stripe:', error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      Alert.alert('Payment Error', 'Failed to initialize payment system. Please try again.');
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

    if (!cardValid) {
      Alert.alert('Invalid Card', 'Please enter valid card information.');
      return;
    }

    try {
      setPaymentStatus('processing');
      setIsProcessing(true);

      console.log('💳 Step 1: Validating payment amount:', amount);
      PaymentService.validatePaymentAmount(amount);
      console.log('✅ Step 1 complete: Amount validated');

      console.log('💳 Step 2: Creating payment method...');
      const paymentMethod = await createPaymentMethod();
      console.log('💳 Step 2 result - paymentMethod:', JSON.stringify(paymentMethod, null, 2));

      if (!paymentMethod) {
        throw new Error('Failed to create payment method');
      }
      console.log('✅ Step 2 complete: Payment method created');

      console.log('💳 Step 3: Processing Stripe payment...');
      const result = await processStripePayment(paymentMethod, amount);
      console.log('💳 Step 3 result:', JSON.stringify(result, null, 2));
      console.log('💳 Step 3 result.status:', result.status, 'Type:', typeof result.status);

      if (result.status?.toLowerCase() === 'succeeded') {
        await updateDoc(doc(db, 'jobs', orderId), {
          status: 'paid',
          paymentDetails: {
            transactionId: result.id,
            amount: amount,
            currency: 'usd',
            paymentMethodId: result.paymentMethod?.id || null,
            paidAt: new Date()
          }
        });
        
        setPaymentResult({
          id: result.id,
          amount: amount,
          currency: 'usd',
          status: 'succeeded',
          paymentMethodId: result.paymentMethod?.id || null
        });
        setPaymentStatus('success');
        
        setCardValid(false);
      } else {
        throw new Error('Payment was not successful');
      }
      
    } catch (error) {
      console.error('❌ Payment processing error:', error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      setPaymentError(error.message || 'Payment processing failed');
      setPaymentStatus('failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatusModalClose = () => {
    if (paymentStatus === 'success') {
      setPaymentStatus(null);
      setPaymentResult(null);
      navigation.navigate('OrderHistory');
    } else if (paymentStatus === 'failed') {
      setPaymentStatus(null);
      setPaymentError(null);
    }
  };

  if (!orderData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#34A853" />
          <Text style={styles.loadingText}>Loading Order...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
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
                    borderColor: '#E5E7EB',
                    borderWidth: 1,
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                  style={styles.cardField}
                  onCardChange={(cardDetails) => {
                    console.log('Card details:', cardDetails);
                    setCardValid(cardDetails.complete && !cardDetails.validNumber === false);
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
            (isProcessing || Platform.OS === 'web' || !stripeInitialized || !cardValid) && styles.payButtonDisabled
          ]}
          onPress={Platform.OS === 'web' ? () => Alert.alert('Mobile App Required', 'Please use the mobile app for payments') : processPayment}
          disabled={isProcessing || Platform.OS === 'web' || !stripeInitialized || !cardValid}
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
        
        {Platform.OS !== 'web' && (
          <Text style={styles.testCardNote}>
            For testing, use card: 4242 4242 4242 4242, any future date, any CVV
          </Text>
        )}
      </View>

      {/* Payment Status Modal */}
      <PaymentStatusModal
        visible={paymentStatus !== null}
        status={paymentStatus}
        onClose={handleStatusModalClose}
        amount={amount}
        paymentId={paymentResult?.id}
        errorMessage={paymentError}
      />
    </SafeAreaView>
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
    paddingHorizontal: 4,
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
  testCardNote: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default PaymentScreen;
