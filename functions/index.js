const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Ensure this is present if you use local .env variables

// Initialize Firebase Admin (needed for Firestore access)
admin.initializeApp();

// Initialize Stripe with secret key from environment or Firebase config
// NOTE: functions.config() is deprecated but kept for your current stable configuration.
const stripeSecret = process.env.STRIPE_SECRET_KEY || functions.config().stripe?.secret_key;
const stripe = require('stripe')(stripeSecret);
const app = express();

// Middleware
app.use(cors({ origin: true }));
// We only want JSON parsing for the standard endpoints, not the webhook, so we apply it here globally.
// NOTE: The webhook handler will use express.raw() to override this for its specific path.
app.use(express.json());

// --- HEALTH & DEBUG ---

// Health Check
// URL: /api/health
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'QuickTrash Payment Functions running' });
});

// Debug endpoint: Get Stripe account balance
// URL: /api/debug-stripe-balance
app.get('/debug-stripe-balance', async (req, res) => {
  try {
    const { connectedAccountId } = req.query;
    let balance;
    if (connectedAccountId) {
      console.log(`[DEBUG] Fetching balance for connected Stripe account: ${connectedAccountId}`);
      balance = await stripe.balance.retrieve({ stripeAccount: connectedAccountId });
    } else {
      console.log('[DEBUG] Fetching balance for platform Stripe account (using secret key)');
      balance = await stripe.balance.retrieve();
    }
    const available = (balance.available || [])
      .filter(b => b.currency === 'usd')
      .reduce((sum, b) => sum + (b.amount || 0), 0) / 100;
    res.json({ available });
  } catch (err) {
    console.error('Error fetching Stripe balance:', err);
    res.status(500).json({ error: 'Failed to fetch Stripe balance', details: String(err) });
  }
});

// --- CONNECTED ACCOUNTS & WITHDRAWAL LOGIC ---

// Create Connected Account
// Jey's Fix: Route is now '/create-connected-account' (removed redundant /api prefix)
// URL: /api/create-connected-account
app.post('/create-connected-account', async (req, res) => {
  try {
    const { email, userId } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });

    const account = await stripe.accounts.create({ type: 'express', email });
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: process.env.STRIPE_ONBOARDING_REFRESH_URL || 'https://example.com/refresh',
      return_url: process.env.STRIPE_ONBOARDING_RETURN_URL || 'https://example.com/return',
      type: 'account_onboarding',
    });

    if (userId) {
      try {
        await admin.firestore().collection('users').doc(userId).set({ stripeConnectedAccountId: account.id }, { merge: true });
      } catch (fw) {
        console.error('Failed to persist connected account id to Firestore', fw);
      }
    }

    res.json({ accountId: account.id, onboardingUrl: accountLink.url });
  } catch (err) {
    console.error('create-connected-account error', err);
    res.status(500).json({ error: err.message });
  }
});

// Attach external account (token)
// Jey's Fix: Route is now '/attach-external-account' (removed redundant /api prefix)
// URL: /api/attach-external-account
app.post('/attach-external-account', async (req, res) => {
  try {
    const { connectedAccountId, token, userId } = req.body;
    if (!connectedAccountId || !token) return res.status(400).json({ error: 'connectedAccountId and token required' });

    const externalAccount = await stripe.accounts.createExternalAccount(connectedAccountId, { external_account: token });

    if (userId) {
      try {
        const card = externalAccount;
        const cardMask = card.last4 ? `**** **** **** ${card.last4}` : 'card';
        const payoutDoc = {
          type: 'debit_card',
          cardMask,
          brand: card.brand || null,
          expMonth: card.exp_month || null,
          expYear: card.exp_year || null,
          externalAccountId: externalAccount.id,
          connectedAccountId: connectedAccountId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const docRef = await admin.firestore().collection('users').doc(userId).collection('payoutMethods').add(payoutDoc);
        return res.json({ externalAccount, payoutMethodId: docRef.id });
      } catch (fw) {
        console.error('Failed to persist external account in Firestore', fw);
      }
    }

    res.json({ externalAccount });
  } catch (err) {
    console.error('attach-external-account error', err);
    res.status(500).json({ error: err.message });
  }
});

// GET handler for browser testing (Withdrawal)
app.get('/withdraw-to-card', (req, res) => {
  res.json({ status: 'OK', message: 'WITHDRAW-TO-CARD endpoint is live. Use POST for actual withdraws.' });
});

// Withdraw handler
// Jey's Fix: Route is now '/withdraw-to-card' (removed redundant /api prefix)
// URL: /api/withdraw-to-card
app.post('/withdraw-to-card', async (req, res) => {
  try {
    const { amount, payoutMethodId, userId, userData, payoutMethod } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'amount must be > 0' });

    console.log('Withdraw request (functions)', { amount, payoutMethodId, userId });

    const payoutReq = {
      userId,
      payoutMethodId: payoutMethodId || null,
      amount: Number(amount),
      currency: 'usd',
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await admin.firestore().collection('payoutRequests').add(payoutReq);

    const allowLive = (functions.config && functions.config().payments && functions.config().payments.allow_live === 'true') || (process.env.ALLOW_LIVE_PAYOUTS === 'true');

    if (!allowLive) {
      return res.status(202).json({ message: 'Payout request recorded', payoutRequestId: ref.id });
    }

    if (payoutMethod && payoutMethod.type === 'debit_card' && payoutMethod.stripeToken) {
      let externalAccount;
      try {
        externalAccount = await stripe.accounts.createExternalAccount(
          process.env.STRIPE_PLATFORM_ACCOUNT_ID,
          { external_account: payoutMethod.stripeToken }
        );
      } catch (err) {
        console.error('Error attaching external account:', err);
        return res.status(500).json({ error: 'Failed to attach debit card for payout.' });
      }

      let payout;
      try {
        payout = await stripe.payouts.create({
          amount: Math.round(Number(amount) * 100),
          currency: 'usd',
          method: 'standard',
          statement_descriptor: 'QuickTrash Withdraw',
          destination: externalAccount.id,
        });
      } catch (err) {
        console.error('Error creating payout:', err);
        return res.status(500).json({ error: 'Failed to create payout to debit card.' });
      }

      await ref.update({ status: 'completed', stripePayoutId: payout.id });
      return res.json({ payout, method: 'direct_card' });
    }

    return res.status(400).json({ error: 'No valid payout method found. Must provide a debit card payout method with stripeToken.' });
  } catch (err) {
    console.error('withdraw-to-card error', err);
    return res.status(500).json({ error: 'withdraw-to-card-failed', details: String(err) });
  }
});


// --- PAYMENT INTENT & WEBHOOK LOGIC ---

// GET handler for browser testing
app.get('/create-payment-intent', (req, res) => {
  res.json({ status: 'OK', message: 'CREATE-PAYMENT-INTENT endpoint is live. Use POST with a JSON body for actual creation.' });
});

// Create payment intent endpoint
// Jey's Fix: Route is now '/create-payment-intent' (removed redundant /api prefix)
// URL: /api/create-payment-intent (requires POST)
app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd', customerId, orderData } = req.body;

    if (!amount || amount < 0.50) {
      return res.status(400).json({ error: 'Invalid amount. Minimum is $0.50' });
    }

    const amountInCents = Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency,
      customer: customerId || undefined,
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderId: orderData?.id || 'unknown',
        wasteType: orderData?.wasteType || 'unknown',
        customerId: customerId || 'guest',
      },
    });

    res.json({ clientSecret: paymentIntent.client_secret, id: paymentIntent.id, amount: paymentIntent.amount, currency: paymentIntent.currency });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent', details: error.message });
  }
});

// GET handler for browser testing (for webhook path verification)
app.get('/webhook', (req, res) => {
  res.json({ status: 'OK', message: 'WEBHOOK endpoint is live. This endpoint ONLY accepts raw POST requests from Stripe.' });
});

// Stripe webhook endpoint
// Jey's Fix: Route is now '/webhook' (removed redundant /api prefix)
// URL: /api/webhook (requires POST)
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  // Try to load webhook secret via process.env or functions.config() (deprecated)
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || functions.config().stripe?.webhook_secret;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('PaymentIntent was successful:', paymentIntent.id);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// Export the Express app as a Firebase Function named 'api'
exports.api = functions.https.onRequest(app);
