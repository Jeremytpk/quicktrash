import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import SharedHeader from '../components/SharedHeader';
import AvailableJobsList from '../components/AvailableJobsList';
import LocationService from '../services/LocationService';

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
      LocationService.stopWatchingLocation();
    };
  }, []);

  // Update nearby jobs when location changes
  useEffect(() => {
    if (currentLocation) {
      updateNearbyJobs();
    }
  }, [currentLocation, availableJobs]);

  const initializeLocation = async () => {
    try {
      const hasPermission = await LocationService.requestPermissions();
      setLocationPermission(hasPermission);

      if (hasPermission) {
        // Get initial location
        const location = await LocationService.getCurrentLocation();
        if (location) {
          setCurrentLocation(location);
        }

        // Start watching location changes
        LocationService.addLocationListener((location) => {
          setCurrentLocation(location);
        });

        await LocationService.startWatchingLocation();
      } else {
        Alert.alert(
          'Location Required',
          'You must enable location services to work as a contractor. This allows us to show you nearby jobs and provide navigation.',
          [
            { text: 'Retry', onPress: initializeLocation },
            { text: 'Go to Settings', onPress: () => LocationService.requestPermissions() }
          ]
        );
      }
    } catch (error) {
      console.error('Error initializing location:', error);
      Alert.alert('Location Error', 'Unable to access your location. Please check your device settings.');
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
              </View>
            ) : (
              <MapView
                style={styles.map}
                region={currentLocation ? {
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
                } : {
                  latitude: 33.7490,
                  longitude: -84.3880,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
                }}
                showsUserLocation={true}
                showsMyLocationButton={true}
                followsUserLocation={true}
              >
                {/* Current location marker */}
                {currentLocation && (
                  <Marker
                    coordinate={{
                      latitude: currentLocation.latitude,
                      longitude: currentLocation.longitude,
                    }}
                    title="Your Location"
                    description="You are here"
                    pinColor="#3B82F6"
                  />
                )}

                {/* Available jobs markers */}
                {nearbyJobs.map((job) => (
                  <Marker
                    key={job.id}
                    coordinate={job.coordinates}
                    title={job.type}
                    description={`${job.earnings} • ${job.distance?.toFixed(1)}km away`}
                    pinColor="#34A853"
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
          </View>
        </View>

        {/* Available Jobs List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Jobs Near You</Text>
          {isOnline ? (
            <AvailableJobsList />
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
});

export default ContractorDashboard;
