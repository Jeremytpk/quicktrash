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
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SharedHeader from '../components/SharedHeader';
import { useUser } from '../contexts/UserContext';
import { db, auth } from '../firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';

const MyJobs = ({ navigation, route }) => {
  const { user, contractorId } = useUser();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [filter, setFilter] = useState('active'); // active, completed, all

  // Handle auto-opening job details when navigated from another screen
  useEffect(() => {
    if (route.params?.jobId && route.params?.autoOpen && jobs.length > 0) {
      const job = jobs.find(j => j.id === route.params.jobId);
      if (job) {
        setSelectedJob(job);
        setShowJobDetails(true);
        // Clear the params to prevent reopening on subsequent renders
        navigation.setParams({ jobId: undefined, autoOpen: undefined });
      }
    }
  }, [route.params?.jobId, route.params?.autoOpen, jobs, navigation]);

  // Fetch jobs for the logged-in contractor from Firestore
  useEffect(() => {
    if (!user) return;
    
    // Use user.uid as the contractor ID (contractors are identified by their user ID)
    const effectiveContractorId = contractorId || user.uid;
    
    setLoading(true);
    const jobsRef = collection(db, 'jobs');
    const q = query(
      jobsRef,
      where('contractorId', '==', effectiveContractorId)
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let jobsList = [];
      console.log('MyJobs: Query snapshot size:', querySnapshot.size);
      console.log('MyJobs: Querying with contractorId:', effectiveContractorId);
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('MyJobs: Job data:', { id: doc.id, status: data.status, contractorId: data.contractorId });
        jobsList.push({
          id: doc.id,
          ...data,
          // Convert Firestore Timestamps to JS Dates for compatibility
          scheduledTime: data.scheduledTime?.toDate ? data.scheduledTime.toDate() : data.scheduledTime,
          acceptedAt: data.acceptedAt?.toDate ? data.acceptedAt.toDate() : data.acceptedAt,
          completedAt: data.completedAt?.toDate ? data.completedAt.toDate() : data.completedAt,
          // Add default values for missing fields
          customerName: data.customerName || 'Customer',
          wasteType: data.wasteType || 'General Waste',
          volume: data.volume || 'N/A',
          location: data.location || data.pickupAddress || { address: 'Address not available' },
          contractorEarnings: data.pricing?.contractorPayout || data.contractorEarnings || 0,
          distance: data.distance || 'N/A',
        });
      });
      console.log('MyJobs: Total jobs fetched:', jobsList.length);
      // Filter by UI filter - only show accepted and beyond statuses
      const filteredJobs = jobsList.filter(job => {
        const jobStatus = (job.status || '').toLowerCase();
        const validStatuses = ['accepted', 'scheduled', 'in_progress', 'completed'];
        
        // Check if status is valid
        if (!validStatuses.includes(jobStatus)) {
          console.log('MyJobs: Job filtered out - invalid status:', job.status, 'Job ID:', job.id);
          return false;
        }
        
        switch (filter) {
          case 'active':
            const isActive = ['accepted', 'scheduled', 'in_progress'].includes(jobStatus);
            console.log('MyJobs: Active filter - Job:', job.id, 'Status:', jobStatus, 'Included:', isActive);
            return isActive;
          case 'completed':
            const isCompleted = jobStatus === 'completed';
            console.log('MyJobs: Completed filter - Job:', job.id, 'Status:', jobStatus, 'Included:', isCompleted);
            return isCompleted;
          default:
            return true;
        }
      });
      console.log('MyJobs: Filtered jobs:', filteredJobs.length, 'Filter:', filter);
      setJobs(filteredJobs);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error('Error fetching jobs:', error);
      setLoading(false);
      setRefreshing(false);
      Alert.alert('Error', 'Failed to fetch jobs.');
    });
    return () => unsubscribe();
  }, [user, contractorId, filter]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted': return '#8B5CF6';
      case 'scheduled': return '#3B82F6';
      case 'in_progress': return '#F59E0B';
      case 'completed': return '#34A853';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'accepted': return 'Accepted';
      case 'scheduled': return 'Scheduled';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
              // Update job status to in_progress
              setJobs(prev =>
                prev.map(job =>
                  job.id === jobId
                    ? { ...job, status: 'in_progress', startedAt: new Date() }
                    : job
                )
              );
              Alert.alert('Success', 'Job started! Navigate to the pickup location.');
            } catch (error) {
              Alert.alert('Error', 'Failed to start job');
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
              setJobs(prev =>
                prev.map(job =>
                  job.id === jobId
                    ? { ...job, status: 'completed', completedAt: new Date() }
                    : job
                )
              );
              Alert.alert('Success', 'Job completed! Payment will be processed shortly.');
            } catch (error) {
              Alert.alert('Error', 'Failed to complete job');
            }
          }
        }
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    // Refetch jobs
  };

  const renderJobCard = ({ item }) => (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => {
        setSelectedJob(item);
        setShowJobDetails(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.jobHeader}>
        <View style={styles.jobInfo}>
          <Text style={styles.customerName}>{item.customerName || 'Customer'}</Text>
          <Text style={styles.jobType}>
            {(item.wasteType || 'Waste')?.charAt(0).toUpperCase() + (item.wasteType || 'waste').slice(1)} • {item.volume || 'N/A'}
          </Text>
          <Text style={styles.jobLocation}>
            {item.location?.address || item.pickupAddress?.street || item.pickupAddress?.fullAddress || 'Location not available'}
          </Text>
        </View>
        
        <View style={styles.jobMeta}>
          <Text style={styles.earnings}>${item.contractorEarnings || item.pricing?.contractorPayout || 0}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.jobFooter}>
        <View style={styles.jobDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>
              {item.status === 'accepted' ? formatTime(item.acceptedAt) :
               item.status === 'scheduled' ? formatTime(item.scheduledTime) : 
               item.status === 'completed' ? formatTime(item.completedAt) :
               'In progress'}
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <Ionicons name="location-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>{item.distance} mi away</Text>
          </View>
        </View>

        {(item.status === 'accepted' || item.status === 'scheduled') && (
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
      </View>
    </TouchableOpacity>
  );

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

      {/* Debug Info - Remove after testing */}
      {__DEV__ && (
        <View style={{ backgroundColor: '#FFF3E0', padding: 8, marginHorizontal: 16, marginTop: 8, borderRadius: 4 }}>
          <Text style={{ fontSize: 12, color: '#E65100' }}>
            Debug: User ID: {user?.uid?.slice(0, 8) || 'N/A'} | Contractor ID: {(contractorId || user?.uid)?.slice(0, 8) || 'N/A'}
          </Text>
          <Text style={{ fontSize: 12, color: '#E65100' }}>
            Jobs found: {jobs.length} | Filter: {filter} | Loading: {loading ? 'Yes' : 'No'}
          </Text>
        </View>
      )}

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
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Job Details</Text>
              <View style={styles.modalHeaderSpacer} />
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Show welcome banner for newly accepted jobs */}
              {(selectedJob.status === 'accepted' || selectedJob.status === 'scheduled') && (
                <View style={styles.welcomeBanner}>
                  <Ionicons name="checkmark-circle" size={24} color="#34A853" />
                  <View style={styles.welcomeBannerText}>
                    <Text style={styles.welcomeBannerTitle}>Job Accepted Successfully!</Text>
                    <Text style={styles.welcomeBannerSubtitle}>
                      Get directions and start the pickup when you're ready
                    </Text>
                  </View>
                </View>
              )}

              {/* Customer Info */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Customer</Text>
                <Text style={styles.customerDetailName}>{selectedJob.customerName}</Text>
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
                    <Text style={styles.infoValue}>{selectedJob.wasteType}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Volume</Text>
                    <Text style={styles.infoValue}>{selectedJob.volume}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Earnings</Text>
                    <Text style={styles.infoValue}>${selectedJob.contractorEarnings}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Distance</Text>
                    <Text style={styles.infoValue}>{selectedJob.distance} mi</Text>
                  </View>
                </View>
              </View>

              {/* Location */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Pickup Location</Text>
                <Text style={styles.addressText}>{selectedJob.location.address}</Text>
                <TouchableOpacity 
                  style={styles.navigationButton}
                  onPress={() => {
                    const address = encodeURIComponent(selectedJob.location.address);
                    const lat = selectedJob.location?.latitude;
                    const lng = selectedJob.location?.longitude;
                    
                    let url;
                    if (Platform.OS === 'ios') {
                      // Use Apple Maps on iOS
                      url = lat && lng 
                        ? `maps://app?daddr=${lat},${lng}`
                        : `maps://app?daddr=${address}`;
                    } else {
                      // Use Google Maps on Android and Web
                      url = lat && lng
                        ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
                        : `https://www.google.com/maps/dir/?api=1&destination=${address}`;
                    }
                    
                    if (Platform.OS === 'web') {
                      window.open(url, '_blank');
                    } else {
                      Linking.openURL(url).catch(err => {
                        Alert.alert('Error', 'Could not open navigation app');
                        console.error('Navigation error:', err);
                      });
                    }
                  }}
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

                {(selectedJob.status === 'accepted' || selectedJob.status === 'scheduled') && (
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 25 : 0,
    backgroundColor: '#F9FAFB',
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
    color: '#34A853',
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    backgroundColor: '#F9FAFB',
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
  welcomeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#34A853',
  },
  welcomeBannerText: {
    flex: 1,
    marginLeft: 12,
  },
  welcomeBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 4,
  },
  welcomeBannerSubtitle: {
    fontSize: 14,
    color: '#2E7D32',
    lineHeight: 20,
  },
});

export default MyJobs;
