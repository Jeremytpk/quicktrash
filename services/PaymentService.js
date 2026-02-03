import { Platform } from 'react-native';

// Configuration - set to false to use payment simulator for testing
const USE_REAL_PAYMENTS = process.env.EXPO_PUBLIC_USE_REAL_PAYMENTS === 'true';

// Check if we're on web platform
const isWeb = Platform.OS === 'web';

// Initialize stripe with publishable key
export const initializeStripe = async () => {
  if (isWeb) {
    // Skip Stripe initialization on web
    console.log('Stripe initialization skipped on web platform');
    return;
  }
  
  try {
    const { initStripe } = require('@stripe/stripe-react-native');
    const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      throw new Error('Stripe publishable key not found in environment variables');
    }
    
    await initStripe({
      publishableKey: publishableKey,
      merchantIdentifier: 'merchant.com.quicktrash.app', // for Apple Pay
    });
  } catch (error) {
    console.warn('Stripe initialization failed:', error);
  }
};

// Create payment method using Stripe CardField directly
export const createPaymentMethod = async (cardFieldRef) => {
  if (isWeb) {
    throw new Error('Real Stripe payments not supported on web. Use mobile app.');
  }

  try {
    const { createPaymentMethod } = require('@stripe/stripe-react-native');
    
    const { error, paymentMethod } = await createPaymentMethod({
      paymentMethodType: 'Card',
      card: cardFieldRef,
    });

    if (error) {
      throw new Error(error.message);
    }

    return paymentMethod;
  } catch (error) {
    console.error('Error creating payment method:', error);
    throw error;
  }
};

// Payment simulator for testing
const simulatePayment = async (paymentMethod, amount) => {
  console.log('🎭 PAYMENT SIMULATOR - Processing simulated payment (no real charges)');
  console.log('📋 Payment Method ID:', paymentMethod.id);
  console.log('💰 Amount:', amount);
  console.log('⚠️  Note: This is a simulation - no actual payment will be processed');
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Simulate 95% success rate (5% chance of failure for testing)
  if (Math.random() < 0.05) {
    throw new Error('Your card was declined. Please try a different payment method.');
  }
  
  // Simulate successful payment result
  const simulatedResult = {
    id: `payment_sim_${Date.now()}`,
    status: 'succeeded',
    amount: Math.round(amount * 100), // amount in cents
    currency: 'usd',
    paymentMethod: {
      id: paymentMethod.id,
      card: paymentMethod.card,
    },
    created: Date.now(),
  };
  
  console.log('✅ SIMULATED PAYMENT SUCCESSFUL - No real charge made');
  console.log('🆔 Simulated Payment ID:', simulatedResult.id);
  console.log('📊 Simulated Status:', simulatedResult.status);
  console.log('💰 Simulated Amount:', amount, 'USD');
  
  return simulatedResult;
};

// Process real payment with backend server
const processRealPayment = async (paymentMethod, amount, orderData = {}) => {
  console.log('💳 REAL PAYMENT PROCESSING - Charging actual payment method');
  console.log('📋 Payment Method ID:', paymentMethod.id);
  console.log('💰 Amount:', amount);
  console.log('🚨 WARNING: This will process a real payment charge');
  
  // Step 1: Create payment intent on backend
  const backendUrl = 'https://us-central1-quicktrash-1cdff.cloudfunctions.net/api';
  const response = await fetch(`${backendUrl}/create-payment-intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amount,
      currency: 'usd',
      orderData: orderData,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create payment intent');
  }

  const { clientSecret } = await response.json();
  
  // Step 2: Confirm payment with Stripe SDK
  const { confirmPayment } = require('@stripe/stripe-react-native');
  const { error, paymentIntent } = await confirmPayment(clientSecret, {
    paymentMethodType: 'Card',
    paymentMethod: paymentMethod,
  });

  if (error) {
    throw new Error(`Payment failed: ${error.message}`);
  }

  console.log('✅ REAL PAYMENT SUCCESSFUL - Payment has been charged');
  console.log('🆔 Payment Intent ID:', paymentIntent.id);
  console.log('📊 Payment Status:', paymentIntent.status);
  console.log('💰 Amount Charged:', paymentIntent.amount / 100, paymentIntent.currency.toUpperCase());
  
  return {
    id: paymentIntent.id,
    status: paymentIntent.status,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    paymentMethod: paymentMethod,
    created: paymentIntent.created,
  };
};

// Main payment processing function - uses real or simulated payments based on config
export const processStripePayment = async (paymentMethod, amount, orderData = {}) => {
  if (isWeb) {
    throw new Error('Stripe payments not supported on web. Use mobile app.');
  }

  // Log payment mode for debugging (console only, not visible to users)
  const mode = USE_REAL_PAYMENTS ? 'REAL PAYMENTS' : 'PAYMENT SIMULATOR';
  console.log(`\n🔄 Starting Payment Process - Mode: ${mode}`);
  console.log('=' .repeat(50));

  try {
    if (USE_REAL_PAYMENTS) {
      return await processRealPayment(paymentMethod, amount, orderData);
    } else {
      return await simulatePayment(paymentMethod, amount);
    }
  } catch (error) {
    console.error('❌ PAYMENT ERROR:', error.message);
    console.error('💡 Check console logs above for detailed payment information');
    throw error;
  }
};

// Card validation and formatting utilities
export const formatCardNumber = (value) => {
  const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  const matches = v.match(/\d{4,16}/g);
  const match = matches && matches[0] || '';
  const parts = [];
  for (let i = 0, len = match.length; i < len; i += 4) {
    parts.push(match.substring(i, i + 4));
  }
  if (parts.length) {
    return parts.join(' ');
  } else {
    return v;
  }
};

export const formatExpiryDate = (value) => {
  const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  if (v.length >= 2) {
    return v.substring(0, 2) + '/' + v.substring(2, 4);
  }
  return v;
};

export const validateCardNumber = (number) => {
  const regex = /^[0-9]{13,19}$/;
  return regex.test(number.replace(/\s/g, ''));
};

export const validateExpiryDate = (expiry) => {
  const regex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
  if (!regex.test(expiry)) return false;
  
  const [month, year] = expiry.split('/');
  const currentYear = new Date().getFullYear() % 100;
  const currentMonth = new Date().getMonth() + 1;
  
  const expYear = parseInt(year, 10);
  const expMonth = parseInt(month, 10);
  
  if (expYear < currentYear) return false;
  if (expYear === currentYear && expMonth < currentMonth) return false;
  
  return true;
};

export const validateCVV = (cvv) => {
  const regex = /^[0-9]{3,4}$/;
  return regex.test(cvv);
};

// Payment utility functions
export const PaymentService = {
  // Check if using real payments or simulator
  isUsingRealPayments: () => USE_REAL_PAYMENTS,
  
  // Get payment mode status
  getPaymentModeInfo: () => {
    return {
      mode: USE_REAL_PAYMENTS ? 'REAL' : 'SIMULATOR',
      description: USE_REAL_PAYMENTS 
        ? 'Real Stripe payments enabled - charges will be processed' 
        : 'Payment simulator enabled - no real charges will be made',
      icon: USE_REAL_PAYMENTS ? '💳' : '🎭'
    };
  },

  // Validate payment amount
  validatePaymentAmount: (amount) => {
    if (!amount || amount <= 0) {
      throw new Error('Invalid payment amount');
    }
    if (amount < 0.50) { // Stripe minimum
      throw new Error('Amount must be at least $0.50');
    }
    return true;
  },

  // Format amount for display
  formatAmount: (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  },
};

export default PaymentService;
