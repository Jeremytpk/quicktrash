import * as Location from 'expo-location';
import { Alert, Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class EnhancedLocationService {
  constructor() {
    this.currentLocation = {
      latitude: 33.7490,
      longitude: -84.3880,
      accuracy: null,
      timestamp: Date.now(),
      isDefault: true,
      address: null
    };
    this.watchId = null;
    this.locationCallbacks = [];
  }

  async requestPermissions(userId = null, userRole = 'customer', isFirstTime = false) {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        const roleMessages = {
          customer: {
            title: isFirstTime ? 'Welcome to QuickTrash!' : 'Location Permission Required',
            message: isFirstTime 
              ? 'Welcome to QuickTrash! To show you nearby contractors and provide accurate pickup estimates, we need access to your location.'
              : 'QuickTrash needs location access to show you nearby contractors and provide accurate pickup estimates. Please enable location permissions in your device settings.'
          },
          contractor: {
            title: isFirstTime ? 'Welcome to QuickTrash!' : 'Location Permission Required', 
            message: isFirstTime
              ? 'Welcome to QuickTrash! To show you nearby jobs and track your location for customers, we need access to your location.'
              : 'QuickTrash needs location access to show you nearby jobs and track your location for customers. Please enable location permissions in your device settings.'
          },
          driver: {
            title: isFirstTime ? 'Welcome to QuickTrash!' : 'Location Permission Required',
            message: isFirstTime
              ? 'Welcome to QuickTrash! To show you nearby jobs and track your location for customers, we need access to your location.'
              : 'QuickTrash needs location access to show you nearby jobs and track your location for customers. Please enable location permissions in your device settings.'
          }
        };

        const messages = roleMessages[userRole] || roleMessages.customer;
        
        Alert.alert(
          messages.title,
          messages.message,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: isFirstTime ? 'Allow Location' : 'Open Settings', 
              onPress: () => {
                if (isFirstTime) {
                  Location.requestForegroundPermissionsAsync();
                } else {
                  Linking.openSettings();
                }
              }
            }
          ]
        );
        return false;
      }

      if (userId && isFirstTime) {
        await AsyncStorage.setItem(`location_requested_${userId}`, 'true');
      }

      if (userRole === 'contractor' || userRole === 'driver') {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          Alert.alert(
            'Background Location Required',
            'To track your progress during pickups and provide accurate ETAs to customers, QuickTrash needs background location access.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Allow', onPress: () => Location.requestBackgroundPermissionsAsync() }
            ]
          );
        }
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  async getCurrentLocation(userRole = 'customer') {
    try {
      const hasPermission = await this.requestPermissions(null, userRole);
      if (!hasPermission) return null;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000,
      });

      this.currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
        isDefault: false,
        address: null
      };

      const address = await this.getAddressFromCoordinates(
        location.coords.latitude, 
        location.coords.longitude
      );
      
      this.currentLocation.address = address;
      this.locationCallbacks.forEach(callback => callback(this.currentLocation));

      return this.currentLocation;
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Location Error', 'Unable to get your current location. Please check your GPS settings.');
      return null;
    }
  }

  async getAddressFromCoordinates(latitude, longitude) {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });

      if (addresses && addresses.length > 0) {
        const address = addresses[0];
        return {
          street: address.street || '',
          city: address.city || '',
          region: address.region || '',
          country: address.country || '',
          postalCode: address.postalCode || '',
          formattedAddress: this.formatAddress(address),
          coordinates: { latitude, longitude }
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting address from coordinates:', error);
      return null;
    }
  }

  formatAddress(address) {
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.region) parts.push(address.region);
    if (address.postalCode) parts.push(address.postalCode);
    return parts.join(', ');
  }

  async requestLocationWithAddress(userId, userRole, isFirstTime = false) {
    try {
      const hasPermission = await this.requestPermissions(userId, userRole, isFirstTime);
      if (!hasPermission) {
        return null;
      }

      Alert.alert(
        'Getting Your Location',
        'Please wait while we get your current location and address...',
        [],
        { cancelable: false }
      );

      const location = await this.getCurrentLocation(userRole);
      
      if (location && location.address) {
        await AsyncStorage.setItem(`location_requested_${userId}`, 'true');
        
        Alert.alert(
          'Location Found!',
          `We found you at: ${location.address.formattedAddress}`,
          [
            {
              text: 'Use This Location',
              onPress: () => {
                this.locationCallbacks.forEach(callback => callback(location));
              }
            }
          ]
        );
        
        return location;
      } else {
        Alert.alert(
          'Location Error',
          'We couldn\'t get your exact location. You can still use the app, but some features may be limited.',
          [{ text: 'Continue' }]
        );
        return null;
      }
    } catch (error) {
      console.error('Error requesting location with address:', error);
      Alert.alert(
        'Location Error',
        'There was an error getting your location. You can still use the app.',
        [{ text: 'Continue' }]
      );
      return null;
    }
  }

  addLocationListener(callback) {
    this.locationCallbacks.push(callback);
    
    if (this.currentLocation) {
      callback(this.currentLocation);
    }

    return () => {
      const index = this.locationCallbacks.indexOf(callback);
      if (index > -1) {
        this.locationCallbacks.splice(index, 1);
      }
    };
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }
}

export default new EnhancedLocationService();
