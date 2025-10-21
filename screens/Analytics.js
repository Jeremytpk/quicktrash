import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SharedHeader from '../components/SharedHeader';
import { db, auth } from '../firebaseConfig';
import { collection, query, getDocs, where, Timestamp } from 'firebase/firestore';
import { useUser } from '../contexts/UserContext';

const { width } = Dimensions.get('window');

const Analytics = ({ navigation }) => {
  const { user, userRole } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({
    totalJobs: 0,
    totalRevenue: 0,
    avgJobPrice: 0,
    jobsByStatus: {},
    topDrivers: [],
  });
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showDriverModal, setShowDriverModal] = useState(false);

  // Mock data for a clean, text-based display
  const mockData = {
    totalJobs: 150,
    totalRevenue: 5000,
    avgJobPrice: 33.33,
    jobsByStatus: {
      completed: 75,
      'in_progress': 15,
      'pending': 10,
      'cancelled': 5
    },
    topDrivers: [
      { 
        id: 'driver1',
        name: 'Mike Davis', 
        rating: 4.8, 
        jobs: 35,
        status: 'Online',
        earnings: '$1200',
        phone: '555-1234',
        email: 'mike.davis@quicktrash.com'
      },
      { 
        id: 'driver2',
        name: 'Lisa Chen', 
        rating: 4.9, 
        jobs: 40,
        status: 'On Job',
        earnings: '$1500',
        phone: '555-5678',
        email: 'lisa.chen@quicktrash.com'
      },
      { 
        id: 'driver3',
        name: 'Mark Wilson', 
        rating: 4.5, 
        jobs: 28,
        status: 'Offline',
        earnings: '$950',
        phone: '555-9012',
        email: 'mark.wilson@quicktrash.com'
      },
    ],
  };

  useEffect(() => {
    // Only fetch data if user is authenticated and has employee role
    if (user && userRole === 'employee') {
      fetchAnalyticsData();
    } else {
      setLoading(false);
    }
  }, [user, userRole]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated
      if (!auth.currentUser) {
        console.log('No authenticated user');
        setLoading(false);
        return;
      }
      
      // Fetch all jobs
      const jobsQuery = query(collection(db, 'jobs'));
      const jobsSnapshot = await getDocs(jobsQuery).catch(err => {
        console.error('Error fetching jobs:', err);
        return { docs: [], size: 0 };
      });
      
      // Fetch all contractors - try both role and legacy flags
      const contractorsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'contractor')
      );
      const contractorsSnapshot = await getDocs(contractorsQuery).catch(err => {
        console.error('Error fetching contractors:', err);
        return { docs: [], size: 0 };
      });
      
      // Fetch all ratings
      const ratingsQuery = query(collection(db, 'ratings'));
      const ratingsSnapshot = await getDocs(ratingsQuery).catch(err => {
        console.error('Error fetching ratings:', err);
        return { docs: [], size: 0 };
      });
      
      // Process jobs data
      let totalRevenue = 0;
      let jobsByStatus = {
        completed: 0,
        in_progress: 0,
        pending: 0,
        cancelled: 0
      };
      
      jobsSnapshot.forEach(doc => {
        const job = doc.data();
        
        // Calculate revenue
        if (job.pricing?.total) {
          totalRevenue += job.pricing.total;
        }
        
        // Count by status
        const status = job.status || 'pending';
        if (jobsByStatus.hasOwnProperty(status)) {
          jobsByStatus[status]++;
        }
      });
      
      // Process contractors data with ratings integration
      const topDrivers = [];
      const ratingsMap = new Map();
      
      // Create a map of ratings by contractor
      ratingsSnapshot.forEach(doc => {
        const rating = doc.data();
        const contractorId = rating.ratedUserId;
        if (!ratingsMap.has(contractorId)) {
          ratingsMap.set(contractorId, []);
        }
        ratingsMap.get(contractorId).push(rating.rating || 0);
      });
      
      contractorsSnapshot.forEach(doc => {
        const contractor = doc.data();
        const performance = contractor.contractorData?.performance;
        const contractorRatings = ratingsMap.get(doc.id) || [];
        
        // Calculate average rating from actual ratings data
        const avgRating = contractorRatings.length > 0 
          ? contractorRatings.reduce((sum, rating) => sum + rating, 0) / contractorRatings.length
          : (performance?.rating || 0);
        
        topDrivers.push({
          id: doc.id,
          name: contractor.displayName || 'Unknown Driver',
          rating: avgRating,
          jobs: performance?.totalJobs || 0,
          status: contractor.contractorData?.availability?.isOnline ? 'Online' : 'Offline',
          earnings: `$${performance?.totalEarnings || 0}`,
          phone: contractor.phoneNumber || 'N/A',
          email: contractor.email || 'N/A',
          totalRatings: contractorRatings.length,
          recentRatings: contractorRatings.slice(-5) // Last 5 ratings
        });
      });
      
      // Sort by jobs completed (descending)
      topDrivers.sort((a, b) => b.jobs - a.jobs);
      
      // Calculate average job price
      const avgJobPrice = jobsSnapshot.size > 0 ? totalRevenue / jobsSnapshot.size : 0;
      
      const realAnalyticsData = {
        totalJobs: jobsSnapshot.size,
        totalRevenue: totalRevenue,
        avgJobPrice: avgJobPrice,
        jobsByStatus: jobsByStatus,
        topDrivers: topDrivers.slice(0, 10) // Top 10 drivers
      };
      
      setAnalyticsData(realAnalyticsData);
      
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      // Fallback to mock data if Firebase fails
      setAnalyticsData(mockData);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalyticsData().finally(() => {
      setRefreshing(false);
    });
  };

  const handleDriverPress = (driver) => {
    setSelectedDriver(driver);
    setShowDriverModal(true);
  };
  
  const formattedStats = {
    totalJobs: analyticsData.totalJobs.toLocaleString(),
    totalRevenue: `$${analyticsData.totalRevenue.toFixed(2).toLocaleString()}`,
    avgJobPrice: `$${analyticsData.avgJobPrice.toFixed(2)}`,
    completedJobs: analyticsData.jobsByStatus.completed || 0,
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FF8F00';
      case 'in_progress': return '#1E88E5';
      case 'completed': return '#34A853';
      case 'cancelled': return '#EF4444';
      default: return '#9CA3AF';
    }
  };

  // Show access denied message if user is not an employee
  if (user && userRole !== 'employee') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <SharedHeader title="Business Analytics" showBackButton />
        <View style={styles.accessDeniedContainer}>
          <Ionicons name="lock-closed" size={64} color="#9CA3AF" />
          <Text style={styles.accessDeniedTitle}>Access Restricted</Text>
          <Text style={styles.accessDeniedText}>
            This feature is only available to employees. Please contact your administrator if you believe this is an error.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading or not authenticated message
  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <SharedHeader title="Business Analytics" showBackButton />
        <View style={styles.accessDeniedContainer}>
          <Ionicons name="person-circle-outline" size={64} color="#9CA3AF" />
          <Text style={styles.accessDeniedTitle}>Authentication Required</Text>
          <Text style={styles.accessDeniedText}>
            Please log in to access this feature.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader
        title="Business Analytics"
        subtitle="Performance Dashboard"
        showBackButton={true}
        rightComponent={
          <TouchableOpacity onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color="#333" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading Analytics...</Text>
          </View>
        ) : (
          <>
            {/* KPI Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
              <View style={styles.kpiGrid}>
                <View style={[styles.kpiCard, { backgroundColor: '#34A853' }]}>
                  <Ionicons name="briefcase-outline" size={24} color="#FFFFFF" />
                  <Text style={styles.kpiValue}>{formattedStats.totalJobs}</Text>
                  <Text style={styles.kpiLabel}>Total Jobs</Text>
                </View>
                <View style={[styles.kpiCard, { backgroundColor: '#1E88E5' }]}>
                  <Ionicons name="cash-outline" size={24} color="#FFFFFF" />
                  <Text style={styles.kpiValue}>{formattedStats.totalRevenue}</Text>
                  <Text style={styles.kpiLabel}>Total Revenue</Text>
                </View>
                <View style={[styles.kpiCard, { backgroundColor: '#FF8F00' }]}>
                  <Ionicons name="calculator-outline" size={24} color="#FFFFFF" />
                  <Text style={styles.kpiValue}>{formattedStats.avgJobPrice}</Text>
                  <Text style={styles.kpiLabel}>Avg. Job Price</Text>
                </View>
                <View style={[styles.kpiCard, { backgroundColor: '#9C27B0' }]}>
                  <Ionicons name="checkmark-done-circle-outline" size={24} color="#FFFFFF" />
                  <Text style={styles.kpiValue}>{formattedStats.completedJobs}</Text>
                  <Text style={styles.kpiLabel}>Jobs Completed</Text>
                </View>
              </View>
            </View>

            {/* Jobs by Status Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Jobs by Status</Text>
              <View style={styles.statusGrid}>
                {Object.keys(analyticsData.jobsByStatus).map((status) => (
                  <View key={status} style={styles.statusCard}>
                    <View style={[styles.statusColor, { backgroundColor: getStatusColor(status) }]} />
                    <View style={styles.statusInfo}>
                      <Text style={styles.statusLabel}>{status.replace('_', ' ')}</Text>
                      <Text style={styles.statusCount}>{analyticsData.jobsByStatus[status]}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Top Drivers Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top Drivers</Text>
              {(analyticsData.topDrivers || []).map((driver) => (
                <TouchableOpacity
                  key={driver.id}
                  style={styles.driverCard}
                  onPress={() => handleDriverPress(driver)}
                >
                  <Ionicons name="person-circle-outline" size={28} color="#1F2937" />
                  <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>{driver.name}</Text>
                    <Text style={styles.driverStats}>
                      <Ionicons name="star" size={14} color="#FFB300" /> {driver.rating} Rating · {driver.jobs} Jobs
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Driver Details Modal */}
      <Modal
        visible={showDriverModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDriverModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Driver Details</Text>
            <TouchableOpacity onPress={() => setShowDriverModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          {selectedDriver && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.driverDetailsCard}>
                <Ionicons name="person-circle-outline" size={64} color="#1F2937" style={styles.driverAvatar} />
                <Text style={styles.driverNameBig}>{selectedDriver.name}</Text>
                <Text style={styles.driverStatusBig}>
                  <Ionicons name="checkmark-circle" size={16} color="#34A853" /> {selectedDriver.status}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailHeader}>Performance</Text>
                <View style={styles.performanceRow}>
                  <Ionicons name="star" size={18} color="#FFB300" />
                  <Text style={styles.performanceLabel}>Rating:</Text>
                  <Text style={styles.performanceValue}>{selectedDriver.rating}</Text>
                </View>
                <View style={styles.performanceRow}>
                  <Ionicons name="briefcase" size={18} color="#34A853" />
                  <Text style={styles.performanceLabel}>Jobs Completed:</Text>
                  <Text style={styles.performanceValue}>{selectedDriver.jobs}</Text>
                </View>
                <View style={styles.performanceRow}>
                  <Ionicons name="cash" size={18} color="#1E88E5" />
                  <Text style={styles.performanceLabel}>Total Earnings:</Text>
                  <Text style={styles.performanceValue}>{selectedDriver.earnings}</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailHeader}>Contact Information</Text>
                <View style={styles.performanceRow}>
                  <Ionicons name="call" size={18} color="#6B7280" />
                  <Text style={styles.performanceLabel}>Phone:</Text>
                  <Text style={styles.performanceValue}>{selectedDriver.phone}</Text>
                </View>
                <View style={styles.performanceRow}>
                  <Ionicons name="mail" size={18} color="#6B7280" />
                  <Text style={styles.performanceLabel}>Email:</Text>
                  <Text style={styles.performanceValue}>{selectedDriver.email}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.contactButton} onPress={() => Alert.alert('Simulating Contact', `Calling ${selectedDriver.name}`)}>
                <Ionicons name="call" size={20} color="#FFFFFF" />
                <Text style={styles.contactButtonText}>Call Driver</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.contactButton, { backgroundColor: '#FF8F00' }]} onPress={() => Alert.alert('Simulating Contact', `Messaging ${selectedDriver.name}`)}>
                <Ionicons name="chatbubbles" size={20} color="#FFFFFF" />
                <Text style={styles.contactButtonText}>Message Driver</Text>
              </TouchableOpacity>

            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 300,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  kpiCard: {
    width: (width - 60) / 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 4,
    opacity: 0.9,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statusCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  driverInfo: {
    marginLeft: 12,
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  driverStats: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  // Modal Styles
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
  driverDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  driverAvatar: {
    marginBottom: 10,
  },
  driverNameBig: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  driverStatusBig: {
    fontSize: 16,
    color: '#34A853',
    fontWeight: 'bold',
    marginTop: 4,
  },
  detailSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
  },
  performanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  performanceLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
  },
  performanceValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E88E5',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  accessDeniedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default Analytics;