QuickTrash Firebase Functions for Payments

This folder contains Firebase Cloud Functions that expose a small Express app for payment-related endpoints (Stripe Connect onboarding, attach external account, withdraw placeholder).

Setup

1. Install dependencies inside functions/:
   cd functions
   npm install

2. Set environment variables in Firebase (or locally using .env when testing with emulators):
   firebase functions:config:set stripe.secret="<STRIPE_SECRET_KEY>" stripe.onboard_refresh="https://..." stripe.onboard_return="https://..."

   Note: In code we read process.env.STRIPE_SECRET_KEY directly; you can adapt to use functions.config() if preferred.

3. Deploy functions:
   firebase deploy --only functions

Local testing

- To run locally with the emulator:
  npx firebase emulators:start --only functions

Endpoints
- GET /.auth/health -> health check
- POST /api/create-connected-account
- POST /api/attach-external-account
- POST /api/withdraw-to-card (501 placeholder)
