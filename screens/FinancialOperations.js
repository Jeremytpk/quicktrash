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

const FinancialOperations = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalPayouts: 0,
    platformFee: 0,
    netProfit: 0,
    todayRevenue: 0,
    thisWeekRevenue: 0,
    thisMonthRevenue: 0,
  });

  const filters = [
    { key: 'all', label: 'All Transactions', icon: 'list-outline' },
    { key: 'revenue', label: 'Revenue', icon: 'trending-up-outline' },
    { key: 'payouts', label: 'Payouts', icon: 'trending-down-outline' },
    { key: 'fees', label: 'Platform Fees', icon: 'card-outline' },
  ];

  const dateRanges = [
    { key: 'all', label: 'All Time' },
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
  ];

  useEffect(() => {
    fetchFinancialData();
  }, [selectedFilter, dateRange]);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchQuery, selectedFilter, dateRange]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      
      // Fetch jobs for revenue data
      const jobsQuery = query(
        collection(db, 'jobs'),
        orderBy('createdAt', 'desc')
      );
      
      // Fetch users for contractor data
      const contractorsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'contractor')
      );
      
      const [jobsSnapshot, contractorsSnapshot] = await Promise.all([
        getDocs(jobsQuery),
        getDocs(contractorsQuery)
      ]);

      const transactionsData = [];
      let totalRevenue = 0;
      let totalPayouts = 0;
      let platformFee = 0;
      let todayRevenue = 0;
      let thisWeekRevenue = 0;
      let thisMonthRevenue = 0;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Process job transactions
      jobsSnapshot.forEach(doc => {
        const job = doc.data();
        const jobAmount = job.pricing?.total || 0;
        const serviceFee = job.pricing?.serviceFee || 0;
        const contractorPayout = job.pricing?.contractorPayout || 0;
        const jobDate = new Date(job.createdAt?.seconds * 1000);

        totalRevenue += jobAmount;
        totalPayouts += contractorPayout;
        platformFee += serviceFee;

        // Calculate date-based revenue
        if (jobDate >= today) {
          todayRevenue += jobAmount;
        }
        if (jobDate >= weekStart) {
          thisWeekRevenue += jobAmount;
        }
        if (jobDate >= monthStart) {
          thisMonthRevenue += jobAmount;
        }

        // Add revenue transaction
        transactionsData.push({
          id: `revenue-${doc.id}`,
          type: 'revenue',
          amount: jobAmount,
          description: `${job.wasteType} Pickup - Job ${doc.id}`,
          customerId: job.customerId,
          contractorId: job.contractorId,
          jobId: doc.id,
          createdAt: job.createdAt,
          status: job.status,
          wasteType: job.wasteType,
          location: job.pickupAddress?.street || 'Unknown Location',
        });

        // Add payout transaction
        if (contractorPayout > 0) {
          transactionsData.push({
            id: `payout-${doc.id}`,
            type: 'payout',
            amount: -contractorPayout,
            description: `Contractor Payout - Job ${doc.id}`,
            customerId: job.customerId,
            contractorId: job.contractorId,
            jobId: doc.id,
            createdAt: job.createdAt,
            status: job.status,
            wasteType: job.wasteType,
            location: job.pickupAddress?.street || 'Unknown Location',
          });
        }

        // Add platform fee transaction
        if (serviceFee > 0) {
          transactionsData.push({
            id: `fee-${doc.id}`,
            type: 'fee',
            amount: serviceFee,
            description: `Platform Fee - Job ${doc.id}`,
            customerId: job.customerId,
            contractorId: job.contractorId,
            jobId: doc.id,
            createdAt: job.createdAt,
            status: job.status,
            wasteType: job.wasteType,
            location: job.pickupAddress?.street || 'Unknown Location',
          });
        }
      });

      // Sort transactions by date
      transactionsData.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });

      setTransactions(transactionsData);
      setStats({
        totalRevenue: totalRevenue,
        totalPayouts: totalPayouts,
        platformFee: platformFee,
        netProfit: totalRevenue - totalPayouts,
        todayRevenue: todayRevenue,
        thisWeekRevenue: thisWeekRevenue,
        thisMonthRevenue: thisMonthRevenue,
      });

    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = transactions;

    // Filter by type
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(transaction => transaction.type === selectedFilter);
    }

    // Filter by date range
    if (dateRange !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = null;
      }
      
      if (startDate) {
        filtered = filtered.filter(transaction => {
          const transactionDate = new Date(transaction.createdAt?.seconds * 1000);
          return transactionDate >= startDate;
        });
      }
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(transaction =>
        transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.wasteType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.location?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTransactions(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFinancialData().finally(() => {
      setRefreshing(false);
    });
  };

  const handleTransactionPress = (transaction) => {
    navigation.navigate('TransactionDetails', { transaction });
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'revenue': return 'trending-up';
      case 'payout': return 'trending-down';
      case 'fee': return 'card';
      default: return 'list';
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'revenue': return '#10B981';
      case 'payout': return '#EF4444';
      case 'fee': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const renderTransactionCard = ({ item: transaction }) => (
    <TouchableOpacity
      style={styles.transactionCard}
      onPress={() => handleTransactionPress(transaction)}
    >
      <View style={styles.transactionHeader}>
        <View style={styles.transactionIconContainer}>
          <Ionicons 
            name={getTransactionIcon(transaction.type)} 
            size={24} 
            color={getTransactionColor(transaction.type)} 
          />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription}>{transaction.description}</Text>
          <Text style={styles.transactionLocation}>{transaction.location}</Text>
          <Text style={styles.transactionWasteType}>{transaction.wasteType}</Text>
        </View>
        <View style={styles.transactionMeta}>
          <Text style={[
            styles.transactionAmount,
            { color: transaction.amount >= 0 ? '#10B981' : '#EF4444' }
          ]}>
            {transaction.amount >= 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
          </Text>
          <View style={[styles.typeBadge, { backgroundColor: getTransactionColor(transaction.type) }]}>
            <Text style={styles.typeText}>{transaction.type}</Text>
          </View>
        </View>
      </View>
      <View style={styles.transactionFooter}>
        <Text style={styles.transactionDate}>{formatDate(transaction.createdAt)}</Text>
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

  const renderDateRangeButton = (range) => (
    <TouchableOpacity
      key={range.key}
      style={[
        styles.dateRangeButton,
        dateRange === range.key && styles.activeDateRangeButton
      ]}
      onPress={() => setDateRange(range.key)}
    >
      <Text style={[
        styles.dateRangeText,
        dateRange === range.key && styles.activeDateRangeText
      ]}>
        {range.label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <SharedHeader title="Financial Operations" showBackButton />

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Financial Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#10B981' }]}>
              <Ionicons name="trending-up" size={24} color="#FFFFFF" />
              <Text style={styles.statNumber}>${stats.totalRevenue.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Total Revenue</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#EF4444' }]}>
              <Ionicons name="trending-down" size={24} color="#FFFFFF" />
              <Text style={styles.statNumber}>${stats.totalPayouts.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Total Payouts</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="card" size={24} color="#FFFFFF" />
              <Text style={styles.statNumber}>${stats.platformFee.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Platform Fees</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#3B82F6' }]}>
              <Ionicons name="calculator" size={24} color="#FFFFFF" />
              <Text style={styles.statNumber}>${stats.netProfit.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Net Profit</Text>
            </View>
          </View>
        </View>

        {/* Revenue Breakdown */}
        <View style={styles.revenueSection}>
          <Text style={styles.sectionTitle}>Revenue Breakdown</Text>
          <View style={styles.revenueGrid}>
            <View style={styles.revenueItem}>
              <Text style={styles.revenueAmount}>${stats.todayRevenue.toFixed(2)}</Text>
              <Text style={styles.revenueLabel}>Today</Text>
            </View>
            <View style={styles.revenueItem}>
              <Text style={styles.revenueAmount}>${stats.thisWeekRevenue.toFixed(2)}</Text>
              <Text style={styles.revenueLabel}>This Week</Text>
            </View>
            <View style={styles.revenueItem}>
              <Text style={styles.revenueAmount}>${stats.thisMonthRevenue.toFixed(2)}</Text>
              <Text style={styles.revenueLabel}>This Month</Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search transactions..."
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

        {/* Date Range Filter */}
        <View style={styles.dateRangeSection}>
          <Text style={styles.sectionTitle}>Date Range</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.dateRangeContainer}>
              {dateRanges.map(renderDateRangeButton)}
            </View>
          </ScrollView>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filtersSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filtersContainer}>
              {filters.map(renderFilterButton)}
            </View>
          </ScrollView>
        </View>

        {/* Transactions List */}
        <View style={styles.transactionsSection}>
          <Text style={styles.sectionTitle}>
            {selectedFilter === 'all' ? 'All Transactions' : 
             selectedFilter === 'revenue' ? 'Revenue Transactions' :
             selectedFilter === 'payouts' ? 'Payout Transactions' : 'Platform Fee Transactions'}
            ({filteredTransactions.length})
          </Text>
          
          <FlatList
            data={filteredTransactions}
            renderItem={renderTransactionCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Ionicons name="card-outline" size={64} color="#9CA3AF" />
                <Text style={styles.emptyText}>No transactions found</Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery ? 'Try adjusting your search terms' : 'Transactions will appear here as jobs are completed'}
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
  revenueSection: {
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
  revenueGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  revenueItem: {
    alignItems: 'center',
  },
  revenueAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  revenueLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
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
  dateRangeSection: {
    marginBottom: 20,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dateRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeDateRangeButton: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  dateRangeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeDateRangeText: {
    color: '#FFFFFF',
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
  transactionsSection: {
    flex: 1,
  },
  transactionCard: {
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
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transactionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  transactionLocation: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  transactionWasteType: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  transactionMeta: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  transactionDate: {
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

export default FinancialOperations;
