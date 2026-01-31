import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SharedHeader from '../components/SharedHeader';
import { useNavigation, useRoute } from '@react-navigation/native';

const AccountDetails = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { accountId } = route.params;
  const [accountDetails, setAccountDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [requestingInfo, setRequestingInfo] = useState(false);
  const [requestInfoUrl, setRequestInfoUrl] = useState(null);
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [emailSubject, setEmailSubject] = useState('Complete Your Stripe Verification');
  const [emailMessage, setEmailMessage] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`https://api-bzlaa2cuqa-uc.a.run.app/get-stripe-account-details?id=${accountId}`)
      .then(res => res.json())
      .then(data => {
        setAccountDetails(data.account || null);
        setLoading(false);
      })
      .catch(() => {
        setAccountDetails(null);
        setLoading(false);
      });
  }, [accountId]);

  const handleDeactivate = () => {
    if (!accountDetails) return;
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
                body: JSON.stringify({ accountId: accountDetails.id })
              });
              const data = await res.json();
              if (data.success) {
                Alert.alert('Deactivated', 'Account has been deactivated.');
                navigation.goBack();
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

  const handleDelete = () => {
    if (!accountDetails) return;
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
                body: JSON.stringify({ accountId: accountDetails.id })
              });
              const data = await res.json();
              if (data.success) {
                Alert.alert('Deleted', 'Account has been deleted from Stripe.');
                navigation.goBack();
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

  // Show modal with auto-filled subject/message
  const showEmailModal = (link, toEmail) => {
    setEmailSubject('Complete Your Stripe Verification');
    setEmailMessage(
      `Hi,\n\nTo start receiving payouts, please complete your verification using the secure Stripe link below. This is required to enable payments.\n\nVerification link: ${link}\n\nIf you have any questions, reply to this email.\n\nThank you!\nQuickTrash Team`
    );
    setEmailModalVisible(true);
  };

  const openGmail = (toEmail, subject, message) => {
    // Gmail supports mailto links, but for best compatibility use mailto:
    const mailto = `mailto:${toEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    Linking.openURL(mailto).catch(() => {
      Alert.alert('Error', 'Could not open Gmail or email app.');
    });
  };

  const handleSendEmail = async () => {
    setEmailModalVisible(false);
    try {
      const sendRes = await fetch('https://api-bzlaa2cuqa-uc.a.run.app/send-remediation-link-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: accountDetails.email,
          from: 'jeremytopaka@gmail.com',
          subject: emailSubject,
          message: emailMessage
        })
      });
      const sendData = await sendRes.json();
      if (sendData.success) {
        Alert.alert('Sent', 'Request Information link sent to user.');
      } else {
        Alert.alert('Error', sendData.error || 'Failed to send email');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to send email');
    }
  };

  const handleRequestInfo = async () => {
    if (!accountDetails) return;
    setRequestingInfo(true);
    setRequestInfoUrl(null);
    try {
      const res = await fetch('https://api-bzlaa2cuqa-uc.a.run.app/request-stripe-remediation-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: accountDetails.id })
      });
      const data = await res.json();
      if (data.success && data.url) {
        setRequestInfoUrl(data.url);
        const subject = 'Complete Your Stripe Verification';
        const message = `Hi,\n\nTo start receiving payouts, please complete your verification using the secure Stripe link below. This is required to enable payments.\n\nVerification link: ${data.url}\n\nIf you have any questions, reply to this email.\n\nThank you!\nQuickTrash Team`;
        Alert.alert(
          'Send Request Information Link',
          'How would you like to send the verification link?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setRequestingInfo(false) },
            {
              text: 'In-App Email',
              onPress: () => {
                showEmailModal(data.url, accountDetails.email);
                setRequestingInfo(false);
              }
            },
            {
              text: 'Gmail',
              onPress: () => {
                openGmail(accountDetails.email, subject, message);
                setRequestingInfo(false);
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', data.error || 'Failed to get remediation link');
        setRequestingInfo(false);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to get remediation link');
      setRequestingInfo(false);
    }
  };

  return (
    <View style={styles.container}>
      <SharedHeader title="Account Details" showBackButton onBackPress={() => navigation.goBack()} />
      {loading ? (
        <ActivityIndicator size="large" color="#2196F3" style={{ marginTop: 40 }} />
      ) : accountDetails ? (
        <ScrollView style={{ padding: 20 }}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Account Info</Text>
            <View style={styles.infoRow}><Text style={styles.label}>ID:</Text><Text style={styles.value}>{accountDetails.id}</Text></View>
            <View style={styles.infoRow}><Text style={styles.label}>Email:</Text><Text style={styles.value}>{accountDetails.email}</Text></View>
            <View style={styles.infoRow}><Text style={styles.label}>Status:</Text><Text style={[styles.value, { color: accountDetails.charges_enabled && accountDetails.payouts_enabled ? '#4CAF50' : '#FF9800' }]}>{accountDetails.charges_enabled && accountDetails.payouts_enabled ? 'Active' : 'Pending'}</Text></View>
            <View style={styles.infoRow}><Text style={styles.label}>Type:</Text><Text style={styles.value}>{accountDetails.type}</Text></View>
            <View style={styles.infoRow}><Text style={styles.label}>Country:</Text><Text style={styles.value}>{accountDetails.country}</Text></View>
            <View style={styles.infoRow}><Text style={styles.label}>Created:</Text><Text style={styles.value}>{accountDetails.created ? new Date(accountDetails.created * 1000).toLocaleString() : ''}</Text></View>
            <View style={styles.infoRow}><Text style={styles.label}>Business Type:</Text><Text style={styles.value}>{accountDetails.business_type}</Text></View>
            <View style={styles.infoRow}><Text style={styles.label}>Individual Name:</Text><Text style={styles.value}>{accountDetails.individual ? `${accountDetails.individual.first_name || ''} ${accountDetails.individual.last_name || ''}`.trim() : ''}</Text></View>
            <View style={styles.infoRow}><Text style={styles.label}>Capabilities:</Text><Text style={styles.value}>{Object.keys(accountDetails.capabilities || {}).join(', ')}</Text></View>
            <View style={styles.infoRow}><Text style={styles.label}>Details Submitted:</Text><Text style={styles.value}>{accountDetails.details_submitted ? 'Yes' : 'No'}</Text></View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Action Required (Now)</Text>
            {Array.isArray(accountDetails.requirements?.currently_due) && accountDetails.requirements.currently_due.length > 0 ? (
              accountDetails.requirements.currently_due.map((item, idx) => (
                <View key={item + idx} style={styles.actionRow}>
                  <Ionicons name="alert-circle" size={18} color="#DC2626" style={{ marginRight: 8 }} />
                  <Text style={styles.actionRequiredItem}>{item.replace('individual.', '').replace(/_/g, ' ')}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.value}>None</Text>
            )}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Action Required (Future)</Text>
            {Array.isArray(accountDetails.requirements?.eventually_due) && accountDetails.requirements.eventually_due.length > 0 ? (
              accountDetails.requirements.eventually_due.map((item, idx) => (
                <View key={item + idx} style={styles.actionRow}>
                  <Ionicons name="time" size={18} color="#F59E0B" style={{ marginRight: 8 }} />
                  <Text style={[styles.actionRequiredItem, { color: '#F59E0B' }]}>{item.replace('individual.', '').replace(/_/g, ' ')}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.value}>None</Text>
            )}
          </View>

          <View style={{ flexDirection: 'row', marginTop: 32, gap: 12 }}>
            <TouchableOpacity
              style={{ backgroundColor: '#2196F3', borderRadius: 24, padding: 16, flex: 1, alignItems: 'center', opacity: requestingInfo ? 0.6 : 1 }}
              onPress={handleRequestInfo}
              disabled={requestingInfo}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Request Information</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', marginTop: 16, gap: 12 }}>
            <TouchableOpacity
              style={{ backgroundColor: '#FF9800', borderRadius: 24, padding: 16, flex: 1, alignItems: 'center', opacity: deactivating ? 0.6 : 1 }}
              onPress={handleDeactivate}
              disabled={deactivating}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Deactivate</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ backgroundColor: '#DC2626', borderRadius: 24, padding: 16, flex: 1, alignItems: 'center', opacity: deleting ? 0.6 : 1 }}
              onPress={handleDelete}
              disabled={deleting}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Delete</Text>
            </TouchableOpacity>
          </View>

          <Modal visible={emailModalVisible} animationType="slide" transparent onRequestClose={() => setEmailModalVisible(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '90%' }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Send Verification Email</Text>
                <Text style={{ fontWeight: '600', marginBottom: 6 }}>To: {accountDetails?.email}</Text>
                <Text style={{ fontWeight: '600', marginBottom: 6 }}>From: jeremytopaka@gmail.com</Text>
                <TextInput
                  style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10, marginBottom: 12 }}
                  value={emailSubject}
                  onChangeText={setEmailSubject}
                  placeholder="Subject"
                />
                <TextInput
                  style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10, minHeight: 100, marginBottom: 12, textAlignVertical: 'top' }}
                  value={emailMessage}
                  onChangeText={setEmailMessage}
                  multiline
                  placeholder="Message"
                />
                <TouchableOpacity
                  style={{ backgroundColor: '#2196F3', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 8 }}
                  onPress={handleSendEmail}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Send Email</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEmailModalVisible(false)} style={{ alignItems: 'center' }}>
                  <Text style={{ color: '#888', fontWeight: '500' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </ScrollView>
      ) : (
        <Text style={{ margin: 32, color: '#888' }}>No details found for this account.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingBottom: 40,
  },
  label: {
    fontWeight: 'bold',
    marginTop: 12,
    color: '#333',
  },
  value: {
    color: '#222',
    marginBottom: 4,
  },
  actionRequiredItem: {
    color: '#DC2626',
    fontWeight: '500',
    marginLeft: 8,
    marginBottom: 2,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
});

export default AccountDetails;
