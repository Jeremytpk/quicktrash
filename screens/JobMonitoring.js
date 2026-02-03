import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Dimensions,
  FlatList,
  RefreshControl,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SharedHeader from '../components/SharedHeader';
import { db, auth } from '../firebaseConfig';
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';

const { width } = Dimensions.get('window');

const JobMonitoring = ({ navigation }) => {
  const [statusFilter, setStatusFilter] = useState('All');
  const [allJobs, setAllJobs] = useState([]);
  const [selectedJobIds, setSelectedJobIds] = useState([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');

  // Real-time listener for all jobs
  useEffect(() => {
    const q = query(collection(db, 'jobs'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const jobs = [];
      querySnapshot.forEach((doc) => {
        jobs.push({ id: doc.id, ...doc.data() });
      });
      jobs.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
      setAllJobs(jobs);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error('Error fetching jobs:', error);
      setLoading(false);
      setRefreshing(false);
      Alert.alert('Error', 'Failed to fetch job data. Please check your network connection.');
    });

    return () => unsubscribe();
  }, []);

  // Effect to fetch user display names for all jobs
  useEffect(() => {
    const fetchUserNames = async () => {
      const updatedJobs = await Promise.all(allJobs.map(async (job) => {
        // Fetch customer name
        const customerRef = doc(db, 'users', job.customerId);
        const customerSnap = await getDoc(customerRef);
        const customerName = customerSnap.exists() ? customerSnap.data().displayName : 'N/A';
        
        // Fetch contractor name if applicable
        let contractorName = 'Unassigned';
        if (job.contractorId) {
          const contractorRef = doc(db, 'users', job.contractorId);
          const contractorSnap = await getDoc(contractorRef);
          contractorName = contractorSnap.exists() ? contractorSnap.data().displayName : 'N/A';
        }

        return {
          ...job,
          customerName,
          contractorName,
        };
      }));
      setAllJobs(updatedJobs);
    };

    if (allJobs.length > 0) {
      fetchUserNames();
    }
  }, [allJobs.length]); // This dependency ensures this effect only runs when new jobs are added

  const onRefresh = () => {
    setRefreshing(true);
    // The onSnapshot listener handles the refresh automatically
  };

  const handleJobPress = (job) => {
    if (multiSelectMode) {
      if (selectedJobIds.includes(job.id)) {
        setSelectedJobIds(selectedJobIds.filter((id) => id !== job.id));
      } else {
        setSelectedJobIds([...selectedJobIds, job.id]);
      }
    } else {
      setSelectedJob(job);
      setShowJobModal(true);
    }
  };

  const handleLongPressJob = (job) => {
    if (!multiSelectMode) {
      setMultiSelectMode(true);
      setSelectedJobIds([job.id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedJobIds.length === allJobs.length) {
      setSelectedJobIds([]);
    } else {
      setSelectedJobIds(allJobs.map((job) => job.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedJobIds.length === 0) return;
    Alert.alert(
      'Delete Jobs',
      `Are you sure you want to delete ${selectedJobIds.length} job(s)? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              for (const jobId of selectedJobIds) {
                await deleteDoc(doc(db, 'jobs', jobId));
              }
              setSelectedJobIds([]);
              setMultiSelectMode(false);
              Alert.alert('Deleted', 'Selected jobs have been deleted.');
            } catch (error) {
              console.error('Error deleting jobs:', error);
              Alert.alert('Error', 'Failed to delete jobs.');
            }
          }
        }
      ]
    );
  };

  const handleCancelMultiSelect = () => {
    setMultiSelectMode(false);
    setSelectedJobIds([]);
  };

  const handleManualCancellation = async () => {
    if (!selectedJob) return;

    if (!cancellationReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for the cancellation.');
      return;
    }

    Alert.alert(
      'Confirm Cancellation',
      `Are you sure you want to cancel Job #${selectedJob.id}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const jobRef = doc(db, 'jobs', selectedJob.id);
              await updateDoc(jobRef, {
                status: 'cancelled_by_employee',
                cancellationReason,
                cancelledAt: serverTimestamp(),
                cancelledBy: auth.currentUser?.uid || 'unknown_employee',
              });

              Alert.alert('Success', `Job #${selectedJob.id} has been successfully cancelled.`);
              setShowJobModal(false);
              setSelectedJob(null);
            } catch (error) {
              console.error('Error canceling job:', error);
              Alert.alert('Error', 'Failed to cancel the job. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Helper function to render job cards
  const renderJobCard = ({ item: job }) => {
    let statusColor = getStatusColor(job.status);
    // Make 'Paid' status badge green
    if ((job.status || '').toLowerCase() === 'paid') {
      statusColor = '#22b3f6ff';
    }
    const contractorInfo = job.contractorName || 'Unassigned';
    const customerInfo = job.customerName || 'N/A';
    const isSelected = selectedJobIds.includes(job.id);

    return (
      <TouchableOpacity
        style={[styles.jobCard, multiSelectMode && isSelected && styles.selectedJobCard]}
        onPress={() => handleJobPress(job)}
        onLongPress={() => handleLongPressJob(job)}
      >
        <View style={styles.jobCardHeader}>
          <Text style={styles.jobId}>Job #{job.id.slice(0, 6)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}> 
              <Text style={styles.statusText}>{job.status.replace(/_/g, ' ')}</Text>
            </View>
            {multiSelectMode && (
              <View style={{ marginLeft: 8 }}>
                <Ionicons
                  name={isSelected ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={isSelected ? '#34A853' : '#9CA3AF'}
                />
              </View>
            )}
          </View>
        </View>
        <Text style={styles.jobDetails}>Customer: {customerInfo}</Text>
        <Text style={styles.jobDetails}>Driver: {contractorInfo}</Text>
        <Text style={styles.jobDetails}>Type: {job.wasteType}</Text>
        <Text style={styles.jobDetails}>Price: ${job.pricing?.total?.toFixed(2) || 'N/A'}</Text>
      </TouchableOpacity>
    );
  };

  // Helper function to determine status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FF8F00';
      case 'in_progress': return '#1E88E5';
      case 'completed': return '#34A853';
      case 'cancelled':
      case 'cancelled_by_employee':
      case 'cancelled_by_customer':
        return '#EF4444';
      default: return '#9CA3AF';
    }
  };

  // Filter jobs by status and search query (customer name or job number)
  const filteredJobs = allJobs.filter((job) => {
    // Status filter
    if (statusFilter !== 'All') {
      const statusMap = {
        'Paid': 'paid',
        'Accepted': 'accepted',
        'Pending': 'pending',
        'Cancelled': ['cancelled', 'cancelled_by_employee', 'cancelled_by_customer'],
        'Completed': 'completed',
      };
      const jobStatus = (job.status || '').toLowerCase();
      if (Array.isArray(statusMap[statusFilter])) {
        if (!statusMap[statusFilter].includes(jobStatus)) return false;
      } else {
        if (jobStatus !== statusMap[statusFilter]) return false;
      }
    }
    // Search filter
    const customerName = (job.customerName || '').toLowerCase();
    const jobId = (job.id || '').toLowerCase();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return customerName.includes(query) || jobId.includes(query);
  });

  return (
    <View style={styles.container}>
      <SharedHeader
        title="Job Monitoring"
        subtitle="Live Job Tracking"
        showBackButton={true}
        rightComponent={
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={onRefresh} style={{ marginRight: 12 }}>
              <Ionicons name="refresh" size={24} color="#333" />
            </TouchableOpacity>
            {/* Multi-select mode entry button */}
            {!multiSelectMode && (
              <TouchableOpacity onPress={() => setMultiSelectMode(true)}>
                <Ionicons name="trash" size={24} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Multi-select toolbar */}
      {multiSelectMode && (
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
          <TouchableOpacity onPress={handleSelectAll} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
            <Ionicons name={selectedJobIds.length === allJobs.length ? 'checkbox' : 'square-outline'} size={22} color="#34A853" />
            <Text style={{ fontSize: 14, color: '#374151', marginLeft: 4 }}>Select All</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteSelected} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
            <Ionicons name="trash" size={22} color="#EF4444" />
            <Text style={{ fontSize: 14, color: '#EF4444', marginLeft: 4 }}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCancelMultiSelect} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="close" size={22} color="#6B7280" />
            <Text style={{ fontSize: 14, color: '#6B7280', marginLeft: 4 }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ marginLeft: 16, color: '#374151', fontWeight: 'bold' }}>{selectedJobIds.length} selected</Text>
        </View>
      )}

      {/* Status Filter Bar */}
      <View style={{
        backgroundColor: '#E6F0FA',
        paddingVertical: 14,
        paddingHorizontal: 0,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#D1E3F8',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
      }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', paddingHorizontal: 12 }} contentContainerStyle={{ alignItems: 'center' }}>
          {['All', 'Paid', 'Accepted', 'Pending', 'Cancelled', 'Completed'].map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => setStatusFilter(status)}
              style={{
                paddingHorizontal: 18,
                paddingVertical: 9,
                borderRadius: 20,
                backgroundColor: statusFilter === status ? '#1E88E5' : '#fff',
                marginRight: 10,
                borderWidth: 2,
                borderColor: statusFilter === status ? '#1E88E5' : '#B6C6D8',
                shadowColor: statusFilter === status ? '#1E88E5' : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: statusFilter === status ? 0.12 : 0,
                shadowRadius: 4,
                elevation: statusFilter === status ? 2 : 0,
              }}
            >
              <Text style={{ color: statusFilter === status ? '#fff' : '#1E293B', fontWeight: '700', fontSize: 15, letterSpacing: 0.2 }}>{status}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBarContainer, { flexDirection: 'row', alignItems: 'center' }]}> 
        <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { flex: 1 }]}
          placeholder="Search by customer name or job number"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
        <View style={{ marginLeft: 10, backgroundColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ color: '#374151', fontWeight: 'bold', fontSize: 15 }}>Total: {allJobs.length}</Text>
        </View>
      </View>

      <FlatList
        data={filteredJobs}
        renderItem={renderJobCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        extraData={selectedJobIds}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="briefcase-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>No active jobs to display.</Text>
            {loading && <Text style={styles.loadingText}>Loading...</Text>}
          </View>
        )}
      />

      {/* Job Details Modal */}
      <Modal
        visible={showJobModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowJobModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Job Details</Text>
            <TouchableOpacity onPress={() => setShowJobModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedJob && (
              <>
                <View style={styles.detailSection}>
                  <Text style={styles.detailHeader}>Job Information</Text>
                  <Text style={styles.detailText}>ID: {selectedJob.id}</Text>
                  <Text style={styles.detailText}>Type: {selectedJob.wasteType}</Text>
                  <Text style={styles.detailText}>Volume: {selectedJob.volume}</Text>
                  <Text style={styles.detailText}>Status: {selectedJob.status}</Text>
                  <Text style={styles.detailText}>Price: ${selectedJob.pricing?.total?.toFixed(2) || 'N/A'}</Text>
                  <Text style={styles.detailText}>Description: {selectedJob.description || 'N/A'}</Text>
                  <Text style={styles.detailText}>Created: {selectedJob.createdAt?.toDate().toLocaleString() || 'N/A'}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailHeader}>Customer & Location</Text>
                  <Text style={styles.detailText}>Customer: {selectedJob.customerName || 'N/A'}</Text>
                  <Text style={styles.detailText}>Address: {selectedJob.pickupAddress?.street || 'N/A'}</Text>
                  <Text style={styles.detailText}>City: {selectedJob.pickupAddress?.city || 'N/A'}</Text>
                  <TouchableOpacity style={styles.contactButton}>
                    <Ionicons name="call" size={18} color="#FFFFFF" />
                    <Text style={styles.contactButtonText}>Call Customer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.contactButton}>
                    <Ionicons name="chatbubbles" size={18} color="#FFFFFF" />
                    <Text style={styles.contactButtonText}>Message Customer</Text>
                  </TouchableOpacity>
                </View>

                {selectedJob.contractorId && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailHeader}>Driver Information</Text>
                    <Text style={styles.detailText}>Driver: {selectedJob.contractorName || 'N/A'}</Text>
                    <Text style={styles.detailText}>Accepted: {selectedJob.acceptedAt?.toDate().toLocaleString() || 'N/A'}</Text>
                    <TouchableOpacity style={styles.contactButton}>
                      <Ionicons name="call" size={18} color="#FFFFFF" />
                      <Text style={styles.contactButtonText}>Call Driver</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                {selectedJob.status !== 'completed' && selectedJob.status !== 'cancelled' && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailHeader}>Manual Actions</Text>
                    <TextInput
                      style={styles.reasonInput}
                      placeholder="Reason for cancellation"
                      value={cancellationReason}
                      onChangeText={setCancellationReason}
                      multiline
                    />
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={handleManualCancellation}
                    >
                      <Ionicons name="close-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.cancelButtonText}>Cancel Job</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
// Search bar styles
const searchBarHeight = 44;

const styles = StyleSheet.create({
  selectedJobCard: {
    borderWidth: 2,
    borderColor: '#34A853',
    backgroundColor: '#E6F4EA',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    height: searchBarHeight,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    backgroundColor: 'transparent',
    height: searchBarHeight,
    paddingVertical: 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  jobDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
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
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  detailSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E88E5',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  reasonInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  }
});

export default JobMonitoring;