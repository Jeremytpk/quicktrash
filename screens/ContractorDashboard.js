import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '../contexts/UserContext';
import WebCompatibleMap, { Marker, Circle } from '../components/WebCompatibleMap';
import * as Location from 'expo-location';
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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import SharedHeader from '../components/SharedHeader';

const { width } = Dimensions.get('window');

const formatDate = (timestamp) => {
  if (!timestamp || !timestamp.toDate) return 'N/A';
  return timestamp.toDate().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const ContractorDashboard = ({ navigation }) => {
  const { user } = useUser();
  const [isOnline, setIsOnline] = useState(false);
  const [driverLocation, setDriverLocation] = useState(null);
  // Track driver's live location when online
  useEffect(() => {
    let locationSubscription;
    const startLocationTracking = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      locationSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 5 },
        (loc) => setDriverLocation(loc.coords)
      );
    };
    if (isOnline) {
      startLocationTracking();
    } else {
      setDriverLocation(null);
      if (locationSubscription) locationSubscription.remove();
    }
    return () => {
      if (locationSubscription) locationSubscription.remove();
    };
  }, [isOnline]);
  const [showJobModal, setShowJobModal] = useState(false);
  const [activeJob, setActiveJob] = useState(null);
  const [countdown, setCountdown] = useState(40);
  const [showJobsContainer, setShowJobsContainer] = useState(true);
  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobFilter, setJobFilter] = useState('available');
  const isInitialLoad = useRef(true); // Ref to track the first load

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
      // Assuming 'all' or another filter that doesn't need a specific status for this example
      // You might need to adjust this logic based on your actual data structure/requirements for other filters
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
              // Only offer available jobs
              if (newJob.status === 'available') { 
                handleJobOffer(newJob);
              }
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

  const [todayStats, setTodayStats] = useState({
    jobsCompleted: 0,
    earnings: '$0',
    hoursOnline: '0h',
    rating: 0,
  });

  useEffect(() => {
    if (!user) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const jobsRef = collection(db, 'jobs');
    const q = query(
      jobsRef,
      where('contractorId', '==', user.uid),
      where('status', '==', 'completed'),
      where('completedAt', '>=', today)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let jobsCompleted = 0;
      let earnings = 0;
      let totalRating = 0;
      let ratingCount = 0;
      snapshot.forEach((doc) => {
        jobsCompleted++;
        earnings += doc.data().pricing?.contractorPayout || 0;
        if (doc.data().contractorRating) {
          totalRating += doc.data().contractorRating;
          ratingCount++;
        }
      });
      setTodayStats({
        jobsCompleted,
        earnings: `$${earnings}`,
        hoursOnline: 'N/A', // You can implement hoursOnline tracking if you store online time
        rating: ratingCount ? (totalRating / ratingCount).toFixed(1) : 0,
      });
    });
    return () => unsubscribe();
  }, [user]);

  const handleToggleOnline = () => {
    setIsOnline(!isOnline);
    Alert.alert(!isOnline ? 'Going Online' : 'Going Offline', !isOnline ? 'You are now available to receive job offers.' : 'You will no longer receive job offers.');
  };

  const handleAcceptJob = async () => {
    if (!activeJob) return;
    try {
      // NOTE: You are using a placeholder 'current-user-id' in the original code. 
      // Make sure to replace this with the actual user.uid (e.g., user.uid)
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
    // You might want to update the job status in the database to 'declined' or similar
    Alert.alert('Job Declined', 'Looking for more jobs in your area...');
  };

  const handleAcceptJobFromList = async (job) => {
    Alert.alert('Accept Job?', `Accept this ${job.wasteType} job for $${job.pricing?.contractorPayout || 'N/A'}?`,
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Accept Job', onPress: async () => {
        try {
          const jobRef = doc(db, 'jobs', job.id);
          // NOTE: You are using a placeholder 'current-user-id' in the original code. 
          // Make sure to replace this with the actual user.uid (e.g., user.uid)
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
          // NOTE: Only allow a user to reject a job if they haven't accepted it yet.
          // This update should probably NOT include the contractorId since it's being rejected from the general available list
          await updateDoc(jobRef, { status: 'rejected', rejectedAt: new Date() }); 
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
  
  // A helper function to render a job card (placeholder for brevity)
  const renderJobCard = (job) => (
    <View key={job.id} style={styles.jobCardContainer}>
      {/* Actual job card implementation using job data */}
      <View style={[styles.jobCardNew, job.isHighPayout ? styles.highPayoutJob : styles.mediumPayoutJob]}>
        <View style={styles.jobCardHeader}>
          <View style={styles.jobTypeContainer}>
            <View style={[styles.urgencyBadge, styles.urgencyNormal]}>
              <Text style={[styles.urgencyText, styles.urgencyTextNormal]}>NEW OFFER</Text>
            </View>
            <Text style={styles.jobTypeNew}>{job.wasteType}</Text>
          </View>
          <View style={styles.earningsContainer}>
            <Text style={styles.earningsAmountNew}>${job.pricing?.contractorPayout || 'N/A'}</Text>
            <Text style={styles.earningsLabelNew}>Your Payout</Text>
          </View>
        </View>
        <View style={styles.jobDetailsSection}>
          <Text style={styles.jobVolumeNew}>{job.volume} | {formatDate(job.createdAt)}</Text>
          <View style={styles.jobMetrics}>
            <View style={styles.metric}><Ionicons name="location-outline" size={16} color="#6B7280" /><Text style={styles.metricText}>{job.distance || '1.5 mi'}</Text></View>
            <Text style={styles.jobAddressNew}>{job.pickupAddress?.fullAddress || 'Address Not Available'}</Text>
          </View>
        </View>
        {job.status === 'available' && (
          <View style={styles.jobActions}>
            <TouchableOpacity style={styles.rejectJobButton} onPress={() => handleRejectJobFromList(job)}>
              <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
              <Text style={styles.rejectJobText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptJobButton} onPress={() => handleAcceptJobFromList(job)}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.acceptJobText}>Accept Job</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 1. Primary SharedHeader (Visible at the top of the main container) */}
      <SharedHeader 
        title="Welcome back, Driver!"
        subtitle={
          <View style={styles.onlineStatus}>
            <Switch value={isOnline} onValueChange={handleToggleOnline} trackColor={{ false: '#E5E7EB', true: '#34A853' }} thumbColor={isOnline ? '#FFFFFF' : '#9CA3AF'} />
            <Text style={[styles.statusText, { color: isOnline ? '#34A853' : '#6B7280' }]}>{isOnline ? 'Online' : 'Offline'}</Text>
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

      {/* 2. Main ScrollView for the dashboard content */}
      <ScrollView style={styles.content} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>

        {/* --- Content section: Jobs and Map (only when online) --- */}
        {isOnline && (
          <View style={styles.jobsContainer}>
            {/* Jobs Filter and Header */}
            <View style={styles.jobsHeader}>
                <View style={styles.jobsHeaderLeft}>
                    <Text style={styles.jobsTitle}>New & Available Jobs</Text>
                    <Text style={styles.jobsCount}>{allJobs.length} {jobFilter} jobs</Text>
                </View>
                <TouchableOpacity style={styles.toggleButton} onPress={() => setShowJobsContainer(!showJobsContainer)}>
                    <Ionicons name={showJobsContainer ? 'chevron-up-outline' : 'chevron-down-outline'} size={18} color="#6B7280" />
                    <Text style={styles.toggleText}>{showJobsContainer ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
                <TouchableOpacity style={[styles.filterButton, jobFilter === 'available' && styles.activeFilter]} onPress={() => setJobFilter('available')}>
                    <Text style={[styles.filterText, jobFilter === 'available' && styles.activeFilterText]}>Available</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.filterButton, jobFilter === 'all' && styles.activeFilter]} onPress={() => setJobFilter('all')}>
                    <Text style={[styles.filterText, jobFilter === 'all' && styles.activeFilterText]}>All Jobs</Text>
                </TouchableOpacity>
                {/* Add more filters as needed */}
            </ScrollView>

            {/* Job Cards List */}
            {showJobsContainer && (
              <ScrollView style={styles.jobsScrollView} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <Ionicons name="sync-circle-outline" size={48} color="#9CA3AF" />
                        <Text style={styles.loadingText}>Loading available jobs...</Text>
                    </View>
                ) : (
                    allJobs.length > 0 ? (
                        allJobs.map(renderJobCard)
                    ) : (
                        <View style={styles.noJobsContainer}>
                          <Ionicons name="briefcase-outline" size={48} color="#9CA3AF" />
                          <Text style={styles.noJobsTitle}>No Jobs Found</Text>
                          <Text style={styles.noJobsText}>There are no jobs matching the current filter.</Text>
                        </View>
                    )
                )}
              </ScrollView>
            )}

            {/* Live location map below jobs */}
            {driverLocation && (
              <View style={{ height: 250, margin: 16, borderRadius: 16, overflow: 'hidden' }}>
                <WebCompatibleMap
                  style={{ flex: 1 }}
                  initialRegion={{
                    latitude: driverLocation.latitude,
                    longitude: driverLocation.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                >
                  <Marker
                    coordinate={{
                      latitude: driverLocation.latitude,
                      longitude: driverLocation.longitude,
                    }}
                    title="Your Location"
                  >
                    <Ionicons name="car" size={32} color="#34A853" />
                  </Marker>
                </WebCompatibleMap>
              </View>
            )}
          </View>
        )}

        {/* --- Content section: Today's Performance --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Performance</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}><Ionicons name="checkmark-circle" size={24} color="#34A853" /><Text style={styles.statNumber}>{todayStats.jobsCompleted}</Text><Text style={styles.statLabel}>Jobs Completed</Text></View>
            <View style={styles.statCard}><Ionicons name="cash" size={24} color="#FF8F00" /><Text style={styles.statNumber}>{todayStats.earnings}</Text><Text style={styles.statLabel}>Earnings</Text></View>
            <View style={styles.statCard}><Ionicons name="time" size={24} color="#1E88E5" /><Text style={styles.statNumber}>{todayStats.hoursOnline}</Text><Text style={styles.statLabel}>Hours Online</Text></View>
            <View style={styles.statCard}><Ionicons name="star" size={24} color="#FFB300" /><Text style={styles.statNumber}>{todayStats.rating}</Text><Text style={styles.statLabel}>Rating</Text></View>
          </View>
        </View>
      </ScrollView>

      {/* 3. Job Offer Modal (Positioned outside the ScrollView) */}
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
    container: { flex: 1, backgroundColor: '#F8F9FA', paddingTop: Platform.OS === 'ios' ? 30 : 24 },
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
});

export default ContractorDashboard;
