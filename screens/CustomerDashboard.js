import React, { useState, useEffect } from 'react';
// Jey: Merged Alert import here
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  Platform,
  Dimensions,
  Alert, 
  ActivityIndicator, // Jey: Added missing import
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SharedHeader from '../components/SharedHeader';
import RateUserModal from '../components/RateUserModal';
// import OrderBasket from '../components/OrderBasket'; // Removed OrderBasket
import LocationService from '../services/LocationService';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { db, auth } from '../firebaseConfig';
// Jey: Merged all firestore imports into one block
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs,
  updateDoc, 
  setDoc, 
  increment, 
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
// Jey: Removed the duplicate Alert import

const { width } = Dimensions.get('window');

const CustomerDashboard = ({ navigation }) => {
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [mapRegion, setMapRegion] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isLocationTracking, setIsLocationTracking] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [jobToRate, setJobToRate] = useState(null);
  const [ratedJobs, setRatedJobs] = useState(new Set());

  const wasteTypes = [
    { id: 'household', name: 'Household Trash', icon: 'home', color: '#34A853' },
    { id: 'bulk', name: 'Bulk Items', icon: 'cube', color: '#FF8F00' },
    { id: 'yard', name: 'Yard Waste', icon: 'leaf', color: '#4CAF50' },
    { id: 'construction', name: 'Construction Debris', icon: 'construct', color: '#795548' },
    { id: 'recyclables', name: 'Recyclables', icon: 'refresh', color: '#2196F3' },
  ];

  // --- Core Location Logic ---
  const initLocation = async (shouldNavigate = false) => {
    try {
      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied');
        // Default to Atlanta if permission denied
        const atlantaLocation = {
          latitude: 33.7490,
          longitude: -84.3880,
          accuracy: 1000,
          timestamp: new Date(),
        };
        setCurrentLocation(atlantaLocation);
        setMapRegion({
          latitude: atlantaLocation.latitude,
          longitude: atlantaLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        setIsLocationTracking(false);
        return;
      }

      // Get current location
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const locationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date(),
      };
      
      setCurrentLocation(locationData);
      setMapRegion({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setIsLocationTracking(true);
      setLocationError(null);
        } catch (error) {
          console.error('Error getting location:', error);
          setLocationError('Failed to get location');
          // Default to Atlanta on error
          const atlantaLocation = {
            latitude: 33.7490,
            longitude: -84.3880,
            accuracy: 1000,
            timestamp: new Date(),
          };
          setCurrentLocation(atlantaLocation);
          setMapRegion({
            latitude: atlantaLocation.latitude,
            longitude: atlantaLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
          setIsLocationTracking(false);
        }
  };
  
  // Jey: Extracted and corrected the refresh logic
  const refreshLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied. Cannot refresh.');
        setIsLocationTracking(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const locationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date(),
      };
      
      setCurrentLocation(locationData);
      setMapRegion({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setIsLocationTracking(true);
      setLocationError(null);
      Alert.alert('Location Updated', `Accuracy: ±${Math.round(locationData.accuracy)}m`);

    } catch (error) {
      console.error('Error refreshing location:', error);
      setLocationError('Failed to refresh location. Please try again.');
      setIsLocationTracking(false);
    }
  };

  // --- Lifecycle and Initial Call ---
  useEffect(() => {
    initLocation();
  }, []);

  // --- Missing Function Definitions (Fixed) ---
  const handleNewOrder = () => {
    // Jey: Logic to open the modal for selecting waste type
  navigation.navigate('CreateOrder');
  };

  const handleOrderType = (type) => {
    // Jey: Logic to handle selection and navigate/proceed
  setShowOrderModal(false);
  navigation.navigate('CreateOrder', { wasteType: type.id });
  };

  // Jey: Added placeholder for missing function
  const handleSubmitRating = (rating, comment) => {
    console.log('Submitting rating:', rating, 'Comment:', comment);
    // --- Add your Firestore logic here ---
    // Example:
    // if (jobToRate) {
    //   const jobRef = doc(db, 'jobs', jobToRate.id);
    //   await updateDoc(jobRef, {
    //     rating: rating,
    //     review: comment,
    //     status: 'rated'
    //   });
    //   setRatedJobs(prev => new Set(prev).add(jobToRate.id));
    // }
    setShowRatingModal(false);
    setJobToRate(null);
    Alert.alert('Rating Submitted', 'Thank you for your feedback!');
  };
  // --- End Missing Function Definitions ---


  return (
    <View style={styles.container}>
      <SharedHeader 
        title="Good morning!"
        subtitle="Ready for pickup?"
        showBackButton={false}
        rightComponent={
          <View style={styles.headerActions}>
            {/* Replaced OrderBasket with a recycling icon */}
            <TouchableOpacity style={styles.recyclingButton} onPress={() => navigation.navigate('OrderHistory')}>
              <Ionicons name="trash-bin-outline" size={24} color="#333" /> 
            </TouchableOpacity>
            <TouchableOpacity style={styles.notificationButton} onPress={() => Alert.alert('Notifications', 'No new alerts.')}>
              <Ionicons name="notifications-outline" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Order Section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.quickOrderButton} onPress={handleNewOrder}>
            <View style={styles.quickOrderContent}>
              <Ionicons name="add-circle" size={48} color="#34A853" />
              <View style={styles.quickOrderText}>
                <Text style={styles.quickOrderTitle}>Request Pickup</Text>
                <Text style={styles.quickOrderSubtitle}>Get trash picked up now or schedule later</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Location Map Section */}
        {currentLocation && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Location</Text>
            <View style={styles.mapCard}>
              <View style={styles.mapHeader}>
                <View style={styles.locationHeaderInfo}>
                  <Ionicons name="location" size={18} color="#34A853" />
                  <Text style={styles.mapTitle}>
                    {isLocationTracking ? 'Current Location' : 'Default Location'}
                  </Text>
                </View>
                <View style={styles.locationActions}>
                  {currentLocation.accuracy && (
                    <View style={styles.accuracyBadge}>
                      <Text style={styles.accuracyText}>±{Math.round(currentLocation.accuracy)}m</Text>
                    </View>
                  )}
                  <TouchableOpacity 
                    style={styles.refreshButton} 
                    onPress={refreshLocation}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh" size={16} color="#34A853" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.mapContainer}>
                {mapRegion ? (
                  <MapView
                    style={styles.map}
                    region={mapRegion}
                    showsUserLocation={false}
                    showsMyLocationButton={false}
                    showsCompass={true}
                    showsScale={true}
                    mapType="standard"
                    showsPointsOfInterest={true}
                    showsBuildings={true}
                    showsTraffic={false}
                  >
                    <Marker
                      coordinate={{
                        latitude: currentLocation.latitude,
                        longitude: currentLocation.longitude,
                      }}
                      title="Your Location"
                      description={isLocationTracking ? 
                        `GPS Accuracy: ±${Math.round(currentLocation.accuracy)} meters` : 
                        'Default location - tap refresh to get your current location'
                      }
                    >
                      <View style={styles.customerMarker}>
                        <View style={styles.markerInner}>
                          <Ionicons name="home" size={16} color="#FFFFFF" />
                        </View>
                        {isLocationTracking && <View style={styles.markerPulse} />}
                      </View>
                    </Marker>
                  </MapView>
                ) : (
                  <View style={styles.mapLoading}>
                      <ActivityIndicator size="large" color="#34A853" />
                      <Text style={styles.mapLoadingText}>Loading Map...</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.mapFooter}>
                <View style={styles.coordsInfo}>
                  <Text style={styles.coordsText}>
                    Lat: {currentLocation.latitude.toFixed(4)}, Long: {currentLocation.longitude.toFixed(4)}
                  </Text>
                </View>
                {locationError ? (
                  <Text style={styles.errorText}>{locationError}</Text>
                ) : (
                  <Text style={styles.lastUpdateText}>
                    {isLocationTracking ? 
                      `Updated: ${currentLocation.timestamp?.toLocaleTimeString() || 'N/A'}` :
                      'Tap refresh to get your current location'
                    }
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Services Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Services</Text>
          <View style={styles.servicesGrid}>
            {wasteTypes.slice(0, 4).map((service) => (
              <TouchableOpacity
                key={service.id}
                style={[styles.serviceCard, { borderColor: service.color }]}
                onPress={() => handleOrderType(service)}
              >
                <Ionicons name={service.icon} size={32} color={service.color} />
                <Text style={styles.serviceText}>{service.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Orders */}
        <View style={[styles.section, { marginBottom: 30 }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity onPress={() => navigation.navigate('OrderHistory')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.emptyState}>
            <Ionicons name="trash-outline" size={40} color="#9CA3AF" />
            <Text style={styles.emptyStateText}>No recent orders</Text>
            <Text style={styles.emptyStateSubtext}>Request your first pickup now!</Text>
          </View>
        </View>
      </ScrollView>

      {/* Order Type Modal */}
      <Modal
        visible={showOrderModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowOrderModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Waste Type</Text>
            <TouchableOpacity onPress={() => setShowOrderModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {wasteTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={styles.wasteTypeOption}
                onPress={() => handleOrderType(type)}
              >
                <View style={[styles.wasteTypeIcon, { backgroundColor: type.color }]}>
                  <Ionicons name={type.icon} size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.wasteTypeName}>{type.name}</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      
      {/* Rating Modal */}
      <RateUserModal
        visible={showRatingModal}
        onClose={() => {
          setShowRatingModal(false);
          setJobToRate(null);
        }}
        onSubmit={handleSubmitRating}
        title="Rate Contractor"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Added new style for recycling button
  recyclingButton: { 
    padding: 8,
  },
  notificationButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  seeAllText: {
    fontSize: 14,
    color: '#34A853',
    fontWeight: '600',
  },
  quickOrderButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quickOrderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickOrderText: {
    marginLeft: 16,
    flex: 1,
  },
  quickOrderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  quickOrderSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12, // Jey: Added gap for consistent spacing
    marginVertical: 4,
  },
  serviceCard: {
    width: (width - 60 - 12) / 2, // Jey: Adjusted width for gap spacing
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 0, // Removed bottom margin since gap handles spacing
    borderWidth: 1,
    borderColor: '#E5E7EB', // Default light border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceText: {
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  orderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderInfo: {
    flex: 1,
  },
  orderType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  orderStatus: {
    alignItems: 'flex-end',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  wasteTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  wasteTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  wasteTypeName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  // Map styles
  mapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  locationHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  locationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accuracyBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  accuracyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803D',
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  mapContainer: {
    height: 180,
    backgroundColor: '#F3F4F6',
  },
  map: {
    flex: 1,
  },
  mapLoading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
  },
  mapLoadingText: {
      marginTop: 8,
      color: '#6B7280',
  },
  customerMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#34A853',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  markerPulse: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#34A853',
    opacity: 0.3,
    borderWidth: 2,
    borderColor: '#34A853',
  },
  mapFooter: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  coordsInfo: {
    alignItems: 'center',
    marginBottom: 4,
  },
  coordsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', // Jey: Added specific platform monospace font
  },
  lastUpdateText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    textAlign: 'center',
  },
});

export default CustomerDashboard;
