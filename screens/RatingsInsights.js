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

const RatingsInsights = ({ navigation }) => {
  const { user, userRole } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ratings, setRatings] = useState([]);
  const [filteredRatings, setFilteredRatings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [stats, setStats] = useState({
    totalRatings: 0,
    averageRating: 0,
    ratingDistribution: {},
    topRatedContractors: [],
    recentRatings: [],
  });

  const filters = [
    { key: 'all', label: 'All Ratings', icon: 'star-outline' },
    { key: '5', label: '5 Stars', icon: 'star' },
    { key: '4', label: '4 Stars', icon: 'star' },
    { key: '3', label: '3 Stars', icon: 'star' },
    { key: '2', label: '2 Stars', icon: 'star' },
    { key: '1', label: '1 Star', icon: 'star' },
  ];

  useEffect(() => {
    // Only fetch data if user is authenticated and has employee role
    if (user && userRole === 'employee') {
      fetchRatingsData();
    } else {
      setLoading(false);
    }
  }, [user, userRole]);

  useEffect(() => {
    filterRatings();
  }, [ratings, searchQuery, selectedFilter]);

  const fetchRatingsData = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated
      if (!auth.currentUser) {
        console.log('No authenticated user');
        setLoading(false);
        return;
      }
      
      // Fetch all ratings
      const ratingsQuery = query(
        collection(db, 'ratings'),
        orderBy('createdAt', 'desc')
      );
      
      // Fetch users for contractor names
      const usersQuery = query(collection(db, 'users'));
      
      const [ratingsSnapshot, usersSnapshot] = await Promise.all([
        getDocs(ratingsQuery).catch(err => {
          console.error('Error fetching ratings:', err);
          return { docs: [], size: 0 };
        }),
        getDocs(usersQuery).catch(err => {
          console.error('Error fetching users:', err);
          return { docs: [], size: 0 };
        })
      ]);

      // Create users map for quick lookup
      const usersMap = new Map();
      usersSnapshot.forEach(doc => {
        usersMap.set(doc.id, doc.data());
      });

      // Process ratings data
      const ratingsData = [];
      let totalRatingSum = 0;
      let ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const contractorRatings = new Map();

      ratingsSnapshot.forEach(doc => {
        const rating = doc.data();
        const raterUser = usersMap.get(rating.raterId);
        const ratedUser = usersMap.get(rating.ratedUserId);
        
        ratingsData.push({
          id: doc.id,
          rating: rating.rating,
          review: rating.review || 'No review provided',
          raterName: raterUser?.displayName || 'Unknown',
          raterEmail: raterUser?.email || 'N/A',
          ratedName: ratedUser?.displayName || 'Unknown',
          ratedEmail: ratedUser?.email || 'N/A',
          createdAt: rating.createdAt,
          jobId: rating.jobId || 'N/A',
        });

        // Calculate statistics
        totalRatingSum += rating.rating;
        ratingDistribution[rating.rating]++;

        // Track contractor ratings
        if (!contractorRatings.has(rating.ratedUserId)) {
          contractorRatings.set(rating.ratedUserId, []);
        }
        contractorRatings.get(rating.ratedUserId).push(rating.rating);
      });

      // Calculate top rated contractors
      const topRatedContractors = [];
      contractorRatings.forEach((ratings, contractorId) => {
        const contractor = usersMap.get(contractorId);
        if (contractor) {
          const avgRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
          topRatedContractors.push({
            id: contractorId,
            name: contractor.displayName || 'Unknown',
            email: contractor.email || 'N/A',
            averageRating: avgRating,
            totalRatings: ratings.length,
            ratings: ratings,
          });
        }
      });

      // Sort by average rating
      topRatedContractors.sort((a, b) => b.averageRating - a.averageRating);

      setRatings(ratingsData);
      setStats({
        totalRatings: ratingsData.length,
        averageRating: ratingsData.length > 0 ? totalRatingSum / ratingsData.length : 0,
        ratingDistribution: ratingDistribution,
        topRatedContractors: topRatedContractors.slice(0, 10),
        recentRatings: ratingsData.slice(0, 10),
      });

    } catch (error) {
      console.error('Error fetching ratings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterRatings = () => {
    let filtered = ratings;

    // Filter by rating value
    if (selectedFilter !== 'all') {
      const ratingValue = parseInt(selectedFilter);
      filtered = filtered.filter(rating => rating.rating === ratingValue);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(rating =>
        rating.raterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rating.ratedName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rating.review.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredRatings(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRatingsData().finally(() => {
      setRefreshing(false);
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const renderStars = (rating) => {
    return [1, 2, 3, 4, 5].map((star) => (
      <Ionicons
        key={star}
        name={star <= rating ? 'star' : 'star-outline'}
        size={16}
        color="#F59E0B"
      />
    ));
  };

  const renderRatingCard = ({ item: rating }) => (
    <View style={styles.ratingCard}>
      <View style={styles.ratingHeader}>
        <View style={styles.ratingInfo}>
          <Text style={styles.ratingTitle}>
            {rating.raterName} → {rating.ratedName}
          </Text>
          <View style={styles.starsContainer}>
            {renderStars(rating.rating)}
            <Text style={styles.ratingValue}>({rating.rating}/5)</Text>
          </View>
        </View>
        <Text style={styles.ratingDate}>{formatDate(rating.createdAt)}</Text>
      </View>
      
      <Text style={styles.ratingReview}>{rating.review}</Text>
      
      <View style={styles.ratingFooter}>
        <Text style={styles.ratingJobId}>Job ID: {rating.jobId}</Text>
        <Text style={styles.ratingEmails}>
          {rating.raterEmail} → {rating.ratedEmail}
        </Text>
      </View>
    </View>
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
        <SharedHeader title="Ratings Insights" showBackButton />
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
        <SharedHeader title="Ratings Insights" showBackButton />
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
      <SharedHeader title="Ratings Insights" showBackButton />

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
            <View style={[styles.statCard, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="star" size={24} color="#FFFFFF" />
              <Text style={styles.statNumber}>{stats.totalRatings}</Text>
              <Text style={styles.statLabel}>Total Ratings</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#10B981' }]}>
              <Ionicons name="trending-up" size={24} color="#FFFFFF" />
              <Text style={styles.statNumber}>{stats.averageRating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Average Rating</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#3B82F6' }]}>
              <Ionicons name="people" size={24} color="#FFFFFF" />
              <Text style={styles.statNumber}>{stats.topRatedContractors.length}</Text>
              <Text style={styles.statLabel}>Rated Contractors</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#8B5CF6' }]}>
              <Ionicons name="star-half" size={24} color="#FFFFFF" />
              <Text style={styles.statNumber}>{stats.ratingDistribution[5] || 0}</Text>
              <Text style={styles.statLabel}>5-Star Ratings</Text>
            </View>
          </View>
        </View>

        {/* Rating Distribution */}
        <View style={styles.distributionSection}>
          <Text style={styles.sectionTitle}>Rating Distribution</Text>
          <View style={styles.distributionGrid}>
            {[5, 4, 3, 2, 1].map((star) => (
              <View key={star} style={styles.distributionItem}>
                <View style={styles.distributionStars}>
                  {renderStars(star)}
                </View>
                <Text style={styles.distributionCount}>
                  {stats.ratingDistribution[star] || 0}
                </Text>
                <Text style={styles.distributionPercentage}>
                  {stats.totalRatings > 0 
                    ? ((stats.ratingDistribution[star] || 0) / stats.totalRatings * 100).toFixed(1)
                    : 0}%
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top Rated Contractors */}
        <View style={styles.topContractorsSection}>
          <Text style={styles.sectionTitle}>Top Rated Contractors</Text>
          {stats.topRatedContractors.slice(0, 5).map((contractor, index) => (
            <View key={contractor.id} style={styles.contractorCard}>
              <View style={styles.contractorRank}>
                <Text style={styles.rankNumber}>#{index + 1}</Text>
              </View>
              <View style={styles.contractorInfo}>
                <Text style={styles.contractorName}>{contractor.name}</Text>
                <View style={styles.contractorStats}>
                  <View style={styles.starsContainer}>
                    {renderStars(Math.round(contractor.averageRating))}
                  </View>
                  <Text style={styles.contractorRating}>
                    {contractor.averageRating.toFixed(1)} ({contractor.totalRatings} ratings)
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search ratings..."
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

        {/* Ratings List */}
        <View style={styles.ratingsSection}>
          <Text style={styles.sectionTitle}>
            {selectedFilter === 'all' ? 'All Ratings' : `${selectedFilter} Star Ratings`}
            ({filteredRatings.length})
          </Text>
          
          <FlatList
            data={filteredRatings}
            renderItem={renderRatingCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Ionicons name="star-outline" size={64} color="#9CA3AF" />
                <Text style={styles.emptyText}>No ratings found</Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery ? 'Try adjusting your search terms' : 'Ratings will appear here as customers rate contractors'}
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
  distributionSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  distributionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  distributionItem: {
    alignItems: 'center',
  },
  distributionStars: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  distributionCount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  distributionPercentage: {
    fontSize: 12,
    color: '#6B7280',
  },
  topContractorsSection: {
    marginBottom: 20,
  },
  contractorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contractorRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: 'bold',
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
  contractorStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  contractorRating: {
    fontSize: 14,
    color: '#6B7280',
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
    backgroundColor: '#F59E0B',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  ratingsSection: {
    flex: 1,
  },
  ratingCard: {
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
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  ratingInfo: {
    flex: 1,
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  ratingValue: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  ratingDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  ratingReview: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  ratingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  ratingJobId: {
    fontSize: 12,
    color: '#6B7280',
  },
  ratingEmails: {
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

export default RatingsInsights;
