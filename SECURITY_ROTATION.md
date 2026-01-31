# Stripe API Key Rotation & Secure Deployment (Quick reference)

This document shows safe steps to rotate a compromised Stripe secret and update your Firebase Functions without committing secrets to the repo.

IMPORTANT: Do not paste or commit secret keys into source control or chat. Run commands locally in your terminal.

Steps — quick path (firebase functions:config)

1) Create a new secret key in the Stripe dashboard
   - Go to Developers → API keys → Create restricted key or rotate/create a new secret key.
   - Revoke the old key after you've confirmed the new key is deployed.

2) Set the new key in Firebase functions config (run locally)

   ```bash
   # from project root
   ./scripts/set_stripe_key.sh sk_live_XXXXXXXXXXXXXXXXXXXX
   ```

   The script will run:
   - `firebase functions:config:set stripe.secret="<KEY>"`
   - `firebase deploy --only functions`

   You can also run the two commands manually if you prefer:

   ```bash
   firebase functions:config:set stripe.secret="sk_live_XXXXXXXXXXXXXXXXXXXX"
   firebase deploy --only functions
   ```

3) Verify the deployment
   - Call a debug endpoint like `/api/debug-stripe-balance` that uses the Stripe secret to confirm the functions can access Stripe with the new key.

4) Revoke the old key in Stripe dashboard
   - After verifying everything works, revoke the exposed key immediately.

Optional: Use Google Cloud Secret Manager (recommended for production)

1) Create a secret and add a version:

   ```bash
   # create secret (one-time)
   gcloud secrets create stripe-secret --replication-policy="automatic"

   # add a secret value
   echo -n "sk_live_XXXXXXXXXXXXXXXXXXXX" | gcloud secrets versions add stripe-secret --data-file=-
   ```

2) Give your Cloud Functions service account access:

   ```bash
   PROJECT_ID=$(gcloud config get-value project)
   SA="$(gcloud projects get-iam-policy ${PROJECT_ID} --flatten="bindings[].members" --format="value(bindings.members)" | grep serviceAccount | head -n1)"
   gcloud secrets add-iam-policy-binding stripe-secret --member="${SA}" --role="roles/secretmanager.secretAccessor"
   ```

   (Alternatively assign the role to the functions runtime service account explicitly.)

3) Read the secret at runtime in your function (example snippet):

   ```js
   // using @google-cloud/secret-manager
   const {SecretManagerServiceClient} = require('@google-cloud/secret-manager');
   const client = new SecretManagerServiceClient();

   async function getStripeSecret() {
     const [version] = await client.accessSecretVersion({ name: `projects/${process.env.GCP_PROJECT}/secrets/stripe-secret/versions/latest` });
     const payload = version.payload.data.toString('utf8');
     return payload;
   }
   ```

4) Deploy your functions and ensure the code reads from Secret Manager at cold start or cached locally in memory.

Notes & best practices
- Never commit secrets. Use environment mechanisms (firebase functions config, Secret Manager, CI secrets).
- Restrict API key permissions in Stripe (use restricted keys whenever possible).
- Rotate keys immediately if exposed and audit recent usage in Stripe's logs.
- Use logging and monitoring to watch for failed webhook or API calls after rotation.

If you want, I can produce the exact Secret Manager setup commands tailored to your GCP project and add a small helper to read the secret in `functions/index.js` (non-blocking).