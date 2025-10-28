import React, { useState, useEffect } from 'react';
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
<<<<<<< HEAD
  Platform,
  Linking,
  ActivityIndicator, // Added ActivityIndicator for better loading UX
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons'; // Added MaterialIcons
import SharedHeader from '../components/SharedHeader';
import RateUserModal from '../components/RateUserModal';
import * as Location from 'expo-location';
=======
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SharedHeader from '../components/SharedHeader';
>>>>>>> e936db1 (Auto-insert '/' after 2 digits in Expiry field for WithdrawToDebit and bugfixes)
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
<<<<<<< HEAD
  getDoc,
  setDoc,
  increment
=======
  increment,
  limit
>>>>>>> e936db1 (Auto-insert '/' after 2 digits in Expiry field for WithdrawToDebit and bugfixes)
} from 'firebase/firestore';
import RateUserModal from '../components/RateUserModal';

// Utility functions (kept local for simplicity)
const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return '#3B82F6';
      case 'in_progress': return '#F59E0B';
      case 'completed': return '#34A853';
      default: return '#6B7280';
    }
  };

const getStatusText = (status) => {
  switch (status) {
    case 'scheduled': return 'Scheduled';
    case 'in_progress': return 'In Progress';
    case 'completed': return 'Completed';
    default: return status;
  }
};

const formatTime = (date) => {
  // Check if date is a Firestore Timestamp object and convert it, otherwise assume Date object
  const d = date?.toDate ? date.toDate() : (date instanceof Date ? date : null);
  if (!d) return '';
  
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};


const MyJobs = ({ navigation }) => { // Added navigation to props if needed for real use
  const { user } = useUser();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [filter, setFilter] = useState('active'); // active, completed, all
<<<<<<< HEAD
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [navigationJob, setNavigationJob] = useState(null);
  const [jobLocationPin, setJobLocationPin] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [jobToRate, setJobToRate] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isWithinPickupRange, setIsWithinPickupRange] = useState(false);
  const [is3DEnabled, setIs3DEnabled] = useState(false);
=======
  const [showRateModal, setShowRateModal] = useState(false);
  const [rateContext, setRateContext] = useState(null); // { jobId, customerId, customerName }
>>>>>>> e936db1 (Auto-insert '/' after 2 digits in Expiry field for WithdrawToDebit and bugfixes)
  
  // NOTE: Mock job IDs are gone; now using dynamic Firestore data

  // --- FIREBASE REAL-TIME DATA FETCH ---
  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      // Optionally navigate to login or show error
      console.error("Jey: No authenticated user found for MyJobs.");
      return;
    }
    
    setLoading(true);

    const contractorId = auth.currentUser.uid;
    const jobsRef = collection(db, 'jobs');
    let statusFilter = [];
    let queryOrder = [];

    // 1. Determine Status Filters
    if (filter === 'active') {
      // Active now means jobs that have been accepted and are awaiting pickup/completion
      statusFilter = ['accepted'];
      queryOrder = ['acceptedAt', 'desc']; // Order active (accepted) jobs newest-first
    } else if (filter === 'completed') {
      statusFilter = ['completed'];
      queryOrder = ['completedAt', 'desc']; // Order completed jobs newest first
    } else {
        // 'all' filter is generally discouraged without status index, 
        // but for a small user set, we will use it.
        statusFilter = ['scheduled', 'in_progress', 'accepted', 'completed'];
        queryOrder = ['createdAt', 'desc'];
    }

    // 2. Build the Query
    // Firestore requires composite indexes when combining multiple where/orderBy clauses.
    // To avoid forcing index creation for development, query only by contractorId (single-field)
    // and apply status filtering + sorting client-side. Limit results to avoid large scans.
    const jobQuery = query(
      jobsRef,
      where('contractorId', '==', contractorId),
      limit(200)
    );
    
    // 3. Set up the Real-time Listener
    const unsubscribe = onSnapshot(jobQuery, (querySnapshot) => {
      const liveJobs = [];
      querySnapshot.forEach((doc) => {
        const jobData = doc.data();
        liveJobs.push({
          id: doc.id,
          ...jobData,
          location: jobData.pickupAddress || jobData.location || { address: 'Address Missing' },
          contractorEarnings: jobData.pricing?.contractorPayout || 0,
        });
      });

      // Apply status filter and sort locally to avoid composite index requirements
      const filtered = liveJobs.filter(j => statusFilter.includes(j.status));

      // Sorting helper: handle Firestore Timestamps and JS Dates
      const sortField = queryOrder[0];
      const sortDir = (queryOrder[1] || 'desc').toLowerCase();
      const getTime = (val) => {
        if (!val) return 0;
        if (val.toDate) return val.toDate().getTime();
        const d = val instanceof Date ? val : new Date(val);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      };

      if (sortField) {
        filtered.sort((a, b) => {
          const aVal = getTime(a[sortField]);
          const bVal = getTime(b[sortField]);
          return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        });
      }

      setJobs(filtered);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error("Jey: Error fetching real-time jobs:", error);
      setLoading(false);
      setRefreshing(false);
      Alert.alert("Data Error", "Failed to load jobs in real-time. Check connection.");
    });

    // Clean up the listener on unmount or filter change
    return () => unsubscribe();
  }, [filter, user?.uid]); // Re-run effect when filter changes or user changes

  const onRefresh = () => {
    setRefreshing(true);
    // The useEffect listener handles refresh automatically, but we can 
    // force a re-render/re-fetch by briefly toggling the filter state if needed.
    // For now, let the listener handle refresh.
  };
  
  // --- Job Action Handlers ---

  const handleStartJob = async (jobId) => {
    Alert.alert(
      'Start Job',
      'Are you ready to start this pickup?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            try {
              const jobRef = doc(db, 'jobs', jobId);
              await updateDoc(jobRef, {
                status: 'in_progress',
                startedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              // The onSnapshot listener will update the local state automatically
              Alert.alert('Success', 'Job started! Navigate to the pickup location.');
              setShowJobDetails(false);
            } catch (error) {
              console.error('Jey: Error starting job:', error);
              Alert.alert('Error', 'Failed to start job. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleCompleteJob = async (jobId) => {
    Alert.alert(
      'Complete Job',
      'Have you successfully completed the pickup?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
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
<<<<<<< HEAD
              setSelectedJob(prev => prev ? {...prev, status: 'completed'} : null);
              
              // Prompt contractor to rate the customer
              setJobToRate({ id: jobId, customerId: jobData.customerId, contractorId: jobData.contractorId });
              setShowRatingModal(true);
=======
              
              // Find the job locally to get rating context before the list refreshes
              const jobToRate = jobs.find(j => j.id === jobId);
              if (jobToRate) {
                  setRateContext({
                      jobId: jobToRate.id,
                      customerId: jobToRate.customerId,
                      customerName: jobToRate.customerName
                  });
                  setShowRateModal(true);
              }

              Alert.alert('Success', 'Job completed! Your payment is being processed.');
              setShowJobDetails(false);
>>>>>>> e936db1 (Auto-insert '/' after 2 digits in Expiry field for WithdrawToDebit and bugfixes)
            } catch (error) {
              console.error('Jey: Error completing job:', error);
              Alert.alert('Error', 'Failed to complete job. Please try again.');
            }
          }
        }
      ]
    );
  };

<<<<<<< HEAD
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
=======
  // --- Placeholder Logic (removed dependencies on mocked fields) ---
  const navigateToLocation = (job) => { Alert.alert('Navigate', `Directions to ${job.location?.address || 'Pickup Location'}`); };
  const openExternalNavigation = () => { Alert.alert('External Nav', 'Launching external map app...'); };
>>>>>>> e936db1 (Auto-insert '/' after 2 digits in Expiry field for WithdrawToDebit and bugfixes)
  
  // --- Render Job Card (minor cleanup) ---
  const renderJobCard = ({ item }) => {
    const isCompleted = item.status === 'completed';
    const isScheduled = item.status === 'scheduled';
    
    // Payout color: neutral for completed, green for active
    const payoutColor = isCompleted ? '#1F2937' : '#34A853'; 

    const commonHeader = (
      <View style={styles.jobHeader}>
        <View style={styles.jobInfo}>
          <Text style={styles.customerName}>{item.customerName || 'Customer'}</Text>
          <Text style={styles.jobType}>
            {(item.wasteType?.charAt(0).toUpperCase() + item.wasteType?.slice(1) || 'Waste') + ` • ${item.volume || 'N/A'}`}
          </Text>
          
          {/* HIDE ADDRESS FOR COMPLETED JOBS */}
          {!isCompleted && item.location?.address && (
            <Text style={styles.jobLocation}>{item.location.address}</Text>
          )}
          {isCompleted && (
            <View style={styles.ratingDisplay}>
              <Ionicons name="star" size={16} color="#FFB300" />
              {/* Assuming rating lives on the job document after it's been rated */}
              <Text style={styles.ratingText}>{item.rating ? `${item.rating}/5 Rated` : 'Rate Customer'}</Text> 
            </View>
          )}
        </View>

        <View style={styles.jobMeta}>
          <Text style={[styles.earnings, { color: payoutColor }]}>${Number(item.contractorEarnings).toFixed(2)}</Text>
          
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}> 
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>
      </View>
    );

    const footer = (
      <View style={styles.jobFooter}>
        <View style={styles.jobDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>
              {isScheduled ? `Scheduled: ${formatTime(item.scheduledTime)}` : 
               isCompleted ? `Finished: ${formatTime(item.completedAt)}` :
               `Accepted: ${formatTime(item.acceptedAt)}`}
            </Text>
          </View>
          
          {/* Only show distance for active jobs (assuming distance is calculated in parent screen/logic) */}
          {!isCompleted && item.distance && (
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={16} color="#6B7280" />
              <Text style={styles.detailText}>{item.distance} mi away</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {isScheduled && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleStartJob(item.id)}
          >
            <Text style={styles.actionButtonText}>Start</Text>
          </TouchableOpacity>
        )}

        {item.status === 'in_progress' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={() => handleCompleteJob(item.id)}
          >
            <Text style={styles.actionButtonText}>Complete</Text>
          </TouchableOpacity>
        )}
        
        {/* Rating Button for Completed Jobs - only if not already rated */}
        {isCompleted && !item.rating && (
            <TouchableOpacity
                style={[styles.actionButton, styles.rateButton]}
                onPress={() => {
                    setRateContext({
                        jobId: item.id,
                        customerId: item.customerId,
                        customerName: item.customerName
                    });
                    setShowRateModal(true);
                }}
            >
                <Text style={styles.actionButtonText}>Rate</Text>
            </TouchableOpacity>
        )}
      </View>
    );

    // Completed jobs: render as a non-interactive View
    if (isCompleted) {
      return (
        <View style={styles.jobCard}>
          {commonHeader}
          {footer}
        </View>
      );
    }

    // Active/scheduled jobs: keep clickable behavior
    return (
      <TouchableOpacity
        style={styles.jobCard}
        onPress={() => {
          setSelectedJob(item);
          setShowJobDetails(true);
        }}
        activeOpacity={0.7}
      >
        {commonHeader}
        {footer}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="briefcase-outline" size={64} color="#9CA3AF" />
      <Text style={styles.emptyStateTitle}>
        {filter === 'active' ? 'No Active Jobs' : 
         filter === 'completed' ? 'No Completed Jobs' : 'No Jobs Yet'}
      </Text>
      <Text style={styles.emptyStateDescription}>
        {filter === 'active' 
          ? 'Check the Available Jobs section to find new opportunities.'
          : filter === 'completed'
          ? 'Completed jobs will appear here after you finish them.'
          : 'Your accepted jobs will appear here.'}
      </Text>
      {/*
      {filter === 'active' && (
        <TouchableOpacity 
          style={styles.ctaButton}
          onPress={() => navigation.navigate('ContractorDashboard', { showAllJobs: true })} // Navigating back to Dashboard
        >
          <Text style={styles.ctaButtonText}>Find Available Jobs</Text>
        </TouchableOpacity>
      )}
      */}
    </View>
  );

  return (
    <View style={styles.container}>
      <SharedHeader 
        title="My Jobs" 
        showBackButton 
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
      
      {loading ? (
        <View style={styles.loadingOverlay}>
          <Ionicons name="sync-circle-outline" size={32} color="#34A853" />
          <Text style={styles.loadingText}>Loading jobs...</Text>
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
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#34A853']}
              tintColor="#34A853"
            />
          }
          ListEmptyComponent={renderEmptyState}
        />
      )}


      {/* Job Details Modal (retained, ensures Timestamp dates are handled by formatTime) */}
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
                <Ionicons name="close" size={24} color="#6B7280" />
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
                  <Ionicons name="chatbubble-outline" size={20} color="#34A853" />
                  <Text style={styles.contactButtonText}>Message Customer</Text>
                </TouchableOpacity>
              </View>

              {/* Job Info */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Job Information</Text>
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Type</Text>
                    <Text style={styles.infoValue}>{selectedJob.wasteType || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Volume</Text>
                    <Text style={styles.infoValue}>{selectedJob.volume || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Earnings</Text>
                    <Text style={styles.infoValue}>${Number(selectedJob.contractorEarnings).toFixed(2)}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Distance</Text>
                    <Text style={styles.infoValue}>{selectedJob.distance || 'N/A'} mi</Text>
                  </View>
                </View>
              </View>

              {/* Location */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Pickup Location</Text>
                <Text style={styles.addressText}>{selectedJob.location?.address || selectedJob.pickupAddress?.fullAddress || 'Address Missing'}</Text>
                <TouchableOpacity 
                  style={styles.navigationButton}
                  onPress={() => navigateToLocation(selectedJob)}
                >
                  <Ionicons name="navigate-outline" size={20} color="#3B82F6" />
                  <Text style={styles.navigationButtonText}>Get Directions</Text>
                </TouchableOpacity>
              </View>

              {/* Notes */}
              {selectedJob.notes && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Customer Notes</Text>
                  <Text style={styles.notesText}>{selectedJob.notes}</Text>
                </View>
              )}

              {/* Status & Actions */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Status</Text>
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
                    <Text style={styles.modalActionButtonText}>Complete Job</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
<<<<<<< HEAD
      
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
=======

      {/* Rate Customer Modal (unchanged) */}
      <RateUserModal
        visible={showRateModal}
        onClose={() => setShowRateModal(false)}
        title={rateContext?.customerName ? `Rate ${rateContext.customerName}` : 'Rate Customer'}
        onSubmit={async ({ rating, review }) => {
          try {
            if (!rateContext || !auth.currentUser) return;
            // Create rating document
            await addDoc(collection(db, 'ratings'), {
              jobId: rateContext.jobId,
              raterId: auth.currentUser.uid,
              raterRole: 'contractor',
              ratedUserId: rateContext.customerId,
              rating,
              review: review || '',
              createdAt: serverTimestamp(),
            });

            // Update aggregates on rated user's doc
            const ratedUserRef = doc(db, 'users', rateContext.customerId);
            await updateDoc(ratedUserRef, {
              'ratings.count': increment(1),
              'ratings.sum': increment(rating),
            });
            
            // Local update to mark job as rated, which removes the "Rate" button
            setJobs(prev => 
                prev.map(job => 
                    job.id === rateContext.jobId ? {...job, rating: rating} : job
                )
            );
          } catch (e) {
            console.error('Error submitting rating:', e);
          } finally {
            setShowRateModal(false);
            setRateContext(null);
          }
        }}
      />
    </View>
>>>>>>> e936db1 (Auto-insert '/' after 2 digits in Expiry field for WithdrawToDebit and bugfixes)
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  activeFilter: {
    backgroundColor: '#34A853',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  jobInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  jobType: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  jobLocation: {
    fontSize: 14,
    color: '#6B7280',
  },
  jobMeta: {
    alignItems: 'flex-end',
  },
  earnings: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobDetails: {
    flex: 1,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  actionButton: {
    backgroundColor: '#34A853',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  completeButton: {
    backgroundColor: '#F59E0B',
  },
  rateButton: {
    backgroundColor: '#3B82F6',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  ctaButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    fontWeight: '600',
    color: '#1F2937',
  },
  modalHeaderSpacer: {
    width: 24,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  customerDetailName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34A853',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    flex: 1,
    minWidth: '45%',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  addressText: {
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 12,
  },
  navigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navigationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  notesText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
  },
  modalActionButton: {
    backgroundColor: '#34A853',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  modalActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ratingDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
  },
  ratingText: {
      fontSize: 14,
      color: '#FFB300',
      marginLeft: 4,
      fontWeight: '600',
  },
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
    fontWeight: '500',
  },
});

export default MyJobs;