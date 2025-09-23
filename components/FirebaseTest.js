import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

const FirebaseTest = () => {
  const [connectionStatus, setConnectionStatus] = useState('Testing...');
  const [firestoreStatus, setFirestoreStatus] = useState('Not tested');
  const [authStatus, setAuthStatus] = useState('Not tested');

  const testFirebaseConnection = async () => {
    try {
      setConnectionStatus('Testing Firebase connection...');
      
      // Test Authentication
      setAuthStatus('Testing...');
      try {
        await signInAnonymously(auth);
        setAuthStatus('✅ Authentication working');
      } catch (authError) {
        setAuthStatus(`❌ Auth error: ${authError.message}`);
        throw authError;
      }

      // Test Firestore
      setFirestoreStatus('Testing...');
      try {
        // Try to write a test document
        const testRef = collection(db, 'connectionTest');
        await addDoc(testRef, {
          message: 'Firebase connection test',
          timestamp: serverTimestamp(),
          source: 'QuickTrash App'
        });

        // Try to read documents
        const snapshot = await getDocs(testRef);
        const docCount = snapshot.size;
        
        setFirestoreStatus(`✅ Firestore working (${docCount} test docs)`);
        setConnectionStatus('🎉 Firebase fully connected!');
      } catch (firestoreError) {
        setFirestoreStatus(`❌ Firestore error: ${firestoreError.message}`);
        throw firestoreError;
      }

    } catch (error) {
      setConnectionStatus(`❌ Connection failed: ${error.message}`);
      console.error('Firebase Test Error:', error);
    }
  };

  useEffect(() => {
    testFirebaseConnection();
  }, []);

  const retryTest = () => {
    setConnectionStatus('Retrying...');
    setFirestoreStatus('Not tested');
    setAuthStatus('Not tested');
    testFirebaseConnection();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔥 Firebase Connection Test</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Overall Status:</Text>
        <Text style={styles.statusText}>{connectionStatus}</Text>
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Authentication:</Text>
        <Text style={styles.statusText}>{authStatus}</Text>
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Firestore Database:</Text>
        <Text style={styles.statusText}>{firestoreStatus}</Text>
      </View>

      <TouchableOpacity style={styles.retryButton} onPress={retryTest}>
        <Text style={styles.retryButtonText}>Retry Test</Text>
      </TouchableOpacity>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Project ID: quicktrash-1cdff{'\n'}
          This test verifies your Firebase connection by:{'\n'}
          • Testing anonymous authentication{'\n'}
          • Writing/reading from Firestore{'\n'}
          • Checking overall connectivity
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#34A853',
  },
  statusContainer: {
    backgroundColor: 'white',
    padding: 15,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 5,
  },
  statusText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#34A853',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: '#E5F3FF',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  infoText: {
    fontSize: 12,
    color: '#1F2937',
    lineHeight: 18,
  },
});

export default FirebaseTest;
