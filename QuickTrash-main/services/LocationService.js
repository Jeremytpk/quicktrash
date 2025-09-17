import * as Location from 'expo-location';
import { Alert, Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });

      this.currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
        isDefault: false
      };

      // Notify all listeners
      this.locationCallbacks.forEach(callback => callback(this.currentLocation));

      return this.currentLocation;
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Location Error', 'Unable to get your current location. Please check your GPS settings.');
      return null;
    }
  }

  // Start watching location changes
  async startWatchingLocation() {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      if (this.watchId) {
        this.stopWatchingLocation();
      }

      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          this.currentLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: location.timestamp,
            isDefault: false
          };

          // Notify all listeners
          this.locationCallbacks.forEach(callback => callback(this.currentLocation));
        }
      );

      return this.watchId;
    } catch (error) {
      console.error('Error starting location watch:', error);
      return null;
    }
  }

  // Stop watching location changes
  stopWatchingLocation() {
    if (this.watchId) {
      this.watchId.remove();
      this.watchId = null;
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
      console.error('Error opening navigation:', error);
      Alert.alert('Navigation Error', 'Unable to open navigation app.');
    }
  }

  // Check if contractor is close to pickup location
  isNearPickupLocation(pickupLocation, threshold = 0.1) { // 100 meters
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

// Export singleton instance
export default new LocationService();