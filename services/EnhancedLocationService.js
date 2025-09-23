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

  async isFirstTimeLocationRequest(userId) {
    try {
      const hasRequested = await AsyncStorage.getItem(`location_requested_${userId}`);
      return !hasRequested;
    } catch (error) {
      console.error('Error checking first time location request:', error);
      return true;
    }
  }

  async markLocationRequested(userId) {
    try {
      await AsyncStorage.setItem(`location_requested_${userId}`, 'true');
    } catch (error) {
      console.error('Error marking location requested:', error);
    }
  }

  async requestPermissions(userId = null, userRole = 'customer', isFirstTime = false) {
    try {
      // First check current permission status
      let { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
      
      // If not granted, request permission
      if (foregroundStatus !== 'granted') {
        console.log('Requesting location permission...');
        const permissionResult = await Location.requestForegroundPermissionsAsync();
        foregroundStatus = permissionResult.status;
        console.log('Permission result:', foregroundStatus);
      }
      
      if (foregroundStatus !== 'granted') {
        const roleMessages = {
          customer: {
            title: 'Location Permission Required',
            message: 'QuickTrash needs location access to show you nearby contractors and provide accurate pickup estimates. Please enable location permissions in your device settings.'
          },
          contractor: {
            title: 'Location Permission Required', 
            message: 'QuickTrash needs location access to show you nearby jobs and track your location for customers. Please enable location permissions in your device settings.'
          },
          driver: {
            title: 'Location Permission Required',
            message: 'QuickTrash needs location access to show you nearby jobs and track your location for customers. Please enable location permissions in your device settings.'
          }
        };

        const messages = roleMessages[userRole] || roleMessages.customer;
        
        Alert.alert(
          messages.title,
          messages.message,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => Linking.openSettings()
            }
          ]
        );
        return false;
      }

      if (userId && isFirstTime) {
        await this.markLocationRequested(userId);
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
      console.log('Getting current location...');
      const hasPermission = await this.requestPermissions(null, userRole);
      if (!hasPermission) {
        console.log('No location permission');
        return null;
      }

      // Use the highest accuracy possible for the most precise location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        timeout: 30000,
        maximumAge: 5000, // Accept location up to 5 seconds old
      });

      console.log('Location obtained:', location.coords);

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
      Alert.alert('Location Error', 'Unable to get your current location. Please check your GPS settings and ensure location services are enabled.');
      return null;
    }
  }

  async getAddressFromCoordinates(latitude, longitude) {
    try {
      console.log('Getting address for coordinates:', latitude, longitude);
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });

      if (addresses && addresses.length > 0) {
        const address = addresses[0];
        const formattedAddress = this.formatAddress(address);
        console.log('Address found:', formattedAddress);
        return {
          street: address.street || '',
          city: address.city || '',
          region: address.region || '',
          country: address.country || '',
          postalCode: address.postalCode || '',
          formattedAddress: formattedAddress,
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
      console.log('Requesting location with address for user:', userId, 'role:', userRole);
      
      // Force permission request
      const hasPermission = await this.requestPermissions(userId, userRole, isFirstTime);
      if (!hasPermission) {
        console.log('Permission denied');
        return null;
      }

      // Show loading message
      Alert.alert(
        'Getting Your Location',
        'Please wait while we get your current location and address...',
        [],
        { cancelable: false }
      );

      // Try to get location with multiple attempts for better accuracy
      let location = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (!location && attempts < maxAttempts) {
        attempts++;
        console.log(`Location attempt ${attempts}/${maxAttempts}`);
        try {
          location = await this.getCurrentLocation(userRole);
          if (location && location.address) {
            console.log('Location obtained successfully');
            break;
          }
        } catch (error) {
          console.error(`Location attempt ${attempts} failed:`, error);
          if (attempts < maxAttempts) {
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      if (location && location.address) {
        await this.markLocationRequested(userId);
        
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
          'We couldn\'t get your exact location. Please ensure location services are enabled and try again.',
          [
            { text: 'Try Again', onPress: () => this.requestLocationWithAddress(userId, userRole, isFirstTime) },
            { text: 'Continue Without Location', style: 'cancel' }
          ]
        );
        return null;
      }
    } catch (error) {
      console.error('Error requesting location with address:', error);
      Alert.alert(
        'Location Error',
        'There was an error getting your location. Please check your device settings.',
        [
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
          { text: 'Continue', style: 'cancel' }
        ]
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
