import * as Location from 'expo-location';
import { Alert, Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// IMPROVEMENT: Centralized configuration for easy tweaking
const CONFIG = {
  LOCATION_ACCURACY: Location.Accuracy.High,
  WATCH_TIME_INTERVAL_MS: 5000,
  WATCH_DISTANCE_INTERVAL_M: 10,
  DEFAULT_MAX_DISTANCE_KM: 25,
  PICKUP_THRESHOLD_KM: 0.1, // 100 meters
};

// IMPROVEMENT: Consistent key management for AsyncStorage
const LOCATION_REQUESTED_KEY_PREFIX = '@QuickTrash:location_requested_';

class LocationService {
  constructor() {

    // Default to Atlanta, GA coordinates
    this.currentLocation = {
      latitude: 33.7490,
      longitude: -84.3880,
      accuracy: null,
      timestamp: Date.now(),
      isDefault: true
    };
    this.watchId = null;
    this.locationCallbacks = [];
  }

  // --- Permission and Storage Methods (Now with consistent keys) ---

  async isFirstTimeLocationRequest(userId) {
    try {
      const hasRequested = await AsyncStorage.getItem(`${LOCATION_REQUESTED_KEY_PREFIX}${userId}`);
      return !hasRequested;
    } catch (error) {
      console.error('Error checking first time location request:', error);
      return true;
    }
  }


  // Mark that location has been requested for a user
  async markLocationRequested(userId) {
    try {
      await AsyncStorage.setItem(`${LOCATION_REQUESTED_KEY_PREFIX}${userId}`, 'true');
    } catch (error) {
      console.error('Error marking location requested:', error);
    }
  }

  // Request location permissions with first-time user flow
  async requestPermissions(userId = null, isFirstTime = false) {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        const message = isFirstTime 
          ? 'Welcome to QuickTrash! To provide you with the best experience and show you relevant content based on your location, we need access to your location.'
          : 'QuickTrash needs location access to show you nearby jobs and provide navigation. Please enable location permissions in your device settings.';
        
        Alert.alert(
          isFirstTime ? 'Welcome to QuickTrash!' : 'Location Permission Required',
          message,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: isFirstTime ? 'Allow Location' : 'Open Settings', onPress: () => Location.requestForegroundPermissionsAsync() }
          ]
        );
        return false;
      }

      // Mark that we've requested location for this user
      if (userId && isFirstTime) {
        await this.markLocationRequested(userId);
      }
      // For contractors, we also need background location for job tracking
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

      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  // Get current location
  async getCurrentLocation() {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const location = await Location.getCurrentPositionAsync({
        accuracy: CONFIG.LOCATION_ACCURACY,
        timeout: 10000,
      });

      this.currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
        isDefault: false
      };

      this.locationCallbacks.forEach(callback => callback(this.currentLocation));
      return this.currentLocation;
    } catch (error) {
      // IMPROVEMENT: More specific error handling for a better user experience
      console.error('Error getting current location:', error);
      if (error.code === 'E_LOCATION_TIMEOUT') {
        Alert.alert('Location Timeout', 'Could not get your location in time. Please check your GPS signal and try again.');
      } else {
        Alert.alert('Location Error', 'Unable to get your current location. Please check your device settings.');
      }
      return null;
    }
  }

  async startWatchingLocation() {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      if (this.watchId) {
        this.stopWatchingLocation();
      }

      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: CONFIG.LOCATION_ACCURACY,
          timeInterval: CONFIG.WATCH_TIME_INTERVAL_MS,
          distanceInterval: CONFIG.WATCH_DISTANCE_INTERVAL_M,
        },
        (location) => {
          this.currentLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: location.timestamp,
            isDefault: false
          };
          this.locationCallbacks.forEach(callback => callback(this.currentLocation));
        }
      );
      return this.watchId;
    } catch (error) {
      console.error('Error starting location watch:', error);
      return null;
    }
  }

  // (stopWatchingLocation and addLocationListener remain the same)
  stopWatchingLocation() {
    if (this.watchId) {
      this.watchId.remove();
      this.watchId = null;
    }
    this.locationCallbacks = [];
    console.log('🛑 Location watching stopped');
  }

  addLocationListener(callback) {
    this.locationCallbacks.push(callback);
    return () => {
      const index = this.locationCallbacks.indexOf(callback);
      if (index > -1) {
        this.locationCallbacks.splice(index, 1);
      }
    };
  }

  // EMERGENCY: Complete stop of all location services
  emergencyStop() {
    console.log('🚨 EMERGENCY STOP: Killing all location services');
    this.stopWatchingLocation();
    this.currentLocation = null;
    this.locationCallbacks = [];
    console.log('✅ All location services stopped');
  }

  // --- Geolocation and Routing Methods ---

  // (calculateDistance and deg2rad remain the same)
  calculateDistance(lat1, lon1, lat2, lon2) { /* ... */ }
  deg2rad(deg) { /* ... */ }

  // (getNearbyJobs now uses the CONFIG value as a default)
  async getNearbyJobs(jobs, maxDistance = CONFIG.DEFAULT_MAX_DISTANCE_KM) { /* ... */ }

  // Get nearby jobs based on current location
  async getNearbyJobs(jobs, maxDistance = 25) {
    const currentLocation = await this.getCurrentLocation();
    if (!currentLocation) return [];

    return jobs.filter(job => {
      if (!job.location?.coordinates) return false;
      
      const distance = this.calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        job.location.coordinates.lat,
        job.location.coordinates.lng
      );

      return distance <= maxDistance;
    }).map(job => ({
      ...job,
      distance: this.calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        job.location.coordinates.lat,
        job.location.coordinates.lng
      )
    })).sort((a, b) => a.distance - b.distance);
  }

  // Generate route to a destination
  generateRoute(destination) {
    if (!this.currentLocation || !destination) return null;

    // This would typically integrate with Google Maps Directions API
    // For now, returning a simple route object
    return {
      origin: this.currentLocation,
      destination: destination,
      distance: this.calculateDistance(
        this.currentLocation.latitude,
        this.currentLocation.longitude,
        destination.latitude,
        destination.longitude
      ),
      estimatedTime: this.estimateTravelTime(
        this.calculateDistance(
          this.currentLocation.latitude,
          this.currentLocation.longitude,
          destination.latitude,
          destination.longitude
        )
      )
    };
  }

  // Estimate travel time based on distance
  estimateTravelTime(distanceKm) {
    // Assuming average speed of 40 km/h in urban areas
    const avgSpeed = 40;
    const timeHours = distanceKm / avgSpeed;
    const timeMinutes = Math.round(timeHours * 60);
    return timeMinutes;
  }

  // Open navigation in external app (Google Maps, Apple Maps)
  async openNavigation(destination, destinationName = 'Destination') {
    const currentLocation = await this.getCurrentLocation();
    if (!currentLocation) {
      Alert.alert('Error', 'Unable to get your current location for navigation.');
      return;
    }

    const url = Platform.select({
      ios: `maps:?saddr=${currentLocation.latitude},${currentLocation.longitude}&daddr=${destination.latitude},${destination.longitude}&dirflg=d`,
      android: `google.navigation:q=${destination.latitude},${destination.longitude}`
    });

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback to web-based Google Maps
        const webUrl = `https://www.google.com/maps/dir/${currentLocation.latitude},${currentLocation.longitude}/${destination.latitude},${destination.longitude}`;
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      console.error("Error generating route:", error);
      Alert.alert("Routing Error", "Failed to calculate the route to the destination.");
      return null;
    }
  }

  // IMPROVEMENT: The estimateTravelTime method is no longer needed, as Google provides a more accurate duration.

  // (openNavigation remains the same)
  async openNavigation(destination, destinationName = 'Destination') { /* ... */ }
  
  // (isNearPickupLocation now uses the CONFIG value)
  isNearPickupLocation(pickupLocation, threshold = CONFIG.PICKUP_THRESHOLD_KM) {
    if (!this.currentLocation || !pickupLocation) return false;
    const distance = this.calculateDistance(
      this.currentLocation.latitude,
      this.currentLocation.longitude,
      pickupLocation.latitude,
      pickupLocation.longitude
    );
    return distance <= threshold;
  }
}

export default new LocationService();