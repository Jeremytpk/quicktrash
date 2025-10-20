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
  const [allJobs, setAllJobs] = useState([]);
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
    setSelectedJob(job);
    setShowJobModal(true);
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
    const statusColor = getStatusColor(job.status);
    const contractorInfo = job.contractorName || 'Unassigned';
    const customerInfo = job.customerName || 'N/A';

    return (
      <TouchableOpacity
        style={styles.jobCard}
        onPress={() => handleJobPress(job)}
      >
        <View style={styles.jobCardHeader}>
          <Text style={styles.jobId}>Job #{job.id.slice(0, 6)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{job.status.replace(/_/g, ' ')}</Text>
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

  return (
    <View style={styles.container}>
      <SharedHeader
        title="Job Monitoring"
        subtitle="Live Job Tracking"
        showBackButton={true}
        rightComponent={
          <TouchableOpacity onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color="#333" />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={allJobs}
        renderItem={renderJobCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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