import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  TextInput,
} from 'react-native';
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
  Timestamp 
} from 'firebase/firestore';

const ContractorActivities = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [contractors, setContractors] = useState([]);
  const [filteredContractors, setFilteredContractors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [stats, setStats] = useState({
    totalContractors: 0,
    activeContractors: 0,
    totalJobs: 0,
    totalEarnings: 0,
  });

  const filters = [
    { key: 'all', label: 'All Contractors', icon: 'people-outline' },
    { key: 'active', label: 'Active', icon: 'checkmark-circle-outline' },
    { key: 'inactive', label: 'Inactive', icon: 'close-circle-outline' },
    { key: 'top', label: 'Top Performers', icon: 'trophy-outline' },
  ];

  useEffect(() => {
    fetchContractorActivities();
  }, [selectedFilter]);

  useEffect(() => {
    filterContractors();
  }, [contractors, searchQuery, selectedFilter]);

  const fetchContractorActivities = async () => {
    try {
      setLoading(true);
      
      // Fetch contractors
      const contractorsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'contractor')
      );
      
      // Fetch jobs
      const jobsQuery = query(collection(db, 'jobs'));
      
      const [contractorsSnapshot, jobsSnapshot] = await Promise.all([
        getDocs(contractorsQuery),
        getDocs(jobsQuery)
      ]);

      const contractorsData = [];
      let totalJobs = 0;
      let totalEarnings = 0;
      let activeContractors = 0;

      contractorsSnapshot.forEach(doc => {
        const contractor = doc.data();
        const contractorData = contractor.contractorData || {};
        const performance = contractorData.performance || {};
        
        // Count jobs for this contractor
        const contractorJobs = Array.from(jobsSnapshot.docs).filter(jobDoc => 
          jobDoc.data().contractorId === doc.id
        );
        
        const contractorEarnings = contractorJobs.reduce((sum, jobDoc) => {
          const job = jobDoc.data();
          return sum + (job.pricing?.total || 0);
        }, 0);

        totalJobs += contractorJobs.length;
        totalEarnings += contractorEarnings;
        
        if (contractorData.availability?.isOnline) {
          activeContractors++;
        }

        contractorsData.push({
          id: doc.id,
          name: contractor.displayName || 'Unknown',
          email: contractor.email || 'N/A',
          phone: contractor.phoneNumber || 'N/A',
          status: contractorData.availability?.isOnline ? 'active' : 'inactive',
          rating: performance.rating || 0,
          totalJobs: contractorJobs.length,
          totalEarnings: contractorEarnings,
          joinDate: contractor.createdAt,
          vehicleInfo: contractorData.vehicleInfo || {},
          location: contractorData.location || {},
          recentActivity: contractorJobs.length > 0 ? contractorJobs[0].data().createdAt : null,
        });
      });

      // Sort contractors based on filter
      let sortedContractors = contractorsData;
      if (selectedFilter === 'active') {
        sortedContractors = contractorsData.filter(c => c.status === 'active');
      } else if (selectedFilter === 'inactive') {
        sortedContractors = contractorsData.filter(c => c.status === 'inactive');
      } else if (selectedFilter === 'top') {
        sortedContractors = contractorsData
          .sort((a, b) => b.totalJobs - a.totalJobs)
          .slice(0, 10);
      }

      setContractors(sortedContractors);
      setStats({
        totalContractors: contractorsData.length,
        activeContractors: activeContractors,
        totalJobs: totalJobs,
        totalEarnings: totalEarnings,
      });

    } catch (error) {
      console.error('Error fetching contractor activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterContractors = () => {
    let filtered = contractors;

    if (searchQuery) {
      filtered = filtered.filter(contractor =>
        contractor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contractor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contractor.phone.includes(searchQuery)
      );
    }

    setFilteredContractors(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchContractorActivities().finally(() => {
      setRefreshing(false);
    });
  };

  const handleContractorPress = (contractor) => {
    navigation.navigate('ContractorDetails', { contractor });
  };

  const getStatusColor = (status) => {
    return status === 'active' ? '#10B981' : '#6B7280';
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString();
  };

  const renderContractorCard = ({ item: contractor }) => (
    <TouchableOpacity
      style={styles.contractorCard}
      onPress={() => handleContractorPress(contractor)}
    >
      <View style={styles.contractorHeader}>
        <View style={styles.contractorAvatar}>
          <Text style={styles.avatarText}>
            {contractor.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.contractorInfo}>
          <Text style={styles.contractorName}>{contractor.name}</Text>
          <Text style={styles.contractorEmail}>{contractor.email}</Text>
          <Text style={styles.contractorPhone}>{contractor.phone}</Text>
        </View>
        <View style={styles.contractorMeta}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(contractor.status) }]}>
            <Text style={styles.statusText}>{contractor.status}</Text>
          </View>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#F59E0B" />
            <Text style={styles.ratingText}>{contractor.rating.toFixed(1)}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.contractorStats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{contractor.totalJobs}</Text>
          <Text style={styles.statLabel}>Jobs</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>${contractor.totalEarnings.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Earnings</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {contractor.vehicleInfo.make || 'N/A'}
          </Text>
          <Text style={styles.statLabel}>Vehicle</Text>
        </View>
      </View>
      
      <View style={styles.contractorFooter}>
        <Text style={styles.joinDate}>
          Joined: {formatDate(contractor.joinDate)}
        </Text>
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

  return (
    <SafeAreaView style={styles.container}>
      <SharedHeader title="Contractor Activities" showBackButton />

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
              <Ionicons name="people" size={24} color="#FFFFFF" />
              <Text style={styles.statNumber}>{stats.totalContractors}</Text>
              <Text style={styles.statLabel}>Total Contractors</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#10B981' }]}>
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.statNumber}>{stats.activeContractors}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="briefcase" size={24} color="#FFFFFF" />
              <Text style={styles.statNumber}>{stats.totalJobs}</Text>
              <Text style={styles.statLabel}>Total Jobs</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#8B5CF6' }]}>
              <Ionicons name="cash" size={24} color="#FFFFFF" />
              <Text style={styles.statNumber}>${stats.totalEarnings.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Total Earnings</Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search contractors..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
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

        {/* Contractors List */}
        <View style={styles.contractorsSection}>
          <Text style={styles.sectionTitle}>
            {selectedFilter === 'all' ? 'All Contractors' : 
             selectedFilter === 'active' ? 'Active Contractors' :
             selectedFilter === 'inactive' ? 'Inactive Contractors' : 'Top Performers'}
            ({filteredContractors.length})
          </Text>
          
          <FlatList
            data={filteredContractors}
            renderItem={renderContractorCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color="#9CA3AF" />
                <Text style={styles.emptyText}>No contractors found</Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery ? 'Try adjusting your search terms' : 'Contractors will appear here when they register'}
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
  searchSection: {
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  filtersSection: {
    marginBottom: 20,
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
  contractorsSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  contractorCard: {
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
  contractorHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  contractorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contractorInfo: {
    flex: 1,
  },
  contractorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  contractorEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  contractorPhone: {
    fontSize: 14,
    color: '#6B7280',
  },
  contractorMeta: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginLeft: 4,
  },
  contractorStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  contractorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  joinDate: {
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
});

export default ContractorActivities;
