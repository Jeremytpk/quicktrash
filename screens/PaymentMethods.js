import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Linking } from 'react-native';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import { db } from '../firebaseConfig';
import { collection, getDocs, setDoc, doc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore';
import SharedHeader from '../components/SharedHeader';
import { useNavigation } from '@react-navigation/native';

const PaymentMethods = () => {
  const navigation = useNavigation();
  const { user } = useUser();
  const { createToken } = useStripe();
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [cardDetails, setCardDetails] = useState({});
  const [loading, setLoading] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState(null);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const [creatingStripeAccount, setCreatingStripeAccount] = useState(false);
  const [onboardingUrl, setOnboardingUrl] = useState(null);

  // Ensure this function is defined before the return statement
  const handleCreateStripeAccount = async () => {
    setCreatingStripeAccount(true);
    try {
      const res = await fetch('https://api-bzlaa2cuqa-uc.a.run.app/create-connected-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.email,
          userId: user?.uid
        })
      });
      const data = await res.json();
      if (data.success && data.onboardingUrl) {
        setOnboardingUrl(data.onboardingUrl);
        Alert.alert(
          'Stripe Onboarding',
          'To receive payouts, you must complete your Stripe onboarding on Stripe’s secure website. You will be asked to provide all required information, including your date of birth and the last 4 digits of your SSN, for identity verification.',
          [
            {
              text: 'Start Onboarding',
              onPress: () => {
                setTimeout(() => {
                  if (data.onboardingUrl) {
                    Linking.openURL(data.onboardingUrl);
                  }
                }, 300);
              }
            },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      } else {
        Alert.alert('Error', data.error || 'Failed to create Stripe account');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to create Stripe account');
    }
    setCreatingStripeAccount(false);
  };

  React.useEffect(() => {
  const handleCreateStripeAccount = async () => {
    setCreatingStripeAccount(true);
    try {
      const res = await fetch('https://api-bzlaa2cuqa-uc.a.run.app/create-connected-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.email,
          userId: user?.uid
        })
      });
      const data = await res.json();
      if (data.success && data.onboardingUrl) {
        setOnboardingUrl(data.onboardingUrl);
        Alert.alert(
          'Stripe Onboarding',
          'You need to complete your Stripe onboarding to receive payouts.',
          [
            {
              text: 'Start Onboarding',
              onPress: () => {
                setTimeout(() => {
                  if (data.onboardingUrl) {
                    Linking.openURL(data.onboardingUrl);
                  }
                }, 300);
              }
            },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      } else {
        Alert.alert('Error', data.error || 'Failed to create Stripe account');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to create Stripe account');
    }
    setCreatingStripeAccount(false);
  };
    const fetchAllMethods = async () => {
      if (!user?.uid) return;
      try {
        // Fetch user document to check for Stripe account
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setStripeAccountId(userData.stripeConnectedAccountId || null);
        }

        const paymentMethodsRef = collection(db, 'users', user.uid, 'paymentMethods');
        const payoutMethodsRef = collection(db, 'users', user.uid, 'payoutMethods');
        const [paymentSnap, payoutSnap] = await Promise.all([
          getDocs(paymentMethodsRef),
          getDocs(payoutMethodsRef)
        ]);
        // Combine payment methods (for customer payments) and payout methods (for contractor earnings)
        const paymentMethodsData = paymentSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'payment' }));
        const payoutMethodsData = payoutSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'payout' }));
        setPaymentMethods([...paymentMethodsData, ...payoutMethodsData]);
      } catch (error) {
        console.error('Error fetching payment/payout methods:', error);
      }
    };
    fetchAllMethods();
  }, [user]);

  const handleAddCard = async () => {
    if (!cardDetails.complete) {
      Alert.alert('Error', 'Please enter complete card details');
      return;
    }
    setLoading(true);
    try {
      // NOTE: createToken expects the type 'Card' in PascalCase
      const { token, error } = await createToken({ type: 'Card' });
      
      if (error || !token) {
        Alert.alert('Error', error?.message || 'Failed to create Stripe token');
        setLoading(false);
        return;
      }
      
      // For now, save card info locally to Firestore
      // The token contains card info like last4, brand, etc.
      const cardInfo = token.card || {};
      const newMethodData = {
        type: 'card',
        last4: cardInfo.last4 || '****',
        brand: cardInfo.brand || 'CARD',
        holderName: cardInfo.name || 'Card Holder',
        isDefault: paymentMethods.length === 0,
        source: 'payout',
        tokenId: token.id,
        createdAt: new Date().toISOString(),
      };

      // Save to Firestore as payout method
      await setDoc(doc(db, 'users', user.uid, 'payoutMethods', token.id), newMethodData);

      setPaymentMethods(prev => [...prev, { id: token.id, ...newMethodData }]);
      
      Alert.alert('Success', 'Payout card saved successfully!');
      
    } catch (err) {
      console.error("Error in handleAddCard:", err);
      Alert.alert('Error', err.message || 'Failed to add card.');
    }
    setLoading(false);
  };

  const handleDeleteCard = async (methodId, source) => {
    Alert.alert(
      'Delete Card',
      'Are you sure you want to remove this payment method?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Determine the collection based on source
              const collectionName = source === 'payout' ? 'payoutMethods' : 'paymentMethods';
              
              // Delete from Firestore
              await deleteDoc(doc(db, 'users', user.uid, collectionName, methodId));
              
              // Update local state
              setPaymentMethods(prev => prev.filter(method => method.id !== methodId));
              
              Alert.alert('Success', 'Payment method deleted successfully');
            } catch (err) {
              console.error('Error deleting card:', err);
              Alert.alert('Error', 'Failed to delete payment method');
            }
          }
        }
      ]
    );
  };

  const handleDeleteStripeAccount = async () => {
    if (!stripeAccountId) {
      Alert.alert('Info', 'No Stripe Connect account to delete.');
      return;
    }

    Alert.alert(
      'Delete Payout Account',
      'Are you sure you want to delete your payout account? This will remove your account from Stripe and you will need to set it up again to receive payouts. This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            try {
              // Call backend to delete the Stripe account
              const res = await fetch('https://api-bzlaa2cuqa-uc.a.run.app/delete-stripe-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  accountId: stripeAccountId,
                  userId: user.uid,
                })
              });

              let proceedWithLocalDelete = false;
              let errorText = '';
              let data = null;
              if (!res.ok) {
                errorText = await res.text();
                // If backend returns a specific error indicating account is already deleted, proceed
                if (
                  errorText.includes('No such account') ||
                  errorText.toLowerCase().includes('already deleted') ||
                  errorText.toLowerCase().includes('does not exist')
                ) {
                  proceedWithLocalDelete = true;
                } else {
                  console.error('Backend error:', errorText);
                  Alert.alert('Error', `Failed to delete account. Status: ${res.status}`);
                  setDeletingAccount(false);
                  return;
                }
              } else {
                data = await res.json();
                if (data.success) {
                  proceedWithLocalDelete = true;
                } else if (
                  data.message && (
                    data.message.toLowerCase().includes('already deleted') ||
                    data.message.toLowerCase().includes('does not exist')
                  )
                ) {
                  proceedWithLocalDelete = true;
                } else {
                  Alert.alert('Error', data.message || 'Failed to delete account');
                  setDeletingAccount(false);
                  return;
                }
              }

              if (proceedWithLocalDelete) {
                // Remove the account ID from Firestore
                await updateDoc(doc(db, 'users', user.uid), {
                  stripeConnectedAccountId: null
                });
                setStripeAccountId(null);
                Alert.alert('Success', 'Payout account deleted successfully.');
              }
            } catch (err) {
              console.error('Error deleting Stripe account:', err);
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            }
            setDeletingAccount(false);
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <SharedHeader title="Payment Methods" showBackButton />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saved Payment Methods</Text>
          {paymentMethods.length > 0 ? (
            paymentMethods.map(method => (
              <View key={method.id} style={styles.paymentCard}>
                <View style={styles.cardInfo}>
                  <View style={styles.cardDetails}>
                    <Text style={styles.cardBrand}>{method.brand || 'CARD'} •••• {method.last4}</Text>
                    <Text style={styles.cardHolder}>{method.holderName || (method.source === 'payout' ? 'Payout Method' : 'Payment Method')}</Text>
                    {method.isDefault && <Text style={styles.defaultText}>Default</Text>}
                  </View>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDeleteCard(method.id, method.source)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyState}>No payment methods added yet.</Text>
          )}
        </View>

        {/* Stripe Onboarding Button if no Stripe account */}
        {!stripeAccountId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payout Account</Text>
            <Text style={styles.infoText}>To receive payouts, you must create and verify a Stripe account.</Text>
            <TouchableOpacity
              style={[styles.addButton, { marginBottom: 12 }]}
              onPress={handleCreateStripeAccount}
              disabled={creatingStripeAccount}
            >
              <Text style={styles.addButtonText}>{creatingStripeAccount ? 'Creating...' : 'Create Stripe Account & Start Onboarding'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stripe Payout Account Section */}
        {stripeAccountId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payout Account</Text>
            <View style={styles.accountCard}>
              <View style={styles.accountInfo}>
                <Ionicons name="checkmark-circle" size={24} color="#34A853" />
                <View style={styles.accountDetails}>
                  <Text style={styles.accountTitle}>Connected</Text>
                  <Text style={styles.accountSubtitle}>Account ID: {stripeAccountId.substring(0, 20)}...</Text>
                  <Text style={styles.accountNote}>Withdrawals are enabled for this account</Text>
                </View>
              </View>
              <View style={styles.accountButtonRow}>
                <TouchableOpacity 
                  style={styles.verifyButton} 
                  onPress={() => navigation.navigate('ContractorVerification')}
                >
                  <Ionicons name="shield-checkmark" size={16} color="#3B82F6" style={{ marginRight: 6 }} />
                  <Text style={styles.verifyButtonText}>Complete Verification</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.deleteAccountButton} 
                  onPress={handleDeleteStripeAccount}
                  disabled={deletingAccount}
                >
                  <Ionicons name="trash-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.deleteAccountButtonText}>
                    {deletingAccount ? 'Deleting...' : 'Delete'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Payout Card</Text>
          <Text style={styles.infoText}>Add a debit card to receive instant payouts. Credit cards are not supported for payouts.</Text>
          <CardField
            postalCodeEnabled={true}
            placeholder={{ number: '4242 4242 4242 4242' }}
            cardStyle={styles.cardField}
            style={{ height: 50, marginVertical: 20 }}
            onCardChange={details => setCardDetails(details)}
          />
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={handleAddCard} 
            disabled={loading || !cardDetails.complete}
          >
            <Text style={styles.addButtonText}>{loading ? 'Adding...' : 'Add Card for Payouts'}</Text>
          </TouchableOpacity>
        </View>
        
        {/* Placeholder for Security Info, based on removed styles */}
        <View style={[styles.section, styles.securityCard]}>
          <Ionicons name="shield-checkmark-outline" size={24} color="#3B82F6" />
          <View style={styles.securityContent}>
            <Text style={styles.securityTitle}>Secure Payments</Text>
            <Text style={styles.securityText}>All transactions are processed securely via Stripe. Your card details are not stored on our servers.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F9FAFB', 
    paddingTop: Platform.OS === 'android' ? 25 : 0 
  },
  content: { 
    flex: 1 
  },
  section: { 
    margin: 16 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1F2937', 
    marginBottom: 16,
    // marginHorizontal: 16, // Removed if margin is already on section
  },
  // Custom Payment Card styles based on the fragments
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDetails: {
    flex: 1,
  },
  cardBrand: { 
    fontSize: 16, 
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  cardHolder: { 
    fontSize: 14, 
    color: '#6B7280' 
  },
  defaultText: { 
    color: '#34A853', 
    fontWeight: 'bold', 
    marginTop: 4,
    fontSize: 12, 
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    marginLeft: 12,
  },
  emptyState: { 
    textAlign: 'center', 
    color: '#9CA3AF', 
    marginTop: 32,
    fontSize: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  cardField: { 
    backgroundColor: '#fff', 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  addButton: { 
    backgroundColor: '#34A853', 
    padding: 12, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  addButtonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  // Stripe Account Card styles
  accountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  accountDetails: {
    flex: 1,
    marginLeft: 12,
  },
  accountTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  accountSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  accountNote: {
    fontSize: 12,
    color: '#34A853',
    fontStyle: 'italic',
  },
  accountButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  verifyButton: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  verifyButtonText: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 14,
  },
  deleteAccountButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  deleteAccountButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  // Security Card styles based on fragments
  securityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  securityContent: {
    flex: 1,
    marginLeft: 16,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  securityText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});

export default PaymentMethods;