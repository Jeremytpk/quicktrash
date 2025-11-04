import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SharedHeader from '../components/SharedHeader';
import { db } from '../firebaseConfig';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const Disputes = ({ navigation }) => {
  const [disputes, setDisputes] = useState([]);
  const [filteredDisputes, setFilteredDisputes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Mock disputes data (replace with real Firebase data)
  const mockDisputes = [
    {
      id: 'D-2025-001',
      jobId: 'QT-2025-001',
      customerId: 'customer_1',
      contractorId: 'contractor_1',
      reportedBy: 'customer',
      issue: 'service_quality',
      description: 'Contractor left trash bags on the curb instead of taking them',
      priority: 'high',
      status: 'pending',
      createdAt: new Date('2025-01-15T10:30:00'),
      customerName: 'Sarah Martinez',
      contractorName: 'Mike Davis',
      jobType: 'Household Pickup',
      location: '123 Main St, Atlanta, GA'
    },
    {
      id: 'D-2025-002',
      jobId: 'QT-2025-002',
      customerId: 'customer_2',
      contractorId: 'contractor_2',
      reportedBy: 'contractor',
      issue: 'payment_dispute',
      description: 'Customer reported incorrect amount charged',
      priority: 'medium',
      status: 'investigating',
      createdAt: new Date('2025-01-15T09:15:00'),
      customerName: 'John Smith',
      contractorName: 'Lisa Chen',
      jobType: 'Bulk Pickup',
      location: '456 Oak Ave, Atlanta, GA'
    },
    {
      id: 'D-2025-003',
      jobId: 'QT-2025-003',
      customerId: 'customer_3',
      contractorId: 'contractor_1',
      reportedBy: 'customer',
      issue: 'damage_claim',
      description: 'Contractor damaged property during pickup',
      priority: 'high',
      status: 'pending',
      createdAt: new Date('2025-01-14T16:45:00'),
      customerName: 'Emma Thompson',
      contractorName: 'Mike Davis',
      jobType: 'Yard Waste',
      location: '789 Pine St, Atlanta, GA'
    }
  ];

  useEffect(() => {
    fetchDisputesData();
  }, []);

  const fetchDisputesData = async () => {
    try {
      setLoading(true);
      
      // Fetch disputes from Firebase
      const disputesQuery = query(
        collection(db, 'disputes'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(disputesQuery);
      const disputesData = [];
      
      // Process disputes and fetch related data
      for (const doc of snapshot.docs) {
        const dispute = doc.data();
        
        // Fetch customer and contractor names
        const customerName = await fetchUserName(dispute.customerId);
        const contractorName = await fetchUserName(dispute.contractorId);
        
        // Fetch job details
        const jobDetails = await fetchJobDetails(dispute.jobId);
        
        disputesData.push({
          id: doc.id,
          jobId: dispute.jobId,
          customerId: dispute.customerId,
          contractorId: dispute.contractorId,
          reportedBy: dispute.reportedBy,
          issue: dispute.issue,
          description: dispute.description,
          priority: dispute.priority,
          status: dispute.status,
          createdAt: dispute.createdAt ? new Date(dispute.createdAt.seconds * 1000) : new Date(),
          customerName: customerName || 'Unknown Customer',
          contractorName: contractorName || 'Unknown Contractor',
          jobType: jobDetails?.wasteType || 'Unknown',
          location: jobDetails?.pickupAddress?.street 
            ? `${jobDetails.pickupAddress.street}, ${jobDetails.pickupAddress.city}, ${jobDetails.pickupAddress.state}`
            : 'Unknown Location'
        });
      }
      
      setDisputes(disputesData);
      setFilteredDisputes(disputesData);
      
    } catch (error) {
      console.error('Error fetching disputes:', error);
      // Fallback to mock data if Firebase fails
      setDisputes(mockDisputes);
      setFilteredDisputes(mockDisputes);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserName = async (userId) => {
    try {
      if (!userId) return null;
      
      const userDoc = await getDocs(
        query(collection(db, 'users'), where('__name__', '==', userId))
      );
      
      if (!userDoc.empty) {
        return userDoc.docs[0].data().displayName;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user name:', error);
      return null;
    }
  };

  const fetchJobDetails = async (jobId) => {
    try {
      if (!jobId) return null;
      
      const jobDoc = await getDocs(
        query(collection(db, 'jobs'), where('__name__', '==', jobId))
      );
      
      if (!jobDoc.empty) {
        return jobDoc.docs[0].data();
      }
      return null;
    } catch (error) {
      console.error('Error fetching job details:', error);
      return null;
    }
  };

  useEffect(() => {
    let filtered = disputes;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(dispute => 
        dispute.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dispute.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dispute.contractorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dispute.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(dispute => dispute.status === selectedStatus);
    }

    setFilteredDisputes(filtered);
  }, [searchQuery, selectedStatus, disputes]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDisputesData().finally(() => {
      setRefreshing(false);
    });
  };

  const handleDisputePress = (dispute) => {
    setSelectedDispute(dispute);
    setShowDisputeModal(true);
  };

  const handleStatusUpdate = async (disputeId, newStatus) => {
    try {
      // Update dispute status in Firebase
      const disputeRef = doc(db, 'disputes', disputeId);
      await updateDoc(disputeRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      const updatedDisputes = disputes.map(dispute => 
        dispute.id === disputeId ? { ...dispute, status: newStatus } : dispute
      );
      setDisputes(updatedDisputes);
      setShowDisputeModal(false);
      setSelectedDispute(null);
      
      Alert.alert('Success', `Dispute status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating dispute:', error);
      Alert.alert('Error', 'Failed to update dispute status');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#EF4444';
      case 'investigating': return '#F59E0B';
      case 'resolved': return '#10B981';
      default: return '#6B7280';
    }
  };

  const renderDisputeCard = ({ item: dispute }) => (
    <TouchableOpacity
      style={styles.disputeCard}
      onPress={() => handleDisputePress(dispute)}
    >
      <View style={styles.disputeHeader}>
        <Text style={styles.disputeId}>{dispute.id}</Text>
        <View style={styles.priorityContainer}>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(dispute.priority) }]}>
            <Text style={styles.priorityText}>{dispute.priority.toUpperCase()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(dispute.status) }]}>
            <Text style={styles.statusText}>{dispute.status.toUpperCase()}</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.disputeDescription}>{dispute.description}</Text>
      
      <View style={styles.disputeDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>Customer: {dispute.customerName}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="car-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>Contractor: {dispute.contractorName}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>{dispute.location}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>{dispute.createdAt.toLocaleDateString()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const DisputeModal = () => (
    <Modal
      visible={showDisputeModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowDisputeModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Dispute Details</Text>
          <TouchableOpacity onPress={() => setShowDisputeModal(false)}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {selectedDispute && (
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Dispute Information</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Dispute ID:</Text>
                <Text style={styles.infoValue}>{selectedDispute.id}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Job ID:</Text>
                <Text style={styles.infoValue}>{selectedDispute.jobId}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Issue Type:</Text>
                <Text style={styles.infoValue}>{selectedDispute.issue.replace('_', ' ')}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Priority:</Text>
                <Text style={[styles.infoValue, { color: getPriorityColor(selectedDispute.priority) }]}>
                  {selectedDispute.priority.toUpperCase()}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status:</Text>
                <Text style={[styles.infoValue, { color: getStatusColor(selectedDispute.status) }]}>
                  {selectedDispute.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.descriptionText}>{selectedDispute.description}</Text>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Parties Involved</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Customer:</Text>
                <Text style={styles.infoValue}>{selectedDispute.customerName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Contractor:</Text>
                <Text style={styles.infoValue}>{selectedDispute.contractorName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Location:</Text>
                <Text style={styles.infoValue}>{selectedDispute.location}</Text>
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Actions</Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.investigateButton]}
                  onPress={() => handleStatusUpdate(selectedDispute.id, 'investigating')}
                >
                  <Ionicons name="search-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Start Investigation</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.resolveButton]}
                  onPress={() => handleStatusUpdate(selectedDispute.id, 'resolved')}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Mark Resolved</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <SharedHeader title="Dispute Management" showBackButton />

      <View style={styles.content}>
        {/* Search and Filter */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search disputes..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
          </View>
          
          <View style={styles.filterContainer}>
            <TouchableOpacity 
              style={[styles.filterButton, selectedStatus === 'all' && styles.activeFilter]}
              onPress={() => setSelectedStatus('all')}
            >
              <Text style={[styles.filterText, selectedStatus === 'all' && styles.activeFilterText]}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterButton, selectedStatus === 'pending' && styles.activeFilter]}
              onPress={() => setSelectedStatus('pending')}
            >
              <Text style={[styles.filterText, selectedStatus === 'pending' && styles.activeFilterText]}>Pending</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterButton, selectedStatus === 'investigating' && styles.activeFilter]}
              onPress={() => setSelectedStatus('investigating')}
            >
              <Text style={[styles.filterText, selectedStatus === 'investigating' && styles.activeFilterText]}>Investigating</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterButton, selectedStatus === 'resolved' && styles.activeFilter]}
              onPress={() => setSelectedStatus('resolved')}
            >
              <Text style={[styles.filterText, selectedStatus === 'resolved' && styles.activeFilterText]}>Resolved</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Disputes List */}
        <FlatList
          data={filteredDisputes}
          renderItem={renderDisputeCard}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyText}>No disputes found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery ? 'Try adjusting your search criteria' : 'All disputes have been resolved'}
              </Text>
            </View>
          )}
        />
      </View>

      <DisputeModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
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
    paddingBottom: 20,
  },
  disputeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disputeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  disputeId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disputeDescription: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
    lineHeight: 20,
  },
  disputeDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
    textAlign: 'right',
  },
  descriptionText: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  investigateButton: {
    backgroundColor: '#F59E0B',
  },
  resolveButton: {
    backgroundColor: '#10B981',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default Disputes;
