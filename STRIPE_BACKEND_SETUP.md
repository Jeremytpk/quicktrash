# Stripe Payment Integration - Backend Setup Guide

## Overview
This document explains how to implement the secure backend for Stripe payment processing in your QuickTrash application.

## Current Implementation
The current app uses a **demo payment system** for development and testing purposes. The PaymentModal shows a credit card form but doesn't process real payments.

## Production Backend Setup

### 1. Create Backend API Endpoint

You need to create a secure backend server (Node.js, Python, PHP, etc.) with the following endpoint:

```javascript
// Node.js + Express example
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency, customerId, orderData } = req.body;
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency || 'usd',
      customer: customerId,
      metadata: {
        orderId: orderData?.orderId || '',
        customerEmail: orderData?.customerEmail || '',
        wasteType: orderData?.wasteType || '',
        volume: orderData?.volume || '',
      },
    });

    res.json({
      client_secret: paymentIntent.client_secret,
      id: paymentIntent.id,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

### 2. Update PaymentService.js

Replace the mock implementation in `services/PaymentService.js`:

```javascript
export const createPaymentIntent = async (amount, currency = 'usd', customerId, orderData) => {
  try {
    const response = await fetch('https://your-backend.com/api/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_TOKEN', // Your app's auth token
      },
      body: JSON.stringify({
        amount,
        currency,
        customerId,
        orderData
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};
```

### 3. Enable Real Stripe Payment Sheet

Update `components/PaymentModal.js` to use the real Stripe PaymentSheet:

```javascript
import { usePaymentSheet } from '@stripe/stripe-react-native';

const PaymentModal = ({ visible, onClose, amount, onPaymentSuccess, onPaymentError, orderData }) => {
  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();

  const initializePaymentSheet = async () => {
    try {
      const paymentIntent = await createPaymentIntent(amount, 'usd', orderData?.customerId, orderData);

      const { error } = await initPaymentSheet({
        merchantDisplayName: 'QuickTrash',
        paymentIntentClientSecret: paymentIntent.client_secret,
        defaultBillingDetails: {
          name: orderData?.customerName || '',
          email: orderData?.customerEmail || '',
        },
      });

      if (error) {
        console.error('Payment sheet initialization error:', error);
        onPaymentError('Failed to initialize payment');
      }
    } catch (error) {
      console.error('Payment initialization error:', error);
      onPaymentError('Failed to setup payment');
    }
  };

  const handlePayment = async () => {
    const { error } = await presentPaymentSheet();

    if (error) {
      if (error.code !== 'Canceled') {
        onPaymentError(error.message);
      }
      return;
    }

    onPaymentSuccess({
      paymentIntentId: paymentIntent.id,
      amount: amount,
      status: 'succeeded'
    });
  };

  // ... rest of component
};
```

## Security Considerations

### 1. Never Store Secret Keys in Client Code
- ✅ Store secret keys only on your backend server
- ✅ Use environment variables for sensitive data
- ❌ Never include secret keys in your mobile app code

### 2. API Authentication
- Implement proper authentication for your backend API
- Use JWT tokens or similar secure authentication methods
- Validate user permissions before processing payments

### 3. Webhook Handling
Set up Stripe webhooks to handle payment confirmations:

```javascript
app.post('/api/stripe-webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed.`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    // Update your database with successful payment
    updateOrderPaymentStatus(paymentIntent.metadata.orderId, 'paid');
  }

  res.json({ received: true });
});
```

## Environment Variables

Create a `.env` file on your backend:

```env
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
STRIPE_SECRET_KEY=replace_with_your_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret_here
```

## Testing

1. Use Stripe test cards for development:
   - Success: `4242 4242 4242 4242`
   - Declined: `4000 0000 0000 0002`
   - Authentication: `4000 0025 0000 3155`

2. Test webhook delivery using Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe-webhook
   ```

## Next Steps

1. Set up your backend server
2. Implement the payment intent endpoint
3. Update the mobile app to use real Stripe integration
4. Set up webhooks for payment confirmation
5. Test with Stripe test cards
6. Deploy to production with live keys

## Current Demo Features

The current implementation includes:
- ✅ Payment flow UI/UX
- ✅ Order creation with payment status
- ✅ Integration with Firebase for order storage
- ✅ Demo card form validation
- ✅ Success/error handling
- ❌ Real Stripe payment processing (requires backend)

Contact your development team to implement the backend integration following this guide.
