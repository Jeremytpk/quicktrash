import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { useUser } from '../contexts/UserContext';
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc, deleteField, updateDoc } from 'firebase/firestore';

const ContractorStripe = ({ navigation }) => {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState(null);
  const [onboardingUrl, setOnboardingUrl] = useState(null);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [onboardingError, setOnboardingError] = useState(false);
  const [onboardingErrorMessage, setOnboardingErrorMessage] = useState('');

  useEffect(() => {
    const fetchStripeAccount = async () => {
      if (!user?.uid) return;
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const acctId = userDoc.data().stripeConnectedAccountId || null;
          setStripeAccountId(acctId);

          // If an account ID exists, request an onboarding link from backend
          if (acctId) {
            // helper to fetch onboarding link; extracted so Retry can call it
            const fetchOnboarding = async (showErrors = false) => {
              setOnboardingLoading(true);
              setOnboardingError(false);
              setOnboardingErrorMessage('');
              try {
                const resp = await fetch('https://us-central1-quicktrash-1cdff.cloudfunctions.net/api/create-onboarding-link', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ accountId: acctId }),
                });

                const contentType = resp.headers.get('content-type') || '';
                if (!resp.ok) {
                  const txt = await resp.text();
                  const msg = `status ${resp.status}: ${txt}`;
                  console.log('create-onboarding-link error:', msg);
                  setOnboardingError(true);
                  setOnboardingErrorMessage(msg);
                  if (showErrors) Alert.alert('Error', 'Failed to fetch onboarding link. Tap Retry to try again.');
                  return;
                }

                if (contentType.includes('application/json')) {
                  const j = await resp.json();
                  if (j.onboardingUrl) {
                    setOnboardingUrl(j.onboardingUrl);
                    setOnboardingError(false);
                    setOnboardingErrorMessage('');
                  } else {
                    const msg = `no onboardingUrl in JSON: ${JSON.stringify(j)}`;
                    console.log('create-onboarding-link missing url:', j);
                    setOnboardingError(true);
                    setOnboardingErrorMessage(msg);
                    if (showErrors) Alert.alert('Error', 'Failed to fetch onboarding link. Tap Retry to try again.');
                  }
                } else {
                  const txt = await resp.text();
                  const msg = `non-json response: ${txt}`;
                  console.log('create-onboarding-link returned non-JSON response:', txt);
                  setOnboardingError(true);
                  setOnboardingErrorMessage(msg);
                  if (showErrors) Alert.alert('Error', 'Failed to fetch onboarding link. Tap Retry to try again.');
                }
              } catch (e) {
                console.log('Failed to fetch onboarding link for existing account:', e);
                setOnboardingError(true);
                setOnboardingErrorMessage(String(e));
                if (showErrors) Alert.alert('Error', 'Failed to fetch onboarding link. Tap Retry to try again.');
              } finally {
                setOnboardingLoading(false);
              }
            };

            // fetch initially without showing alerts (silent)
            await fetchOnboarding(false);

            // attach retry function to component scope
            fetchOnboardingRef.current = fetchOnboarding;
          }
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to fetch Stripe account info.');
      }
      setLoading(false);
    };
    fetchStripeAccount();
  }, [user]);

  // ref to hold retry function created dynamically in effect
  const fetchOnboardingRef = React.useRef(null);

  const handleRetryOnboarding = async () => {
    if (fetchOnboardingRef.current) {
      await fetchOnboardingRef.current(true);
    } else if (stripeAccountId) {
      // fallback: call endpoint directly and show errors
      setOnboardingLoading(true);
      try {
        const resp = await fetch('https://us-central1-quicktrash-1cdff.cloudfunctions.net/api/create-onboarding-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId: stripeAccountId }),
        });
        if (!resp.ok) {
          const txt = await resp.text();
          setOnboardingError(true);
          setOnboardingErrorMessage(`status ${resp.status}: ${txt}`);
          Alert.alert('Error', 'Failed to fetch onboarding link.');
        } else {
          const j = await resp.json();
          if (j.onboardingUrl) {
            setOnboardingUrl(j.onboardingUrl);
            setOnboardingError(false);
            setOnboardingErrorMessage('');
          } else {
            setOnboardingError(true);
            setOnboardingErrorMessage('no onboardingUrl in response');
            Alert.alert('Error', 'Failed to fetch onboarding link.');
          }
        }
      } catch (e) {
        setOnboardingError(true);
        setOnboardingErrorMessage(String(e));
        Alert.alert('Error', 'Failed to fetch onboarding link.');
      } finally {
        setOnboardingLoading(false);
      }
    } else {
      Alert.alert('Error', 'No connected account id found to retry onboarding.');
    }
  };

  const handleCreateAccount = async () => {
    if (!user?.uid || !user?.email) return;
    setLoading(true);
    try {
      // Call backend API to create Stripe account for payouts only
      const res = await fetch('https://us-central1-quicktrash-1cdff.cloudfunctions.net/api/create-connected-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, userId: user.uid })
      });
      const data = await res.json();
      if (data.accountId) {
        setStripeAccountId(data.accountId);
        await updateDoc(doc(db, 'users', user.uid), { stripeConnectedAccountId: data.accountId });
        Alert.alert('Success', 'Payment account created. You can now receive payouts.');
      } else {
        Alert.alert('Error', 'Payment account creation failed.');
      }
    } catch (error) {
      console.log('Payment account creation error:', error);
      Alert.alert('Error', 'Failed to create Payment account.');
    }
    setLoading(false);
  };

  const handleEditAccount = () => {
    if (onboardingUrl) {
      // Navigate using the navigation prop passed to this screen.
      try {
        navigation.navigate('WebViewScreen', { url: onboardingUrl, title: 'Stripe Onboarding' });
      } catch (err) {
        // If navigation fails for any reason, show an error and allow retry
        console.log('Navigation to WebViewScreen failed:', err);
        Alert.alert('Error', 'Unable to open onboarding. Please try again.');
      }
    } else {
      // Offer retry if onboardingUrl not available
      Alert.alert(
        'Onboarding link not ready',
        'Unable to load the onboarding link. Would you like to retry?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => handleRetryOnboarding() },
        ],
      );
    }
  };

  const handleRemoveAccount = async () => {
    if (!user?.uid || !stripeAccountId) return;
    setLoading(true);
    try {
      // Call backend API to delete Stripe account from Stripe
      const res = await fetch('https://us-central1-quicktrash-1cdff.cloudfunctions.net/api/delete-stripe-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: stripeAccountId, userId: user.uid })
      });
      const rawText = await res.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (jsonError) {
        console.log('Raw backend response (not JSON):', rawText);
        Alert.alert('Error', `Backend did not return JSON. Raw response: ${rawText}`);
        setLoading(false);
        return;
      }
      if (data.success) {
        try {
          await updateDoc(doc(db, 'users', user.uid), { stripeConnectedAccountId: deleteField() });
          setStripeAccountId(null);
          setOnboardingUrl(null);
          Alert.alert('Success', 'Stripe account removed from both QuickTrash and Stripe.');
        } catch (firestoreError) {
          console.log('Firestore error during Stripe account removal:', firestoreError);
          Alert.alert('Error', `Stripe removed, but failed to update Firestore: ${firestoreError.message || firestoreError}`);
        }
      } else {
        console.log('Backend error during Stripe account removal:', data);
        Alert.alert('Error', `Failed to remove Stripe account from Stripe. Details: ${data.error || JSON.stringify(data)}`);
      }
    } catch (error) {
      console.log('General error during Stripe account removal:', error);
      Alert.alert('Error', `Failed to remove Stripe account. Details: ${error.message || error}`);
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment Account Management</Text>
      {loading && <ActivityIndicator size="large" color="#34A853" />}
      {stripeAccountId ? (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>Connected Account ID:</Text>
          <Text style={styles.accountId}>{stripeAccountId}</Text>
          <Text style={styles.infoText}>This account is for receiving payouts only.</Text>
          <TouchableOpacity style={[styles.button, styles.removeButton]} onPress={handleRemoveAccount}>
            <Text style={styles.buttonText}>Remove Account</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleCreateAccount}>
          <Text style={styles.buttonText}>Create Payment Account</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
    color: '#1F2937',
  },
  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  accountId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 16,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  errorSubText: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  button: {
    backgroundColor: '#34A853',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginVertical: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  removeButton: {
    backgroundColor: '#DC2626',
  },
});

export default ContractorStripe;
