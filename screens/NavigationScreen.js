import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  Platform,
  ActivityIndicator, // Added for loading states
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location'; // Required for real device location
import * as Linking from 'expo-linking'; // For opening navigation links

// --- Component Colors ---
const Colors = {
  primary: '#34A853', // Success/Active Green
  secondary: '#3B82F6', // Navigation Blue
  warning: '#F59E0B', // Highlight/Attention
  textDark: '#1F2937',
  textMedium: '#4B5563',
  background: '#F9FAFB',
  inactive: '#9CA3AF',
  cardBackground: '#FFFFFF',
};

// --- Constants ---
const PROXIMITY_RADIUS_FEET = 50; // Increased radius to 50ft for better real-world usability

// --- Utility: Haversine Formula (Meters to Feet) ---
const calculateDistance = (coord1, coord2) => {
  const R = 6371000; // Earth radius in meters
  const toRad = (value) => (value * Math.PI) / 180;
  const lat1 = toRad(coord1.latitude);
  const lat2 = toRad(coord2.latitude);
  const deltaLat = toRad(coord2.latitude - coord1.latitude);
  const deltaLon = toRad(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c * 3.28084; // Convert meters to feet
};


const NavigationScreen = ({ route, navigation }) => {
  const { coordinates, address, payout, description } = route.params;

  const [targetLocation, setTargetLocation] = useState(coordinates);
  const [driverLocation, setDriverLocation] = useState(null); // Initialize as null for loading
  const [isLoading, setIsLoading] = useState(true);
  const [isWithinLocation, setIsWithinLocation] = useState(false);
  const [distanceToTarget, setDistanceToTarget] = useState(null);

  const mapRef = useRef(null);

  // --- Location Permissions & Real-time Tracking ---
  useEffect(() => {
    let locationWatcher = null;
    
    const requestLocationPermissions = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Required', 
          'Permission to access location is necessary for navigation and arrival confirmation.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return false;
      }
      return true;
    };

    const startLocationWatcher = async () => {
      const granted = await requestLocationPermissions();
      if (!granted) return;

      locationWatcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 10, // Update location every 10 meters
          timeInterval: 5000,   // or every 5 seconds
        },
        (location) => {
          const newLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setDriverLocation(newLocation);
          setIsLoading(false);

          // Animate map to follow driver's location smoothly
          mapRef.current?.animateCamera({
            center: newLocation,
            pitch: 45, // Optional tilt for better navigation view
            heading: location.coords.heading || 0,
            zoom: 17,
          }, { duration: 500 });
        }
      );
    };

    startLocationWatcher();

    return () => {
      if (locationWatcher) {
        locationWatcher.remove();
      }
    };
  }, [navigation]);

  // --- Proximity Calculation Effect ---
  useEffect(() => {
    if (!driverLocation || !targetLocation) return;
    
    const distanceFeet = calculateDistance(driverLocation, targetLocation);
    setDistanceToTarget(distanceFeet);
    
    const isInside = distanceFeet <= PROXIMITY_RADIUS_FEET;
    setIsWithinLocation(isInside);

  }, [driverLocation, targetLocation]);

  // --- Handlers ---
  const handleTargetDragEnd = (e) => {
    // Allows administrator/testing to adjust the target for proximity check
    const newCoordinates = e.nativeEvent.coordinate;
    setTargetLocation(newCoordinates);
    Alert.alert('Target Location Moved', 'Job target coordinates have been manually adjusted for testing.');
  };

  const handleArrived = () => {
    if (isWithinLocation) {
      // Logic to confirm arrival in Firestore/API would typically go here
      Alert.alert('Arrival Confirmed', 'You have arrived at the job site. Proceed to the next step.', [
        { 
          text: 'View Job Details', 
          onPress: () => navigation.navigate('JobDetailsScreen', {
            jobDetails: {
              address,
              payout,
              description,
            },
            status: 'arrived' // Passing back updated status might be useful
          })
        },
      ]);
    } else {
      Alert.alert(
        'Out of Range', 
        `You must be within ${PROXIMITY_RADIUS_FEET} feet of the target location to confirm arrival. Current distance: ${distanceToTarget ? distanceToTarget.toFixed(1) : '--'} ft.`,
        [{ text: 'OK' }]
      );
    }
  };

  const startNavigation = () => {
    if (!targetLocation) {
      Alert.alert('Error', 'Target location is unavailable.');
      return;
    }

    const url = Platform.select({
      ios: `maps:0,0?q=${targetLocation.latitude},${targetLocation.longitude}`,
      android: `geo:0,0?q=${targetLocation.latitude},${targetLocation.longitude}`,
      default: `https://maps.google.com/?q=${targetLocation.latitude},${targetLocation.longitude}`,
    });

    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open navigation.');
    });
  };

  const centerMap = () => {
    if (mapRef.current && driverLocation) {
      mapRef.current.animateToRegion({
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 500);
    }
  }
  
  // --- Loading State ---
  if (isLoading || !driverLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.secondary} />
        <Text style={styles.loadingText}>Locating device for navigation...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        provider="google" // Use Google Maps as the provider
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
        showsUserLocation={false} // Hide default blue dot since we use a custom marker
        showsMyLocationButton={false} // Use custom re-center button
        pitchEnabled
        rotateEnabled
        scrollEnabled
      >
        {/* Driver Marker - Uses a custom icon and is not draggable in production */}
        <Marker
          coordinate={driverLocation}
          anchor={{ x: 0.5, y: 0.5 }}
          title="Your Location"
        >
          <MaterialIcons name="navigation" size={30} color={Colors.secondary} style={styles.driverIcon} />
        </Marker>
        
        {/* Target Marker - Draggable for testing/admin roles */}
        <Marker
          coordinate={targetLocation}
          draggable
          onDragEnd={handleTargetDragEnd}
          title="Job Site"
          description={address}
        >
          <Ionicons name="location-sharp" size={35} color={Colors.primary} />
        </Marker>
        
        {/* Proximity Circle */}
        <Circle
          center={targetLocation}
          radius={PROXIMITY_RADIUS_FEET * 0.3048} // Convert feet to meters for MapView
          strokeWidth={2}
          strokeColor={isWithinLocation ? Colors.primary : Colors.warning}
          fillColor={isWithinLocation ? `${Colors.primary}20` : `${Colors.warning}20`}
        />
      </MapView>

      {/* Map Controls */}
      <TouchableOpacity 
        style={styles.recenterButton}
        onPress={centerMap}
      >
        <MaterialIcons name="my-location" size={28} color={Colors.textDark} />
      </TouchableOpacity>

      {/* Information Overlay */}
      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <Ionicons name="map-outline" size={20} color={Colors.textMedium} />
          <Text style={styles.infoText} numberOfLines={1}>{address}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="cash-outline" size={20} color={Colors.textMedium} />
          <Text style={styles.infoText}>Payout: <Text style={{fontWeight: '700', color: Colors.primary}}>${payout}</Text></Text>
        </View>
        
        {distanceToTarget && (
          <View style={styles.distanceContainer}>
            <Ionicons name="walk-outline" size={20} color={Colors.textMedium} />
            <Text style={styles.distanceText}>
              Distance to Target: 
              <Text style={{fontWeight: '700'}}> {distanceToTarget.toFixed(1)} ft</Text>
            </Text>
          </View>
        )}
        
        {/* Updated Button Logic */}
        <TouchableOpacity
          style={[styles.arrivedButton, isWithinLocation ? styles.activeButton : styles.inactiveButton]}
          onPress={isWithinLocation ? handleArrived : startNavigation}
        >
          <Text style={styles.arrivedButtonText}>
            {isWithinLocation ? 'CONFIRM ARRIVAL' : 'START NAVIGATION'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.textMedium,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  driverIcon: {
    transform: [{ rotate: '-45deg' }], // Rotate icon to better represent a moving vehicle
    color: Colors.secondary,
  },
  recenterButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    right: 20,
    backgroundColor: Colors.cardBackground,
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  infoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: Colors.background,
    alignSelf: 'flex-start',
  },
  infoText: {
    fontSize: 16,
    marginLeft: 10,
    color: Colors.textDark,
    flexShrink: 1,
  },
  distanceText: {
    fontSize: 14,
    marginLeft: 10,
    color: Colors.textMedium,
  },
  arrivedButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  activeButton: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  inactiveButton: {
    backgroundColor: Colors.inactive,
  },
  arrivedButtonText: {
    color: Colors.cardBackground,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default NavigationScreen;