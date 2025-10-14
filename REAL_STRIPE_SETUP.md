# Backend API Setup for Real Stripe Payments

To enable real Stripe payments, you need to create a secure backend API endpoint that handles payment intent creation. Here's how to set it up:

## Required Backend Endpoint

Create an API endpoint at: `YOUR_BACKEND_URL/api/create-payment-intent`

### Example Backend Implementation (Node.js/Express)

```javascript
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();

app.use(express.json());

app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency, customerId, orderData } = req.body;

    // Validate the request
    if (!amount || amount < 50) { // Stripe minimum is $0.50
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // amount in cents
      currency: currency || 'usd',
      customer: customerId, // optional: Stripe customer ID
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId: orderData?.id || 'unknown',
        wasteType: orderData?.wasteType || 'unknown',
        // Add other relevant order metadata
      },
    });

    res.json({
      id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
    });
  } catch (error) {
    console.error('Payment intent creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => {
  console.log('Payment server running on port 3001');
});
```

### Environment Variables for Backend

```bash
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
# For production: sk_live_your_stripe_secret_key_here
```

## Update PaymentService Configuration

After setting up your backend, update the backend URL in `PaymentService.js`:

```javascript
// Replace this line in PaymentService.js:
const response = await fetch('YOUR_BACKEND_URL/api/create-payment-intent', {
// With your actual backend URL:
const response = await fetch('https://your-domain.com/api/create-payment-intent', {
```

## Security Considerations

1. **Never expose your Stripe secret key** in the mobile app
2. **Validate all payment requests** on your backend
3. **Use HTTPS** for all payment-related communications
4. **Implement proper authentication** for your API endpoints
5. **Log payment activities** for audit purposes
6. **Handle webhook events** from Stripe for payment confirmations

## Webhook Setup (Recommended)

Set up a webhook endpoint to handle payment confirmations:

```javascript
app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('Payment succeeded:', paymentIntent.id);
      // Update your database with successful payment
      break;
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('Payment failed:', failedPayment.id);
      // Handle failed payment
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
});
```

## Testing

1. Use Stripe test card numbers for testing:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Requires 3D Secure: `4000 0027 6000 3184`

2. Monitor payments in your Stripe Dashboard

## Production Checklist

- [ ] Replace test keys with live keys
- [ ] Set up proper SSL certificates
- [ ] Implement rate limiting
- [ ] Add logging and monitoring
- [ ] Test webhook endpoints
- [ ] Review Stripe compliance requirements
