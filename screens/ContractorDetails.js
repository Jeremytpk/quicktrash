import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SharedHeader from '../components/SharedHeader';
import { db } from '../firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';

const ContractorDetails = ({ navigation, route }) => {
  const { contractor } = route.params;
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [contractorDetails, setContractorDetails] = useState(contractor);
  const [recentJobs, setRecentJobs] = useState([]);
  const [stats, setStats] = useState({
    totalJobs: 0,
    completedJobs: 0,
    totalEarnings: 0,
    averageRating: 0,
    joinDate: null,
    lastActive: null,
  });

  useEffect(() => {
    fetchContractorDetails();
  }, []);

  const fetchContractorDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch contractor's jobs
      const jobsQuery = query(
        collection(db, 'jobs'),
        where('contractorId', '==', contractor.id),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      
      // Fetch contractor's ratings
      const ratingsQuery = query(
        collection(db, 'ratings'),
        where('ratedUserId', '==', contractor.id)
      );

      const [jobsSnapshot, ratingsSnapshot] = await Promise.all([
        getDocs(jobsQuery),
        getDocs(ratingsQuery)
      ]);

      // Process jobs data
      const jobsData = [];
      let totalEarnings = 0;
      let completedJobs = 0;

      jobsSnapshot.forEach(doc => {
        const job = doc.data();
        jobsData.push({
          id: doc.id,
          wasteType: job.wasteType,
          status: job.status,
          amount: job.pricing?.total || 0,
          createdAt: job.createdAt,
          location: job.pickupAddress?.street || 'Unknown Location',
        });

        totalEarnings += job.pricing?.total || 0;
        if (job.status === 'completed') {
          completedJobs++;
        }
      });

      // Calculate average rating
      let totalRating = 0;
      let ratingCount = 0;
      ratingsSnapshot.forEach(doc => {
        const rating = doc.data();
        totalRating += rating.rating || 0;
        ratingCount++;
      });

      const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;

      setRecentJobs(jobsData);
      setStats({
        totalJobs: jobsData.length,
        completedJobs: completedJobs,
        totalEarnings: totalEarnings,
        averageRating: averageRating,
        joinDate: contractor.joinDate,
        lastActive: jobsData.length > 0 ? jobsData[0].createdAt : null,
      });

    } catch (error) {
      console.error('Error fetching contractor details:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchContractorDetails().finally(() => {
      setRefreshing(false);
    });
  };

  const handleStatusToggle = () => {
    const newStatus = contractorDetails.status === 'active' ? 'inactive' : 'active';
    
    Alert.alert(
      'Change Status',
      `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} this contractor?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => updateContractorStatus(newStatus) }
      ]
    );
  };

  const updateContractorStatus = async (newStatus) => {
    try {
      setLoading(true);
      
      const contractorRef = doc(db, 'users', contractor.id);
      await updateDoc(contractorRef, {
        'contractorData.availability.isOnline': newStatus === 'active',
        updatedAt: serverTimestamp()
      });

      setContractorDetails(prev => ({
        ...prev,
        status: newStatus
      }));

      Alert.alert('Success', `Contractor ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      
    } catch (error) {
      console.error('Error updating contractor status:', error);
      Alert.alert('Error', 'Failed to update contractor status');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const getStatusColor = (status) => {
    return status === 'active' ? '#10B981' : '#6B7280';
  };

  const getJobStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'in_progress': return '#F59E0B';
      case 'pending': return '#6B7280';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const renderJobCard = ({ item: job }) => (
    <View style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <View style={styles.jobIcon}>
          <Ionicons name="briefcase" size={20} color="#3B82F6" />
        </View>
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{job.wasteType} Pickup</Text>
          <Text style={styles.jobLocation}>{job.location}</Text>
        </View>
        <View style={styles.jobMeta}>
          <Text style={styles.jobAmount}>${job.amount.toFixed(2)}</Text>
          <View style={[styles.jobStatusBadge, { backgroundColor: getJobStatusColor(job.status) }]}>
            <Text style={styles.jobStatusText}>{job.status}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.jobDate}>{formatDate(job.createdAt)}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <SharedHeader 
        title="Contractor Details" 
        showBackButton 
        subtitle={contractor.name}
      />

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Contractor Header */}
        <View style={styles.headerCard}>
          <View style={styles.contractorAvatar}>
            <Text style={styles.avatarText}>
              {contractor.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.contractorInfo}>
            <Text style={styles.contractorName}>{contractor.name}</Text>
            <Text style={styles.contractorEmail}>{contractor.email}</Text>
            <Text style={styles.contractorPhone}>{contractor.phone}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(contractorDetails.status) }]}>
              <Text style={styles.statusText}>{contractorDetails.status}</Text>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#3B82F6' }]}>
              <Ionicons name="briefcase" size={24} color="#FFFFFF" />
              <Text style={styles.statNumber}>{stats.totalJobs}</Text>
              <Text style={styles.statLabel}>Total Jobs</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#10B981' }]}>
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.statNumber}>{stats.completedJobs}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="star" size={24} color="#FFFFFF" />
              <Text style={styles.statNumber}>{stats.averageRating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#8B5CF6' }]}>
              <Ionicons name="cash" size={24} color="#FFFFFF" />
              <Text style={styles.statNumber}>${stats.totalEarnings.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Earnings</Text>
            </View>
          </View>
        </View>

        {/* Vehicle Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Information</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Make:</Text>
            <Text style={styles.detailValue}>
              {contractor.vehicleInfo.make || 'N/A'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Model:</Text>
            <Text style={styles.detailValue}>
              {contractor.vehicleInfo.model || 'N/A'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Year:</Text>
            <Text style={styles.detailValue}>
              {contractor.vehicleInfo.year || 'N/A'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>License Plate:</Text>
            <Text style={styles.detailValue}>
              {contractor.vehicleInfo.licensePlate || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Account Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Join Date:</Text>
            <Text style={styles.detailValue}>{formatDate(stats.joinDate)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Last Active:</Text>
            <Text style={styles.detailValue}>{formatDate(stats.lastActive)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status:</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(contractorDetails.status) }]}>
              <Text style={styles.statusText}>{contractorDetails.status}</Text>
            </View>
          </View>
        </View>

        {/* Recent Jobs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Jobs</Text>
          
          <FlatList
            data={recentJobs}
            renderItem={renderJobCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Ionicons name="briefcase-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyText}>No jobs found</Text>
                <Text style={styles.emptySubtext}>
                  Jobs will appear here when the contractor accepts them
                </Text>
              </View>
            )}
          />
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: contractorDetails.status === 'active' ? '#EF4444' : '#10B981' }
            ]}
            onPress={handleStatusToggle}
          >
            <Ionicons 
              name={contractorDetails.status === 'active' ? 'pause-circle' : 'play-circle'} 
              size={20} 
              color="#FFFFFF" 
            />
            <Text style={styles.actionButtonText}>
              {contractorDetails.status === 'active' ? 'Deactivate' : 'Activate'} Contractor
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  headerCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  contractorAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contractorInfo: {
    flex: 1,
  },
  contractorName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  contractorEmail: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 2,
  },
  contractorPhone: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  statsSection: {
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.9,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
    textAlign: 'right',
  },
  jobCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  jobLocation: {
    fontSize: 12,
    color: '#6B7280',
  },
  jobMeta: {
    alignItems: 'flex-end',
  },
  jobAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 4,
  },
  jobStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  jobStatusText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  jobDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  actionsSection: {
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ContractorDetails;
