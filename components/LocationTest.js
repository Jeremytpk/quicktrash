import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import EnhancedLocationService from '../services/EnhancedLocationService';

const LocationTest = () => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);

  const testLocation = async () => {
    setLoading(true);
    try {
      console.log('Testing location...');
      const locationData = await EnhancedLocationService.getCurrentLocation('customer');
      console.log('Location result:', locationData);
      setLocation(locationData);
      
      if (locationData) {
        Alert.alert(
          'Location Test',
          `Lat: ${locationData.latitude.toFixed(6)}\nLng: ${locationData.longitude.toFixed(6)}\nAddress: ${locationData.address?.formattedAddress || 'No address'}`
        );
      }
    } catch (error) {
      console.error('Location test error:', error);
      Alert.alert('Error', 'Failed to get location: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Location Test</Text>
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={testLocation}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Getting Location...' : 'Test Location'}
        </Text>
      </TouchableOpacity>
      
      {location && (
        <View style={styles.locationInfo}>
          <Text style={styles.infoTitle}>Current Location:</Text>
          <Text style={styles.infoText}>Latitude: {location.latitude.toFixed(6)}</Text>
          <Text style={styles.infoText}>Longitude: {location.longitude.toFixed(6)}</Text>
          <Text style={styles.infoText}>Accuracy: {location.accuracy}m</Text>
          {location.address && (
            <Text style={styles.infoText}>Address: {location.address.formattedAddress}</Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#1A1A1A',
  },
  button: {
    backgroundColor: '#34A853',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  locationInfo: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
    width: '100%',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1A1A1A',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666666',
  },
});

export default LocationTest;
