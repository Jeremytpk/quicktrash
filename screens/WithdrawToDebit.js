import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SharedHeader from '../components/SharedHeader';
import { db, auth } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// NOTE: This is a client-side collection of masked card details for UX. Never store full PAN/CVC.
// In production, use Stripe Elements/Tokenization + server-side attach to Stripe Connect external account.

const maskCard = (num) => {
  if (!num) return '';
  const only = String(num).replace(/\s+/g, '');
  return '**** **** **** ' + only.slice(-4);
};

export default function WithdrawToDebit({ navigation }) {
  const [cardNumber, setCardNumber] = useState('');
  const [name, setName] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const [zip, setZip] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Live validation
  const cardDigits = String(cardNumber).replace(/\D/g, '');
  const isCardValid = cardDigits.length >= 12 && cardDigits.length <= 19;
  const isNameValid = name.trim().length > 1;
  const expMatch = /^\d{2}\/\d{2}$/.test(exp);
  const isExpValid = expMatch; // simple MM/YY check
  const isCvcValid = String(cvc).replace(/\D/g, '').length >= 3;

  const saveCard = async () => {
    if (!auth?.currentUser) {
      Alert.alert('Not signed in', 'Please sign in to save a payout method.');
      return;
    }

    // Basic validation (client-side only)
    if (String(cardNumber).replace(/\s+/g, '').length < 12 || !name || !exp || !isExpValid || !isCvcValid) {
      Alert.alert('Invalid', 'Please complete all required fields with valid information.');
      return;
    }

    setSaving(true);

    try {
      const uRef = collection(db, 'users', auth.currentUser.uid, 'payoutMethods');
      await addDoc(uRef, {
        type: 'debit_card',
        cardMask: maskCard(cardNumber),
        nameOnCard: name,
        exp: exp,
        zip: zip || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // dev-note: do not store full PAN or CVC in Firestore
      });

      Alert.alert('Saved', 'Your debit card was successfully added. You may now use it for withdrawals.');
      navigation.goBack();
    } catch (e) {
      console.error('Error saving payout method', e);
      Alert.alert('Error', 'Failed to save payout method. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.fullScreen}
    >
      <View style={styles.container}>
        <SharedHeader 
          title="Add Debit Card" 
          showBackButton 
          onBack={() => navigation.goBack()} 
        />

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Payment Information</Text>
            
            {/* 1. Name on Card */}
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name on card</Text>
                <TextInput 
                    style={styles.inputField} 
                    value={name} 
                    onChangeText={setName} 
                    placeholder="Full name as it appears on card"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="words"
                />
            </View>

            {/* 2. Card Number */}
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Card number</Text>
                <View style={styles.cardInputWrapper}>
                    <Ionicons 
                        name={isCardValid ? "card-sharp" : "card-outline"} 
                        size={20} 
                        color={isCardValid ? '#34A853' : '#6B7280'} 
                        style={styles.cardIcon}
                    />
                    <TextInput 
                        style={styles.cardInput} 
                        value={cardNumber} 
                        onChangeText={setCardNumber} 
                        placeholder="4242 **** **** 4242" 
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                        maxLength={19} // Simple length limit
                    />
                </View>
            </View>

            {/* 3. Expiry and CVC Row */}
            <View style={styles.row}>
                <View style={styles.expiryInput}>
                    <Text style={styles.inputLabel}>Expiry (MM/YY)</Text>
                    <TextInput 
                        style={styles.inputField} 
                        value={exp} 
                        onChangeText={text => {
                          let formatted = text.replace(/[^0-9]/g, '');
                          if (formatted.length > 2) {
                            formatted = formatted.slice(0,2) + '/' + formatted.slice(2,4);
                          }
                          setExp(formatted);
                        }} 
                        placeholder="MM/YY" 
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                        maxLength={5}
                    />
                </View>

                <View style={styles.cvcInput}>
                    <Text style={styles.inputLabel}>CVC</Text>
                    <TextInput 
                        style={styles.inputField} 
                        value={cvc} 
                        onChangeText={setCvc} 
                        placeholder="CVC" 
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric" 
                        secureTextEntry
                        maxLength={4}
                    />
                </View>
            </View>
            
            {/* 4. ZIP Code */}
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ZIP / Postal code (optional)</Text>
                <TextInput 
                    style={styles.inputField} 
                    value={zip} 
                    onChangeText={setZip} 
                    placeholder="ZIP" 
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric" 
                    maxLength={10}
                />
            </View>
          </View>

          {/* Action Zone */}
          <View style={styles.actionZone}>
              <TouchableOpacity 
                style={[styles.primaryButton, saving && styles.disabledButton]} 
                onPress={saveCard} 
                disabled={saving}
              >
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save Debit Card'}</Text>
              </TouchableOpacity>
          </View>

          {/* Trust and Warning Note */}
          <View style={styles.warningContainer}>
            <Text style={styles.warningTitle}>Security & Payout Note</Text>
            <Text style={styles.warningText}>
              <Ionicons name="lock-closed-outline" size={12} color="#9CA3AF" />
              {' '}
              For real payouts to debit cards you must tokenize the card with Stripe and create a payout using a server-side call (Stripe Connect / Transfers). This app only stores a masked copy for display purposes.
            </Text>
          </View>
          
          {/* Debug Info (Kept separate and collapsible) */}
          <TouchableOpacity style={styles.debugToggle} onPress={() => setShowDebug(v => !v)}>
            <Text style={styles.debugToggleText}>{showDebug ? 'Hide Debug Info' : 'Show Debug Info'}</Text>
          </TouchableOpacity>

          {showDebug && (
            <View style={styles.debugBox}>
              <Text style={styles.debugTitle}>Debug — live input / validation</Text>
              <Text style={styles.debugText}>cardNumber: {cardNumber}</Text>
              <Text style={styles.debugText}>cardDigits: {cardDigits}</Text>
              <Text style={styles.debugText}>mask: **{maskCard(cardNumber).slice(-4)}</Text>
              <Text style={styles.debugText}>isCardValid: {String(isCardValid)}</Text>
              <Text style={styles.debugText}>isNameValid: {String(isNameValid)}</Text>
              <Text style={styles.debugText}>isExpValid: {String(isExpValid)}</Text>
              <Text style={styles.debugText}>isCvcValid: {String(isCvcValid)}</Text>
            </View>
          )}

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flex: 1, padding: 20 },
  
  // --- Form Structure ---
  formSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputField: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  
  // --- Card Specific Inputs ---
  cardInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  cardIcon: {
    marginRight: 10,
  },
  cardInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  row: { 
    flexDirection: 'row', 
    marginBottom: 15,
  },
  expiryInput: {
    flex: 2, 
    marginRight: 10,
  },
  cvcInput: {
    flex: 1,
  },
  
  // --- Action Zone ---
  actionZone: {
    marginBottom: 20,
  },
  primaryButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#34A853', 
    padding: 15, 
    borderRadius: 10, 
  },
  disabledButton: {
    backgroundColor: '#A3D9B5', // Lighter green for disabled state
  },
  primaryButtonText: { 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 18,
    marginLeft: 10, 
  },
  
  // --- Warning/Trust ---
  warningContainer: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#FEFCE8',
    borderColor: '#FDE047',
    borderWidth: 1,
    marginBottom: 20,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#A16207',
    marginBottom: 5,
  },
  warningText: {
    fontSize: 13, 
    color: '#713F12',
    lineHeight: 18,
  },
  
  // --- Debug Styles (Kept for dev use) ---
  debugToggle: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    marginBottom: 10,
  },
  debugToggleText: {
    fontSize: 12,
    color: '#6B7280',
    textDecorationLine: 'underline',
  },
  debugBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 5,
    color: '#3B82F6',
  },
  debugText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#4B5563',
  }
});