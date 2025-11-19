const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
// Load local .env only when running locally (avoid requiring dotenv in Cloud Functions container)
try {
// Trigger a Stripe payout to contractor's account
// URL: /api/contractor-payout
app.post('/contractor-payout', async (req, res) => {
  try {
    const { userId, amount } = req.body;
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'userId and positive amount required' });
    }

    // Fetch contractor's Stripe account ID from Firestore
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    const data = userDoc.data();
    const stripeAccountId = data.stripeConnectedAccountId;
    if (!stripeAccountId) {
      return res.status(400).json({ error: 'Contractor does not have a Stripe account' });
    }

    // Create an instant payout to the contractor's Stripe account (card)
    // Amount must be in cents
    // You may want to check for eligible cards and handle errors if not eligible
    const payout = await stripe.payouts.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      method: 'instant',
    }, {
      stripeAccount: stripeAccountId
    });

    res.json({ success: true, payout });
  } catch (error) {
    console.error('contractor-payout error:', error);
    res.status(500).json({ error: error.message });
  }
});
  if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config(); // Ensure this is present if you use local .env variables
  }
} catch (e) {
  console.log('dotenv not available or failed to load, skipping');
}

// Initialize Firebase Admin (needed for Firestore access)
admin.initializeApp();

// Initialize Stripe with secret key from environment or Firebase config
// Use only process.env for Stripe secret (functions.config() is deprecated)
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = require('stripe')(stripeSecret);
const app = express();

// Middleware
app.use(cors({ origin: true }));
// We only want JSON parsing for the standard endpoints, not the webhook, so we apply it here globally.
// NOTE: The webhook handler will use express.raw() to override this for its specific path.
app.use(express.json());

// Delete Stripe Connected Account
// URL: /api/delete-stripe-account
app.post('/delete-stripe-account', async (req, res) => {
  try {
    const { accountId, userId } = req.body;
    if (!accountId) return res.status(400).json({ error: 'accountId required' });
    // Delete Stripe account
    let deletedAccount;
    try {
      deletedAccount = await stripe.accounts.del(accountId);
    } catch (stripeError) {
      console.error('Stripe account deletion error:', stripeError);
      return res.status(500).json({ error: 'Failed to delete Stripe account', details: String(stripeError) });
    }
    // Remove reference from Firestore if userId provided
    if (userId) {
      try {
        await admin.firestore().collection('users').doc(userId).update({ stripeConnectedAccountId: admin.firestore.FieldValue.delete() });
      } catch (fwError) {
        console.error('Failed to remove connected account id from Firestore', fwError);
        // Don't fail the whole request if Firestore update fails
      }
    }
    res.json({ success: true, deletedAccount });
  } catch (err) {
    console.error('delete-stripe-account error', err);
    res.status(500).json({ error: 'delete-stripe-account-failed', details: String(err) });
  }
});

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
// Attach payout card to Stripe connected account
// URL: /api/add-payout-card
app.all('/api/add-payout-card', async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed. Use POST.' });
  }
  try {
    const { userId, card } = req.body;
    if (!userId || !card || !card.number || !card.exp_month || !card.exp_year || !card.cvc) {
      return res.status(400).json({ success: false, message: 'Missing card details or userId' });
    }
    // Fetch contractor's Stripe account ID from Firestore
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const data = userDoc.data();
    const stripeAccountId = data.stripeConnectedAccountId;
    if (!stripeAccountId) {
      return res.status(400).json({ success: false, message: 'Contractor does not have a Stripe account' });
    }
    // Create a card token using Stripe API
    const token = await stripe.tokens.create({
      card: {
        number: card.number,
        exp_month: card.exp_month,
        exp_year: card.exp_year,
        cvc: card.cvc,
        name: card.name
      }
    });
    // Attach card as external account to Stripe connected account
    const externalAccount = await stripe.accounts.createExternalAccount(
      stripeAccountId,
      {
        external_account: token.id
      }
    );
    res.json({ success: true, externalAccount });
  } catch (error) {
    console.error('add-payout-card error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create Connected Account
// Jey's Fix: Route is now '/create-connected-account' (removed redundant /api prefix)
// URL: /api/create-connected-account
app.get('/create-connected-account', (req, res) => {
  res.json({ status: 'OK', message: 'Endpoint is live. Use POST for actual account creation.' });
});
app.post('/create-connected-account', async (req, res) => {
  try {
    const { email, userId } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });

    // Create Express account for individual payouts only
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      business_type: 'individual',
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: false }, // Not needed for contractors
      },
      settings: {
        payouts: {
          schedule: { delay_days: 2, interval: 'daily' },
        },
      },
    });

    // Save account ID to Firestore
    if (userId) {
      try {
        await admin.firestore().collection('users').doc(userId).set({ stripeConnectedAccountId: account.id }, { merge: true });
      } catch (fw) {
        console.error('Failed to persist connected account id to Firestore', fw);
      }
    }

    // No onboarding link needed; contractors only receive payouts
    res.json({ accountId: account.id });
  } catch (err) {
    console.error('create-connected-account error', err);
  res.status(500).json({ error: error.message });
  }
});

// Create onboarding link for an existing connected account
// URL: /api/create-onboarding-link
app.post('/create-onboarding-link', async (req, res) => {
  try {
    const { accountId } = req.body;
    if (!accountId) return res.status(400).json({ error: 'accountId required' });

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: process.env.STRIPE_ONBOARDING_REFRESH_URL || 'https://example.com/refresh',
      return_url: process.env.STRIPE_ONBOARDING_RETURN_URL || 'https://example.com/return',
      type: 'account_onboarding',
    });

    res.json({ onboardingUrl: accountLink.url });
  } catch (err) {
    console.error('create-onboarding-link error', err);
  res.status(500).json({ error: error.message });
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
  res.status(500).json({ error: error.message });
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
  console.error('Webhook signature verification failed:', error.message);
  return res.status(400).send(`Webhook Error: ${error.message}`);
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
// Local run support: start Express server if run directly
if (require.main === module) {
  const port = process.env.PORT || 5001;
  app.listen(port, () => {
    console.log(`Express server running locally on port ${port}`);
  });
}
const functions = require('firebase-functions');
exports.api = functions.https.onRequest(app);
