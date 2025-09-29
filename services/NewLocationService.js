import * as Location from 'expo-location';
import { Alert, Platform } from 'react-native';

class NewLocationService {
  constructor() {
    this.currentLocation = null;
    this.watchId = null;
    this.locationCallbacks = [];
  }

  // Simple permission request
  async requestPermission() {
    try {
      console.log('🔍 Requesting location permission...');
      
      // Check current permission status
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      console.log('📱 Current permission status:', existingStatus);
      
      if (existingStatus === 'granted') {
        console.log('✅ Permission already granted');
        return true;
      }

      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('📱 Permission request result:', status);
      
      if (status !== 'granted') {
        // Check if location services are enabled
        const isLocationEnabled = await Location.hasServicesEnabledAsync();
        console.log('📍 Location services enabled:', isLocationEnabled);
        
        if (!isLocationEnabled) {
          Alert.alert(
            'Location Services Disabled',
            'Please enable location services in your device settings to use QuickTrash.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Location.openSettingsAsync() }
            ]
          );
        } else {
          Alert.alert(
            'Location Permission Required',
            'QuickTrash needs location access to show you nearby jobs and provide navigation. Please grant permission when prompted.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Try Again', onPress: () => this.requestPermission() },
              { text: 'Settings', onPress: () => Location.openSettingsAsync() }
            ]
          );
        }
        return false;
      }

      console.log('✅ Permission granted successfully');
      return true;
    } catch (error) {
      console.error('❌ Error requesting permission:', error);
      Alert.alert(
        'Location Error',
        'Unable to request location permission. Please check your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => Location.openSettingsAsync() }
        ]
      );
      return false;
    }
  }

  // Simple location getter
  async getCurrentLocation() {
    try {
      console.log('🌍 Getting current location...');
      
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.log('❌ No location permission');
        return null;
      }

      console.log('📍 Requesting location with high accuracy...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000,
        maximumAge: 10000,
      });

      console.log('✅ Location obtained:', {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: new Date(location.timestamp).toLocaleString()
      });

      this.currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
        isDefault: false
      };

      // Notify listeners
      this.locationCallbacks.forEach(callback => {
        try {
          callback(this.currentLocation);
        } catch (error) {
          console.error('❌ Error in location callback:', error);
        }
      });

      return this.currentLocation;
    } catch (error) {
      console.error('❌ Error getting location:', error);
      
      // Show specific error messages
      if (error.code === 'E_LOCATION_SERVICES_DISABLED') {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services in your device settings.',
          [{ text: 'OK' }]
        );
      } else if (error.code === 'E_LOCATION_TIMEOUT') {
        Alert.alert(
          'Location Timeout',
          'Unable to get your location. Please try again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Location Error',
          `Unable to get your location: ${error.message}`,
          [{ text: 'OK' }]
        );
      }
      
      return null;
    }
  }

  // Start watching location
  async startWatching() {
    try {
      console.log('👀 Starting location watching...');
      
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.log('❌ No permission for location watching');
        return false;
      }

      if (this.watchId) {
        console.log('🔄 Stopping existing location watch');
        await this.stopWatching();
      }

      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // 10 seconds
          distanceInterval: 10, // 10 meters
        },
        (location) => {
          console.log('📍 Location update received:', {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            accuracy: location.coords.accuracy
          });

          this.currentLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: location.timestamp,
            isDefault: false
          };

          // Notify listeners
          this.locationCallbacks.forEach(callback => {
            try {
              callback(this.currentLocation);
            } catch (error) {
              console.error('❌ Error in location callback:', error);
            }
          });
        }
      );

      console.log('✅ Location watching started');
      return true;
    } catch (error) {
      console.error('❌ Error starting location watch:', error);
      return false;
    }
  }

  // Stop watching location
  async stopWatching() {
    try {
      if (this.watchId) {
        console.log('🛑 Stopping location watch');
        // The watchId is a subscription object returned by watchPositionAsync
        // We need to call the remove method on the subscription
        if (this.watchId && typeof this.watchId.remove === 'function') {
          this.watchId.remove();
          console.log('✅ Location watching stopped via subscription.remove()');
        } else {
          console.log('⚠️ No valid subscription to remove');
        }
        this.watchId = null;
      }
    } catch (error) {
      console.error('❌ Error stopping location watch:', error);
      // Force reset the watchId even if stopping fails
      this.watchId = null;
    }
  }

  // Add location listener
  addListener(callback) {
    console.log('👂 Adding location listener');
    this.locationCallbacks.push(callback);
    
    // If we already have a location, call the callback immediately
    if (this.currentLocation) {
      console.log('📍 Calling listener with existing location');
      callback(this.currentLocation);
    }

    // Return cleanup function
    return () => {
      const index = this.locationCallbacks.indexOf(callback);
      if (index > -1) {
        this.locationCallbacks.splice(index, 1);
        console.log('🗑️ Removed location listener');
      }
    };
  }

  // Get address from coordinates
  async getAddressFromCoordinates(latitude, longitude) {
    try {
      console.log('🏠 Getting address for coordinates:', latitude, longitude);
      
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });

      if (addresses && addresses.length > 0) {
        const address = addresses[0];
        const formattedAddress = [
          address.street,
          address.city,
          address.region,
          address.postalCode
        ].filter(Boolean).join(', ');

        console.log('✅ Address found:', formattedAddress);
        
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
      
      console.log('❌ No address found');
      return null;
    } catch (error) {
      console.error('❌ Error getting address:', error);
      return null;
    }
  }

  // Calculate distance between two points
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  // Get nearby jobs
  getNearbyJobs(jobs, maxDistance = 25) {
    if (!this.currentLocation) {
      console.log('❌ No current location for nearby jobs');
      return [];
    }

    const nearbyJobs = jobs.filter(job => {
      if (!job.coordinates) return false;
      
      const distance = this.calculateDistance(
        this.currentLocation.latitude,
        this.currentLocation.longitude,
        job.coordinates.latitude,
        job.coordinates.longitude
      );

      return distance <= maxDistance;
    }).map(job => ({
      ...job,
      distance: this.calculateDistance(
        this.currentLocation.latitude,
        this.currentLocation.longitude,
        job.coordinates.latitude,
        job.coordinates.longitude
      )
    })).sort((a, b) => a.distance - b.distance);

    console.log(`📍 Found ${nearbyJobs.length} nearby jobs`);
    return nearbyJobs;
  }

  // Check if location services are enabled
  async hasServicesEnabledAsync() {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (error) {
      console.error('❌ Error checking location services:', error);
      return false;
    }
  }

  // Open device settings
  async openSettingsAsync() {
    try {
      await Location.openSettingsAsync();
    } catch (error) {
      console.error('❌ Error opening settings:', error);
    }
  }
}

export default new NewLocationService();
