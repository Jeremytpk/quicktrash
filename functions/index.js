const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const functions = require('firebase-functions');

// Load local .env only when running locally
try {
  if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
  }
} catch (e) {
  console.log('dotenv not available or failed to load, skipping');
}

// Initialize Firebase Admin (needed for Firestore access)
admin.initializeApp();

// Initialize Stripe with secret key from environment variables
// Set STRIPE_SECRET_KEY in your .env file or Firebase environment config
const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) {
  console.warn('WARNING: No Stripe secret key found in environment. Stripe calls will fail until you set STRIPE_SECRET_KEY.');
}
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

// --- CONTRACTOR PAYOUT LOGIC ---
// Transfer funds from platform account to contractor via Express Connect account
// URL: /api/contractor-payout
app.post('/contractor-payout', async (req, res) => {
  try {
    const { userId, amount } = req.body;
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'userId and positive amount required' });
    }

    // Fetch contractor's data from Firestore
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const userData = userDoc.data();
    let stripeAccountId = userData.stripeConnectedAccountId;
    
    // If no Stripe Connect account exists, create an Express account
    if (!stripeAccountId) {
      console.log('Creating Stripe Express Connect account for user:', userId);
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: userData.email || '',
        business_type: 'individual',
        business_profile: {
          url: 'https://quicktrash.org'
        },
        capabilities: {
          transfers: { requested: true }
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'manual'
            }
          }
        },
        metadata: {
          userId: userId,
          createdBy: 'quicktrash_payout_system'
        }
      });
      stripeAccountId = account.id;
      
      // Save to Firestore
      await admin.firestore().collection('users').doc(userId).update({
        stripeConnectedAccountId: stripeAccountId
      });
      console.log('Created Stripe Express account:', stripeAccountId);
      
      // Return error asking user to complete onboarding first
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: 'https://quicktrash.org/payment-methods',
        return_url: 'https://quicktrash.org/payment-methods',
        type: 'account_onboarding',
        collect: 'currently_due' // Collect all currently required information including SSN, DOB
      });
      
      return res.status(400).json({ 
        success: false, 
        error: 'Account setup required',
        requiresOnboarding: true,
        onboardingUrl: accountLink.url,
        message: 'Please complete your payout account setup to enable withdrawals.'
      });
    }

    // Check if account has transfers capability enabled
    const account = await stripe.accounts.retrieve(stripeAccountId);
    if (!account.capabilities?.transfers || account.capabilities.transfers !== 'active') {
      // Generate new onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: 'https://quicktrash.org/payment-methods',
        return_url: 'https://quicktrash.org/payment-methods',
        type: 'account_onboarding',
        collect: 'currently_due'
      });
      
      return res.status(400).json({ 
        success: false, 
        error: 'Account setup incomplete',
        requiresOnboarding: true,
        onboardingUrl: accountLink.url,
        message: 'Please complete your payout account setup to enable withdrawals.'
      });
    }

    // Check if account has external accounts (bank/card) for payouts
    const externalAccounts = await stripe.accounts.listExternalAccounts(
      stripeAccountId,
      { object: 'bank_account', limit: 1 }
    );
    
    if (externalAccounts.data.length === 0) {
      // No bank account added, need to complete onboarding
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: 'https://quicktrash.org/payment-methods',
        return_url: 'https://quicktrash.org/payment-methods',
        type: 'account_onboarding',
        collect: 'currently_due'
      });
      
      return res.status(400).json({ 
        success: false, 
        error: 'Bank account required',
        requiresOnboarding: true,
        onboardingUrl: accountLink.url,
        message: 'Please add a bank account or debit card to receive payouts.'
      });
    }

    // Create a transfer from your platform account to the contractor's connected account
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100), // Amount in cents
      currency: 'usd',
      destination: stripeAccountId,
      description: `Payout to contractor ${userId}`,
      metadata: {
        userId: userId,
        type: 'contractor_payout'
      }
    });

    console.log(`Transfer created: ${transfer.id} for $${amount} to account ${stripeAccountId}`);

    // Try to trigger an instant payout from their Connect account balance to their bank/card
    try {
      const payout = await stripe.payouts.create(
        {
          amount: Math.round(amount * 100),
          currency: 'usd',
          method: 'instant',
          statement_descriptor: 'QuickTrash Payout'
        },
        {
          stripeAccount: stripeAccountId // Create payout on their Connect account
        }
      );
      console.log(`Instant payout created: ${payout.id}`);
      res.json({ success: true, transfer, payout });
    } catch (payoutError) {
      console.log('Instant payout failed, will use standard payout:', payoutError.message);
      // If instant payout fails, try standard payout
      try {
        const payout = await stripe.payouts.create(
          {
            amount: Math.round(amount * 100),
            currency: 'usd',
            method: 'standard',
            statement_descriptor: 'QuickTrash Payout'
          },
          {
            stripeAccount: stripeAccountId
          }
        );
        console.log(`Standard payout created: ${payout.id}`);
        res.json({ success: true, transfer, payout });
      } catch (standardPayoutError) {
        console.log('Standard payout also failed:', standardPayoutError.message);
        // Transfer succeeded but payout failed - funds are in their Stripe balance
        res.json({ 
          success: true, 
          transfer, 
          message: 'Transfer completed. Funds will be paid out according to the account schedule.'
        });
      }
    }
  } catch (error) {
    console.error('contractor-payout error:', error);
    res.status(500).json({ success: false, error: error.message });
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

    // Create Express account - simpler setup for receiving transfers
    // Express accounts can receive transfers once they add a bank account or debit card
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      country: 'US', // Required for Express accounts
      capabilities: {
        transfers: { requested: true }, // Enable transfers to receive payouts
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

    // Create onboarding link so contractor can add bank/debit card and complete all required info
    // This enables the transfers capability and ensures compliance
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: 'https://quicktrash.org/payment-methods',
      return_url: 'https://quicktrash.org/payment-methods',
      type: 'account_onboarding',
      collect: 'currently_due', // Force Stripe to collect all required info (DOB, SSN, etc.)
    });

    res.json({ success: true, accountId: account.id, onboardingUrl: accountLink.url });
  } catch (err) {
    console.error('create-connected-account error', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update contractor information (SSN, DOB, address) for Stripe Connect account
// URL: /api/update-contractor-info
// Note: Express accounts don't allow updating individual info via API
// This endpoint generates an onboarding link with prefilled data
app.post('/update-contractor-info', async (req, res) => {
  try {
    const { userId, accountId, individual } = req.body;
    
    console.log('=== UPDATE CONTRACTOR INFO REQUEST ===');
    console.log('userId:', userId);
    console.log('accountId:', accountId);
    console.log('individual data:', JSON.stringify(individual, null, 2));
    
    if (!accountId || !individual) {
      console.log('ERROR: Missing accountId or individual data');
      return res.status(400).json({ success: false, error: 'accountId and individual data required' });
    }

    console.log('Fetching account to check status...');
    const account = await stripe.accounts.retrieve(accountId);
    console.log('Account type:', account.type);
    console.log('Requirements currently_due:', account.requirements?.currently_due);
    
    // For Express accounts, we can't update individual info directly
    // We need to create an onboarding link for them to complete
    console.log('Creating account onboarding link...');
    
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: 'https://quicktrash.org/payment-methods',
      return_url: 'https://quicktrash.org/payment-methods',
      type: 'account_onboarding',
      collect: 'currently_due'
    });

    console.log('✅ Created onboarding link');

    res.json({
      success: true,
      requiresOnboarding: true,
      onboardingUrl: accountLink.url,
      message: 'Please complete verification through Stripe to enable payouts.'
    });
    
  } catch (err) {
    console.error('❌ update-contractor-info error:', err);
    console.error('Error code:', err.code);
    console.error('Error type:', err.type);
    console.error('Error message:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Request Contractor Verification - Creates account and triggers Stripe verification emails
// URL: /api/request-contractor-verification
app.post('/request-contractor-verification', async (req, res) => {
  try {
    const { userId } = req.body;
    
    console.log('=== REQUEST CONTRACTOR VERIFICATION ===');
    console.log('userId:', userId);
    
    if (!userId) {
      console.log('ERROR: Missing userId');
      return res.status(400).json({ success: false, error: 'userId required' });
    }

    // Get user's Stripe account ID from Firestore
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.log('ERROR: User not found in Firestore');
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userData = userDoc.data();
    let stripeAccountId = userData.stripeConnectedAccountId;
    const userEmail = userData.email || userData.contactEmail;

    console.log('User email:', userEmail);
    console.log('Existing Stripe account ID:', stripeAccountId);

    // If Stripe account already exists
    if (stripeAccountId) {
      console.log('Account already exists, creating account link to trigger email...');
      
      // Create an account link to trigger Stripe's verification email
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: 'https://quicktrash.org/payment-methods',
        return_url: 'https://quicktrash.org/payment-methods',
        type: 'account_onboarding',
        collect: 'currently_due'
      });

      console.log('✅ Created account link - Stripe will send verification email');

      res.json({
        success: true,
        message: 'A verification link has been sent to your email by Stripe',
        email: userEmail,
        accountId: stripeAccountId
      });
      return;
    }

    // Create new Express Connect account
    console.log('Creating new Express Connect account...');
    
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: userEmail,
      business_type: 'individual',
      business_profile: {
        url: 'https://quicktrash.org'
      },
      capabilities: {
        card_payments: { requested: false },
        transfers: { requested: true }
      },
      settings: {
        payouts: {
          schedule: { interval: 'manual' }
        }
      },
      metadata: {
        userId: userId,
        platform: 'quicktrash'
      }
    });

    stripeAccountId = account.id;
    console.log('✅ Created Stripe account:', stripeAccountId);

    // Save to Firestore
    await admin.firestore().collection('users').doc(userId).update({
      stripeConnectedAccountId: stripeAccountId,
      stripeAccountCreatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Create an account link to trigger Stripe's verification email
    console.log('Creating account link to trigger verification email...');
    
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: 'https://quicktrash.org/payment-methods',
      return_url: 'https://quicktrash.org/payment-methods',
      type: 'account_onboarding',
      collect: 'currently_due'
    });

    console.log('✅ Created account link - Stripe will send verification email to:', userEmail);

    // Note: When you create an account link, Stripe sends an email to the connected account's
    // email address with the verification link. The email contains "Request Information" links
    // for SSN, DOB, and other required fields.

    res.json({
      success: true,
      message: 'Your Stripe payout account has been created! Check your email for a verification link from Stripe.',
      email: userEmail,
      accountId: stripeAccountId
    });
    
  } catch (err) {
    console.error('❌ request-contractor-verification error:', err);
    console.error('Error code:', err.code);
    console.error('Error type:', err.type);
    console.error('Error message:', err.message);
    res.status(500).json({ success: false, error: err.message });
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

// List all Stripe Connected Accounts
// URL: /api/list-stripe-accounts
app.get('/list-stripe-accounts', async (req, res) => {
  try {
    // List all connected accounts (paginated)
    let accounts = [];
    let starting_after = undefined;
    let has_more = true;
    while (has_more) {
      const resp = await stripe.accounts.list({ limit: 100, starting_after });
      accounts = accounts.concat(resp.data.map(acc => ({
        id: acc.id,
        email: acc.email,
        name: acc.individual ? `${acc.individual.first_name || ''} ${acc.individual.last_name || ''}`.trim() : '',
        status: acc.charges_enabled && acc.payouts_enabled ? 'active' : 'pending',
      })));
      has_more = resp.has_more;
      if (has_more) starting_after = resp.data[resp.data.length - 1].id;
    }
    res.json({ success: true, accounts });
  } catch (err) {
    console.error('Error listing Stripe accounts:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Stripe Connected Account Details
// URL: /api/get-stripe-account-details?id=acct_xxx
app.get('/get-stripe-account-details', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing account id' });
    const account = await stripe.accounts.retrieve(id);
    res.json({ success: true, account });
  } catch (err) {
    console.error('Error fetching Stripe account details:', err);
    res.status(500).json({ error: err.message });
  }
});

// Request Stripe Remediation Link (Request Information)
// URL: /api/request-stripe-remediation-link
app.post('/request-stripe-remediation-link', async (req, res) => {
  try {
    const { accountId } = req.body;
    if (!accountId) return res.status(400).json({ success: false, error: 'Missing accountId' });

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: 'https://quicktrash.org/payment-methods',
      return_url: 'https://quicktrash.org/payment-methods',
      type: 'account_onboarding',
      collect: 'currently_due'
    });

    res.json({ success: true, url: accountLink.url });
  } catch (err) {
    console.error('Error creating Stripe remediation link:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export the Express app as a Firebase Function named 'api'
// Local run support: start Express server if run directly

// --- SEND REMEDIATION LINK EMAIL ENDPOINT ---
// URL: /api/send-remediation-link-email
const nodemailer = require('nodemailer');
app.post('/send-remediation-link-email', async (req, res) => {
  try {
    const { to, subject, message, remediationLink } = req.body;
    const missingFields = [];
    if (!to) missingFields.push('to');
    if (!subject) missingFields.push('subject');
    if (!message) missingFields.push('message');
    if (!remediationLink) missingFields.push('remediationLink');
    if (missingFields.length > 0) {
      console.log('Missing required fields in /send-remediation-link-email:', missingFields);
      return res.status(400).json({ success: false, error: 'Missing required fields', missingFields });
    }

    // Configure transporter (use environment variables for credentials)
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html: `<p>${message}</p><p><a href="${remediationLink}">${remediationLink}</a></p>`
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to send email:', err);
    res.status(500).json({ success: false, error: 'Failed to send email', details: String(err) });
  }
});

if (require.main === module) {
  const port = process.env.PORT || 5001;
  app.listen(port, () => {
    console.log(`Express server running locally on port ${port}`);
  });
}

// Export the Express app as a Firebase Function named 'api'
// The secret will be available through process.env.STRIPE_SECRET_KEY automatically
exports.api = functions.https.onRequest(app);
