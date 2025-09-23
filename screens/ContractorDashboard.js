import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, Circle } from 'react-native-maps';
import SharedHeader from '../components/SharedHeader';
import AvailableJobsList from '../components/AvailableJobsList';
import LocationService from '../services/NewLocationService';
import MAPS_CONFIG from '../config/mapsConfig';

const { width, height } = Dimensions.get('window');

const ContractorDashboard = ({ navigation }) => {
  const [isOnline, setIsOnline] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [activeJob, setActiveJob] = useState(null);
  const [countdown, setCountdown] = useState(40);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [route, setRoute] = useState(null);
  const [nearbyJobs, setNearbyJobs] = useState([]);
  
  // Animation for pulsing location icon
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim1 = useRef(new Animated.Value(1)).current;
  const ringAnim2 = useRef(new Animated.Value(1)).current;
  const ringAnim3 = useRef(new Animated.Value(1)).current;

  // Mock data for available jobs
  const [availableJobs] = useState([
    {
      id: 1,
      type: 'Household Trash',
      volume: '3 bags',
      distance: '1.2 miles',
      earnings: '$15',
      address: '123 Oak Street',
      customerName: 'Sarah J.',
      coordinates: { latitude: 33.7490, longitude: -84.3880 },
    },
    {
      id: 2,
      type: 'Bulk Items',
      volume: 'Old sofa',
      distance: '2.8 miles',
      earnings: '$45',
      address: '456 Pine Avenue',
      customerName: 'Mike R.',
      coordinates: { latitude: 33.7590, longitude: -84.3780 },
    },
  ]);

  const [todayStats] = useState({
    jobsCompleted: 3,
    earnings: '$95',
    hoursOnline: '4.5h',
    rating: 4.8,
  });

  const handleToggleOnline = () => {
    setIsOnline(!isOnline);
    if (!isOnline) {
      Alert.alert('Going Online', 'You are now available to receive job offers!');
    } else {
      Alert.alert('Going Offline', 'You will no longer receive job offers.');
    }
  };

  const handleJobOffer = (job) => {
    setActiveJob(job);
    setShowJobModal(true);
    setCountdown(40);
  };

  const handleAcceptJob = async () => {
    if (activeJob && currentLocation) {
      // Generate route to the pickup location
      const jobRoute = LocationService.generateRoute({
        latitude: activeJob.coordinates.latitude,
        longitude: activeJob.coordinates.longitude
      });
      
      if (jobRoute) {
        // Create polyline coordinates for the route
        const routeCoordinates = [
          currentLocation,
          {
            latitude: activeJob.coordinates.latitude,
            longitude: activeJob.coordinates.longitude
          }
        ];
        
        setRoute({
          ...jobRoute,
          coordinates: routeCoordinates
        });
      }

      // Open navigation
      await LocationService.openNavigation(
        {
          latitude: activeJob.coordinates.latitude,
          longitude: activeJob.coordinates.longitude
        },
        activeJob.type + ' pickup'
      );
    }

    setShowJobModal(false);
    Alert.alert('Job Accepted!', `You accepted the ${activeJob?.type} pickup job. Navigation started!`);
    // navigation.navigate('ActiveJob', { job: activeJob });
  };

  const handleDeclineJob = () => {
    setShowJobModal(false);
    setActiveJob(null);
    Alert.alert('Job Declined', 'Looking for more jobs in your area...');
  };

  const handleJobPress = (job) => {
    // Show job details or handle job selection
    Alert.alert(
      'Job Details',
      `${job.type} - ${job.volume}\n${job.address}\nEarnings: ${job.earnings}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Details', onPress: () => {
          // Navigate to job details or show more info
          console.log('Viewing job details:', job);
        }}
      ]
    );
  };

  useEffect(() => {
    let timer;
    if (showJobModal && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
      handleDeclineJob();
    }
    return () => clearTimeout(timer);
  }, [showJobModal, countdown]);

  // Initialize location services
  useEffect(() => {
    initializeLocation();
    return () => {
      LocationService.stopWatching();
    };
  }, []);

  // Start pulsing animation for location icon and rings
  useEffect(() => {
    if (currentLocation) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );

      const ring1 = Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim1, {
            toValue: 1.5,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(ringAnim1, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );

      const ring2 = Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim2, {
            toValue: 1.3,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(ringAnim2, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );

      const ring3 = Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim3, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(ringAnim3, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );

      pulse.start();
      ring1.start();
      ring2.start();
      ring3.start();
      
      return () => {
        pulse.stop();
        ring1.stop();
        ring2.stop();
        ring3.stop();
      };
    }
  }, [currentLocation, pulseAnim, ringAnim1, ringAnim2, ringAnim3]);

  // Update nearby jobs when location changes
  useEffect(() => {
    if (currentLocation) {
      updateNearbyJobs();
    }
  }, [currentLocation, availableJobs]);

  const initializeLocation = async () => {
    try {
      console.log('🚀 Initializing location services...');
      
      // Request permission with more aggressive prompting
      const hasPermission = await LocationService.requestPermission();
      setLocationPermission(hasPermission);

      if (hasPermission) {
        console.log('✅ Permission granted, getting location...');
        
        // Get initial location with retry logic
        let location = await LocationService.getCurrentLocation();
        if (!location) {
          console.log('🔄 Retrying location request...');
          // Wait a bit and try again
          await new Promise(resolve => setTimeout(resolve, 2000));
          location = await LocationService.getCurrentLocation();
        }
        
        if (location) {
          console.log('📍 Location obtained:', location);
          setCurrentLocation(location);
        } else {
          console.log('❌ Failed to get location after retry');
          Alert.alert(
            'Location Error',
            'Unable to get your current location. Please ensure location services are enabled and try again.',
            [
              { text: 'Retry', onPress: initializeLocation },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        }

        // Add location listener for real-time updates
        LocationService.addListener((location) => {
          console.log('📍 Location update received:', location);
          setCurrentLocation(location);
        });

        // Start watching location changes for real-time updates
        await LocationService.startWatching();
        console.log('👀 Location watching started');
      } else {
        console.log('❌ Location permission denied');
        Alert.alert(
          'Location Access Required',
          'QuickTrash needs access to your location to show you nearby jobs and provide navigation. This is essential for working as a contractor.',
          [
            { text: 'Enable Location', onPress: initializeLocation },
            { text: 'Go to Settings', onPress: () => LocationService.requestPermission() }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Error initializing location:', error);
      Alert.alert(
        'Location Error', 
        'Unable to access your location. Please check your device settings and ensure location services are enabled.',
        [
          { text: 'Retry', onPress: initializeLocation },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const updateNearbyJobs = async () => {
    try {
      const nearby = await LocationService.getNearbyJobs(availableJobs, 25); // 25km radius
      setNearbyJobs(nearby);
    } catch (error) {
      console.error('Error updating nearby jobs:', error);
    }
  };

  return (
    <View style={styles.container}>
      <SharedHeader 
        title="Welcome back, Driver!"
        subtitle={
          <View style={styles.onlineStatus}>
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              trackColor={{ false: '#E5E7EB', true: '#34A853' }}
              thumbColor={isOnline ? '#FFFFFF' : '#9CA3AF'}
            />
            <Text style={[styles.statusText, { color: isOnline ? '#34A853' : '#6B7280' }]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        }
        showBackButton={false}
        rightComponent={
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#333" />
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>2</Text>
            </View>
          </TouchableOpacity>
        }
      />


      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Today's Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Performance</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle" size={24} color="#34A853" />
              <Text style={styles.statNumber}>{todayStats.jobsCompleted}</Text>
              <Text style={styles.statLabel}>Jobs Completed</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="cash" size={24} color="#FF8F00" />
              <Text style={styles.statNumber}>{todayStats.earnings}</Text>
              <Text style={styles.statLabel}>Earnings</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="time" size={24} color="#1E88E5" />
              <Text style={styles.statNumber}>{todayStats.hoursOnline}</Text>
              <Text style={styles.statLabel}>Hours Online</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="star" size={24} color="#FFB300" />
              <Text style={styles.statNumber}>{todayStats.rating}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </View>

        {/* Map View */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {locationPermission ? 'Available Jobs Near You' : 'Location Required'}
          </Text>
          <View style={styles.mapContainer}>
            {!locationPermission ? (
              <View style={styles.locationRequiredView}>
                <Ionicons name="location-outline" size={64} color="#9CA3AF" />
                <Text style={styles.locationRequiredTitle}>Location Access Required</Text>
                <Text style={styles.locationRequiredText}>
                  Enable location services to see nearby jobs and receive navigation assistance.
                </Text>
                <TouchableOpacity 
                  style={styles.enableLocationButton}
                  onPress={initializeLocation}
                >
                  <Ionicons name="location" size={20} color="#FFFFFF" />
                  <Text style={styles.enableLocationText}>Enable Location</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.refreshLocationButton}
                  onPress={async () => {
                    console.log('🔄 Manually refreshing location...');
                    const location = await LocationService.getCurrentLocation();
                    if (location) {
                      setCurrentLocation(location);
                      console.log('📍 Manual location refresh successful:', location);
                    }
                  }}
                >
                  <Ionicons name="refresh" size={16} color="#34A853" />
                  <Text style={styles.refreshLocationText}>Refresh Location</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <MapView
                style={styles.map}
                provider="google"
                initialRegion={currentLocation ? {
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                } : MAPS_CONFIG.DEFAULT_REGION}
                region={currentLocation ? {
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                } : undefined}
                showsUserLocation={true}
                showsMyLocationButton={true}
                followsUserLocation={true}
                showsCompass={true}
                showsScale={true}
                customMapStyle={MAPS_CONFIG.MAP_STYLE}
                mapType="standard"
                onUserLocationChange={(event) => {
                  console.log('📍 User location change event:', event.nativeEvent);
                  if (event.nativeEvent.coordinate) {
                    const newLocation = {
                      latitude: event.nativeEvent.coordinate.latitude,
                      longitude: event.nativeEvent.coordinate.longitude,
                      accuracy: event.nativeEvent.coordinate.accuracy,
                      timestamp: Date.now(),
                      isDefault: false
                    };
                    setCurrentLocation(newLocation);
                    console.log('📍 Real-time location update:', newLocation);
                    console.log('📍 Map should now center on:', newLocation.latitude, newLocation.longitude);
                  }
                }}
                onMapReady={() => {
                  console.log('🗺️ Map is ready');
                }}
                onRegionChangeComplete={(region) => {
                  console.log('🗺️ Map region changed:', region);
                }}
              >
                {/* Current location marker with accuracy circle */}
                {currentLocation && (
                  <>
                    <Marker
                      coordinate={{
                        latitude: currentLocation.latitude,
                        longitude: currentLocation.longitude,
                      }}
                      title="Your Location"
                      description={`Accuracy: ${currentLocation.accuracy ? `${currentLocation.accuracy.toFixed(0)}m` : 'Unknown'}`}
                      pinColor={MAPS_CONFIG.MARKERS.CONTRACTOR.color}
                    />
                    {/* Accuracy circle */}
                    {currentLocation.accuracy && (
                      <Circle
                        center={{
                          latitude: currentLocation.latitude,
                          longitude: currentLocation.longitude,
                        }}
                        radius={currentLocation.accuracy}
                        strokeColor="rgba(52, 168, 83, 0.3)"
                        fillColor="rgba(52, 168, 83, 0.1)"
                        strokeWidth={2}
                      />
                    )}
                  </>
                )}

                {/* Available jobs markers */}
                {nearbyJobs.map((job) => (
                  <Marker
                    key={job.id}
                    coordinate={job.coordinates}
                    title={job.type}
                    description={`${job.earnings} • ${job.distance?.toFixed(1)}km away`}
                    pinColor={MAPS_CONFIG.MARKERS.JOB.color}
                    onPress={() => handleJobPress(job)}
                  />
                ))}

                {/* Route polyline */}
                {route && route.coordinates && (
                  <Polyline
                    coordinates={route.coordinates}
                    strokeColor="#3B82F6"
                    strokeWidth={4}
                    lineDashPattern={[5, 5]}
                  />
                )}
              </MapView>
            )}
            
            {/* Real-time Location Display */}
            {locationPermission && currentLocation && (
              <View style={styles.locationStatusOverlay}>
                <View style={styles.realtimeLocationCard}>
                  <View style={styles.locationHeader}>
                    <View style={styles.locationIconContainer}>
                      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <Ionicons name="location" size={20} color="#34A853" />
                      </Animated.View>
                      <View style={styles.locationPulse} />
                    </View>
                    <View style={styles.locationInfo}>
                      <Text style={styles.locationTitle}>Live Location</Text>
                      <Text style={styles.locationSubtitle}>GPS Tracking Active</Text>
                    </View>
                    <View style={styles.locationStatusIndicator}>
                      <View style={styles.statusDot} />
                      <Text style={styles.statusText}>LIVE</Text>
                    </View>
                  </View>
                  
                  {/* Visual Location Display */}
                  <View style={styles.visualLocationContainer}>
                    <View style={styles.locationVisualization}>
                      <View style={styles.gpsIndicator}>
                        <View style={styles.gpsCenter}>
                          <Ionicons name="location" size={16} color="#FFFFFF" />
                        </View>
                        <Animated.View style={[styles.gpsRing1, { transform: [{ scale: ringAnim1 }] }]} />
                        <Animated.View style={[styles.gpsRing2, { transform: [{ scale: ringAnim2 }] }]} />
                        <Animated.View style={[styles.gpsRing3, { transform: [{ scale: ringAnim3 }] }]} />
                      </View>
                      <View style={styles.locationInfo}>
                        <Text style={styles.locationLabel}>Current Position</Text>
                        <Text style={styles.accuracyText}>
                          Accuracy: {currentLocation.accuracy ? `${currentLocation.accuracy.toFixed(0)}m` : 'Unknown'}
                        </Text>
                        <Text style={styles.updateTime}>
                          Updated: {new Date(currentLocation.timestamp).toLocaleTimeString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Available Jobs List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Jobs Near You</Text>
          {isOnline ? (
            <View style={styles.jobsListContainer}>
              <AvailableJobsList />
            </View>
          ) : (
            <View style={styles.offlineState}>
              <Ionicons name="moon-outline" size={48} color="#9CA3AF" />
              <Text style={styles.offlineText}>You're offline</Text>
              <Text style={styles.offlineSubtext}>Turn online to start receiving job offers</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Job Offer Modal */}
      <Modal
        visible={showJobModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowJobModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Job Offer</Text>
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownText}>{countdown}s</Text>
            </View>
          </View>

          {activeJob && (
            <View style={styles.modalContent}>
              <View style={styles.jobOfferCard}>
                <Text style={styles.jobOfferType}>{activeJob.type}</Text>
                <Text style={styles.jobOfferDetails}>{activeJob.volume}</Text>
                <Text style={styles.jobOfferAddress}>{activeJob.address}</Text>
                
                <View style={styles.offerStats}>
                  <View style={styles.offerStat}>
                    <Ionicons name="location" size={20} color="#6B7280" />
                    <Text style={styles.offerStatText}>{activeJob.distance}</Text>
                  </View>
                  <View style={styles.offerStat}>
                    <Ionicons name="cash" size={20} color="#34A853" />
                    <Text style={styles.offerStatText}>{activeJob.earnings}</Text>
                  </View>
                  <View style={styles.offerStat}>
                    <Ionicons name="person" size={20} color="#6B7280" />
                    <Text style={styles.offerStatText}>{activeJob.customerName}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.declineButton]}
                  onPress={handleDeclineJob}
                >
                  <Text style={styles.declineButtonText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={handleAcceptJob}
                >
                  <Text style={styles.acceptButtonText}>Accept Job</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  map: {
    flex: 1,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  jobInfo: {
    flex: 1,
  },
  jobType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  jobDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  jobAddress: {
    fontSize: 14,
    color: '#374151',
  },
  jobEarnings: {
    alignItems: 'flex-end',
  },
  earningsAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#34A853',
  },
  earningsLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  offlineState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  offlineText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 12,
  },
  offlineSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  jobsListContainer: {
    height: 400, // Fixed height to prevent VirtualizedList nesting
  },
  locationRequiredView: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 32,
  },
  locationRequiredTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  locationRequiredText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  enableLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34A853',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  enableLocationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  refreshLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#34A853',
    marginTop: 12,
  },
  refreshLocationText: {
    color: '#34A853',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  locationStatusOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 1000,
  },
  realtimeLocationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(52, 168, 83, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  locationIconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  locationPulse: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 168, 83, 0.3)',
    borderWidth: 2,
    borderColor: '#34A853',
    opacity: 0.6,
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  locationSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  locationStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34A853',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginRight: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  locationDetails: {
    padding: 16,
  },
  coordinateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  coordinateLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  coordinateValue: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '600',
    fontFamily: 'monospace',
    flex: 2,
    textAlign: 'right',
  },
  visualLocationContainer: {
    padding: 16,
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
  },
  locationVisualization: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gpsIndicator: {
    position: 'relative',
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gpsCenter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#34A853',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  gpsRing1: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(52, 168, 83, 0.6)',
    zIndex: 1,
  },
  gpsRing2: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(52, 168, 83, 0.4)',
    zIndex: 2,
  },
  gpsRing3: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(52, 168, 83, 0.2)',
    zIndex: 3,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  accuracyText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  updateTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
  countdownContainer: {
    backgroundColor: '#EF4444',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  countdownText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  jobOfferCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  jobOfferType: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  jobOfferDetails: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  jobOfferAddress: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 20,
  },
  offerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  offerStat: {
    alignItems: 'center',
  },
  offerStatText: {
    fontSize: 14,
    color: '#374151',
    marginTop: 4,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  acceptButton: {
    backgroundColor: '#34A853',
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});

export default ContractorDashboard;
