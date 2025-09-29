import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import LocationService from '../services/NewLocationService';

const LocationVerification = () => {
  const [location, setLocation] = useState(null);
  const [isWatching, setIsWatching] = useState(false);
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[LocationVerification] ${message}`);
  };

  const testLocation = async () => {
    try {
      addLog('Testing location service...');
      
      // Test permission first
      const hasPermission = await LocationService.requestPermission();
      addLog(`Permission granted: ${hasPermission}`);
      
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Location permission is required for this test.');
        return;
      }
      
      // Get current location
      const loc = await LocationService.getCurrentLocation();
      if (loc) {
        setLocation(loc);
        addLog(`Location obtained: ${loc.latitude}, ${loc.longitude}`);
        
        // Check if it's the default location (California/Atlanta)
        const isDefaultLocation = (
          (loc.latitude >= 33.7 && loc.latitude <= 33.8 && loc.longitude >= -84.4 && loc.longitude <= -84.3) || // Atlanta
          (loc.latitude >= 37.7 && loc.latitude <= 37.8 && loc.longitude >= -122.5 && loc.longitude <= -122.4) || // San Francisco
          (loc.latitude >= 34.0 && loc.latitude <= 34.1 && loc.longitude >= -118.3 && loc.longitude <= -118.2)    // Los Angeles
        );
        
        if (isDefaultLocation) {
          addLog('⚠️ WARNING: This appears to be a default location, not your real location!');
          Alert.alert(
            'Default Location Detected',
            `The location service returned what appears to be a default location (${loc.latitude}, ${loc.longitude}). This might not be your actual location.`,
            [
              { text: 'Try Again', onPress: testLocation },
              { text: 'Continue', style: 'cancel' }
            ]
          );
        } else {
          addLog('✅ Real location detected!');
          Alert.alert(
            'Location Verified',
            `Real location detected: ${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`
          );
        }
      } else {
        addLog('❌ No location returned');
        Alert.alert('Error', 'Could not get location');
      }
    } catch (error) {
      addLog(`Error: ${error.message}`);
      Alert.alert('Error', 'Location test failed: ' + error.message);
    }
  };

  const startWatching = async () => {
    try {
      addLog('Starting location watching...');
      const started = await LocationService.startWatching();
      if (started) {
        setIsWatching(true);
        addLog('Location watching started');
        
        LocationService.addListener((loc) => {
          addLog(`Real-time update: ${loc.latitude}, ${loc.longitude}`);
          setLocation(loc);
        });
      }
    } catch (error) {
      addLog(`Watch error: ${error.message}`);
    }
  };

  const stopWatching = async () => {
    try {
      addLog('Stopping location watching...');
      await LocationService.stopWatching();
      setIsWatching(false);
      addLog('Location watching stopped');
    } catch (error) {
      addLog(`Stop error: ${error.message}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Location Verification</Text>
      <Text style={styles.subtitle}>Test if the app gets your real location</Text>
      
      <TouchableOpacity style={styles.button} onPress={testLocation}>
        <Text style={styles.buttonText}>Test My Location</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: isWatching ? '#FF6B6B' : '#34A853' }]} 
        onPress={isWatching ? stopWatching : startWatching}
      >
        <Text style={styles.buttonText}>
          {isWatching ? 'Stop Watching' : 'Start Real-time Tracking'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.button, { backgroundColor: '#9C27B0' }]} onPress={clearLogs}>
        <Text style={styles.buttonText}>Clear Logs</Text>
      </TouchableOpacity>
      
      {location && (
        <View style={styles.locationInfo}>
          <Text style={styles.infoTitle}>Current Location:</Text>
          <Text>Latitude: {location.latitude.toFixed(6)}</Text>
          <Text>Longitude: {location.longitude.toFixed(6)}</Text>
          <Text>Accuracy: {location.accuracy}m</Text>
          <Text>Time: {new Date(location.timestamp).toLocaleTimeString()}</Text>
        </View>
      )}
      
      <View style={styles.logsContainer}>
        <Text style={styles.logsTitle}>Debug Logs:</Text>
        {logs.slice(-15).map((log, index) => (
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
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
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
  },
  logText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
    fontFamily: 'monospace',
  },
});

export default LocationVerification;
