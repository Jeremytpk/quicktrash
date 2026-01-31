#!/usr/bin/env bash
set -e

# Usage: ./scripts/set_stripe_key.sh <STRIPE_SECRET_KEY>
# This script sets the Stripe secret into Firebase functions config and deploys functions.
# WARNING: Do NOT paste secrets into public places. Run this locally on your machine.

if [ -z "$1" ]; then
  echo "Usage: $0 <STRIPE_SECRET_KEY>"
  exit 1
fi

KEY="$1"

echo "Setting Firebase functions config stripe.secret (not committing to repo)"
firebase functions:config:set stripe.secret="$KEY"

echo "Deploying functions..."
firebase deploy --only functions

echo "Done. IMPORTANT: Revoke the old key in the Stripe dashboard immediately." 
