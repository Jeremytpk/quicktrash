import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import LocationService from '../services/EnhancedLocationService';

const LocationTest = ({ onClose }) => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('unknown');

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(status);
      console.log('Permission status:', status);
    } catch (error) {
      console.error('Error checking permission status:', error);
    }
  };

  const testLocationPermission = async () => {
    setLoading(true);
    try {
      console.log('Testing location permission...');
      const hasPermission = await LocationService.requestPermissions(null, 'contractor', false);
      console.log('Permission result:', hasPermission);
      setPermissionStatus(hasPermission ? 'granted' : 'denied');
      
      if (hasPermission) {
        Alert.alert('Success', 'Location permission granted!');
      } else {
        Alert.alert('Permission Denied', 'Location permission was denied. Please enable it in settings.');
      }
    } catch (error) {
      console.error('Error testing permission:', error);
      Alert.alert('Error', 'Failed to test location permission');
    } finally {
      setLoading(false);
    }
  };

  const testGetLocation = async () => {
    setLoading(true);
    try {
      console.log('Testing get current location...');
      const currentLocation = await LocationService.getCurrentLocation('contractor');
      console.log('Location result:', currentLocation);
      
      if (currentLocation) {
        setLocation(currentLocation);
        Alert.alert(
          'Location Found!',
          `Lat: ${currentLocation.latitude.toFixed(6)}\nLng: ${currentLocation.longitude.toFixed(6)}\nAccuracy: ${currentLocation.accuracy}m`
        );
      } else {
        Alert.alert('Error', 'Could not get current location');
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get current location');
    } finally {
      setLoading(false);
    }
  };

  const testLocationWatching = async () => {
    setLoading(true);
    try {
      console.log('Testing location watching...');
      await LocationService.startWatchingLocation();
      
      // Add a listener to see location updates
      const removeListener = LocationService.addLocationListener((newLocation) => {
        console.log('Location update received:', newLocation);
        setLocation(newLocation);
      });
      
      Alert.alert('Success', 'Location watching started! Check console for updates.');
      
      // Clean up after 10 seconds
      setTimeout(() => {
        removeListener();
        LocationService.stopWatchingLocation();
        console.log('Location watching stopped');
      }, 10000);
      
    } catch (error) {
      console.error('Error testing location watching:', error);
      Alert.alert('Error', 'Failed to start location watching');
    } finally {
      setLoading(false);
    }
  };

  const getPermissionStatusColor = () => {
    switch (permissionStatus) {
      case 'granted': return '#34A853';
      case 'denied': return '#EF4444';
      case 'undetermined': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getPermissionStatusText = () => {
    switch (permissionStatus) {
      case 'granted': return 'Granted';
      case 'denied': return 'Denied';
      case 'undetermined': return 'Not Requested';
      default: return 'Unknown';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Location Services Test</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Permission Status:</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: getPermissionStatusColor() }]} />
          <Text style={[styles.statusText, { color: getPermissionStatusColor() }]}>
            {getPermissionStatusText()}
          </Text>
        </View>
      </View>

      {location && (
        <View style={styles.locationCard}>
          <Text style={styles.locationTitle}>Current Location:</Text>
          <Text style={styles.locationText}>
            Lat: {location.latitude.toFixed(6)}
          </Text>
          <Text style={styles.locationText}>
            Lng: {location.longitude.toFixed(6)}
          </Text>
          <Text style={styles.locationText}>
            Accuracy: {location.accuracy ? `${location.accuracy.toFixed(0)}m` : 'Unknown'}
          </Text>
          {location.address && (
            <Text style={styles.locationText}>
              Address: {location.address.formattedAddress}
            </Text>
          )}
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.permissionButton]}
          onPress={testLocationPermission}
          disabled={loading}
        >
          <Ionicons name="shield-checkmark" size={20} color="white" />
          <Text style={styles.buttonText}>Test Permission</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.locationButton]}
          onPress={testGetLocation}
          disabled={loading}
        >
          <Ionicons name="location" size={20} color="white" />
          <Text style={styles.buttonText}>Get Location</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.watchButton]}
          onPress={testLocationWatching}
          disabled={loading}
        >
          <Ionicons name="eye" size={20} color="white" />
          <Text style={styles.buttonText}>Test Watching</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#34A853" />
          <Text style={styles.loadingText}>Testing location services...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    margin: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    padding: 8,
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  locationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  permissionButton: {
    backgroundColor: '#3B82F6',
  },
  locationButton: {
    backgroundColor: '#34A853',
  },
  watchButton: {
    backgroundColor: '#8B5CF6',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
});

export default LocationTest;