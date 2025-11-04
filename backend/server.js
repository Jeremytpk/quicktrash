const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'QuickTrash Payment Server is running' });
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
      id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
    });
  } catch (error) {
    console.error('Payment intent creation error:', error);
    res.status(500).json({ 
      error: error.message,
      type: 'payment_intent_creation_failed'
    });
  }
});

// Create a Stripe Express connected account for a contractor and return onboarding link
app.post('/api/create-connected-account', async (req, res) => {
  try {
    const { email, refresh_url, return_url } = req.body;

    if (!email) return res.status(400).json({ error: 'email required' });

    // Create an Express account
    const account = await stripe.accounts.create({
      type: 'express',
      email,
    });

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: refresh_url || (process.env.STRIPE_ONBOARDING_REFRESH_URL || 'https://example.com/refresh'),
      return_url: return_url || (process.env.STRIPE_ONBOARDING_RETURN_URL || 'https://example.com/return'),
      type: 'account_onboarding',
    });

    res.json({ accountId: account.id, onboardingUrl: accountLink.url });
  } catch (err) {
    console.error('Error creating connected account:', err);
    res.status(500).json({ error: err.message });
  }
});

// Attach an external account (card token) to an existing connected account
app.post('/api/attach-external-account', async (req, res) => {
  try {
    const { connectedAccountId, token } = req.body;

    if (!connectedAccountId || !token) {
      return res.status(400).json({ error: 'connectedAccountId and token are required' });
    }

    // Attach token as external account to the connected account
    const externalAccount = await stripe.accounts.createExternalAccount(
      connectedAccountId,
      { external_account: token }
    );

    res.json({ externalAccount });
  } catch (err) {
    console.error('Error attaching external account:', err);
    res.status(500).json({ error: err.message });
  }
});

// Placeholder: Withdraw to card endpoint
// NOTE: Implement server-side Stripe transfer/payout logic here using Connect and external accounts.
app.post('/api/withdraw-to-card', async (req, res) => {
  try {
    const { amount, payoutMethodId, userId, userData, payoutMethod } = req.body;

    if (!amount || !payoutMethodId || !userId || !payoutMethod) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    // Convert amount to cents
    const amountInCents = Math.round(amount * 100);

    // If contractor has a Stripe account, use Connect payout (legacy support)
    if (userData && userData.stripeAccountId) {
      const payout = await stripe.payouts.create({
        amount: amountInCents,
        currency: 'usd',
        method: 'standard',
        statement_descriptor: 'QuickTrash Withdraw',
      }, {
        stripeAccount: userData.stripeAccountId
      });
      return res.json({ payout, method: 'stripe_connect' });
    }

    // Otherwise, use debit card token for direct payout
    // payoutMethod should contain the Stripe token/id for the card
    if (payoutMethod.type === 'debit_card' && payoutMethod.stripeToken) {
      // Attach card as external account to platform Stripe account
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

      // Create payout to the attached card
      let payout;
      try {
        payout = await stripe.payouts.create({
          amount: amountInCents,
          currency: 'usd',
          method: 'standard',
          statement_descriptor: 'QuickTrash Withdraw',
          destination: externalAccount.id,
        });
      } catch (err) {
        console.error('Error creating payout:', err);
        return res.status(500).json({ error: 'Failed to create payout to debit card.' });
      }

      return res.json({ payout, method: 'direct_card' });
    }

    return res.status(400).json({ error: 'No valid payout method found.' });
  } catch (err) {
    console.error('Withdraw endpoint error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Confirm payment endpoint (optional - can be done client-side)
app.post('/api/confirm-payment', async (req, res) => {
  try {
    const { paymentIntentId, paymentMethodId } = req.body;

    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
    });

    res.json({
      id: paymentIntent.id,
      status: paymentIntent.status,
      client_secret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({ 
      error: error.message,
      type: 'payment_confirmation_failed'
    });
  }
});

// Webhook endpoint for Stripe events
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
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
      // TODO: Update your database with successful payment
      break;
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('Payment failed:', failedPayment.id);
      // TODO: Handle failed payment
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 QuickTrash Payment Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`💳 Payment endpoint: http://localhost:${PORT}/api/create-payment-intent`);
});

module.exports = app;
