import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SharedHeader from '../components/SharedHeader';
import { db, auth } from '../firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';
import { useUser } from '../contexts/UserContext';

const Activities = ({ navigation }) => {
  const { user, userRole } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activities, setActivities] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [stats, setStats] = useState({
    totalActivities: 0,
    todayActivities: 0,
    totalEarnings: 0,
    activeContractors: 0,
  });

  const filters = [
    { key: 'all', label: 'All Activities', icon: 'list-outline' },
    { key: 'jobs', label: 'Job Activities', icon: 'briefcase-outline' },
    { key: 'financial', label: 'Financial', icon: 'cash-outline' },
    { key: 'today', label: 'Today', icon: 'today-outline' },
  ];

  useEffect(() => {
    // Only fetch data if user is authenticated and has employee role
    if (user && userRole === 'employee') {
      fetchActivitiesData();
    } else {
      setLoading(false);
    }
  }, [selectedFilter, user, userRole]);

  const fetchActivitiesData = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated
      if (!auth.currentUser) {
        console.log('No authenticated user');
        setLoading(false);
        return;
      }
      
      // Fetch jobs data
      const jobsQuery = query(
        collection(db, 'jobs'),
        orderBy('createdAt', 'desc')
      );
      
      // Fetch users (contractors) - use both role and legacy flags
      const contractorsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'contractor')
      );
      
      // Fetch ratings
      const ratingsQuery = query(
        collection(db, 'ratings'),
        orderBy('createdAt', 'desc')
      );

      const [jobsSnapshot, contractorsSnapshot, ratingsSnapshot] = await Promise.all([
        getDocs(jobsQuery).catch(err => {
          console.error('Error fetching jobs:', err);
          return { docs: [], size: 0 };
        }),
        getDocs(contractorsQuery).catch(err => {
          console.error('Error fetching contractors:', err);
          return { docs: [], size: 0 };
        }),
        getDocs(ratingsQuery).catch(err => {
          console.error('Error fetching ratings:', err);
          return { docs: [], size: 0 };
        })
      ]);

      // Process activities data
      const activitiesData = [];
      
      // Add job activities
      jobsSnapshot.forEach(doc => {
        const job = doc.data();
        activitiesData.push({
          id: doc.id,
          type: 'job',
          title: `${job.wasteType} Pickup`,
          description: `Job ${doc.id} - ${job.status}`,
          contractorId: job.contractorId,
          customerId: job.customerId,
          amount: job.pricing?.total || 0,
          status: job.status,
          createdAt: job.createdAt,
          location: job.pickupAddress?.street || 'Unknown Location',
          wasteType: job.wasteType,
        });
      });

      // Add rating activities
      ratingsSnapshot.forEach(doc => {
        const rating = doc.data();
        activitiesData.push({
          id: doc.id,
          type: 'rating',
          title: 'Job Rating',
          description: `${rating.rating} stars - ${rating.review || 'No review'}`,
          contractorId: rating.ratedUserId,
          customerId: rating.raterId,
          amount: 0,
          status: 'completed',
          createdAt: rating.createdAt,
          rating: rating.rating,
          review: rating.review,
        });
      });

      // Sort by creation date
      activitiesData.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });

      // Filter activities based on selected filter
      let filteredActivities = activitiesData;
      if (selectedFilter === 'jobs') {
        filteredActivities = activitiesData.filter(activity => activity.type === 'job');
      } else if (selectedFilter === 'financial') {
        filteredActivities = activitiesData.filter(activity => activity.amount > 0);
      } else if (selectedFilter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filteredActivities = activitiesData.filter(activity => {
          const activityDate = new Date(activity.createdAt?.seconds * 1000);
          return activityDate >= today;
        });
      }

      setActivities(filteredActivities);

      // Calculate stats
      const totalEarnings = activitiesData
        .filter(activity => activity.amount > 0)
        .reduce((sum, activity) => sum + activity.amount, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayActivities = activitiesData.filter(activity => {
        const activityDate = new Date(activity.createdAt?.seconds * 1000);
        return activityDate >= today;
      }).length;

      setStats({
        totalActivities: activitiesData.length,
        todayActivities: todayActivities,
        totalEarnings: totalEarnings,
        activeContractors: contractorsSnapshot.size,
      });

    } catch (error) {
      console.error('Error fetching activities data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchActivitiesData().finally(() => {
      setRefreshing(false);
    });
  };

  const handleActivityPress = (activity) => {
    navigation.navigate('ActivityDetails', { activity });
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'job': return 'briefcase';
      case 'rating': return 'star';
      case 'financial': return 'cash';
      default: return 'list';
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'job': return '#3B82F6';
      case 'rating': return '#F59E0B';
      case 'financial': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'in_progress': return '#F59E0B';
      case 'pending': return '#6B7280';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const renderActivityCard = ({ item: activity }) => (
    <TouchableOpacity
      style={styles.activityCard}
      onPress={() => handleActivityPress(activity)}
    >
      <View style={styles.activityHeader}>
        <View style={styles.activityIconContainer}>
          <Ionicons 
            name={getActivityIcon(activity.type)} 
            size={24} 
            color={getActivityColor(activity.type)} 
          />
        </View>
        <View style={styles.activityInfo}>
          <Text style={styles.activityTitle}>{activity.title}</Text>
          <Text style={styles.activityDescription}>{activity.description}</Text>
          <Text style={styles.activityLocation}>{activity.location}</Text>
        </View>
        <View style={styles.activityMeta}>
          {activity.amount > 0 && (
            <Text style={styles.activityAmount}>${activity.amount.toFixed(2)}</Text>
          )}
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(activity.status) }]}>
            <Text style={styles.statusText}>{activity.status}</Text>
          </View>
        </View>
      </View>
      <View style={styles.activityFooter}>
        <Text style={styles.activityDate}>{formatDate(activity.createdAt)}</Text>
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );

  const renderFilterButton = (filter) => (
    <TouchableOpacity
      key={filter.key}
      style={[
        styles.filterButton,
        selectedFilter === filter.key && styles.activeFilterButton
      ]}
      onPress={() => setSelectedFilter(filter.key)}
    >
      <Ionicons 
        name={filter.icon} 
        size={16} 
        color={selectedFilter === filter.key ? '#FFFFFF' : '#6B7280'} 
      />
      <Text style={[
        styles.filterText,
        selectedFilter === filter.key && styles.activeFilterText
      ]}>
        {filter.label}
      </Text>
    </TouchableOpacity>
  );

  // Show access denied message if user is not an employee
  if (user && userRole !== 'employee') {
    return (
      <SafeAreaView style={styles.container}>
        <SharedHeader title="Activities" showBackButton />
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
      <SafeAreaView style={styles.container}>
        <SharedHeader title="Activities" showBackButton />
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
    <SafeAreaView style={styles.container}>
      <SharedHeader title="Activities" showBackButton />

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#3B82F6' }]}>
              <Ionicons name="list" size={24} color="#FFFFFF" />
              <Text style={styles.statNumber}>{stats.totalActivities}</Text>
              <Text style={styles.statLabel}>Total Activities</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#10B981' }]}>
              <Ionicons name="today" size={24} color="#FFFFFF" />
              <Text style={styles.statNumber}>{stats.todayActivities}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="cash" size={24} color="#FFFFFF" />
              <Text style={styles.statNumber}>${stats.totalEarnings.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Total Earnings</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#8B5CF6' }]}>
              <Ionicons name="people" size={24} color="#FFFFFF" />
              <Text style={styles.statNumber}>{stats.activeContractors}</Text>
              <Text style={styles.statLabel}>Active Contractors</Text>
            </View>
          </View>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filtersSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filtersContainer}>
              {filters.map(renderFilterButton)}
            </View>
          </ScrollView>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('ContractorActivities')}
            >
              <Ionicons name="people" size={32} color="#3B82F6" />
              <Text style={styles.quickActionText}>Contractor Activities</Text>
              <Text style={styles.quickActionSubtext}>View all contractor activities</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('FinancialOperations')}
            >
              <Ionicons name="cash" size={32} color="#10B981" />
              <Text style={styles.quickActionText}>Financial Operations</Text>
              <Text style={styles.quickActionSubtext}>View money operations</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('RatingsInsights')}
            >
              <Ionicons name="star" size={32} color="#F59E0B" />
              <Text style={styles.quickActionText}>Ratings Insights</Text>
              <Text style={styles.quickActionSubtext}>View ratings & reviews</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Activities List */}
        <View style={styles.activitiesSection}>
          <Text style={styles.sectionTitle}>
            {selectedFilter === 'all' ? 'All Activities' : 
             selectedFilter === 'jobs' ? 'Job Activities' :
             selectedFilter === 'financial' ? 'Financial Activities' : 'Today\'s Activities'}
          </Text>
          
          <FlatList
            data={activities}
            renderItem={renderActivityCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Ionicons name="list-outline" size={64} color="#9CA3AF" />
                <Text style={styles.emptyText}>No activities found</Text>
                <Text style={styles.emptySubtext}>
                  Activities will appear here as contractors complete jobs
                </Text>
              </View>
            )}
          />
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
  filtersSection: {
    marginBottom: 20,
  },
  quickActionsSection: {
    marginBottom: 20,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: '30%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
    textAlign: 'center',
  },
  quickActionSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  activeFilterButton: {
    backgroundColor: '#3B82F6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  activitiesSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  activityCard: {
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
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  activityLocation: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  activityMeta: {
    alignItems: 'flex-end',
  },
  activityAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  activityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  activityDate: {
    fontSize: 12,
    color: '#9CA3AF',
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

export default Activities;
