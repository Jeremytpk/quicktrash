import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, updateDoc, doc, orderBy } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import SharedHeader from '../components/SharedHeader';
import { useUser } from '../contexts/UserContext';

const { width } = Dimensions.get('window');

const UserRatingManagement = ({ navigation }) => {
  const { user } = useUser();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all'); // all, customer, contractor
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, warning, suspended
  const [sortBy, setSortBy] = useState('rating'); // rating, jobs, date
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType] = useState(''); // warn, suspend, promote, contact
  const [actionReason, setActionReason] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterAndSortUsers();
  }, [users, searchQuery, filterRole, filterStatus, sortBy]);

  const loadUsers = async () => {
    try {
      // For now, create mock data since we don't have real user data
      // In production, this would query the users collection
      const mockUsers = [
        {
          id: 'user1',
          name: 'John Smith',
          email: 'john@example.com',
          role: 'contractor',
          rating: 4.8,
          totalJobs: 45,
          completionRate: 98,
          status: 'active',
          lastActive: new Date('2024-01-15'),
          warnings: 0,
          earnings: 1250.50,
          recentRatings: [
            { rating: 5, review: 'Excellent service!', date: new Date('2024-01-14') },
            { rating: 4, review: 'Good job, arrived on time', date: new Date('2024-01-12') },
            { rating: 5, review: 'Very professional', date: new Date('2024-01-10') },
          ],
        },
        {
          id: 'user2',
          name: 'Sarah Johnson',
          email: 'sarah@example.com',
          role: 'customer',
          rating: 4.2,
          totalOrders: 12,
          completionRate: 95,
          status: 'warning',
          lastActive: new Date('2024-01-16'),
          warnings: 1,
          totalSpent: 340.75,
          recentRatings: [
            { rating: 3, review: 'Could be more punctual', date: new Date('2024-01-15') },
            { rating: 4, review: 'Good communication', date: new Date('2024-01-13') },
          ],
        },
        {
          id: 'user3',
          name: 'Mike Davis',
          email: 'mike@example.com',
          role: 'contractor',
          rating: 3.5,
          totalJobs: 23,
          completionRate: 85,
          status: 'suspended',
          lastActive: new Date('2024-01-10'),
          warnings: 2,
          earnings: 890.25,
          recentRatings: [
            { rating: 2, review: 'Late arrival, poor communication', date: new Date('2024-01-09') },
            { rating: 3, review: 'Average service', date: new Date('2024-01-07') },
          ],
        },
        {
          id: 'user4',
          name: 'Emily Wilson',
          email: 'emily@example.com',
          role: 'customer',
          rating: 4.9,
          totalOrders: 8,
          completionRate: 100,
          status: 'active',
          lastActive: new Date('2024-01-16'),
          warnings: 0,
          totalSpent: 245.60,
          recentRatings: [
            { rating: 5, review: 'Perfect service every time!', date: new Date('2024-01-15') },
            { rating: 5, review: 'Highly recommended', date: new Date('2024-01-12') },
          ],
        },
      ];

      setUsers(mockUsers);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error loading users:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterAndSortUsers = () => {
    let filtered = [...users];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by role
    if (filterRole !== 'all') {
      filtered = filtered.filter(user => user.role === filterRole);
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(user => user.status === filterStatus);
    }

    // Sort users
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'jobs':
          return (b.totalJobs || b.totalOrders || 0) - (a.totalJobs || a.totalOrders || 0);
        case 'date':
          return b.lastActive - a.lastActive;
        default:
          return 0;
      }
    });

    setFilteredUsers(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const handleUserAction = (user, action) => {
    setSelectedUser(user);
    setActionType(action);
    setShowActionModal(true);
    setActionReason('');
  };

  const executeAction = () => {
    if (!actionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for this action.');
      return;
    }

    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${actionType} ${selectedUser.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            // In production, this would update the user's status in Firestore
            console.log(`${actionType} action for ${selectedUser.name}: ${actionReason}`);
            
            // Update local state
            setUsers(prev => prev.map(u => 
              u.id === selectedUser.id 
                ? { 
                    ...u, 
                    status: actionType === 'suspend' ? 'suspended' : 
                           actionType === 'warn' ? 'warning' : 
                           actionType === 'promote' ? 'active' : u.status,
                    warnings: actionType === 'warn' ? u.warnings + 1 : u.warnings
                  }
                : u
            ));

            setShowActionModal(false);
            setSelectedUser(null);
            setActionType('');
            setActionReason('');

            Alert.alert('Success', `Action completed for ${selectedUser.name}`);
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#34A853';
      case 'warning': return '#F59E0B';
      case 'suspended': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return 'checkmark-circle';
      case 'warning': return 'warning';
      case 'suspended': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const renderUserCard = (user) => (
    <View key={user.id} style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <View style={styles.userMeta}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(user.status) }]}>
              <Ionicons name={getStatusIcon(user.status)} size={12} color="white" />
              <Text style={styles.statusText}>{user.status.toUpperCase()}</Text>
            </View>
            <Text style={styles.userRole}>{user.role}</Text>
          </View>
        </View>
        
        <View style={styles.ratingSection}>
          <View style={styles.ratingDisplay}>
            <Ionicons name="star" size={16} color="#FFB300" />
            <Text style={styles.ratingValue}>{user.rating}</Text>
          </View>
          <Text style={styles.ratingCount}>
            {user.totalJobs || user.totalOrders} {user.role === 'contractor' ? 'jobs' : 'orders'}
          </Text>
        </View>
      </View>

      <View style={styles.userStats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Completion Rate</Text>
          <Text style={styles.statValue}>{user.completionRate}%</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Warnings</Text>
          <Text style={[styles.statValue, { color: user.warnings > 0 ? '#F59E0B' : '#34A853' }]}>
            {user.warnings}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>
            {user.role === 'contractor' ? 'Earnings' : 'Total Spent'}
          </Text>
          <Text style={styles.statValue}>
            ${user.earnings || user.totalSpent || '0.00'}
          </Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.viewButton]}
          onPress={() => navigation.navigate('UserDetails', { userId: user.id })}
        >
          <Ionicons name="eye" size={16} color="#34A853" />
          <Text style={styles.actionButtonText}>View Details</Text>
        </TouchableOpacity>

        {user.status === 'active' && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.warnButton]}
            onPress={() => handleUserAction(user, 'warn')}
          >
            <Ionicons name="warning" size={16} color="#F59E0B" />
            <Text style={styles.actionButtonText}>Warn</Text>
          </TouchableOpacity>
        )}

        {user.status !== 'suspended' && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.suspendButton]}
            onPress={() => handleUserAction(user, 'suspend')}
          >
            <Ionicons name="ban" size={16} color="#EF4444" />
            <Text style={styles.actionButtonText}>Suspend</Text>
          </TouchableOpacity>
        )}

        {user.status === 'suspended' && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.activateButton]}
            onPress={() => handleUserAction(user, 'promote')}
          >
            <Ionicons name="checkmark" size={16} color="#34A853" />
            <Text style={styles.actionButtonText}>Activate</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={[styles.actionButton, styles.contactButton]}
          onPress={() => handleUserAction(user, 'contact')}
        >
          <Ionicons name="mail" size={16} color="#3B82F6" />
          <Text style={styles.actionButtonText}>Contact</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <SharedHeader 
        title="User Rating Management" 
        subtitle="Manage user ratings and accounts"
        showBackButton 
      />

      {/* Filters and Search */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity 
            style={[styles.filterButton, filterRole === 'all' && styles.filterButtonActive]}
            onPress={() => setFilterRole('all')}
          >
            <Text style={[styles.filterButtonText, filterRole === 'all' && styles.filterButtonTextActive]}>
              All Users
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, filterRole === 'customer' && styles.filterButtonActive]}
            onPress={() => setFilterRole('customer')}
          >
            <Text style={[styles.filterButtonText, filterRole === 'customer' && styles.filterButtonTextActive]}>
              Customers
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, filterRole === 'contractor' && styles.filterButtonActive]}
            onPress={() => setFilterRole('contractor')}
          >
            <Text style={[styles.filterButtonText, filterRole === 'contractor' && styles.filterButtonTextActive]}>
              Contractors
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.filterButton, filterStatus === 'warning' && styles.filterButtonActive]}
            onPress={() => setFilterStatus('warning')}
          >
            <Text style={[styles.filterButtonText, filterStatus === 'warning' && styles.filterButtonTextActive]}>
              Warnings
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.filterButton, filterStatus === 'suspended' && styles.filterButtonActive]}
            onPress={() => setFilterStatus('suspended')}
          >
            <Text style={[styles.filterButtonText, filterStatus === 'suspended' && styles.filterButtonTextActive]}>
              Suspended
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          <TouchableOpacity 
            style={[styles.sortButton, sortBy === 'rating' && styles.sortButtonActive]}
            onPress={() => setSortBy('rating')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'rating' && styles.sortButtonTextActive]}>
              Rating
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.sortButton, sortBy === 'jobs' && styles.sortButtonActive]}
            onPress={() => setSortBy('jobs')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'jobs' && styles.sortButtonTextActive]}>
              Activity
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Users List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#34A853']}
            tintColor="#34A853"
          />
        }
      >
        {filteredUsers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyTitle}>No Users Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try adjusting your search criteria' : 'No users match the current filters'}
            </Text>
          </View>
        ) : (
          filteredUsers.map(renderUserCard)
        )}
      </ScrollView>

      {/* Action Modal */}
      <Modal
        visible={showActionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowActionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {actionType === 'warn' && 'Issue Warning'}
                {actionType === 'suspend' && 'Suspend User'}
                {actionType === 'promote' && 'Activate User'}
                {actionType === 'contact' && 'Contact User'}
              </Text>
              <TouchableOpacity onPress={() => setShowActionModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalUser}>
              {selectedUser?.name} ({selectedUser?.role})
            </Text>

            <TextInput
              style={styles.reasonInput}
              placeholder={`Reason for ${actionType}...`}
              value={actionReason}
              onChangeText={setActionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowActionModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.confirmButton,
                  { backgroundColor: actionType === 'suspend' ? '#EF4444' : 
                                    actionType === 'warn' ? '#F59E0B' : '#34A853' }
                ]}
                onPress={executeAction}
              >
                <Text style={styles.confirmButtonText}>
                  {actionType === 'warn' && 'Issue Warning'}
                  {actionType === 'suspend' && 'Suspend'}
                  {actionType === 'promote' && 'Activate'}
                  {actionType === 'contact' && 'Send Message'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1F2937',
  },
  filterScroll: {
    marginBottom: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#34A853',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginRight: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  sortButtonActive: {
    backgroundColor: '#3B82F6',
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  sortButtonTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  userCard: {
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
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  userRole: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  ratingSection: {
    alignItems: 'center',
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 4,
  },
  ratingCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    minWidth: 80,
    justifyContent: 'center',
  },
  viewButton: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#34A853',
  },
  warnButton: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  suspendButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  activateButton: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#34A853',
  },
  contactButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: width * 0.9,
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalUser: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 24,
    minHeight: 100,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default UserRatingManagement;
