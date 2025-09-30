import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import LocationService from '../services/NewLocationService';

const LocationTestSimple = () => {
  const [location, setLocation] = useState(null);
  const [isWatching, setIsWatching] = useState(false);
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[LocationTest] ${message}`);
  };

  const testPermission = async () => {
    try {
      addLog('Testing permission...');
      const hasPermission = await LocationService.requestPermission();
      addLog(`Permission result: ${hasPermission}`);
      Alert.alert('Permission Test', `Permission granted: ${hasPermission}`);
    } catch (error) {
      addLog(`Permission error: ${error.message}`);
    }
  };

  const testGetLocation = async () => {
    try {
      addLog('Getting current location...');
      const loc = await LocationService.getCurrentLocation();
      if (loc) {
        setLocation(loc);
        addLog(`Location: ${loc.latitude}, ${loc.longitude}`);
        Alert.alert('Location Test', `Lat: ${loc.latitude.toFixed(6)}\nLng: ${loc.longitude.toFixed(6)}`);
      } else {
        addLog('No location returned');
      }
    } catch (error) {
      addLog(`Location error: ${error.message}`);
    }
  };

  const testStartWatching = async () => {
    try {
      addLog('Starting location watching...');
      const started = await LocationService.startWatching();
      if (started) {
        setIsWatching(true);
        addLog('Location watching started');
        
        // Add listener
        LocationService.addListener((loc) => {
          addLog(`Real-time update: ${loc.latitude}, ${loc.longitude}`);
          setLocation(loc);
        });
      } else {
        addLog('Failed to start watching');
      }
    } catch (error) {
      addLog(`Watch error: ${error.message}`);
    }
  };

  const testStopWatching = async () => {
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
    <View style={styles.container}>
      <Text style={styles.title}>Simple Location Test</Text>
      
      <TouchableOpacity style={styles.button} onPress={testPermission}>
        <Text style={styles.buttonText}>Test Permission</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={testGetLocation}>
        <Text style={styles.buttonText}>Get Location</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: isWatching ? '#FF6B6B' : '#34A853' }]} 
        onPress={isWatching ? testStopWatching : testStartWatching}
      >
        <Text style={styles.buttonText}>
          {isWatching ? 'Stop Watching' : 'Start Watching'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.button, { backgroundColor: '#9C27B0' }]} onPress={clearLogs}>
        <Text style={styles.buttonText}>Clear Logs</Text>
      </TouchableOpacity>
      
      {location && (
        <View style={styles.locationInfo}>
          <Text style={styles.infoTitle}>Current Location:</Text>
          <Text>Lat: {location.latitude.toFixed(6)}</Text>
          <Text>Lng: {location.longitude.toFixed(6)}</Text>
          <Text>Accuracy: {location.accuracy}m</Text>
          <Text>Time: {new Date(location.timestamp).toLocaleTimeString()}</Text>
        </View>
      )}
      
      <View style={styles.logsContainer}>
        <Text style={styles.logsTitle}>Logs:</Text>
        {logs.slice(-10).map((log, index) => (
          <Text key={index} style={styles.logText}>{log}</Text>
        ))}
      </View>
    </View>
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

export default LocationTestSimple;
