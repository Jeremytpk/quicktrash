const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');

// This uses the DEPRECATED functions.config() API. 
// This will work for now, but must be migrated before March 2026.
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || functions.config().stripe?.secret_key;
const stripe = require('stripe')(stripeSecretKey);

const app = express();

// Middleware
app.use(cors({
  origin: true // Allow all origins for Firebase Functions
}));

// We only want JSON parsing for the standard endpoints, not the webhook
app.use(express.json());

// --- CORE APPLICATION ENDPOINTS ---
// Delete Stripe account endpoint
// URL: /api/delete-stripe-account (requires POST)
app.post('/delete-stripe-account', async (req, res) => {
  try {
    const { accountId, userId } = req.body;
    if (!accountId || !userId) {
      return res.status(400).json({ success: false, error: 'Missing accountId or userId' });
    }

    // Delete Stripe account
    let deletedStripeAccount;
    try {
      deletedStripeAccount = await stripe.accounts.del(accountId);
    } catch (stripeError) {
      return res.status(500).json({ success: false, error: `Stripe error: ${stripeError.message}` });
    }

    // Optionally, remove from Firestore (if using admin SDK)
    // const admin = require('firebase-admin');
    // await admin.firestore().collection('users').doc(userId).update({ stripeConnectedAccountId: admin.firestore.FieldValue.delete() });

    res.json({ success: true, deletedStripeAccount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
// URL: /api/health
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'QuickTrash Payment Server is running on Firebase Functions',
    timestamp: new Date().toISOString()
  });
});

// GET handler for browser testing
app.get('/create-payment-intent', (req, res) => {
  res.json({ status: 'OK', message: 'CREATE-PAYMENT-INTENT endpoint is live. Use POST with a JSON body for actual creation.' });
});

// Create payment intent endpoint
// URL: /api/create-payment-intent (requires POST)
app.post('/create-payment-intent', async (req, res) => {
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

// GET handler for browser testing (for webhook path verification)
app.get('/webhook', (req, res) => {
  res.json({ status: 'OK', message: 'WEBHOOK endpoint is live. This endpoint ONLY accepts raw POST requests from Stripe.' });
});

// Stripe webhook endpoint
// URL: /api/webhook (requires POST)
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // The webhook secret is typically loaded via process.env
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || functions.config().stripe?.webhook_secret);
  } catch (err) {
  console.error('Webhook signature verification failed:', error.message);
  return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('PaymentIntent was successful:', paymentIntent.id);
      // TODO: Fulfill the order, update Firestore, send confirmation email.
      break;
    case 'payment_method.attached':
      const paymentMethod = event.data.object;
      console.log('PaymentMethod was attached to a Customer:', paymentMethod.id);
      // TODO: Update user's saved payment methods in Firestore.
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// Export the Express app as a Firebase Function named 'api'
exports.api = functions.https.onRequest(app);
