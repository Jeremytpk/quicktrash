import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  Platform,
  ActivityIndicator, 
  Modal,
  Animated,
  Easing,
  ScrollView, // Added for the new dumpster list
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle } from 'react-native-maps';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location'; 
import * as Linking from 'expo-linking'; 
import MAPS_CONFIG from '../config/mapsConfig';

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
const PROXIMITY_RADIUS_FEET = 50; 

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
  const { coordinates, address, payout, description, jobId } = route.params || {};

  const [targetLocation, setTargetLocation] = useState(coordinates);
  const [driverLocation, setDriverLocation] = useState(null); 
  const [isLoading, setIsLoading] = useState(true);
  const [isWithinLocation, setIsWithinLocation] = useState(false);
  const [distanceToTarget, setDistanceToTarget] = useState(null);
  const [dumpsters, setDumpsters] = useState([]);
  const [showDumpsterList, setShowDumpsterList] = useState(false);
  const [showDumpsterButton, setShowDumpsterButton] = useState(false); 
  const [showArrivalModal, setShowArrivalModal] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  const mapRef = useRef(null);

  // --- Location Permissions & Real-time Tracking ---
  useEffect(() => {
    // If caller passed a flag to show dumpsters, enable button and fetch
    if (route.params?.showDumpsters) {
      setShowDumpsterButton(true);
      // Ensure we have a location before attempting to fetch
      if (driverLocation || targetLocation) {
        fetchNearbyDumpsters(driverLocation || targetLocation);
      }
      // If caller requested dumpsters, open the list overlay immediately
      setShowDumpsterList(true);
    }
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
          distanceInterval: 10, 
          timeInterval: 5000,   
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
            pitch: 45, 
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
      // Show custom arrival modal instead of the default alert
      setShowArrivalModal(true);
    } else {
      Alert.alert(
        'Out of Range', 
        `You must be within ${PROXIMITY_RADIUS_FEET} feet of the target location to confirm arrival. Current distance: ${distanceToTarget ? distanceToTarget.toFixed(1) : '--'} ft.`,
        [{ text: 'OK' }]
      );
    }
  };

  /** * Handlers for the Arrival Modal actions
   */
  const handleArrivalViewDetails = () => {
    // 1. Enable floating button for later use
    setShowDumpsterButton(true); 
    // 2. Fetch dumpsters immediately
    fetchNearbyDumpsters(driverLocation || targetLocation);
    // 3. Close modal
    setShowArrivalModal(false);
    // 4. Navigate to next screen
    navigation.navigate('JobDetailsScreen', {
      jobDetails: {
        address,
        payout,
        description,
      },
      status: 'arrived'
    });
  };

  const handleArrivalShowDumpsters = () => {
    // 1. Enable floating button
    setShowDumpsterButton(true);
    // 2. Fetch dumpsters immediately
    fetchNearbyDumpsters(driverLocation || targetLocation);
    // 3. Close modal
    setShowArrivalModal(false);
    // 4. Show the list overlay instantly
    setShowDumpsterList(true);
  };

  // Animate modal scale when it opens
  useEffect(() => {
    if (showArrivalModal) {
      scaleAnim.setValue(0.85);
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [showArrivalModal]);

  // Fetch nearby dumpsters using Google Places Nearby Search with keyword 'dumpster'
  const fetchNearbyDumpsters = async (locationCoords) => {
    try {
      const apiKey = MAPS_CONFIG.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.warn('Google Maps API key not configured');
        return;
      }

      const location = `${locationCoords.latitude},${locationCoords.longitude}`;
      // radius in meters
      const radius = 5000;
      const keyword = encodeURIComponent('dumpster');
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&keyword=${keyword}&key=${apiKey}`;

      const resp = await fetch(url);
      const data = await resp.json();
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.warn('Places API error', data);
        return;
      }

      const places = (data.results || []).map(p => ({
        id: p.place_id,
        name: p.name,
        location: { latitude: p.geometry.location.lat, longitude: p.geometry.location.lng },
        vicinity: p.vicinity,
        rating: p.rating,
        types: p.types,
      }));

      // Sort by distance to driverLocation
      const base = driverLocation || locationCoords;
      places.sort((a, b) => calculateDistance(base, a.location) - calculateDistance(base, b.location));
      setDumpsters(places);
    } catch (error) {
      console.error('Error fetching nearby dumpsters', error);
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
      // FIX: The default URL in the original code was broken. Fixed using a standard Google Maps URL
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
        provider="google" 
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
        showsUserLocation={false} 
        showsMyLocationButton={false} 
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
          style={[styles.arrivedButton, styles.activeButton]}
          onPress={() => navigation.navigate('DumpConfirmation', { jobId, coordinates: targetLocation, address, payout, description })}
        >
          <Text style={styles.arrivedButtonText}>BEGIN DUMP</Text>
        </TouchableOpacity>
      </View>

      {/* Floating list button - appears only after arrival/if requested by route params */}
      {/* Persistent floating button: always available and starts the dumping flow */}
      <TouchableOpacity
        style={styles.arrivedFloatingButton}
        onPress={() => navigation.navigate('DumpConfirmation', { jobId, coordinates: targetLocation, address, payout, description })}
      >
        <Text style={styles.arrivedFloatingButtonText}>BEGIN DUMP</Text>
      </TouchableOpacity>

      {showDumpsterButton && (
        <TouchableOpacity
          style={styles.floatingListButton}
          onPress={() => setShowDumpsterList(prev => !prev)}
        >
          <Ionicons name={showDumpsterList ? "close-circle" : "list"} size={22} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Arrival confirmation modal (custom UI) */}
      <Modal
        visible={showArrivalModal}
        transparent
        animationType="none"
        onRequestClose={() => setShowArrivalModal(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <Animated.View style={[styles.modalCard, { transform: [{ scale: scaleAnim }] }] }>
            <View style={styles.modalHeaderIcon}>
              <View style={styles.checkCircle}><Ionicons name="checkmark" size={28} color="#fff" /></View>
            </View>

            <Text style={styles.modalTitle}>Arrival Confirmed</Text>
            <Text style={styles.modalSubtitle}>You're at the pickup location. What would you like to do next?</Text>

            <View style={styles.modalInfoRow}>
              <Ionicons name="location" size={18} color={Colors.textMedium} />
              <Text style={styles.modalInfoText} numberOfLines={2}>{address}</Text>
            </View>

            <View style={styles.modalActionsHorizontal}>
              <TouchableOpacity style={styles.modalButtonGhost} onPress={() => setShowArrivalModal(false)}>
                <Text style={styles.modalButtonGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButtonOutline]} onPress={handleArrivalShowDumpsters}>
                <Text style={styles.modalButtonOutlineText}>Nearby Dumpsters</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButtonPrimary]} onPress={handleArrivalViewDetails}>
                <Text style={styles.modalButtonPrimaryText}>View Job Details</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </SafeAreaView>
      </Modal>

      {/* Dumpster list overlay (PROFESSIONAL UI UPDATE APPLIED HERE) */}
      {showDumpsterList && (
        <SafeAreaView style={styles.dumpsterListOverlay}>
          <View style={styles.dumpsterListCard}>
            
            {/* Header with Close Button */}
            <View style={styles.dumpsterListHeader}>
              <Text style={styles.dumpsterListTitle}>Nearby Dumpsters</Text>
              <TouchableOpacity onPress={() => setShowDumpsterList(false)}>
                <Ionicons name="close-circle-outline" size={28} color={Colors.textMedium} />
              </TouchableOpacity>
            </View>
            
            {/* List Content */}
            {dumpsters.length === 0 ? (
              <Text style={styles.dumpsterEmpty}>
                {isLoading ? 'Searching...' : 'No dumpsters found nearby.'}
              </Text>
            ) : (
              <ScrollView 
                style={styles.dumpsterScrollView} 
                contentContainerStyle={styles.dumpsterScrollContent}
              >
                {dumpsters.map((d) => (
                  <TouchableOpacity 
                    key={d.id} 
                    style={styles.dumpsterRow} 
                    onPress={() => {
                      setTargetLocation(d.location);
                      setShowDumpsterList(false);
                      mapRef.current?.animateToRegion({
                        latitude: d.location.latitude,
                        longitude: d.location.longitude,
                        latitudeDelta: 0.003,
                        longitudeDelta: 0.003,
                      }, 300);
                    }}>
                    <View style={styles.dumpsterIconContainer}>
                        <MaterialIcons name="delete-sweep" size={24} color={Colors.primary} />
                    </View>
                    <View style={styles.dumpsterTextContent}>
                      <Text style={styles.dumpsterName} numberOfLines={1}>{d.name}</Text>
                      <Text style={styles.dumpsterVic} numberOfLines={1}>{d.vicinity}</Text>
                    </View>
                    {/* Display distance in miles: (distance in feet / 5280 feet per mile) */}
                    {driverLocation && (
                        <Text style={styles.dumpsterDistance}>
                            {(calculateDistance(driverLocation, d.location) / 5280).toFixed(2)} mi
                        </Text>
                    )}
                    <Ionicons name="chevron-forward-outline" size={20} color={Colors.textMedium} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      )}
    </View>
  );
};

// --- Stylesheet (Updated) ---
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
  floatingListButton: {
    position: 'absolute',
    bottom: 220, 
    right: 20,
    backgroundColor: Colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10, 
  },

  arrivedFloatingButton: {
    position: 'absolute',
    bottom: 140,
    right: 20,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 7,
    zIndex: 11,
  },
  arrivedFloatingButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.6,
  },
  
  // --- PROFESSIONAL DUMPSTER LIST STYLES (NEW/UPDATED) ---
  dumpsterListOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)', 
    paddingHorizontal: 16,
    paddingBottom: 16, 
    zIndex: 10,
  },
  dumpsterListCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    maxHeight: '60%', 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  dumpsterListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dumpsterListTitle: {
    fontSize: 20,
    fontWeight: '800', 
    color: Colors.textDark,
  },
  dumpsterScrollView: {
    // No specific style needed, just a container
  },
  dumpsterScrollContent: {
    paddingBottom: 10, 
  },
  dumpsterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background, 
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dumpsterIconContainer: {
    marginRight: 10,
    padding: 6,
    backgroundColor: `${Colors.primary}10`, 
    borderRadius: 5,
  },
  dumpsterTextContent: {
    flex: 1,
    marginRight: 10,
  },
  dumpsterName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
  },
  dumpsterVic: {
    fontSize: 12,
    color: Colors.textMedium,
    marginTop: 2,
  },
  dumpsterDistance: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary, 
    marginRight: 15,
  },
  dumpsterEmpty: {
    fontSize: 14,
    color: Colors.textMedium,
    textAlign: 'center',
    paddingVertical: 20,
  },
  // --- END DUMPSTER LIST STYLES ---

  // --- Modal Styles (Kept original) ---
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)'
  },
  modalCard: {
    backgroundColor: Colors.cardBackground,
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginHorizontal: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeaderIcon: {
    alignItems: 'center',
    marginBottom: 8,
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textMedium,
    marginBottom: 12,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalInfoText: {
    marginLeft: 10,
    color: Colors.textDark,
    flex: 1,
  },
  modalActionsHorizontal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
  },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 8,
  },
  modalButtonPrimaryText: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
  modalButtonOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.secondary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  modalButtonOutlineText: {
    color: Colors.secondary,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalButtonGhost: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.inactive,
    marginRight: 8,
  },
  modalButtonGhostText: {
    color: Colors.inactive,
    fontWeight: '700',
  },
  modalCloseRow: {
    marginTop: 14,
    alignItems: 'center',
  },
  modalCloseText: {
    color: Colors.textMedium,
    fontWeight: '600',
  },
});

export default NavigationScreen;