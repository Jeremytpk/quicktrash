const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');

// Initialize Stripe with secret key from environment or Firebase config
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || functions.config().stripe?.secret_key;
const stripe = require('stripe')(stripeSecretKey);

const app = express();

// Middleware
app.use(cors({
  origin: true // Allow all origins for Firebase Functions
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'QuickTrash Payment Server is running on Firebase Functions',
    timestamp: new Date().toISOString()
  });
});

// Create payment intent endpoint
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd', customerId, orderData } = req.body;

    // Validate the request
    if (!amount || amount < 0.50) {
      return res.status(400).json({ error: 'Invalid amount. Minimum is $0.50' });
    }

    // Convert amount to cents
    const amountInCents = Math.round(amount * 100);

    console.log(`Creating payment intent for $${amount} (${amountInCents} cents)`);

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency,
      customer: customerId || undefined,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId: orderData?.id || 'unknown',
        wasteType: orderData?.wasteType || 'unknown',
        customerId: customerId || 'guest',
        // Add other relevant order metadata
      },
    });

    console.log(`Payment intent created: ${paymentIntent.id}`);

    res.json({
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ 
      error: 'Failed to create payment intent',
      details: error.message 
    });
  }
});

// Stripe webhook endpoint
app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('PaymentIntent was successful:', paymentIntent.id);
      // Handle successful payment here
      break;
    case 'payment_method.attached':
      const paymentMethod = event.data.object;
      console.log('PaymentMethod was attached to a Customer:', paymentMethod.id);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// Export the Express app as a Firebase Function
exports.api = functions.https.onRequest(app);
