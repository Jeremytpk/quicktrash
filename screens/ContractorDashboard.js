import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { collection, onSnapshot, query, where, updateDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import SharedHeader from '../components/SharedHeader';
import * as Location from 'expo-location';
import { auth } from '../firebaseConfig';
import MapView, { Marker } from '../components/WebCompatibleMap';

const { width } = Dimensions.get('window');

const formatDate = (timestamp) => {
  if (!timestamp || !timestamp.toDate) return 'N/A';
  return timestamp.toDate().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const ContractorDashboard = ({ navigation }) => {
  const [isOnline, setIsOnline] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [activeJob, setActiveJob] = useState(null);
  const [countdown, setCountdown] = useState(40);
  const [showJobsContainer, setShowJobsContainer] = useState(true);
  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobFilter, setJobFilter] = useState('available');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isLocationTracking, setIsLocationTracking] = useState(false);
  const [mapRegion, setMapRegion] = useState(null);
  const isInitialLoad = useRef(true); // Ref to track the first load
  const locationSubscription = useRef(null);
  const mapRef = useRef(null);

  // Location tracking functions
  const startLocationTracking = async () => {
    try {
      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied');
        Alert.alert('Permission Required', 'Location access is required to receive job offers and track your position.');
        return;
      }

      // Get current location first
      const currentPos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const locationData = {
        latitude: currentPos.coords.latitude,
        longitude: currentPos.coords.longitude,
        accuracy: currentPos.coords.accuracy,
        timestamp: new Date(),
      };
      
      setCurrentLocation(locationData);
      setMapRegion({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
      await updateLocationInFirestore(locationData);

      // Start watching position
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 10, // Update when moved 10 meters
        },
        (position) => {
          const newLocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(),
          };
          
          setCurrentLocation(newLocationData);
          setMapRegion({
            latitude: newLocationData.latitude,
            longitude: newLocationData.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          });
          updateLocationInFirestore(newLocationData);
        }
      );

      setIsLocationTracking(true);
      setLocationError(null);
      console.log('Location tracking started');

    } catch (error) {
      console.error('Error starting location tracking:', error);
      setLocationError('Failed to start location tracking');
      Alert.alert('Location Error', 'Unable to start location tracking. Please check your device settings.');
    }
  };

  const stopLocationTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    setIsLocationTracking(false);
    console.log('Location tracking stopped');
  };

  const updateLocationInFirestore = async (locationData) => {
    if (!auth.currentUser) return;

    try {
      const contractorRef = doc(db, 'contractors', auth.currentUser.uid);
      await setDoc(contractorRef, {
        userId: auth.currentUser.uid,
        email: auth.currentUser.email,
        isOnline: isOnline,
        currentLocation: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          timestamp: locationData.timestamp,
        },
        lastUpdated: new Date(),
      }, { merge: true });

      console.log('Location updated in Firestore:', locationData);
    } catch (error) {
      console.error('Error updating location in Firestore:', error);
    }
  };

  const centerMapOnLocation = () => {
    if (currentLocation && mapRef.current) {
      const region = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      mapRef.current.animateToRegion(region, 1000);
    }
  };

  const handleJobOffer = useCallback((job) => {
    // Prevent a new pop-up if one is already showing
    if (showJobModal) return;
    
    console.log('Triggering new job offer pop-up for job:', job.id);
    setActiveJob(job);
    setShowJobModal(true);
    setCountdown(40);
  }, [showJobModal]);

  useEffect(() => {
    console.log(`Setting up Firestore listener for '${jobFilter}' jobs...`);
    isInitialLoad.current = true; // Reset for each time the filter changes
    
    let jobsQuery;
    const jobsCollection = collection(db, 'jobs');

    if (jobFilter === 'available') {
      jobsQuery = query(jobsCollection, where('status', '==', 'available'));
    } else {
      jobsQuery = query(jobsCollection);
    }

    const unsubscribe = onSnapshot(
      jobsQuery,
      (querySnapshot) => {
        const jobs = [];
        querySnapshot.forEach((doc) => {
          jobs.push({ id: doc.id, ...doc.data(), coordinates: doc.data().pickupAddress || {} });
        });

        jobs.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
          return dateB - dateA;
        });
        
        setAllJobs(jobs);
        setLoading(false);

        // --- NEW LOGIC TO TRIGGER POP-UP ---
        // Only check for new jobs after the initial list has been loaded.
        if (!isInitialLoad.current) {
          querySnapshot.docChanges().forEach((change) => {
            // If a new document was added, trigger the pop-up
            if (change.type === 'added') {
              const newJob = { id: change.doc.id, ...change.doc.data() };
              handleJobOffer(newJob);
            }
          });
        }
        
        // Mark the initial load as complete
        isInitialLoad.current = false;
      },
      (error) => {
        console.error('Error fetching jobs from Firestore:', error);
        setLoading(false);
        setAllJobs([]);
      }
    );

    return () => unsubscribe();
  }, [jobFilter, handleJobOffer]);

  const [todayStats] = useState({
    jobsCompleted: 3,
    earnings: '$95',
    hoursOnline: '4.5h',
    rating: 4.8,
  });

  const handleToggleOnline = async () => {
    const newOnlineStatus = !isOnline;
    setIsOnline(newOnlineStatus);
    
    if (newOnlineStatus) {
      // Going online - start location tracking
      await startLocationTracking();
      Alert.alert('Going Online', 'You are now available to receive job offers! Location tracking is active.');
    } else {
      // Going offline - stop location tracking
      stopLocationTracking();
      // Update status in Firestore
      if (auth.currentUser) {
        try {
          const contractorRef = doc(db, 'contractors', auth.currentUser.uid);
          await updateDoc(contractorRef, {
            isOnline: false,
            lastUpdated: new Date(),
          });
        } catch (error) {
          console.error('Error updating online status:', error);
        }
      }
      Alert.alert('Going Offline', 'You will no longer receive job offers. Location tracking stopped.');
    }
  };

  const handleAcceptJob = async () => {
    if (!activeJob) return;
    try {
      const jobRef = doc(db, 'jobs', activeJob.id);
      await updateDoc(jobRef, { status: 'accepted', acceptedAt: new Date(), contractorId: 'current-user-id' });
      Alert.alert('Job Accepted!', `You accepted the ${activeJob.wasteType} pickup job.`);
    } catch (error) {
       console.error("Error accepting job from modal:", error);
       Alert.alert('Error', 'Could not accept job.');
    } finally {
       setShowJobModal(false);
       setActiveJob(null);
    }
  };

  const handleDeclineJob = () => {
    setShowJobModal(false);
    setActiveJob(null);
    Alert.alert('Job Declined', 'Looking for more jobs in your area...');
  };

  const handleAcceptJobFromList = async (job) => {
    Alert.alert('Accept Job?', `Accept this ${job.wasteType} job for $${job.pricing?.contractorPayout || 'N/A'}?`,
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Accept Job', onPress: async () => {
        try {
          const jobRef = doc(db, 'jobs', job.id);
          await updateDoc(jobRef, { status: 'accepted', acceptedAt: new Date(), contractorId: 'current-user-id' });
          Alert.alert('Job Accepted!', `You accepted the ${job.wasteType} pickup job.`);
        } catch (error) {
          console.error('Error accepting job:', error);
          Alert.alert('Error', 'Failed to accept job. Please try again.');
        }
      }}]
    );
  };

  const handleRejectJobFromList = (job) => {
    Alert.alert('Reject Job?', `Are you sure you want to reject this ${job.wasteType} job?`,
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Reject', style: 'destructive', onPress: async () => {
        try {
          const jobRef = doc(db, 'jobs', job.id);
          await updateDoc(jobRef, { status: 'rejected', rejectedAt: new Date(), contractorId: 'current-user-id' });
          Alert.alert('Job Rejected', 'The job has been removed from your list.');
        } catch (error) {
          console.error('Error rejecting job:', error);
          Alert.alert('Error', 'Failed to reject job. Please try again.');
        }
      }}]
    );
  };
  
  useEffect(() => {
    let timer;
    if (showJobModal && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (showJobModal && countdown === 0) {
      handleDeclineJob();
    }
    return () => clearTimeout(timer);
  }, [showJobModal, countdown]);

  // Cleanup location tracking on unmount
  useEffect(() => {
    return () => {
      stopLocationTracking();
    };
  }, []);

  return (
    <View style={styles.container}>
      <SharedHeader 
        title="Welcome back, Driver!"
        subtitle={
          <View style={styles.headerStatusContainer}>
            <View style={styles.onlineStatus}>
              <Switch value={isOnline} onValueChange={handleToggleOnline} trackColor={{ false: '#E5E7EB', true: '#34A853' }} thumbColor={isOnline ? '#FFFFFF' : '#9CA3AF'} />
              <Text style={[styles.statusText, { color: isOnline ? '#34A853' : '#6B7280' }]}>{isOnline ? 'Online' : 'Offline'}</Text>
            </View>
            {isOnline && (
              <View style={styles.locationStatus}>
                <Ionicons 
                  name={isLocationTracking ? "location" : "location-outline"} 
                  size={14} 
                  color={isLocationTracking ? '#34A853' : '#EF4444'} 
                />
                <Text style={[styles.locationText, { color: isLocationTracking ? '#34A853' : '#EF4444' }]}>
                  {isLocationTracking ? 'GPS Active' : 'GPS Inactive'}
                </Text>
              </View>
            )}
          </View>
        }
        showBackButton={false}
        rightComponent={
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#333" />
            <View style={styles.notificationBadge}><Text style={styles.badgeText}>2</Text></View>
          </TouchableOpacity>
        }
      />

      {isOnline && (
        <View style={styles.jobsContainer}>
          <View style={styles.jobsHeader}>
            <View style={styles.jobsHeaderLeft}>
              <Text style={styles.jobsTitle}>Jobs</Text>
              <Text style={styles.jobsCount}>{loading ? 'Loading...' : `${allJobs.length} matching jobs found`}</Text>
            </View>
            <TouchableOpacity style={styles.toggleButton} onPress={() => setShowJobsContainer(!showJobsContainer)}>
              <Ionicons name={showJobsContainer ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
              <Text style={styles.toggleText}>{showJobsContainer ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterContainer}>
            <TouchableOpacity style={[styles.filterButton, jobFilter === 'available' && styles.activeFilter]} onPress={() => setJobFilter('available')}>
              <Text style={[styles.filterText, jobFilter === 'available' && styles.activeFilterText]}>Available</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.filterButton, jobFilter === 'all' && styles.activeFilter]} onPress={() => setJobFilter('all')}>
              <Text style={[styles.filterText, jobFilter === 'all' && styles.activeFilterText]}>All Jobs</Text>
            </TouchableOpacity>
          </View>
          
          {showJobsContainer && (
            <ScrollView style={styles.jobsScrollView} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              {loading ? (
                <View style={styles.loadingContainer}><Ionicons name="hourglass-outline" size={48} color="#9CA3AF" /><Text style={styles.loadingText}>Loading jobs...</Text></View>
              ) : allJobs.map((job) => {
                const payout = job.pricing?.contractorPayout || 0;
                return (
                  <View key={job.id} style={styles.jobCardContainer}>
                    <View style={[ styles.jobCardNew, payout >= 45 && styles.highPayoutJob, payout >= 25 && payout < 45 && styles.mediumPayoutJob ]}>
                      <View style={styles.jobCardHeader}>
                        <View style={styles.jobTypeContainer}>
                          <View style={[styles.urgencyBadge, job.isASAP ? styles.urgencyHigh : styles.urgencyNormal]}>
                            <Text style={[styles.urgencyText, job.isASAP ? styles.urgencyTextHigh : styles.urgencyTextNormal]}>{job.isASAP ? "ASAP" : "SCHEDULED"}</Text>
                          </View>
                          <View style={styles.jobTitleContainer}>
                             <Text style={styles.jobTypeNew}>{job.wasteType}</Text>
                             <View style={styles.statusBadge}><Text style={styles.statusTextBadge}>{job.status?.toUpperCase()}</Text></View>
                          </View>
                        </View>
                        <View style={styles.earningsContainer}>
                          <Text style={styles.earningsAmountNew}>${payout}</Text>
                          <Text style={styles.earningsLabelNew}>Your Payout</Text>
                        </View>
                      </View>
                      <View style={styles.jobDetailsSection}>
                        <Text style={styles.jobVolumeNew}>{job.volume}</Text>
                        {job.pickupAddress?.instructions && (
                          <View style={styles.instructionsContainer}>
                            <Ionicons name="information-circle-outline" size={18} color="#2563EB" />
                            <Text style={styles.instructionsText}>{job.pickupAddress.instructions}</Text>
                          </View>
                        )}
                        <View style={styles.jobMetrics}>
                          <View style={styles.metric}>
                             <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                             <Text style={styles.metricText}>Created: {formatDate(job.createdAt)}</Text>
                          </View>
                          {job.scheduledPickup && (
                            <View style={styles.metric}>
                              <Ionicons name="time-outline" size={16} color="#6B7280" />
                              <Text style={styles.metricText}>Scheduled: {formatDate(job.scheduledPickup)}</Text>
                            </View>
                          )}
                          <View style={styles.metric}>
                            <Ionicons name="cash-outline" size={16} color="#6B7280" />
                            <Text style={styles.metricText}>Payout: <Text style={{fontWeight: 'bold'}}>${payout}</Text> | Total: ${job.pricing?.total || 0}</Text>
                          </View>
                        </View>
                        <Text style={styles.jobAddressNew}>{job.pickupAddress?.fullAddress || 'No address provided'}</Text>
                      </View>
                      <View style={styles.jobActions}>
                        <TouchableOpacity style={styles.rejectJobButton} onPress={() => handleRejectJobFromList(job)}><Ionicons name="close-outline" size={18} color="#EF4444" /><Text style={styles.rejectJobText}>Reject</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.acceptJobButton} onPress={() => handleAcceptJobFromList(job)}><Ionicons name="checkmark-outline" size={18} color="#FFFFFF" /><Text style={styles.acceptJobText}>Accept Job</Text></TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )
              })}
              
              {!loading && allJobs.length === 0 && (
                <View style={styles.noJobsContainer}><Ionicons name="briefcase-outline" size={48} color="#9CA3AF" /><Text style={styles.noJobsTitle}>No Jobs Found</Text><Text style={styles.noJobsText}>There are no jobs matching the current filter.</Text></View>
              )}
            </ScrollView>
          )}
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Live Location Map Section */}
        {isOnline && currentLocation && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Live Location</Text>
            <View style={styles.mapCard}>
              <View style={styles.mapHeader}>
                <View style={styles.locationHeaderInfo}>
                  <Ionicons name="location" size={18} color="#34A853" />
                  <Text style={styles.mapTitle}>GPS Tracking Active</Text>
                </View>
                <View style={styles.accuracyBadge}>
                  <Text style={styles.accuracyText}>±{Math.round(currentLocation.accuracy)}m</Text>
                </View>
              </View>
              
              <View style={styles.mapContainer}>
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  region={mapRegion}
                  showsUserLocation={false} // We'll use custom marker instead
                  showsMyLocationButton={false}
                  showsCompass={true}
                  showsScale={true}
                  mapType="standard"
                  followsUserLocation={false}
                  showsPointsOfInterest={true}
                  showsBuildings={true}
                  showsTraffic={false}
                >
                  <Marker
                    coordinate={{
                      latitude: currentLocation.latitude,
                      longitude: currentLocation.longitude,
                    }}
                    title="Your Current Location"
                    description={`GPS Accuracy: ±${Math.round(currentLocation.accuracy)} meters`}
                  >
                    <View style={styles.customMarker}>
                      <View style={styles.markerInner}>
                        <Ionicons name="car" size={16} color="#FFFFFF" />
                      </View>
                      <View style={styles.markerPulse} />
                    </View>
                  </Marker>
                </MapView>
                
                {/* Center location button */}
                <TouchableOpacity 
                  style={styles.centerButton} 
                  onPress={centerMapOnLocation}
                  activeOpacity={0.8}
                >
                  <Ionicons name="locate" size={20} color="#34A853" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.mapFooter}>
                <View style={styles.coordsInfo}>
                  <Text style={styles.coordsText}>
                    {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                  </Text>
                </View>
                <Text style={styles.lastUpdateText}>
                  Updated: {currentLocation.timestamp?.toLocaleTimeString() || 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Error display for location issues */}
        {isOnline && locationError && (
          <View style={styles.section}>
            <View style={styles.errorCard}>
              <Ionicons name="warning" size={20} color="#EF4444" />
              <Text style={styles.errorText}>{locationError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={startLocationTracking}>
                <Text style={styles.retryButtonText}>Retry Location</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.section}><Text style={styles.sectionTitle}>Today's Performance</Text><View style={styles.statsGrid}><View style={styles.statCard}><Ionicons name="checkmark-circle" size={24} color="#34A853" /><Text style={styles.statNumber}>{todayStats.jobsCompleted}</Text><Text style={styles.statLabel}>Jobs Completed</Text></View><View style={styles.statCard}><Ionicons name="cash" size={24} color="#FF8F00" /><Text style={styles.statNumber}>{todayStats.earnings}</Text><Text style={styles.statLabel}>Earnings</Text></View><View style={styles.statCard}><Ionicons name="time" size={24} color="#1E88E5" /><Text style={styles.statNumber}>{todayStats.hoursOnline}</Text><Text style={styles.statLabel}>Hours Online</Text></View><View style={styles.statCard}><Ionicons name="star" size={24} color="#FFB300" /><Text style={styles.statNumber}>{todayStats.rating}</Text><Text style={styles.statLabel}>Rating</Text></View></View></View>
      </ScrollView>

      <Modal visible={showJobModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowJobModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Job Offer</Text>
            <View style={styles.countdownContainer}><Text style={styles.countdownText}>{countdown}s</Text></View>
          </View>
          {activeJob && (
            <View style={styles.modalContent}>
              <View style={styles.jobOfferCard}>
                <Text style={styles.jobOfferType}>{activeJob.wasteType}</Text>
                <Text style={styles.jobOfferDetails}>{activeJob.volume}</Text>
                <Text style={styles.jobOfferAddress}>{activeJob.pickupAddress?.fullAddress}</Text>
                <View style={styles.offerStats}>
                  <View style={styles.offerStat}><Ionicons name="location" size={20} color="#6B7280" /><Text style={styles.offerStatText}>{activeJob.distance || 'N/A'}</Text></View>
                  <View style={styles.offerStat}><Ionicons name="cash" size={20} color="#34A853" /><Text style={styles.offerStatText}>${activeJob.pricing?.contractorPayout}</Text></View>
                  <View style={styles.offerStat}><Ionicons name="person" size={20} color="#6B7280" /><Text style={styles.offerStatText}>{activeJob.customerName || 'Customer'}</Text></View>
                </View>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity style={[styles.actionButton, styles.declineButton]} onPress={handleDeclineJob}><Text style={styles.declineButtonText}>Decline</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.acceptButton]} onPress={handleAcceptJob}><Text style={styles.acceptButtonText}>Accept Job</Text></TouchableOpacity>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
    highPayoutJob: { borderColor: '#EF4444', borderWidth: 2 },
    mediumPayoutJob: { borderColor: '#F97316', borderWidth: 2 },
    instructionsContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#BFDBFE' },
    instructionsText: { flex: 1, marginLeft: 8, color: '#1E40AF', fontSize: 14, lineHeight: 20 },
    jobTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statusBadge: { backgroundColor: '#E5E7EB', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
    statusTextBadge: { fontSize: 10, fontWeight: '700', color: '#4B5563', letterSpacing: 0.5 },
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    headerStatusContainer: { flexDirection: 'column', alignItems: 'flex-start' },
    onlineStatus: { flexDirection: 'row', alignItems: 'center' },
    statusText: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
    locationStatus: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    locationText: { fontSize: 12, fontWeight: '500', marginLeft: 4 },
    notificationButton: { padding: 8, position: 'relative' },
    notificationBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#EF4444', borderRadius: 8, width: 16, height: 16, justifyContent: 'center', alignItems: 'center' },
    badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
    content: { flex: 1 },
    section: { paddingHorizontal: 20, paddingVertical: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 16 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    statCard: { width: (width - 60) / 2, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    statNumber: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginTop: 8 },
    statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4, textAlign: 'center' },
    modalContainer: { flex: 1, backgroundColor: '#F8F9FA' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
    countdownContainer: { backgroundColor: '#EF4444', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
    countdownText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
    modalContent: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
    jobOfferCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
    jobOfferType: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
    jobOfferDetails: { fontSize: 16, color: '#6B7280', marginBottom: 8 },
    jobOfferAddress: { fontSize: 16, color: '#374151', marginBottom: 20 },
    offerStats: { flexDirection: 'row', justifyContent: 'space-around' },
    offerStat: { alignItems: 'center' },
    offerStatText: { fontSize: 14, color: '#374151', marginTop: 4, fontWeight: '600' },
    actionButtons: { flexDirection: 'row', gap: 12 },
    actionButton: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    declineButton: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#D1D5DB' },
    acceptButton: { backgroundColor: '#34A853' },
    declineButtonText: { fontSize: 16, fontWeight: 'bold', color: '#6B7280' },
    acceptButtonText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
    jobsContainer: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    jobsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16 },
    jobsHeaderLeft: { flex: 1 },
    jobsTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 2 },
    jobsCount: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
    toggleButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
    toggleText: { fontSize: 14, color: '#6B7280', fontWeight: '500', marginLeft: 4 },
    filterContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 10 },
    filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
    activeFilter: { backgroundColor: '#34A853', borderColor: '#34A853' },
    filterText: { fontSize: 14, fontWeight: '600', color: '#374151' },
    activeFilterText: { color: '#FFFFFF' },
    jobsScrollView: { maxHeight: 400, paddingHorizontal: 20, paddingBottom: 16 },
    jobCardContainer: { marginTop: 16 },
    jobCardNew: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4, overflow: 'hidden' },
    jobCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
    jobTypeContainer: { flex: 1 },
    urgencyBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
    urgencyHigh: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
    urgencyNormal: { backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#BFDBFE' },
    urgencyText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    urgencyTextHigh: { color: '#DC2626' },
    urgencyTextNormal: { color: '#2563EB' },
    jobTypeNew: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', textTransform: 'capitalize' },
    earningsContainer: { alignItems: 'flex-end' },
    earningsAmountNew: { fontSize: 24, fontWeight: 'bold', color: '#34A853', marginBottom: 2 },
    earningsLabelNew: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
    jobDetailsSection: { paddingHorizontal: 20, paddingBottom: 16 },
    jobDescription: { fontSize: 14, color: '#6B7280', marginBottom: 8, fontStyle: 'italic' },
    jobVolumeNew: { fontSize: 16, color: '#374151', fontWeight: '600', marginBottom: 12 },
    jobMetrics: { flexDirection: 'column', gap: 8, marginBottom: 12 },
    metric: { flexDirection: 'row', alignItems: 'center' },
    metricText: { fontSize: 12, color: '#6B7280', marginLeft: 6, fontWeight: '500' },
    jobAddressNew: { fontSize: 14, color: '#374151', fontWeight: '500' },
    jobActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#F9FAFB' },
    rejectJobButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRightWidth: 1, borderRightColor: '#F3F4F6' },
    rejectJobText: { fontSize: 14, fontWeight: '600', color: '#EF4444', marginLeft: 6 },
    acceptJobButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, backgroundColor: '#34A853' },
    acceptJobText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginLeft: 6 },
    loadingContainer: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32 },
    loadingText: { fontSize: 16, color: '#6B7280', marginTop: 12, textAlign: 'center' },
    noJobsContainer: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32 },
    noJobsTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginTop: 16, marginBottom: 8 },
    noJobsText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
    mapCard: { backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    mapHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    locationHeaderInfo: { flexDirection: 'row', alignItems: 'center' },
    mapTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginLeft: 8 },
    accuracyBadge: { backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#BBF7D0' },
    accuracyText: { fontSize: 12, fontWeight: '600', color: '#15803D' },
    mapContainer: { height: 200, backgroundColor: '#F3F4F6', position: 'relative' },
    map: { flex: 1 },
    centerButton: { position: 'absolute', top: 10, right: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 5, borderWidth: 1, borderColor: '#E5E7EB' },
    customMarker: { alignItems: 'center', justifyContent: 'center' },
    markerInner: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#34A853', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 5 },
    markerPulse: { position: 'absolute', width: 50, height: 50, borderRadius: 25, backgroundColor: '#34A853', opacity: 0.3, borderWidth: 2, borderColor: '#34A853' },
    mapFooter: { padding: 12, backgroundColor: '#F9FAFB', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    coordsInfo: { alignItems: 'center', marginBottom: 4 },
    coordsText: { fontSize: 14, fontWeight: '600', color: '#1F2937', fontFamily: 'monospace' },
    lastUpdateText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
    errorCard: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
    errorText: { fontSize: 14, color: '#DC2626', marginLeft: 8, flex: 1 },
    retryButton: { backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    retryButtonText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
});

export default ContractorDashboard;
