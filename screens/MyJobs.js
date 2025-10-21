import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  Platform,
  Linking,
  ActivityIndicator, // Added ActivityIndicator for better loading UX
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons'; // Added MaterialIcons
import SharedHeader from '../components/SharedHeader';
import RateUserModal from '../components/RateUserModal';
import * as Location from 'expo-location';
import { useUser } from '../contexts/UserContext';
import { db, auth } from '../firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc,
  serverTimestamp,
  addDoc,
  getDoc,
  setDoc,
  increment
} from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
// NOTE: You will need to import your MapView component here (e.g., import MapView from 'react-native-maps')
// import MapView, { Marker } from 'react-native-maps'; 

const Colors = {
  primary: '#34A853', // Google Green (Used for success/main actions)
  secondary: '#2563EB', // Blue (Used for navigation/action buttons)
  warning: '#F59E0B', // Yellow/Orange (Used for in_progress)
  danger: '#DC2626', // Red (For potential errors/cautions)
  textDark: '#1F2937',
  textMedium: '#4B5563',
  textLight: '#6B7280',
  background: '#F9FAFB',
  cardBackground: '#FFFFFF',
  border: '#E5E7EB',
};

// Placeholder for map components - Replace with your actual imports
const MapView = (props) => <View style={{ flex: 1, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: Colors.textMedium }}>[Map Component Placeholder]</Text></View>;
const Marker = (props) => null;


// Utility function for Haversine distance calculation
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 3959; // Earth's radius in miles
  const deg2rad = (deg) => deg * (Math.PI / 180);
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in miles
  
  return distance; 
};


const MyJobs = () => {
  const navigation = useNavigation();
  const { user } = useUser();
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [filter, setFilter] = useState('active'); // active, completed, all
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [navigationJob, setNavigationJob] = useState(null);
  const [jobLocationPin, setJobLocationPin] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [jobToRate, setJobToRate] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isWithinPickupRange, setIsWithinPickupRange] = useState(false);
  const [is3DEnabled, setIs3DEnabled] = useState(false);
  
  const mapRef = useRef(null);
  const DISTANCE_THRESHOLD_FEET = 100; // Define range constant

  // --- Data Fetching and Real-time Listener ---
  useEffect(() => {
    if (!auth.currentUser) {
      setIsLoading(false);
      return;
    }

    const contractorId = auth.currentUser.uid;
    
    // Query: Jobs assigned to current contractor
    const jobsQuery = query(
      collection(db, 'jobs'),
      where('contractorId', '==', contractorId)
    );

    const unsubscribe = onSnapshot(jobsQuery, (snapshot) => {
      const fetchedJobs = snapshot.docs.map((doc) => {
        const jobData = { id: doc.id, ...doc.data() };
        // Convert Firestore timestamps to Date objects if they exist
        ['scheduledTime', 'acceptedAt', 'completedAt', 'createdAt'].forEach(key => {
          if (jobData[key]?.toDate) {
            jobData[key] = jobData[key].toDate();
          }
        });
        return jobData;
      });

      // Apply filter
      const filteredJobs = fetchedJobs.filter(job => {
        switch (filter) {
          case 'active':
            return ['accepted', 'scheduled', 'in_progress'].includes(job.status);
          case 'completed':
            return job.status === 'completed';
          default:
            return true;
        }
      });

      // Sort jobs by most recent scheduled/creation time first
      filteredJobs.sort((a, b) => {
        const aTime = a.scheduledTime || a.acceptedAt || a.createdAt || new Date(0);
        const bTime = b.scheduledTime || b.acceptedAt || b.createdAt || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });

      setJobs(filteredJobs);
      setIsLoading(false);
      setIsRefreshing(false);
    }, (error) => {
      console.error('Jey: Error fetching contractor jobs:', error);
      setIsLoading(false);
      setIsRefreshing(false);
      Alert.alert('Error', 'Failed to load your jobs. Please try again.');
    });

    return () => unsubscribe();
  }, [filter]); // Re-run effect only when filter changes

  // --- Utility Functions ---
  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return Colors.secondary;
      case 'in_progress': return Colors.warning;
      case 'completed': return Colors.primary;
      default: return Colors.textLight;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'scheduled': return 'Scheduled';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'accepted': return 'Accepted';
      default: return status?.replace(/_/g, ' ') || 'Unknown';
    }
  };

  const formatTime = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAddress = (job) => {
    if (!job) return 'Address not specified';
    return job.pickupAddress?.fullAddress || 
           job.location?.address || 
           job.pickupAddress?.street || 
           'Address not specified';
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    // Setting isRefreshing will cause the Firestore listener in useEffect to trigger a re-render
  };

  // --- Action Handlers ---

  const handleStartJob = async (jobId) => {
    Alert.alert(
      'Start Job',
      'Are you ready to officially start this job?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Start',
          onPress: async () => {
            try {
              const jobRef = doc(db, 'jobs', jobId);
              await updateDoc(jobRef, {
                status: 'in_progress',
                startedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              setSelectedJob(prev => prev ? {...prev, status: 'in_progress'} : null);
              Alert.alert('Success', 'Job status updated to In Progress.');
            } catch (error) {
              console.error('Jey: Error starting job:', error);
              Alert.alert('Error', 'Failed to update job status. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleCompleteJob = async (jobId) => {
    Alert.alert(
      'Complete Job',
      'Final confirmation: Is the job successfully completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Completion',
          style: 'destructive',
          onPress: async () => {
            try {
              const jobRef = doc(db, 'jobs', jobId);
              const jobSnap = await getDoc(jobRef);
              const jobData = jobSnap.data();
              
              await updateDoc(jobRef, {
                status: 'completed',
                completedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              setSelectedJob(prev => prev ? {...prev, status: 'completed'} : null);
              
              // Prompt contractor to rate the customer
              setJobToRate({ id: jobId, customerId: jobData.customerId, contractorId: jobData.contractorId });
              setShowRatingModal(true);
            } catch (error) {
              console.error('Jey: Error completing job:', error);
              Alert.alert('Error', 'Failed to complete job. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleSubmitRating = async ({ rating, review }) => {
    try {
      if (!jobToRate) return;
      
      const ratingData = {
        jobId: jobToRate.id,
        raterId: auth.currentUser.uid,
        raterRole: 'contractor',
        ratedUserId: jobToRate.customerId,
        ratedUserRole: 'customer',
        rating: rating,
        review: review || '',
        createdAt: serverTimestamp(),
      };
      
      // Save rating to Firestore
      await addDoc(collection(db, 'ratings'), ratingData);
      
      // Update the rated user's aggregate rating
      const userRef = doc(db, 'users', jobToRate.customerId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const currentRatings = userData.ratings || { sum: 0, count: 0 };
        
        await updateDoc(userRef, {
          'ratings.sum': increment(rating),
          'ratings.count': increment(1),
        });
      } else {
        await setDoc(userRef, {
          ratings: { sum: rating, count: 1 }
        }, { merge: true });
      }
      
      setShowRatingModal(false);
      setJobToRate(null);
      Alert.alert('Success', 'Thank you for your feedback!');
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    }
  };

  // --- Navigation/Location Logic ---

  const navigateToLocation = (job) => {
    let coordinates = job.pickupAddress?.coordinates || job.location?.coordinates || job.coordinates;

    if (!coordinates || typeof coordinates.latitude !== 'number' || typeof coordinates.longitude !== 'number') {
      Alert.alert('Navigation Error', 'Job location coordinates are unavailable. Please check job data or contact support.');
      return;
    }

    navigation.navigate('NavigationScreen', {
      coordinates,
      address: job.pickupAddress?.fullAddress || job.location?.address || 'Pickup Location',
      payout: job.pricing?.contractorPayout || 0,
      description: job.description || 'No description available',
      jobId: job.id,
    });
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location access is essential for navigation and pickup confirmation.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      
      const currentCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      
      setCurrentLocation(currentCoords);
      if (jobLocationPin) {
        checkPickupRange(jobLocationPin, currentCoords);
      }
    } catch (error) {
      console.error('Jey: Error getting current location:', error);
      Alert.alert('Location Error', 'Could not retrieve current location. Check GPS settings.');
    }
  };

  const checkPickupRange = (jobCoords = jobLocationPin, currentCoords = currentLocation) => {
    if (!currentCoords || !jobCoords) return;
    
    const distanceMiles = calculateDistance(
      currentCoords.latitude,
      currentCoords.longitude,
      jobCoords.latitude,
      jobCoords.longitude
    );
    
    const distanceFeet = distanceMiles * 5280;
    const isInRange = distanceFeet <= DISTANCE_THRESHOLD_FEET;
    
    setIsWithinPickupRange(isInRange);
  };

  const openExternalNavigation = () => {
    if (!jobLocationPin) return;

    const address = navigationJob?.pickupAddress?.fullAddress || 
                   navigationJob?.location?.address || 
                   'Pickup Location';
    
    const url = Platform.select({
      ios: `maps:0,0?q=${jobLocationPin.latitude},${jobLocationPin.longitude}`,
      android: `geo:0,0?q=${jobLocationPin.latitude},${jobLocationPin.longitude}(${encodeURIComponent(address)})`,
      default: `https://maps.google.com/?q=${jobLocationPin.latitude},${jobLocationPin.longitude}`
    });

    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open external maps application.');
    });
  };

  const handlePickupConfirmation = async () => {
    if (!navigationJob || !isWithinPickupRange || !currentLocation) return;
    
    try {
      const jobRef = doc(db, 'jobs', navigationJob.id);
      await updateDoc(jobRef, {
          status: 'in_progress',
          pickedUpAt: serverTimestamp(),
          contractorLocation: currentLocation,
          updatedAt: serverTimestamp(),
      });
      
      // Close navigation and update job locally
      setSelectedJob(prev => prev?.id === navigationJob.id ? {...prev, status: 'in_progress'} : null);
      // Close navigation and navigate to the NavigationScreen so driver can continue navigation
      closeNavigation();
      navigation.navigate('NavigationScreen', {
        jobId: navigationJob.id,
        coordinates: jobLocationPin || navigationJob.pickupAddress?.coordinates || navigationJob.location?.coordinates,
        address: navigationJob.pickupAddress?.fullAddress || navigationJob.location?.address || 'Pickup Location',
        payout: navigationJob.pricing?.contractorPayout || 0,
        description: navigationJob.description || '',
        showDumpsters: true,
      });

      Alert.alert(
        'Pickup Confirmed',
        'The job is now officially in progress. Nearby dumpsters list is available on the navigation screen.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Jey: Error confirming pickup:', error);
      Alert.alert('Error', 'Failed to confirm pickup. Please try again.');
    }
  };

  const closeNavigation = () => {
    setShowNavigationModal(false);
    setNavigationJob(null);
    setJobLocationPin(null);
    setIsWithinPickupRange(false);
    setIs3DEnabled(false);
  };
  
  // Placeholder for map drag end handler (needs proper map implementation)
  const handlePinDragEnd = (e) => {
    const newCoords = e.nativeEvent.coordinate;
    setJobLocationPin(newCoords);
    checkPickupRange(newCoords);
    Alert.alert('Location Pinned', 'New pickup location pinned. Confirm if this is correct.');
  };

  // Placeholder for 3D toggle (needs proper map implementation)
  const toggle3DView = () => {
    // This logic relies on having a real MapView component imported and assigned to mapRef
    const new3DState = !is3DEnabled;
    setIs3DEnabled(new3DState);
    Alert.alert('Feature Note', `3D view toggled to ${new3DState}. Requires full map component integration.`);
    
    // Simulate map action
    if (mapRef.current) {
        // mapRef.current.animateCamera({...}) // Actual implementation goes here
    }
  };

  // Placeholder for job location confirmation (to permanently update Firestore)
  const confirmJobLocation = async () => {
    if (!navigationJob || !jobLocationPin) return;

    Alert.alert(
      'Confirm Location Update',
      'Are you sure you want to permanently update the job\'s pickup coordinates?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Update',
          onPress: async () => {
            try {
              const jobRef = doc(db, 'jobs', navigationJob.id);
              await updateDoc(jobRef, {
                'pickupAddress.coordinates': jobLocationPin,
                updatedAt: serverTimestamp(),
              });

              Alert.alert('Success', 'Job pickup location has been updated successfully.');
            } catch (error) {
              console.error('Jey: Error updating job location:', error);
              Alert.alert('Error', 'Failed to update job location. Please try again.');
            }
          }
        }
      ]
    );
  };


  // --- UI Render Functions ---

  const renderJobCard = ({ item }) => (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => {
        setSelectedJob(item);
        setShowJobDetails(true);
      }}
      activeOpacity={0.8}
    >
      <View style={styles.jobHeader}>
        <View style={styles.jobInfo}>
          <Text style={styles.customerName}>{item.customerName || 'Customer Pickup'}</Text>
          <Text style={[styles.jobType, { color: getStatusColor(item.status) }]}>
             <Text style={{fontWeight: '700'}}>{getStatusText(item.status)}</Text> • {item.wasteType?.toUpperCase() || 'N/A'} • {item.volume || 'N/A'}
          </Text>
          <Text style={styles.jobLocation}>
            <Ionicons name="location-outline" size={14} color={Colors.textLight} /> {formatAddress(item)}
          </Text>
          <Text style={styles.scheduledTime}>
            <Ionicons name="calendar-outline" size={14} color={Colors.textLight} /> {formatTime(item.scheduledTime)}
          </Text>
        </View>
        <View style={styles.jobMeta}>
          <Text style={styles.payoutText}>${(item.pricing?.contractorPayout || 0).toFixed(2)}</Text>
          {item.status !== 'completed' && (
            <TouchableOpacity
              style={[styles.navigationButton, {backgroundColor: Colors.secondary, borderColor: Colors.secondary}]}
              onPress={() => navigateToLocation(item)}
            >
              <Ionicons name="navigate-outline" size={18} style={styles.navigationButtonIcon} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="briefcase-outline" size={64} color={Colors.textLight} />
      <Text style={styles.emptyStateTitle}>
        {filter === 'active' ? 'No Active Jobs' : 
         filter === 'completed' ? 'No Completed Jobs' : 'No Jobs Found'}
      </Text>
      <Text style={styles.emptyStateDescription}>
        {filter === 'active' 
          ? 'Accepted jobs will appear here when they are scheduled.'
          : filter === 'completed'
          ? 'You haven\'t completed any jobs yet!'
          : 'Your accepted jobs will appear here.'}
      </Text>
      {/*
      {filter === 'active' && (
        <TouchableOpacity 
          style={styles.ctaButton}
          onPress={() => navigation.navigate('ContractorDashboard', { showAllJobs: true })}
        >
          <Text style={styles.ctaButtonText}>Find Available Jobs</Text>
        </TouchableOpacity>
      )}
      */}
    </View>
  );

  const renderNavigationModal = () => (
    <Modal
      visible={showNavigationModal}
      animationType="slide"
      onRequestClose={closeNavigation}
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.navigationModalContainer}>
        <View style={styles.navigationModalHeader}>
          <Text style={styles.navigationModalTitle}>Navigate to Pickup</Text>
          <TouchableOpacity onPress={closeNavigation} style={styles.modalCloseButton}>
            <Ionicons name="close" size={28} color={Colors.textDark} />
          </TouchableOpacity>
        </View>

        <View style={styles.mapContainer}>
          {jobLocationPin ? (
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                latitude: jobLocationPin.latitude,
                longitude: jobLocationPin.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              showsUserLocation
              followsUserLocation
              onRegionChangeComplete={(region) => checkPickupRange(region)} // Check range on map movement
            >
              <Marker
                coordinate={jobLocationPin}
                title={navigationJob?.customerName || 'Pickup Location'}
                description={formatAddress(navigationJob)}
                draggable
                onDragEnd={handlePinDragEnd}
              />
              {currentLocation && (
                <Marker
                  coordinate={currentLocation}
                  title="Your Location"
                  pinColor={Colors.primary}
                />
              )}
            </MapView>
          ) : (
            <View style={styles.mapLoading}>
              <ActivityIndicator size="large" color={Colors.secondary} />
              <Text style={styles.mapLoadingText}>Awaiting location data...</Text>
            </View>
          )}

          {/* Map Controls */}
          <View style={styles.mapControls}>
            <TouchableOpacity style={styles.mapControlButton} onPress={toggle3DView}>
              <MaterialIcons name={is3DEnabled ? "view-in-ar" : "view-carousel"} size={24} color={Colors.textDark} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapControlButton} onPress={getCurrentLocation}>
              <MaterialIcons name="my-location" size={24} color={Colors.textDark} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.navigationFooter}>
          <View style={styles.footerJobInfo}>
            <Text style={styles.footerAddressLabel}>Location:</Text>
            <Text style={styles.footerAddressText} numberOfLines={1}>{formatAddress(navigationJob)}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.pickupConfirmationButton,
              isWithinPickupRange ? styles.inRangeButton : styles.outOfRangeButton,
            ]}
            onPress={handlePickupConfirmation}
            disabled={!isWithinPickupRange}
          >
            <Text style={styles.pickupConfirmationText}>
              {isWithinPickupRange ? 'CONFIRM ARRIVAL & START JOB' : `Move closer to start (Range: ${DISTANCE_THRESHOLD_FEET} ft)`}
            </Text>
          </TouchableOpacity>

          <View style={styles.navigationExternalActions}>
            <TouchableOpacity 
              style={styles.externalActionButton} 
              onPress={openExternalNavigation}
            >
              <Ionicons name="logo-google" size={20} color={Colors.secondary} />
              <Text style={styles.externalActionButtonText}>Open in Google Maps</Text>
            </TouchableOpacity>

            {jobLocationPin && (
              <TouchableOpacity 
                style={styles.externalActionButton} 
                onPress={confirmJobLocation}
              >
                <Ionicons name="pin-outline" size={20} color={Colors.textMedium} />
                <Text style={styles.externalActionButtonText}>Confirm Pinned Location</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <SharedHeader 
        title="My Jobs" 
        showBackButton={false}
        rightComponent={
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'active' && styles.activeFilter]}
              onPress={() => setFilter('active')}
            >
              <Text style={[styles.filterText, filter === 'active' && styles.activeFilterText]}>
                Active
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'completed' && styles.activeFilter]}
              onPress={() => setFilter('completed')}
            >
              <Text style={[styles.filterText, filter === 'completed' && styles.activeFilterText]}>
                Completed
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
      {isLoading ? (
        <View style={styles.loadingView}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your job list...</Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          renderItem={renderJobCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={jobs.length === 0 ? styles.emptyContainer : styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={renderEmptyState}
        />
      )}

      {/* Job Details Modal */}
      <Modal
        visible={showJobDetails}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowJobDetails(false)}
      >
        {selectedJob && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowJobDetails(false)}>
                <Ionicons name="close" size={28} color={Colors.textMedium} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Job Details</Text>
              <View style={styles.modalHeaderSpacer} />
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Customer Info */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Customer</Text>
                <Text style={styles.customerDetailName}>{selectedJob.customerName || 'N/A'}</Text>
                <TouchableOpacity style={styles.contactButton}>
                  <Ionicons name="chatbubble-outline" size={20} color={Colors.primary} />
                  <Text style={styles.contactButtonText}>Message Customer</Text>
                </TouchableOpacity>
              </View>

              {/* Job Info */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Job Information</Text>
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Type</Text>
                    <Text style={styles.infoValue}>{selectedJob.wasteType?.toUpperCase() || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Volume</Text>
                    <Text style={styles.infoValue}>{selectedJob.volume || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Payout</Text>
                    <Text style={[styles.infoValue, {color: Colors.primary}]}>
                      ${(selectedJob.pricing?.contractorPayout || 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Scheduled Time</Text>
                    <Text style={styles.infoValue}>{formatTime(selectedJob.scheduledTime)}</Text>
                  </View>
                </View>
              </View>

              {/* Location */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Pickup Location</Text>
                <Text style={styles.addressText}>{formatAddress(selectedJob)}</Text>
                <TouchableOpacity 
                  style={[styles.modalActionButton, { backgroundColor: Colors.secondary }]}
                  onPress={() => {
                    setShowJobDetails(false);
                    navigateToLocation(selectedJob);
                  }}
                >
                  <Ionicons name="navigate-outline" size={20} color={Colors.cardBackground} />
                  <Text style={styles.modalActionButtonText}>Start Navigation</Text>
                </TouchableOpacity>
              </View>

              {/* Notes */}
              {selectedJob.details && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Job Details / Notes</Text>
                  <Text style={styles.notesText}>{selectedJob.details}</Text>
                </View>
              )}

              {/* Status & Actions */}
              <View style={[styles.modalSection, styles.actionSectionFooter]}>
                <Text style={styles.modalSectionTitle}>Job Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedJob.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(selectedJob.status) }]}>
                    {getStatusText(selectedJob.status)}
                  </Text>
                </View>

                {selectedJob.status === 'scheduled' && (
                  <TouchableOpacity
                    style={styles.modalActionButton}
                    onPress={() => {
                      setShowJobDetails(false);
                      handleStartJob(selectedJob.id);
                    }}
                  >
                    <Text style={styles.modalActionButtonText}>Start Job</Text>
                  </TouchableOpacity>
                )}

                {selectedJob.status === 'in_progress' && (
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.completeButton]}
                    onPress={() => {
                      setShowJobDetails(false);
                      handleCompleteJob(selectedJob.id);
                    }}
                  >
                    <Text style={styles.modalActionButtonText}>Confirm Completion</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
      
      {/* Navigation Modal */}
      {renderNavigationModal()}
      
      {/* Rating Modal */}
      <RateUserModal
        visible={showRatingModal}
        onClose={() => {
          setShowRatingModal(false);
          setJobToRate(null);
        }}
        onSubmit={handleSubmitRating}
        title="Rate Customer"
      />
    </SafeAreaView>
  );
};

// --- Stylesheet ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.textMedium,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.border,
    borderRadius: 8,
    padding: 2,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  activeFilter: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
  },
  activeFilterText: {
    color: Colors.cardBackground,
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: Colors.background,
  },
  jobCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    borderLeftWidth: 5,
    borderLeftColor: Colors.primary,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  jobInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 4,
  },
  jobType: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  jobLocation: {
    fontSize: 14,
    color: Colors.textMedium,
    marginBottom: 4,
  },
  scheduledTime: {
    fontSize: 14,
    color: Colors.textMedium,
  },
  jobMeta: {
    alignItems: 'flex-end',
  },
  payoutText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  navigationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navigationButtonIcon: {
    color: Colors.cardBackground,
  },
  emptyState: {
    alignItems: 'center',
    padding: 20,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textDark,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 16,
    color: Colors.textMedium,
    textAlign: 'center',
    lineHeight: 24,
  },
  ctaButton: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  ctaButtonText: {
    color: Colors.cardBackground,
    fontSize: 16,
    fontWeight: '700',
  },
  // --- Modal Styles ---
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
    paddingBottom: 16,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textDark,
  },
  modalHeaderSpacer: {
    width: 28,
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  modalSection: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 8,
  },
  customerDetailName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 12,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 10,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoItem: {
    width: '48%',
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textLight,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
  },
  addressText: {
    fontSize: 16,
    color: Colors.textDark,
    marginBottom: 12,
  },
  notesText: {
    fontSize: 15,
    color: Colors.textMedium,
    lineHeight: 22,
  },
  modalActionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 16,
    gap: 8,
  },
  modalActionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.cardBackground,
  },
  completeButton: {
    backgroundColor: Colors.warning,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionSectionFooter: {
    marginBottom: 40,
  },
  // --- Navigation Modal Styles ---
  navigationModalContainer: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
  },
  navigationModalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  navigationModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
  },
  modalCloseButton: {
    position: 'absolute',
    right: 15,
    padding: 5,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  mapLoadingText: {
    marginTop: 10,
    color: Colors.textMedium,
  },
  mapControls: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: Colors.cardBackground,
    borderRadius: 10,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  mapControlButton: {
    padding: 8,
  },
  navigationFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerJobInfo: {
    marginBottom: 15,
  },
  footerAddressLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textLight,
  },
  footerAddressText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
  },
  pickupConfirmationButton: {
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 10,
  },
  inRangeButton: {
    backgroundColor: Colors.primary,
  },
  outOfRangeButton: {
    backgroundColor: Colors.textLight,
  },
  pickupConfirmationText: {
    color: Colors.cardBackground,
    fontSize: 16,
    fontWeight: '700',
  },
  navigationExternalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  externalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    gap: 5,
  },
  externalActionButtonText: {
    fontSize: 13,
    color: Colors.textMedium,
    fontWeight: '600',
  },
});

export default MyJobs;