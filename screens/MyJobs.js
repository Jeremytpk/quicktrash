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
  serverTimestamp,
  addDoc,
  increment
} from 'firebase/firestore';
import RateUserModal from '../components/RateUserModal';

const MyJobs = () => {
  const { user } = useUser();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [filter, setFilter] = useState('active'); // active, completed, all
  const [showRateModal, setShowRateModal] = useState(false);
  const [rateContext, setRateContext] = useState(null); // { jobId, customerId, customerName }

  // Mock jobs data - in real app, fetch from Firebase
  useEffect(() => {
    const mockJobs = [
      {
        id: '1',
        customerId: 'customer1',
        customerName: 'Sarah Martinez',
        wasteType: 'household',
        volume: '3 bags',
        status: 'in_progress',
        totalPrice: 25.00,
        contractorEarnings: 17.50,
        location: {
          address: '123 Main St, Atlanta, GA 30309',
          coordinates: { latitude: 33.7490, longitude: -84.3880 }
        },
        scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        acceptedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        notes: 'Trash bags are by the garage door',
        photos: [],
        distance: 1.2,
        estimatedDuration: 15,
      },
      {
        id: '2',
        customerId: 'customer2',
        customerName: 'Mike Johnson',
        wasteType: 'bulk',
        volume: 'Old sofa',
        status: 'completed',
        totalPrice: 45.00,
        contractorEarnings: 31.50,
        location: {
          address: '456 Oak Ave, Marietta, GA 30060',
          coordinates: { latitude: 33.9526, longitude: -84.5499 }
        },
        scheduledTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
        acceptedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
        notes: 'Heavy item, may need help',
        photos: ['before.jpg', 'after.jpg'],
        distance: 2.8,
        estimatedDuration: 30,
        rating: 5,
      },
      {
        id: '3',
        customerId: 'customer3',
        customerName: 'Lisa Chen',
        wasteType: 'yard',
        volume: 'Yard trimmings',
        status: 'scheduled',
        totalPrice: 35.00,
        contractorEarnings: 24.50,
        location: {
          address: '789 Pine St, Sandy Springs, GA 30328',
          coordinates: { latitude: 33.9304, longitude: -84.3733 }
        },
        scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
        acceptedAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        notes: 'Please use yard waste bin provided',
        photos: [],
        distance: 3.5,
        estimatedDuration: 20,
      },
    ];

    const filteredJobs = mockJobs.filter(job => {
      switch (filter) {
        case 'active':
          return ['scheduled', 'in_progress'].includes(job.status);
        case 'completed':
          return job.status === 'completed';
        default:
          return true;
      }
    });

    setJobs(filteredJobs);
    setLoading(false);
    setRefreshing(false);
  }, [filter]);

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

              // Show rating modal for contractor to rate customer
              const completedJob = jobs.find(j => j.id === jobId);
              if (completedJob) {
                setRateContext({
                  jobId: completedJob.id,
                  customerId: completedJob.customerId,
                  customerName: completedJob.customerName,
                });
                setShowRateModal(true);
              }
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
          <Text style={styles.customerName}>{item.customerName}</Text>
          <Text style={styles.jobType}>
            {item.wasteType.charAt(0).toUpperCase() + item.wasteType.slice(1)} • {item.volume}
          </Text>
          <Text style={styles.jobLocation}>{item.location.address}</Text>
        </View>
        
        <View style={styles.jobMeta}>
          <Text style={styles.earnings}>${item.contractorEarnings}</Text>
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
              {item.status === 'scheduled' ? formatTime(item.scheduledTime) : 
               item.status === 'completed' ? formatTime(item.completedAt) :
               'In progress'}
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <Ionicons name="location-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>{item.distance} mi away</Text>
          </View>
        </View>

        {item.status === 'scheduled' && (
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
          ? 'Active jobs will appear here when assigned to you.'
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
                <TouchableOpacity style={styles.navigationButton}>
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

      {/* Rate Customer Modal */}
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
          } catch (e) {
            console.error('Error submitting rating:', e);
          } finally {
            setShowRateModal(false);
            setRateContext(null);
          }
        }}
      />
    </View>
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
});

export default MyJobs;
