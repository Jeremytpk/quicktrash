import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { useUser } from '../contexts/UserContext';
import { db } from '../firebaseConfig';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import SharedHeader from '../components/SharedHeader';
import { useNavigation } from '@react-navigation/native';

const PaymentMethods = () => {
  const navigation = useNavigation();
  const { user } = useUser();
  const { createToken } = useStripe();
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [cardDetails, setCardDetails] = useState({});
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    const fetchAllMethods = async () => {
      if (!user?.uid) return;
      try {
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
      
      // Send token to backend to attach as external account for payouts
      const res = await fetch('https://us-central1-quicktrash-1cdff.cloudfunctions.net/api/add-payout-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          token: token.id
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        // Assume cardDetails contains the necessary information (last4, brand, name)
        // If the CardField doesn't expose these directly, you might need to rely on the backend response.
        const newMethodData = {
          type: 'card',
          last4: cardDetails.last4,
          brand: cardDetails.brand,
          holderName: cardDetails.name || 'Card Holder',
          isDefault: paymentMethods.length === 0,
          source: 'payout',
        };

        // Save locally and to Firestore as payout method
        await setDoc(doc(db, 'users', user.uid, 'payoutMethods', token.id), newMethodData);

        setPaymentMethods(prev => [...prev, { id: token.id, ...newMethodData }]);
        
        Alert.alert('Success', 'Payout card added and connected to Stripe account');
      } else {
        Alert.alert('Error', data.message || 'Failed to connect card to Stripe account');
      }
    } catch (err) {
      console.error("Error in handleAddCard:", err);
      Alert.alert('Error', 'Failed to connect card to Stripe account.');
    }
    setLoading(false);
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
                <Text style={styles.cardBrand}>{method.brand || 'CARD'} •••• {method.last4}</Text>
                <Text style={styles.cardHolder}>{method.holderName || (method.source === 'payout' ? 'Payout Method' : 'Payment Method')}</Text>
                {method.isDefault && <Text style={styles.defaultText}>Default</Text>}
              </View>
            ))
          ) : (
            <Text style={styles.emptyState}>No payment methods added yet.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Payout Card</Text>
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
            disabled={loading || !cardDetails.complete} // Added check for cardDetails.complete
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
  emptyState: { 
    textAlign: 'center', 
    color: '#9CA3AF', 
    marginTop: 32,
    fontSize: 16,
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