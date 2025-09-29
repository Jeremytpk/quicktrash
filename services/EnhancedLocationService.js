import * as Location from 'expo-location';
import { Alert, Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class EnhancedLocationService {
  constructor() {
    // Default to Atlanta, GA coordinates
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

  // Check if this is the first time requesting location for a user
  async isFirstTimeLocationRequest(userId) {
    try {
      const hasRequested = await AsyncStorage.getItem(`location_requested_${userId}`);
      return !hasRequested;
    } catch (error) {
      console.error('Error checking first time location request:', error);
      return true;
    }
  }

  // Mark that location has been requested for a user
  async markLocationRequested(userId) {
    try {
      await AsyncStorage.setItem(`location_requested_${userId}`, 'true');
    } catch (error) {
      console.error('Error marking location requested:', error);
    }
  }

  // Request location permissions with role-specific messaging
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
              text: 'Open Settings', 
              onPress: () => Linking.openSettings()
            }
          ]
        );
        return false;
      }

      // Mark that we've requested location for this user
      if (userId && isFirstTime) {
        await this.markLocationRequested(userId);
      }

      // For contractors/drivers, we also need background location for job tracking
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

  // Get current location with address geocoding
  async getCurrentLocation(userRole = 'customer') {
    try {
      console.log('Getting current location...');
      const hasPermission = await this.requestPermissions(null, userRole);
      if (!hasPermission) {
        console.log('No location permission');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        timeout: 20000,
        maximumAge: 10000, // Accept location up to 10 seconds old
      });

      this.currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
        isDefault: false,
        address: null
      };

      // Get address from coordinates
      const address = await this.getAddressFromCoordinates(
        location.coords.latitude, 
        location.coords.longitude
      );
      
      this.currentLocation.address = address;

      // Notify all listeners
      this.locationCallbacks.forEach(callback => callback(this.currentLocation));

      console.log('Location obtained:', this.currentLocation);
      return this.currentLocation;
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Location Error', 'Unable to get your current location. Please check your GPS settings.');
      return null;
    }
  }

  // Get address from coordinates using reverse geocoding
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

  // Format address into readable string
  formatAddress(address) {
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.region) parts.push(address.region);
    if (address.postalCode) parts.push(address.postalCode);
    return parts.join(', ');
  }

  // Request location with user-friendly flow
  async requestLocationWithAddress(userId, userRole, isFirstTime = false) {
    try {
      // Check if this is first time for better UX
      const isFirstTimeForUser = await this.isFirstTimeLocationRequest(userId);
      
      // Request permissions first
      const hasPermission = await this.requestPermissions(userId, userRole, isFirstTimeForUser);
      if (!hasPermission) {
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
        // Mark as requested for this user
        await this.markLocationRequested(userId);
        
        Alert.alert(
          'Location Found!',
          `We found you at: ${location.address.formattedAddress}`,
          [
            {
              text: 'Use This Location',
              onPress: () => {
                // Notify listeners
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

  // Add a callback for location updates
  addLocationListener(callback) {
    this.locationCallbacks.push(callback);
    
    // If we already have a location, call the callback immediately
    if (this.currentLocation) {
      callback(this.currentLocation);
    }

    // Return a function to remove the listener
    return () => {
      const index = this.locationCallbacks.indexOf(callback);
      if (index > -1) {
        this.locationCallbacks.splice(index, 1);
      }
    };
  }

  // Calculate distance between two points (in kilometers)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  // Start watching location changes
  async startWatchingLocation() {
    try {
      if (this.watchId) {
        await Location.stopLocationUpdatesAsync(this.watchId);
      }

      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 100, // Update every 100 meters
        },
        (location) => {
          this.currentLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: location.timestamp,
            isDefault: false,
            address: this.currentLocation.address // Keep existing address
          };

          // Notify all listeners
          this.locationCallbacks.forEach(callback => callback(this.currentLocation));
        }
      );

      console.log('Started watching location changes');
    } catch (error) {
      console.error('Error starting location watch:', error);
    }
  }

  // Stop watching location changes
  async stopWatchingLocation() {
    try {
      if (this.watchId) {
        await Location.stopLocationUpdatesAsync(this.watchId);
        this.watchId = null;
        console.log('Stopped watching location changes');
      }
    } catch (error) {
      console.error('Error stopping location watch:', error);
    }
  }

  // Get nearby jobs based on current location
  async getNearbyJobs(jobs, radiusKm = 25) {
    if (!this.currentLocation || this.currentLocation.isDefault) {
      console.log('No current location available for nearby jobs');
      return [];
    }

    return jobs.filter(job => {
      if (!job.coordinates) return false;
      
      const distance = this.calculateDistance(
        this.currentLocation.latitude,
        this.currentLocation.longitude,
        job.coordinates.latitude,
        job.coordinates.longitude
      );

      return distance <= radiusKm;
    }).map(job => ({
      ...job,
      distance: this.calculateDistance(
        this.currentLocation.latitude,
        this.currentLocation.longitude,
        job.coordinates.latitude,
        job.coordinates.longitude
      )
    }));
  }

  // Generate route between two points
  generateRoute(destination) {
    if (!this.currentLocation || this.currentLocation.isDefault) {
      return null;
    }

    return {
      origin: {
        latitude: this.currentLocation.latitude,
        longitude: this.currentLocation.longitude
      },
      destination: destination,
      distance: this.calculateDistance(
        this.currentLocation.latitude,
        this.currentLocation.longitude,
        destination.latitude,
        destination.longitude
      )
    };
  }

  // Open navigation to destination
  async openNavigation(destination, label = 'Destination') {
    try {
      if (!this.currentLocation || this.currentLocation.isDefault) {
        Alert.alert('Navigation Error', 'Current location not available for navigation.');
        return false;
      }

      const url = Platform.select({
        ios: `maps://app?daddr=${destination.latitude},${destination.longitude}&dirflg=d`,
        android: `google.navigation:q=${destination.latitude},${destination.longitude}`
      });

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      } else {
        // Fallback to Apple Maps on iOS or Google Maps on Android
        const fallbackUrl = Platform.select({
          ios: `http://maps.apple.com/?daddr=${destination.latitude},${destination.longitude}`,
          android: `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`
        });
        
        await Linking.openURL(fallbackUrl);
        return true;
      }
    } catch (error) {
      console.error('Error opening navigation:', error);
      Alert.alert('Navigation Error', 'Unable to open navigation. Please use your preferred maps app.');
      return false;
    }
  }
}

// Export singleton instance
export default new EnhancedLocationService();