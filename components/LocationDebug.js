import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Location from 'expo-location';

const LocationDebug = () => {
  const [permissionStatus, setPermissionStatus] = useState('Unknown');
  const [location, setLocation] = useState(null);

  const checkPermissions = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(status);
      Alert.alert('Permission Status', `Current status: ${status}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to check permissions: ' + error.message);
    }
  };

  const requestPermissions = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      Alert.alert('Permission Request', `Result: ${status}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to request permissions: ' + error.message);
    }
  };

  const getLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        timeout: 30000,
      });
      setLocation(location);
      Alert.alert(
        'Location Found',
        `Lat: ${location.coords.latitude.toFixed(6)}\nLng: ${location.coords.longitude.toFixed(6)}\nAccuracy: ${location.coords.accuracy}m`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to get location: ' + error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Location Debug</Text>
      <Text style={styles.status}>Permission Status: {permissionStatus}</Text>
      
      <TouchableOpacity style={styles.button} onPress={checkPermissions}>
        <Text style={styles.buttonText}>Check Permissions</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={requestPermissions}>
        <Text style={styles.buttonText}>Request Permissions</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={getLocation}>
        <Text style={styles.buttonText}>Get Location</Text>
      </TouchableOpacity>
      
      {location && (
        <View style={styles.locationInfo}>
          <Text style={styles.infoTitle}>Last Location:</Text>
          <Text>Lat: {location.coords.latitude.toFixed(6)}</Text>
          <Text>Lng: {location.coords.longitude.toFixed(6)}</Text>
          <Text>Accuracy: {location.coords.accuracy}m</Text>
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
    marginBottom: 20,
  },
  status: {
    fontSize: 16,
    marginBottom: 20,
    color: '#666',
  },
  button: {
    backgroundColor: '#34A853',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginBottom: 10,
    width: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  locationInfo: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  infoTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
});

export default LocationDebug;
