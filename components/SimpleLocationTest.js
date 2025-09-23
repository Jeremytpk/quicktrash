import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import SimpleLocationService from '../services/NewLocationService';

const SimpleLocationTest = ({ onClose }) => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[${timestamp}] ${message}`);
  };

  const checkPermissionStatus = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(status);
      addLog(`Permission status: ${status}`);
    } catch (error) {
      addLog(`Error checking permission: ${error.message}`);
    }
  };

  const testPermission = async () => {
    setLoading(true);
    addLog('Testing location permission...');
    
    try {
      const result = await SimpleLocationService.requestPermission();
      addLog(`Permission result: ${result ? 'GRANTED' : 'DENIED'}`);
      setPermissionStatus(result ? 'granted' : 'denied');
      
      if (result) {
        Alert.alert('Success', 'Location permission granted!');
      } else {
        Alert.alert('Permission Denied', 'Location permission was denied.');
      }
    } catch (error) {
      addLog(`Permission error: ${error.message}`);
      Alert.alert('Error', 'Failed to test permission');
    } finally {
      setLoading(false);
    }
  };

  const testGetLocation = async () => {
    setLoading(true);
    addLog('Testing get current location...');
    
    try {
      const currentLocation = await SimpleLocationService.getCurrentLocation();
      
      if (currentLocation) {
        setLocation(currentLocation);
        addLog(`Location obtained: ${currentLocation.latitude}, ${currentLocation.longitude}`);
        Alert.alert(
          'Location Found!',
          `Lat: ${currentLocation.latitude.toFixed(6)}\nLng: ${currentLocation.longitude.toFixed(6)}\nAccuracy: ${currentLocation.accuracy}m`
        );
      } else {
        addLog('Failed to get location');
        Alert.alert('Error', 'Could not get current location');
      }
    } catch (error) {
      addLog(`Location error: ${error.message}`);
      Alert.alert('Error', 'Failed to get location');
    } finally {
      setLoading(false);
    }
  };

  const testLocationWatching = async () => {
    setLoading(true);
    addLog('Testing location watching...');
    
    try {
      const result = await SimpleLocationService.startWatching();
      
      if (result) {
        // Add listener to see updates
        const removeListener = SimpleLocationService.addListener((newLocation) => {
          addLog(`Location update: ${newLocation.latitude}, ${newLocation.longitude}`);
          setLocation(newLocation);
        });
        
        addLog('Location watching started successfully');
        Alert.alert('Success', 'Location watching started! Check logs for updates.');
        
        // Stop after 15 seconds
        setTimeout(async () => {
          await SimpleLocationService.stopWatching();
          removeListener();
          addLog('Location watching stopped after 15 seconds');
        }, 15000);
      } else {
        addLog('Failed to start location watching');
        Alert.alert('Error', 'Failed to start location watching');
      }
    } catch (error) {
      addLog(`Watching error: ${error.message}`);
      Alert.alert('Error', 'Failed to start location watching');
    } finally {
      setLoading(false);
    }
  };

  const testAddress = async () => {
    if (!location) {
      Alert.alert('No Location', 'Please get location first');
      return;
    }

    setLoading(true);
    addLog('Testing address geocoding...');
    
    try {
      const address = await SimpleLocationService.getAddressFromCoordinates(
        location.latitude,
        location.longitude
      );
      
      if (address) {
        addLog(`Address found: ${address.formattedAddress}`);
        Alert.alert('Address Found', address.formattedAddress);
      } else {
        addLog('No address found');
        Alert.alert('No Address', 'Could not find address for this location');
      }
    } catch (error) {
      addLog(`Address error: ${error.message}`);
      Alert.alert('Error', 'Failed to get address');
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('Logs cleared');
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
        <Text style={styles.title}>Simple Location Test</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Permission Status:</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: getPermissionStatusColor() }]} />
            <Text style={[styles.statusText, { color: getPermissionStatusColor() }]}>
              {getPermissionStatusText()}
            </Text>
          </View>
        </View>

        {/* Location Card */}
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
            <Text style={styles.locationText}>
              Time: {new Date(location.timestamp).toLocaleString()}
            </Text>
          </View>
        )}

        {/* Test Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.permissionButton]}
            onPress={testPermission}
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

          <TouchableOpacity
            style={[styles.button, styles.addressButton]}
            onPress={testAddress}
            disabled={loading || !location}
          >
            <Ionicons name="home" size={20} color="white" />
            <Text style={styles.buttonText}>Get Address</Text>
          </TouchableOpacity>
        </View>

        {/* Logs */}
        <View style={styles.logsContainer}>
          <View style={styles.logsHeader}>
            <Text style={styles.logsTitle}>Debug Logs</Text>
            <TouchableOpacity onPress={clearLogs} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.logs} showsVerticalScrollIndicator={false}>
            {logs.map((log, index) => (
              <Text key={index} style={styles.logText}>{log}</Text>
            ))}
          </ScrollView>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#34A853" />
            <Text style={styles.loadingText}>Testing location services...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    margin: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
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
    marginBottom: 16,
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
    marginBottom: 20,
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
  addressButton: {
    backgroundColor: '#F59E0B',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  logsContainer: {
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
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EF4444',
    borderRadius: 6,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  logs: {
    maxHeight: 200,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
  },
  logText: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
    fontFamily: 'monospace',
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

export default SimpleLocationTest;
