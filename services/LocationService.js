import * as Location from 'expo-location';
<<<<<<< HEAD
import { Alert, Platform, Linking } from 'react-native';
=======
import { Alert, Platform, Linking } from 'react-native'; // Linking is needed for settings
>>>>>>> 60a5c7d (Fix: Corrected)
import AsyncStorage from '@react-native-async-storage/async-storage';

class LocationService {
  constructor() {
<<<<<<< HEAD
    // Default to Atlanta, GA coordinates
    this.currentLocation = {
      latitude: 33.7490,
      longitude: -84.3880,
=======
    // Default to Gainesville, GA coordinates based on current context
    this.currentLocation = {
      latitude: 34.2979,
      longitude: -83.8241,
>>>>>>> 60a5c7d (Fix: Corrected)
      accuracy: null,
      timestamp: Date.now(),
      isDefault: true
    };
    this.watchId = null;
    this.locationCallbacks = [];
  }

<<<<<<< HEAD
  // Check if this is the first time requesting location for a user
=======
  // --- No changes to these helper methods ---
>>>>>>> 60a5c7d (Fix: Corrected)
  async isFirstTimeLocationRequest(userId) {
    try {
      const hasRequested = await AsyncStorage.getItem(`location_requested_${userId}`);
      return !hasRequested;
    } catch (error) {
      console.error('Error checking first time location request:', error);
      return true;
    }
  }

<<<<<<< HEAD
  // Mark that location has been requested for a user
=======
>>>>>>> 60a5c7d (Fix: Corrected)
  async markLocationRequested(userId) {
    try {
      await AsyncStorage.setItem(`location_requested_${userId}`, 'true');
    } catch (error) {
      console.error('Error marking location requested:', error);
    }
  }
<<<<<<< HEAD

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
=======
  // --- End of unchanged helpers ---

  // MODIFIED: Improved permission handling to guide user to settings
  async requestPermissions(userId = null, isFirstTime = false) {
    try {
      let { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        foregroundStatus = status;
      }

      if (foregroundStatus !== 'granted') {
        const message = 'QuickTrash needs location access to show nearby jobs. Please enable location permissions in your device settings.';
        
        Alert.alert(
          'Location Permission Required',
          message,
          [
            { text: 'Cancel', style: 'cancel' },
            // This now opens the app's settings for the user
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
>>>>>>> 60a5c7d (Fix: Corrected)
          ]
        );
        return false;
      }

<<<<<<< HEAD
      // Mark that we've requested location for this user
=======
>>>>>>> 60a5c7d (Fix: Corrected)
      if (userId && isFirstTime) {
        await this.markLocationRequested(userId);
      }

<<<<<<< HEAD
      // For contractors, we also need background location for job tracking
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      if (backgroundStatus !== 'granted') {
        Alert.alert(
          'Background Location Required',
          'To track your progress during pickups and provide accurate ETAs to customers, QuickTrash needs background location access.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Allow', onPress: () => Location.requestBackgroundPermissionsAsync() }
=======
      let { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
          const { status } = await Location.requestBackgroundPermissionsAsync();
          backgroundStatus = status;
      }
      
      if (backgroundStatus !== 'granted') {
        Alert.alert(
          'Background Location Recommended',
          'To track progress during pickups, QuickTrash works best with background location access. You can enable this in your settings.',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
>>>>>>> 60a5c7d (Fix: Corrected)
          ]
        );
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

<<<<<<< HEAD
  // Get current location
  async getCurrentLocation() {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });
=======
  // MODIFIED: More robust and precise location fetching with a fallback
  async getCurrentLocation() {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return this.currentLocation; // Return default/last known if no permission

      let location;
      try {
        // First, try to get a fresh, high-accuracy location
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
          timeout: 15000, // Increased timeout for a better chance of success
        });
      } catch (e) {
        // If it fails (e.g., timeout), fall back to the last known position
        console.log('High accuracy location failed, falling back to last known position.');
        location = await Location.getLastKnownPositionAsync();
        if (!location) {
          // If there's no last known location, throw an error
          throw new Error("Could not determine location.");
        }
      }
>>>>>>> 60a5c7d (Fix: Corrected)

      this.currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
        isDefault: false
      };

<<<<<<< HEAD
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
=======
      this.locationCallbacks.forEach(callback => callback(this.currentLocation));
      return this.currentLocation;

    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Location Error', 'Unable to get your current location. Please ensure GPS is enabled and you have a clear sky view.');
      return this.currentLocation; // Return default/last known on error
    }
  }

  // MODIFIED: Increased accuracy for active job tracking
>>>>>>> 60a5c7d (Fix: Corrected)
  async startWatchingLocation() {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      if (this.watchId) {
        this.stopWatchingLocation();
      }

      this.watchId = await Location.watchPositionAsync(
        {
<<<<<<< HEAD
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update every 10 meters
=======
          accuracy: Location.Accuracy.BestForNavigation, // Highest accuracy
          timeInterval: 3000, // Update every 3 seconds
          distanceInterval: 5, // Update every 5 meters
>>>>>>> 60a5c7d (Fix: Corrected)
        },
        (location) => {
          this.currentLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: location.timestamp,
            isDefault: false
          };
<<<<<<< HEAD

          // Notify all listeners
          this.locationCallbacks.forEach(callback => callback(this.currentLocation));
        }
      );

=======
          this.locationCallbacks.forEach(callback => callback(this.currentLocation));
        }
      );
>>>>>>> 60a5c7d (Fix: Corrected)
      return this.watchId;
    } catch (error) {
      console.error('Error starting location watch:', error);
      return null;
    }
  }

<<<<<<< HEAD
  // Stop watching location changes
=======
>>>>>>> 60a5c7d (Fix: Corrected)
  stopWatchingLocation() {
    if (this.watchId) {
      this.watchId.remove();
      this.watchId = null;
    }
  }

<<<<<<< HEAD
  // Add a callback for location updates
  addLocationListener(callback) {
    this.locationCallbacks.push(callback);
    
    // If we already have a location, call the callback immediately
    if (this.currentLocation) {
      callback(this.currentLocation);
    }

    // Return a function to remove the listener
=======
  addLocationListener(callback) {
    this.locationCallbacks.push(callback);
    if (this.currentLocation) {
      callback(this.currentLocation);
    }
>>>>>>> 60a5c7d (Fix: Corrected)
    return () => {
      const index = this.locationCallbacks.indexOf(callback);
      if (index > -1) {
        this.locationCallbacks.splice(index, 1);
      }
    };
  }

<<<<<<< HEAD
  // Calculate distance between two points (in kilometers)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return distance;
=======
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
>>>>>>> 60a5c7d (Fix: Corrected)
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

<<<<<<< HEAD
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
=======
  // MODIFIED: Corrected the job data structure to match ContractorDashboard
  async getNearbyJobs(jobs, maxDistance = 25) {
    // We don't need to call getCurrentLocation again if we're already watching it.
    // Use the latest location stored in the service.
    if (!this.currentLocation || this.currentLocation.isDefault) {
        await this.getCurrentLocation(); // Fetch it if we don't have a real one yet
    }

    return jobs.filter(job => {
      // Use 'pickupAddress.coordinates' to match your component's data
      if (!job.pickupAddress?.coordinates) return false;
      
      const distance = this.calculateDistance(
        this.currentLocation.latitude,
        this.currentLocation.longitude,
        // Use 'latitude' and 'longitude' for consistency
        job.pickupAddress.coordinates.latitude,
        job.pickupAddress.coordinates.longitude
>>>>>>> 60a5c7d (Fix: Corrected)
      );

      return distance <= maxDistance;
    }).map(job => ({
      ...job,
      distance: this.calculateDistance(
<<<<<<< HEAD
        currentLocation.latitude,
        currentLocation.longitude,
        job.location.coordinates.lat,
        job.location.coordinates.lng
=======
        this.currentLocation.latitude,
        this.currentLocation.longitude,
        job.pickupAddress.coordinates.latitude,
        job.pickupAddress.coordinates.longitude
>>>>>>> 60a5c7d (Fix: Corrected)
      )
    })).sort((a, b) => a.distance - b.distance);
  }

<<<<<<< HEAD
  // Generate route to a destination
  generateRoute(destination) {
    if (!this.currentLocation || !destination) return null;

    // This would typically integrate with Google Maps Directions API
    // For now, returning a simple route object
=======
  generateRoute(destination) {
    if (!this.currentLocation || this.currentLocation.isDefault || !destination) return null;
>>>>>>> 60a5c7d (Fix: Corrected)
    return {
      origin: this.currentLocation,
      destination: destination,
      distance: this.calculateDistance(
<<<<<<< HEAD
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
=======
        this.currentLocation.latitude, this.currentLocation.longitude,
        destination.latitude, destination.longitude
      ),
      estimatedTime: this.estimateTravelTime(
        this.calculateDistance(
          this.currentLocation.latitude, this.currentLocation.longitude,
          destination.latitude, destination.longitude
>>>>>>> 60a5c7d (Fix: Corrected)
        )
      )
    };
  }

<<<<<<< HEAD
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
=======
  estimateTravelTime(distanceKm) {
    const avgSpeed = 40;
    const timeHours = distanceKm / avgSpeed;
    return Math.round(timeHours * 60);
  }

  // MODIFIED: Corrected the web fallback URL for navigation
  async openNavigation(destination, destinationName = 'Destination') {
    if (!this.currentLocation || this.currentLocation.isDefault) {
>>>>>>> 60a5c7d (Fix: Corrected)
      Alert.alert('Error', 'Unable to get your current location for navigation.');
      return;
    }

<<<<<<< HEAD
    const url = Platform.select({
      ios: `maps:?saddr=${currentLocation.latitude},${currentLocation.longitude}&daddr=${destination.latitude},${destination.longitude}&dirflg=d`,
      android: `google.navigation:q=${destination.latitude},${destination.longitude}`
    });

=======
    const { latitude: destLat, longitude: destLng } = destination;
    const { latitude: startLat, longitude: startLng } = this.currentLocation;

    const scheme = Platform.select({ ios: 'maps:?daddr=', android: 'geo:?q=' });
    const url = Platform.select({
      ios: `${scheme}${destLat},${destLng}&saddr=${startLat},${startLng}`,
      android: `${scheme}${destLat},${destLng}`,
    });
    
>>>>>>> 60a5c7d (Fix: Corrected)
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
<<<<<<< HEAD
        // Fallback to web-based Google Maps
        const webUrl = `https://www.google.com/maps/dir/${currentLocation.latitude},${currentLocation.longitude}/${destination.latitude},${destination.longitude}`;
=======
        // Correct fallback to web-based Google Maps
        const webUrl = `https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${destLat},${destLng}`;
>>>>>>> 60a5c7d (Fix: Corrected)
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      console.error('Error opening navigation:', error);
      Alert.alert('Navigation Error', 'Unable to open navigation app.');
    }
  }

<<<<<<< HEAD
  // Check if contractor is close to pickup location
  isNearPickupLocation(pickupLocation, threshold = 0.1) { // 100 meters
    if (!this.currentLocation || !pickupLocation) return false;
    
    const distance = this.calculateDistance(
      this.currentLocation.latitude,
      this.currentLocation.longitude,
      pickupLocation.latitude,
      pickupLocation.longitude
    );

=======
  isNearPickupLocation(pickupLocation, threshold = 0.1) { // 100 meters
    if (!this.currentLocation || this.currentLocation.isDefault || !pickupLocation) return false;
    const distance = this.calculateDistance(
      this.currentLocation.latitude, this.currentLocation.longitude,
      pickupLocation.latitude, pickupLocation.longitude
    );
>>>>>>> 60a5c7d (Fix: Corrected)
    return distance <= threshold;
  }
}

<<<<<<< HEAD
// Export singleton instance
export default new LocationService();
=======
export default new LocationService();
>>>>>>> 60a5c7d (Fix: Corrected)
