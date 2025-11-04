// Web stub for @stripe/stripe-react-native
// This provides mock implementations for web builds

export const initStripe = async () => {
  console.log('Stripe initialization skipped on web');
  return Promise.resolve();
};

export const createPaymentMethod = async () => {
  throw new Error('Stripe payments not supported on web. Use mobile app.');
};

export const confirmPayment = async () => {
  throw new Error('Stripe payments not supported on web. Use mobile app.');
};

export const CardField = () => {
  throw new Error('CardField not supported on web. Use mobile app.');
};

// Default export for compatibility
export default {
  initStripe,
  createPaymentMethod,
  confirmPayment,
  CardField,
};
