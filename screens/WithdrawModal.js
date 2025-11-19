import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function WithdrawModal({ route, navigation }) {
  const { amount, payoutMethod, onConfirm } = route.params;
  const [stripeBalance, setStripeBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState(null);

  useEffect(() => {
    // Fetch Stripe balance for the connected account
    const fetchBalance = async () => {
      setLoadingBalance(true);
      setBalanceError(null);
      try {
        // Use connectedAccountId from payoutMethod if available
        const connectedAccountId = payoutMethod.connectedAccountId;
        let url = 'https://us-central1-quicktrash.cloudfunctions.net/debug-stripe-balance';
        if (connectedAccountId) {
          url += `?connectedAccountId=${encodeURIComponent(connectedAccountId)}`;
          console.log(`[DEBUG] Fetching balance for connected Stripe account: ${connectedAccountId}`);
        } else {
          console.log('[DEBUG] Fetching balance for platform Stripe account (using secret key)');
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch Stripe balance');
        const data = await res.json();
        setStripeBalance(data.available);
      } catch (err) {
  setBalanceError(error.message);
      } finally {
        setLoadingBalance(false);
      }
    };
    fetchBalance();
  }, [payoutMethod]);

  return (
    <View style={styles.modalContainer}>
      <Image source={require('../assets/logo/qtLogoTxt.png')} style={styles.logo} resizeMode="contain" />
      <View style={styles.cardBox}>
        <Ionicons name="wallet-outline" size={40} color="#059669" style={{ marginBottom: 8 }} />
        <Text style={styles.title}>Withdraw Funds</Text>
        <Text style={styles.amount}>${amount.toFixed(2)}</Text>
        <Text style={styles.cardInfo}>{payoutMethod.cardMask} • {payoutMethod.nameOnCard}</Text>
        <Text style={styles.note}>Your funds will be sent to your debit card securely.</Text>
        <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
          <Text style={styles.confirmText}>Confirm Withdraw</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        {/* Debug Panel: Stripe Balance */}
        <View style={styles.debugPanel}>
          <Text style={styles.debugTitle}>Debug: Stripe Account Balance</Text>
          {loadingBalance ? (
            <ActivityIndicator size="small" color="#059669" />
          ) : balanceError ? (
            <Text style={styles.debugError}>Error: {balanceError}</Text>
          ) : stripeBalance !== null ? (
            <Text style={styles.debugText}>Available: ${stripeBalance.toFixed(2)}</Text>
          ) : (
            <Text style={styles.debugText}>No balance data</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    padding: 24,
  },
  logo: {
    width: 180,
    height: 188,
    marginBottom: 16,
    borderRadius: 100,
  },
  cardBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 4, color: '#222' },
  amount: { fontSize: 32, fontWeight: 'bold', color: '#059669', marginBottom: 4 },
  cardInfo: { fontSize: 16, color: '#444', marginBottom: 8 },
  note: { fontSize: 14, color: '#6B7280', marginBottom: 18, textAlign: 'center' },
  confirmButton: { backgroundColor: '#059669', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 8, marginBottom: 10, width: '100%' },
  confirmText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  cancelButton: { padding: 12, width: '100%' },
  cancelText: { color: '#059669', fontSize: 16, textAlign: 'center' },
  debugPanel: {
    marginTop: 18,
    width: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 4,
  },
  debugText: {
    fontSize: 14,
    color: '#222',
  },
  debugError: {
    fontSize: 14,
    color: '#B91C1C',
  },
});
