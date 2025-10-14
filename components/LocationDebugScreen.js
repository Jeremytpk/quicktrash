import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import EnhancedLocationService from '../services/EnhancedLocationService';

const LocationDebugScreen = () => {
  const [permissionStatus, setPermissionStatus] = useState('Unknown');
  const [location, setLocation] = useState(null);
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[LocationDebug] ${message}`);
  };

  useEffect(() => {
    checkInitialPermissions();
  }, []);

  const checkInitialPermissions = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(status);
      addLog(`Initial permission status: ${status}`);
    } catch (error) {
      addLog(`Error checking permissions: ${error.message}`);
    }
  };

  const checkPermissions = async () => {
    try {
      addLog('Checking permissions...');
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(status);
      addLog(`Permission status: ${status}`);
      Alert.alert('Permission Status', `Current status: ${status}`);
    } catch (error) {
      addLog(`Error: ${error.message}`);
      Alert.alert('Error', 'Failed to check permissions: ' + error.message);
    }
  };

  const requestPermissions = async () => {
    try {
      addLog('Requesting permissions...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      addLog(`Permission request result: ${status}`);
      Alert.alert('Permission Request', `Result: ${status}`);
    } catch (error) {
      addLog(`Error: ${error.message}`);
      Alert.alert('Error', 'Failed to request permissions: ' + error.message);
    }
  };

  const getLocation = async () => {
    try {
      addLog('Getting current location...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        timeout: 30000,
      });
      setLocation(location);
      addLog(`Location obtained: ${location.coords.latitude}, ${location.coords.longitude}`);
      Alert.alert(
        'Location Found',
        `Lat: ${location.coords.latitude.toFixed(6)}\nLng: ${location.coords.longitude.toFixed(6)}\nAccuracy: ${location.coords.accuracy}m`
      );
    } catch (error) {
      addLog(`Error: ${error.message}`);
      Alert.alert('Error', 'Failed to get location: ' + error.message);
    }
  };

  const testEnhancedService = async () => {
    try {
      addLog('Testing EnhancedLocationService...');
      const location = await EnhancedLocationService.getCurrentLocation('customer');
      addLog(`Enhanced service result: ${location ? 'Success' : 'Failed'}`);
      if (location) {
        addLog(`Location: ${location.latitude}, ${location.longitude}`);
        addLog(`Address: ${location.address?.formattedAddress || 'No address'}`);
      }
    } catch (error) {
      addLog(`Enhanced service error: ${error.message}`);
    }
  };

  const testFullFlow = async () => {
    try {
      addLog('Testing full location flow...');
      const locationData = await EnhancedLocationService.requestLocationWithAddress(
        'test-user-id',
        'customer',
        true
      );
      addLog(`Full flow result: ${locationData ? 'Success' : 'Failed'}`);
      if (locationData) {
        addLog(`Location: ${locationData.latitude}, ${locationData.longitude}`);
        addLog(`Address: ${locationData.address?.formattedAddress || 'No address'}`);
      }
    } catch (error) {
      addLog(`Full flow error: ${error.message}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Location Debug Screen</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>Permission Status: {permissionStatus}</Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={checkPermissions}>
          <Text style={styles.buttonText}>Check Permissions</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={requestPermissions}>
          <Text style={styles.buttonText}>Request Permissions</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={getLocation}>
          <Text style={styles.buttonText}>Get Location</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testEnhancedService}>
          <Text style={styles.buttonText}>Test Enhanced Service</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testFullFlow}>
          <Text style={styles.buttonText}>Test Full Flow</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, { backgroundColor: '#FF6B6B' }]} onPress={clearLogs}>
          <Text style={styles.buttonText}>Clear Logs</Text>
        </TouchableOpacity>
      </View>
      
      {location && (
        <View style={styles.locationInfo}>
          <Text style={styles.infoTitle}>Last Location:</Text>
          <Text>Lat: {location.coords.latitude.toFixed(6)}</Text>
          <Text>Lng: {location.coords.longitude.toFixed(6)}</Text>
          <Text>Accuracy: {location.coords.accuracy}m</Text>
        </View>
      )}
      
      <View style={styles.logsContainer}>
        <Text style={styles.logsTitle}>Debug Logs:</Text>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>{log}</Text>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#1A1A1A',
  },
  statusContainer: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#34A853',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  locationInfo: {
    backgroundColor: '#E8F5E8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  infoTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#2E7D32',
  },
  logsContainer: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  logsTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1A1A1A',
  },
  logText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
    fontFamily: 'monospace',
  },
});

export default LocationDebugScreen;
