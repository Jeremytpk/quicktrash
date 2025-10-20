import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import SharedHeader from '../components/SharedHeader';
import LocationService from '../services/LocationService';
import MAPS_CONFIG from '../config/mapsConfig';
import { db } from '../firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';

const { width } = Dimensions.get('window');

const EmployeeDashboard = ({ navigation }) => {
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Real Firebase data state
  const [dashboardStats, setDashboardStats] = useState({
    activeJobs: 0,
    availableDrivers: 0,
    completedToday: 0,
    revenue: 0,
    avgRating: 0,
    disputes: 0,
  });
  
  const [activeJobs, setActiveJobs] = useState([]);
  const [pendingDisputes, setPendingDisputes] = useState([]);
  const [contractors, setContractors] = useState([]);

  useEffect(() => {
    // Initialize location service for employees (with Atlanta default)
    const initLocation = async () => {
      const location = await LocationService.getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
      }
    };

    initLocation();
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch active jobs
      const activeJobsQuery = query(
        collection(db, 'jobs'),
        where('status', 'in', ['assigned', 'in_progress'])
      );
      
      // Fetch available contractors
      const contractorsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'contractor'),
        where('contractorData.availability.isOnline', '==', true)
      );
      
      // Fetch today's completed jobs
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const completedJobsQuery = query(
        collection(db, 'jobs'),
        where('status', '==', 'completed'),
        where('completedAt', '>=', Timestamp.fromDate(today))
      );
      
      // Fetch pending disputes
      const disputesQuery = query(
        collection(db, 'disputes'),
        where('status', 'in', ['pending', 'investigating'])
      );
      
      // Fetch all contractors for map
      const allContractorsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'contractor')
      );

      // Execute all queries
      const [
        activeJobsSnapshot,
        contractorsSnapshot,
        completedJobsSnapshot,
        disputesSnapshot,
        allContractorsSnapshot
      ] = await Promise.all([
        getDocs(activeJobsQuery),
        getDocs(contractorsQuery),
        getDocs(completedJobsQuery),
        getDocs(disputesQuery),
        getDocs(allContractorsQuery)
      ]);

      // Process active jobs
      const jobsData = [];
      activeJobsSnapshot.forEach(doc => {
        const job = doc.data();
        jobsData.push({
          id: doc.id,
          customer: job.customerId, // Will need to fetch customer name separately
          contractor: job.contractorId, // Will need to fetch contractor name separately
          type: job.wasteType,
          status: job.status === 'assigned' ? 'Assigned' : 'In Progress',
          location: job.pickupAddress?.coordinates || { latitude: 33.7490, longitude: -84.3880 },
          startTime: job.startedAt ? new Date(job.startedAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Not started',
          estimatedCompletion: job.estimatedCompletion || 'TBD',
        });
      });
      setActiveJobs(jobsData);

      // Process contractors for map
      const contractorsData = [];
      allContractorsSnapshot.forEach(doc => {
        const contractor = doc.data();
        if (contractor.contractorData?.availability?.currentLocation) {
          contractorsData.push({
            id: doc.id,
            name: contractor.displayName || 'Unknown',
            status: contractor.contractorData.availability.isOnline ? 'Online' : 'Offline',
            rating: contractor.contractorData.performance?.rating || 0,
            jobsToday: contractor.contractorData.performance?.totalJobs || 0,
            earnings: `$${contractor.contractorData.performance?.totalEarnings || 0}`,
            location: contractor.contractorData.availability.currentLocation,
          });
        }
      });
      setContractors(contractorsData);

      // Process disputes
      const disputesData = [];
      disputesSnapshot.forEach(doc => {
        const dispute = doc.data();
        disputesData.push({
          id: doc.id,
          customer: dispute.customerId, // Will need to fetch customer name separately
          contractor: dispute.contractorId, // Will need to fetch contractor name separately
          issue: dispute.issue.replace(/_/g, ' '),
          priority: dispute.priority || 'Medium',
          createdAt: dispute.createdAt ? new Date(dispute.createdAt.seconds * 1000).toLocaleString() : 'Unknown',
        });
      });
      setPendingDisputes(disputesData);

      // Calculate dashboard stats
      const totalRevenue = await calculateTotalRevenue();
      const avgRating = await calculateAverageRating();
      
      setDashboardStats({
        activeJobs: activeJobsSnapshot.size,
        availableDrivers: contractorsSnapshot.size,
        completedToday: completedJobsSnapshot.size,
        revenue: totalRevenue,
        avgRating: avgRating,
        disputes: disputesSnapshot.size,
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalRevenue = async () => {
    try {
      const jobsQuery = query(
        collection(db, 'jobs'),
        where('status', '==', 'completed')
      );
      const snapshot = await getDocs(jobsQuery);
      
      let totalRevenue = 0;
      snapshot.forEach(doc => {
        const job = doc.data();
        if (job.pricing?.total) {
          totalRevenue += job.pricing.total;
        }
      });
      
      return totalRevenue;
    } catch (error) {
      console.error('Error calculating revenue:', error);
      return 0;
    }
  };

  const calculateAverageRating = async () => {
    try {
      const ratingsQuery = query(collection(db, 'ratings'));
      const snapshot = await getDocs(ratingsQuery);
      
      if (snapshot.empty) return 0;
      
      let totalRating = 0;
      let count = 0;
      
      snapshot.forEach(doc => {
        const rating = doc.data();
        if (rating.rating) {
          totalRating += rating.rating;
          count++;
        }
      });
      
      return count > 0 ? totalRating / count : 0;
    } catch (error) {
      console.error('Error calculating average rating:', error);
      return 0;
    }
  };

  const handleDisputePress = (dispute) => {
    setSelectedDispute(dispute);
    setShowDisputeModal(true);
  };

  const handleResolveDispute = () => {
    setShowDisputeModal(false);
    setSelectedDispute(null);
  };

  // Quick Actions handlers
  const handleApproveDriver = () => {
    navigation.navigate('UserManagement');
  };

  const handleSendBroadcast = () => {
    // For now, show an alert. Later this could navigate to a broadcast screen
    alert('Broadcast feature coming soon!');
  };

  const handleViewReports = () => {
    navigation.navigate('Analytics');
  };

  const handleManagePartners = () => {
    navigation.navigate('AdminTools');
  };

  return (
    <View style={styles.container}>
      <SharedHeader 
        title="Admin Dashboard"
        subtitle="QuickTrash Operations"
        showBackButton={false}
        rightComponent={
          <TouchableOpacity style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={24} color="#333" />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Overview Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#34A853' }]}>
              <Ionicons name="briefcase" size={24} color="#FFFFFF" />
              <Text style={styles.statNumber}>{dashboardStats.activeJobs}</Text>
              <Text style={styles.statLabel}>Active Jobs</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#1E88E5' }]}>
              <Ionicons name="people" size={24} color="#FFFFFF" />
              <Text style={styles.statNumber}>{dashboardStats.availableDrivers}</Text>
              <Text style={styles.statLabel}>Available Drivers</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FF8F00' }]}>
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.statNumber}>{dashboardStats.completedToday}</Text>
              <Text style={styles.statLabel}>Completed Today</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#9C27B0' }]}>
              <Ionicons name="cash" size={24} color="#FFFFFF" />
              <Text style={styles.statNumber}>${dashboardStats.revenue.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Revenue</Text>
            </View>
          </View>
        </View>

        {/* Live Map */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Live Job Tracking</Text>
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              provider="google"
              initialRegion={MAPS_CONFIG.DEFAULT_REGION}
              customMapStyle={MAPS_CONFIG.MAP_STYLE}
              mapType="standard"
            >
              {activeJobs.map((job) => (
                <Marker
                  key={job.id}
                  coordinate={job.location}
                  title={`${job.contractor} - ${job.type}`}
                  description={job.status}
                  pinColor={job.status === 'In Progress' ? MAPS_CONFIG.MARKERS.JOB.color : MAPS_CONFIG.MARKERS.CONTRACTOR.color}
                />
              ))}
              {contractors.map((contractor) => (
                <Marker
                  key={`contractor-${contractor.id}`}
                  coordinate={contractor.location}
                  title={contractor.name}
                  description={`${contractor.status} - Rating: ${contractor.rating}`}
                  pinColor={contractor.status === 'Online' ? MAPS_CONFIG.MARKERS.CONTRACTOR.color : '#FF5722'}
                />
              ))}
            </MapView>
          </View>
        </View>

        {/* Active Jobs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Jobs</Text>
          {activeJobs.map((job) => (
            <View key={job.id} style={styles.jobCard}>
              <View style={styles.jobHeader}>
                <View style={styles.jobInfo}>
                  <Text style={styles.jobCustomer}>{job.customer}</Text>
                  <Text style={styles.jobType}>{job.type}</Text>
                  <Text style={styles.jobContractor}>Driver: {job.contractor}</Text>
                </View>
                <View style={styles.jobStatus}>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: job.status === 'In Progress' ? '#FF8F00' : '#34A853' }
                  ]}>
                    <Text style={styles.statusText}>{job.status}</Text>
                  </View>
                  <Text style={styles.jobTime}>Started: {job.startTime}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Disputes Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pending Disputes</Text>
            <View style={styles.disputeBadge}>
              <Text style={styles.disputeCount}>{pendingDisputes.length}</Text>
            </View>
          </View>
          {pendingDisputes.map((dispute) => (
            <TouchableOpacity
              key={dispute.id}
              style={styles.disputeCard}
              onPress={() => handleDisputePress(dispute)}
            >
              <View style={styles.disputeHeader}>
                <View style={styles.disputeInfo}>
                  <Text style={styles.disputeIssue}>{dispute.issue}</Text>
                  <Text style={styles.disputeParties}>
                    {dispute.customer} vs {dispute.contractor}
                  </Text>
                  <Text style={styles.disputeTime}>{dispute.createdAt}</Text>
                </View>
                <View style={styles.disputePriority}>
                  <View style={[
                    styles.priorityBadge,
                    { backgroundColor: dispute.priority === 'High' ? '#EF4444' : '#FF8F00' }
                  ]}>
                    <Text style={styles.priorityText}>{dispute.priority}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={handleApproveDriver}>
              <Ionicons name="person-add" size={32} color="#34A853" />
              <Text style={styles.actionText}>Approve Driver</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={handleSendBroadcast}>
              <Ionicons name="chatbubbles" size={32} color="#1E88E5" />
              <Text style={styles.actionText}>Send Broadcast</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={handleViewReports}>
              <Ionicons name="bar-chart" size={32} color="#FF8F00" />
              <Text style={styles.actionText}>View Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={handleManagePartners}>
              <Ionicons name="business" size={32} color="#9C27B0" />
              <Text style={styles.actionText}>Manage Partners</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Dispute Resolution Modal */}
      <Modal
        visible={showDisputeModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDisputeModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Dispute Resolution</Text>
            <TouchableOpacity onPress={() => setShowDisputeModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {selectedDispute && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.disputeDetails}>
                <Text style={styles.disputeModalIssue}>{selectedDispute.issue}</Text>
                <Text style={styles.disputeModalParties}>
                  Customer: {selectedDispute.customer}
                </Text>
                <Text style={styles.disputeModalParties}>
                  Contractor: {selectedDispute.contractor}
                </Text>
                <Text style={styles.disputeModalTime}>
                  Reported: {selectedDispute.createdAt}
                </Text>
              </View>

              <View style={styles.resolutionActions}>
                <TouchableOpacity style={styles.resolutionButton}>
                  <Text style={styles.resolutionButtonText}>Contact Customer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.resolutionButton}>
                  <Text style={styles.resolutionButtonText}>Contact Contractor</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.resolutionButton, styles.resolveButton]}
                  onPress={handleResolveDispute}
                >
                  <Text style={styles.resolveButtonText}>Mark as Resolved</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  settingsButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 60) / 2,
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
    fontSize: 24,
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
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  map: {
    flex: 1,
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
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  jobInfo: {
    flex: 1,
  },
  jobCustomer: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  jobType: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  jobContractor: {
    fontSize: 14,
    color: '#374151',
  },
  jobStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  jobTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  disputeBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  disputeCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  disputeCard: {
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
  disputeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  disputeInfo: {
    flex: 1,
  },
  disputeIssue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  disputeParties: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  disputeTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  disputePriority: {
    alignItems: 'flex-end',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  priorityText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
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
  actionText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
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
  disputeDetails: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disputeModalIssue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  disputeModalParties: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
  },
  disputeModalTime: {
    fontSize: 14,
    color: '#6B7280',
  },
  resolutionActions: {
    gap: 12,
  },
  resolutionButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  resolutionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  resolveButton: {
    backgroundColor: '#34A853',
    borderColor: '#34A853',
  },
  resolveButtonText: {
    color: '#FFFFFF',
  },
});

export default EmployeeDashboard;
