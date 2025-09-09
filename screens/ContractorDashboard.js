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
import SharedHeader from '../components/SharedHeader';
import AvailableJobsList from '../components/AvailableJobsList';
import LocationService from '../services/LocationService';
// --- NEW: Import Expo Location for reverse geocoding ---
import * as Location from 'expo-location';

// --- Firestore and Auth imports ---
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

const { width } = Dimensions.get('window');

const ContractorDashboard = ({ navigation }) => {
  const [isOnline, setIsOnline] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [activeJob, setActiveJob] = useState(null);
  const [countdown, setCountdown] = useState(40);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [route, setRoute] = useState(null);
  const [nearbyJobs, setNearbyJobs] = useState([]);
  const [availableJobs, setAvailableJobs] = useState([]);
  
  // --- NEW: State to hold the formatted address string ---
  const [currentAddress, setCurrentAddress] = useState('Fetching address...');

  // Mock data for stats
  const [todayStats] = useState({
    jobsCompleted: 3,
    earnings: '$95',
    hoursOnline: '4.5h',
    rating: 4.8,
  });
  
  // Firestore listener for new jobs
  useEffect(() => {
    let unsubscribe;
    if (isOnline) {
      console.log("Going online: Setting up Firestore listener for new jobs...");
      const q = query(collection(db, "jobs"), where("status", "==", "pending"));

      unsubscribe = onSnapshot(q, (snapshot) => {
        const newJobs = [];
        let jobToOffer = null;

        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const newJobData = { id: change.doc.id, ...change.doc.data() };
            console.log("New job detected:", newJobData.id);
            newJobs.push(newJobData);
            if (!jobToOffer) jobToOffer = newJobData;
          }
        });

        if (newJobs.length > 0) {
          setAvailableJobs(prevJobs => [...prevJobs, ...newJobs]);
        }
        
        if (jobToOffer && !showJobModal && !activeJob) {
          handleJobOffer(jobToOffer);
        }
      });
    } else {
      console.log("Going offline: Listener is not active.");
    }

    return () => {
      if (unsubscribe) {
        console.log("Detaching Firestore listener.");
        unsubscribe();
      }
    };
  }, [isOnline, showJobModal, activeJob]);

  // --- MODIFIED: Fetches precise location when toggling online ---
  const handleToggleOnline = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);

    if (newStatus) {
      Alert.alert('Going Online', 'You are now available to receive job offers!');
      console.log('Fetching precise location upon going online...');
      
      // Immediately fetch precise location
      await LocationService.getCurrentLocation();
      
    } else {
      setAvailableJobs([]);
      setNearbyJobs([]);
      Alert.alert('Going Offline', 'You will no longer receive job offers.');
    }
  };

  const handleJobOffer = (job) => {
    setActiveJob(job);
    setShowJobModal(true);
    setCountdown(40);
  };

  const handleAcceptJob = async () => {
    if (!activeJob) return;

    try {
      const jobRef = doc(db, 'jobs', activeJob.id);
      await updateDoc(jobRef, {
        status: 'accepted',
        contractorId: auth.currentUser.uid,
      });
      
      if (currentLocation) {
        // ... navigation logic remains the same ...
        await LocationService.openNavigation(
          activeJob.pickupAddress.coordinates,
          `${activeJob.wasteType} pickup`
        );
      }
      
      Alert.alert('Job Accepted!', `You accepted the ${activeJob?.wasteType} pickup job. Navigation started!`);
      setAvailableJobs(prev => prev.filter(job => job.id !== activeJob.id));
      setShowJobModal(false);
      setActiveJob(null);
    } catch (error) {
      console.error("Error accepting job: ", error);
      Alert.alert("Error", "Could not accept the job. Please try again.");
    }
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
    } else if (countdown === 0 && showJobModal) {
      handleDeclineJob();
    }
    return () => clearTimeout(timer);
  }, [showJobModal, countdown]);

  // Initialize location services on component mount
  useEffect(() => {
    initializeLocation();
    return () => LocationService.stopWatchingLocation();
  }, []);

  // --- MODIFIED: This hook now also handles the default location case ---
  useEffect(() => {
    const processLocationUpdate = async () => {
      if (currentLocation && !currentLocation.isDefault) {
        // Reverse geocode the current location to get a readable address
        try {
          const geocode = await Location.reverseGeocodeAsync(currentLocation);
          if (geocode.length > 0) {
            const { streetNumber, street, city, region } = geocode[0];
            setCurrentAddress(`${streetNumber || ''} ${street || ''}, ${city || ''}, ${region || ''}`);
          } else {
            setCurrentAddress('Address not found');
          }
        } catch (error) {
          console.error('Reverse geocoding error:', error);
          setCurrentAddress('Could not determine address');
        }
        
        // Update nearby jobs list
        updateNearbyJobs();
      } else if (currentLocation && currentLocation.isDefault) {
        // --- NEW: Handle the default case for better developer feedback ---
        setCurrentAddress('Using default location. Update in emulator settings.');
      }
    };

    processLocationUpdate();
  }, [currentLocation, availableJobs]);

  const initializeLocation = async () => {
    try {
      const hasPermission = await LocationService.requestPermissions();
      setLocationPermission(hasPermission);

      if (hasPermission) {
        // Listen for ongoing location updates
        LocationService.addLocationListener((newLocation) => {
          setCurrentLocation(newLocation);
        });
        await LocationService.startWatchingLocation();
        // Get an initial precise location
        await LocationService.getCurrentLocation();
      } else {
        Alert.alert(
          'Location Required',
          'You must enable location services to work as a contractor.',
          [{ text: 'Retry', onPress: initializeLocation }, { text: 'Go to Settings', onPress: () => LocationService.openSettings() }]
        );
      }
    } catch (error) {
      console.error('Error initializing location:', error);
      Alert.alert('Location Error', 'Unable to access your location. Please check device settings.');
    }
  };

  const updateNearbyJobs = async () => {
    try {
      const nearby = await LocationService.getNearbyJobs(availableJobs, 25);
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Performance</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}><Ionicons name="checkmark-circle" size={24} color="#34A853" /><Text style={styles.statNumber}>{todayStats.jobsCompleted}</Text><Text style={styles.statLabel}>Jobs Completed</Text></View>
            <View style={styles.statCard}><Ionicons name="cash" size={24} color="#FF8F00" /><Text style={styles.statNumber}>{todayStats.earnings}</Text><Text style={styles.statLabel}>Earnings</Text></View>
            <View style={styles.statCard}><Ionicons name="time" size={24} color="#1E88E5" /><Text style={styles.statNumber}>{todayStats.hoursOnline}</Text><Text style={styles.statLabel}>Hours Online</Text></View>
            <View style={styles.statCard}><Ionicons name="star" size={24} color="#FFB300" /><Text style={styles.statNumber}>{todayStats.rating}</Text><Text style={styles.statLabel}>Rating</Text></View>
          </View>
        </View>

        {/* --- REPLACED MAPVIEW WITH ADDRESS DISPLAY --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{locationPermission ? 'Your Current Location' : 'Location Required'}</Text>
          <View style={styles.addressDisplayContainer}>
            {!locationPermission ? (
              <View style={styles.locationRequiredView}>
                <Ionicons name="location-outline" size={64} color="#9CA3AF" />
                <Text style={styles.locationRequiredTitle}>Location Access Required</Text>
                <Text style={styles.locationRequiredText}>Enable location to see nearby jobs.</Text>
                <TouchableOpacity style={styles.enableLocationButton} onPress={initializeLocation}>
                  <Ionicons name="location" size={20} color="#FFFFFF" /><Text style={styles.enableLocationText}>Enable Location</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.addressInfo}>
                <Ionicons name="location-sharp" size={28} color="#34A853" />
                <Text style={styles.addressText}>
                  You are here: <Text style={styles.addressBold}>{currentAddress}</Text>
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Opportunities</Text>
          {isOnline ? (
            nearbyJobs.length > 0 ? (
                <AvailableJobsList jobs={nearbyJobs} onJobPress={handleJobOffer} />
            ) : (
                <View style={styles.offlineState}><Ionicons name="search-outline" size={48} color="#9CA3AF" /><Text style={styles.offlineText}>Searching for jobs...</Text><Text style={styles.offlineSubtext}>We'll notify you when a new job is available.</Text></View>
            )
          ) : (
            <View style={styles.offlineState}><Ionicons name="moon-outline" size={48} color="#9CA3AF" /><Text style={styles.offlineText}>You're offline</Text><Text style={styles.offlineSubtext}>Go online to start receiving job offers.</Text></View>
          )}
        </View>
      </ScrollView>

      {/* Job Offer Modal */}
      <Modal visible={showJobModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleDeclineJob}>
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
                <Text style={styles.jobOfferAddress}>{activeJob.pickupAddress.street}</Text>
                <View style={styles.offerStats}>
                  <View style={styles.offerStat}><Ionicons name="location" size={20} color="#6B7280" /><Text style={styles.offerStatText}>{activeJob.distance?.toFixed(1) || '...'} km</Text></View>
                  <View style={styles.offerStat}><Ionicons name="cash" size={20} color="#34A853" /><Text style={styles.offerStatText}>${activeJob.pricing.total.toFixed(2)}</Text></View>
                  <View style={styles.offerStat}><Ionicons name="person" size={20} color="#6B7280" /><Text style={styles.offerStatText}>Customer</Text></View>
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
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  onlineStatus: { flexDirection: 'row', alignItems: 'center' },
  statusText: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
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
  addressDisplayContainer: { minHeight: 120, backgroundColor: '#FFFFFF', borderRadius: 12, justifyContent: 'center', alignItems: 'center', padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, },
  addressInfo: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  addressText: { marginTop: 12, fontSize: 16, color: '#374151', textAlign: 'center', lineHeight: 24 },
  addressBold: { fontWeight: '600', color: '#1F2937' },
  offlineState: { alignItems: 'center', paddingVertical: 40 },
  offlineText: { fontSize: 18, color: '#6B7280', fontWeight: '600', marginTop: 12 },
  offlineSubtext: { fontSize: 14, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  locationRequiredView: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
  locationRequiredTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginTop: 16, marginBottom: 8, textAlign: 'center' },
  locationRequiredText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  enableLocationButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#34A853', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, gap: 8 },
  enableLocationText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  modalContainer: { flex: 1, backgroundColor: '#F8F9FA' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  countdownContainer: { backgroundColor: '#EF4444', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  countdownText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  modalContent: { flex: 1, paddingHorizontal: 20, paddingTop: 20, justifyContent: 'space-between', paddingBottom: 20 },
  jobOfferCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
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
});

export default ContractorDashboard;