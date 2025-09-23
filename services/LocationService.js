import * as Location from 'expo-location';
import { Alert, Platform, Linking } from 'react-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// IMPROVEMENT: Import package to decode polylines from Google Directions API
import polyline from '@mapbox/polyline';
// IMPROVEMENT: Import the API key securely from the .env file
import { GOOGLE_MAPS_API_KEY } from '@env';

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

  async markLocationRequested(userId) {
    try {
      await AsyncStorage.setItem(`${LOCATION_REQUESTED_KEY_PREFIX}${userId}`, 'true');
    } catch (error) {
      console.error('Error marking location requested:', error);
    }
  }
  
  // (requestPermissions method remains largely the same)
  async requestPermissions(userId = null, isFirstTime = false) { /* ... no changes needed here ... */ }

  // --- Core Location Methods (Now with better error handling) ---

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
  stopWatchingLocation() { /* ... */ }
  addLocationListener(callback) { /* ... */ }

  // --- Geolocation and Routing Methods ---

  // (calculateDistance and deg2rad remain the same)
  calculateDistance(lat1, lon1, lat2, lon2) { /* ... */ }
  deg2rad(deg) { /* ... */ }

  // (getNearbyJobs now uses the CONFIG value as a default)
  async getNearbyJobs(jobs, maxDistance = CONFIG.DEFAULT_MAX_DISTANCE_KM) { /* ... */ }

  // IMPROVEMENT: Replaced mock function with a real Google Directions API call
  async generateRoute(destination) {
    if (!this.currentLocation || this.currentLocation.isDefault || !destination) return null;
    if (!GOOGLE_MAPS_API_KEY) {
        console.error("Google Maps API key is missing. Please check your .env file.");
        Alert.alert("Configuration Error", "Could not calculate route due to a configuration issue.");
        return null;
    }

    try {
      const origin = `${this.currentLocation.latitude},${this.currentLocation.longitude}`;
      const dest = `${destination.latitude},${destination.longitude}`;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${dest}&key=${GOOGLE_MAPS_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' || !data.routes?.[0]) {
        throw new Error(data.error_message || 'Could not find a route.');
      }

      const route = data.routes[0];
      const leg = route.legs[0];

      // Decode the polyline to get coordinates for drawing on the map
      const points = polyline.decode(route.overview_polyline.points);
      const coordinates = points.map(point => ({
        latitude: point[0],
        longitude: point[1],
      }));
      
      return {
        coordinates, // Array of {latitude, longitude} for the Polyline component
        distance: leg.distance.text, // e.g., "12.3 km"
        duration: leg.duration.text, // e.g., "15 mins"
        distanceValue: leg.distance.value, // distance in meters
        durationValue: leg.duration.value, // duration in seconds
      };

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