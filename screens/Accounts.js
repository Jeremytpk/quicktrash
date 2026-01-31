import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import SharedHeader from '../components/SharedHeader';

const Accounts = () => {
  const navigation = useNavigation();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(null); // accountId currently being emailed
  const [deleting, setDeleting] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  // Fetch accounts from backend
  useEffect(() => {
    setLoading(true);
    fetch('https://api-bzlaa2cuqa-uc.a.run.app/list-stripe-accounts')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.accounts)) {
          setAccounts(data.accounts);
        } else {
          setAccounts([]);
          Alert.alert('Error', data.error || 'Failed to fetch accounts');
        }
        setLoading(false);
      })
      .catch(err => {
        setLoading(false);
        setAccounts([]);
        Alert.alert('Error', 'Failed to fetch accounts');
      });
  }, []);

  const handleSendEmail = (account) => {
    setSendingEmail(account.id);
    // Placeholder: Integrate with backend to send email
    setTimeout(() => {
      setSendingEmail(null);
      Alert.alert('Email Sent', `Verification email sent to ${account.email}`);
    }, 1200);
  };

  const handleShowDetails = (account) => {
    navigation.navigate('AccountDetails', { accountId: account.id });
  };

  const handleDeactivate = (account) => {
    Alert.alert(
      'Deactivate Account',
      'Are you sure you want to deactivate this account? This will disable payouts and charges.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate', style: 'destructive', onPress: async () => {
            setDeactivating(true);
            try {
              const res = await fetch('https://api-bzlaa2cuqa-uc.a.run.app/deactivate-stripe-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId: account.id })
              });
              const data = await res.json();
              if (data.success) {
                Alert.alert('Deactivated', 'Account has been deactivated.');
                setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, status: 'pending' } : a));
              } else {
                Alert.alert('Error', data.error || 'Failed to deactivate account');
              }
            } catch (e) {
              Alert.alert('Error', 'Failed to deactivate account');
            }
            setDeactivating(false);
          }
        }
      ]
    );
  };

  const handleDelete = (account) => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete this account from Stripe? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            setDeleting(true);
            try {
              const res = await fetch('https://api-bzlaa2cuqa-uc.a.run.app/delete-stripe-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId: account.id })
              });
              const data = await res.json();
              if (data.success) {
                Alert.alert('Deleted', 'Account has been deleted from Stripe.');
                setAccounts(prev => prev.filter(a => a.id !== account.id));
              } else {
                Alert.alert('Error', data.error || 'Failed to delete account');
              }
            } catch (e) {
              Alert.alert('Error', 'Failed to delete account');
            }
            setDeleting(false);
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleShowDetails(item)}>
      <View style={styles.accountCard}>
        <Ionicons name="person-circle" size={40} color="#2196F3" style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.email}>{item.email}</Text>
          <Text style={[styles.status, item.status === 'active' ? styles.active : styles.pending]}>
            {item.status === 'active' ? 'Active' : 'Pending'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.emailButton}
          onPress={() => handleSendEmail(item)}
          disabled={sendingEmail === item.id}
        >
          {sendingEmail === item.id ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name="mail" size={22} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
  <SharedHeader title="Connected Accounts" showBackButton onBackPress={() => navigation.goBack()} />
      {loading ? (
        <ActivityIndicator size="large" color="#2196F3" style={{ marginTop: 40 }} />
      ) : accounts.length === 0 ? (
        <Text style={styles.emptyText}>No connected accounts found.</Text>
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  status: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  active: {
    color: '#4CAF50',
  },
  pending: {
    color: '#FF9800',
  },
  emailButton: {
    backgroundColor: '#2196F3',
    borderRadius: 24,
    padding: 10,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 16,
    marginTop: 40,
  },
});

export default Accounts;
