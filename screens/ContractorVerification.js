import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import SharedHeader from '../components/SharedHeader';
import { useNavigation } from '@react-navigation/native';

const ContractorVerification = () => {
  const { user } = useUser();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  const handleRequestVerification = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('https://api-bzlaa2cuqa-uc.a.run.app/request-contractor-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid
        })
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          'Verification Link Sent! 📧',
          `A secure verification link has been sent to your email${data.email ? ` (${data.email})` : ''}. Please check your inbox and spam folder, then click the link to complete your verification through Stripe's secure portal.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', data.error || 'Failed to send verification link');
      }
    } catch (error) {
      console.error('Error requesting verification:', error);
      Alert.alert('Error', 'Failed to send verification link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark" size={80} color="#4CAF50" />
        </View>

        <Text style={styles.title}>Verify Your Identity</Text>
        <Text style={styles.description}>
          To receive payouts, we need to verify your identity with Stripe, our secure payment processor.
        </Text>

        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Ionicons name="mail" size={24} color="#2196F3" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Email Verification Link</Text>
              <Text style={styles.infoText}>
                We'll send you a secure link to complete verification through Stripe
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="lock-closed" size={24} color="#2196F3" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Secure & Private</Text>
              <Text style={styles.infoText}>
                Your information is encrypted and handled by Stripe, a trusted payment processor
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time" size={24} color="#2196F3" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Quick Process</Text>
              <Text style={styles.infoText}>
                Takes only 2-3 minutes to complete
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.note}>
          You'll need to provide:
          {'\n'}• Date of birth
          {'\n'}• Last 4 digits of SSN
          {'\n'}• Address information
          {'\n'}• Bank account or debit card details
        </Text>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRequestVerification}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="mail-outline" size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Send Verification Link</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center'
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24
  },
  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 15
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  note: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 30,
    lineHeight: 22,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3'
  },
  button: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0
  },
  buttonIcon: {
    marginRight: 10
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600'
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center'
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500'
  }
});

export default ContractorVerification;
