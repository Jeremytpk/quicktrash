import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SharedHeader from '../components/SharedHeader';

// 1. Import necessary Firebase functions
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig'; 

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showRoleSwitchModal, setShowRoleSwitchModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // 2. Fetch users from Firebase Firestore
  useEffect(() => {
    setLoading(true);
    const usersCollectionRef = collection(db, 'users');

    // onSnapshot listens for real-time changes
    const unsubscribe = onSnapshot(usersCollectionRef, (querySnapshot) => {
      const usersData = querySnapshot.docs.map(doc => {
        // Firebase automatically provides the document ID, which we'll use as the user ID
        return { id: doc.id, ...doc.data() };
      });
      setUsers(usersData);
      setFilteredUsers(usersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users: ", error);
      Alert.alert("Error", "Failed to fetch users. Please try again later.");
      setLoading(false);
    });

    // Clean up the listener on component unmount
    return () => unsubscribe();
  }, []); // Empty dependency array ensures this runs once on mount

  useEffect(() => {
    let filtered = users;

    if (selectedRole !== 'all') {
      filtered = filtered.filter(user => user.role === selectedRole);
    }

    if (searchQuery) {
      filtered = filtered.filter(user =>
        user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  }, [users, selectedRole, searchQuery]);

  const getRoleColor = (role) => {
    switch (role) {
      case 'customer': return '#3B82F6';
      case 'contractor': return '#34A853';
      case 'employee': return '#7C3AED';
      default: return '#6B7280';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#34A853';
      case 'suspended': return '#DC2626';
      case 'pending': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getVerificationIcon = (status) => {
    switch (status) {
      case 'verified': return { name: 'checkmark-circle', color: '#34A853' };
      case 'pending': return { name: 'time', color: '#F59E0B' };
      case 'rejected': return { name: 'close-circle', color: '#DC2626' };
      default: return { name: 'help-circle', color: '#6B7280' };
    }
  };

  const handleUserAction = (action, user) => {
    // Note: To make this fully functional, you would need to update the user data
    // in Firebase using functions like `updateDoc` or `deleteDoc`.
    Alert.alert("Action not implemented", "This action would modify the user in Firebase.");
  };

  const handleSwitchRole = (newRole) => {
    // Note: To make this fully functional, you would need to update the user's role
    // in Firebase, perhaps using a Cloud Function.
    Alert.alert("Action not implemented", "This action would switch the user's role in Firebase.");
  };

  const onRefresh = () => {
    // onSnapshot listener handles real-time updates, so a manual refresh isn't needed
    // for data. However, we can use it to show a refresh animation.
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderUserCard = ({ item }) => {
    const verificationIcon = getVerificationIcon(item.verificationStatus);
    
    return (
      <View style={styles.userCard}>
        {/* Main Info */}
        <TouchableOpacity
          style={styles.cardInfoTouchable}
          onPress={() => {
            setSelectedUser(item);
            setShowUserModal(true);
          }}
        >
          <View style={styles.userHeader}>
            <View style={styles.userInfo}>
              <View style={styles.userNameRow}>
                <Text style={styles.userName}>{item.displayName}</Text>
                <Ionicons 
                  name={verificationIcon.name} 
                  size={16} 
                  color={verificationIcon.color} 
                />
              </View>
              <Text style={styles.userEmail}>{item.email}</Text>
              <View style={styles.userMeta}>
                <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) + '20' }]}>
                  <Text style={[styles.roleText, { color: getRoleColor(item.role) }]}>
                    {item.role ? item.role.charAt(0).toUpperCase() + item.role.slice(1) : 'N/A'}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'N/A'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.userStats}>
          {item.role === 'customer' && (
            <>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{item.totalOrders || 0}</Text>
                <Text style={styles.statLabel}>Orders</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>${(item.totalSpent || 0).toFixed(2)}</Text>
                <Text style={styles.statLabel}>Spent</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{item.rating || 0}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </>
          )}
          
          {item.role === 'contractor' && (
            <>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{item.totalJobs || 0}</Text>
                <Text style={styles.statLabel}>Jobs</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>${(item.totalEarnings || 0).toFixed(2)}</Text>
                <Text style={styles.statLabel}>Earned</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{item.rating || 0}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </>
          )}

          {item.role === 'employee' && (
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.department || 'N/A'}</Text>
              <Text style={styles.statLabel}>Department</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.switchRoleButtonCard}
          onPress={() => {
            setSelectedUser(item);
            setShowRoleSwitchModal(true);
          }}
        >
          <Ionicons name="swap-horizontal" size={16} color="#4B5563" />
          <Text style={styles.switchRoleButtonTextCard}>Switch Role</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFilterButton = (role, label) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedRole === role && styles.activeFilterButton
      ]}
      onPress={() => setSelectedRole(role)}
    >
      <Text style={[
        styles.filterButtonText,
        selectedRole === role && styles.activeFilterButtonText
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SharedHeader 
        title="User Management" 
        showBackButton 
        rightComponent={
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={20} color="#34A853" />
            <Text style={styles.addButtonText}>Add User</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.content}>
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
            {renderFilterButton('all', 'All')}
            {renderFilterButton('customer', 'Customers')}
            {renderFilterButton('contractor', 'Contractors')}
            {renderFilterButton('employee', 'Employees')}
          </ScrollView>
        </View>

        {/* Show loading indicator or empty state */}
        {loading ? (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading users...</Text>
            </View>
        ) : (
            <FlatList
            data={filteredUsers}
            renderItem={renderUserCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#34A853']}
                tintColor="#34A853"
                />
            }
            ListEmptyComponent={
                <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={64} color="#9CA3AF" />
                <Text style={styles.emptyStateTitle}>No Users Found</Text>
                <Text style={styles.emptyStateDescription}>
                    {searchQuery ? 'No users match your search criteria' : 'No users to display'}
                </Text>
                </View>
            }
            />
        )}
      </View>
      
      {/* User Details Modal (no changes) */}
      <Modal
        visible={showUserModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowUserModal(false)}
      >
        {selectedUser && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowUserModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>User Details</Text>
              <TouchableOpacity>
                <Ionicons name="create-outline" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* User Info */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>User Information</Text>
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Name</Text>
                    <Text style={styles.infoValue}>{selectedUser.displayName}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{selectedUser.email}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{selectedUser.phone}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Role</Text>
                    <Text style={styles.infoValue}>{selectedUser.role}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Status</Text>
                    <Text style={[styles.infoValue, { color: getStatusColor(selectedUser.status) }]}>
                      {selectedUser.status}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Joined</Text>
                    <Text style={styles.infoValue}>{selectedUser.joinDate}</Text>
                  </View>
                </View>
              </View>

              {/* Role-specific information */}
              {selectedUser.role === 'contractor' && selectedUser.vehicleInfo && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Vehicle Information</Text>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Vehicle</Text>
                      <Text style={styles.infoValue}>
                        {selectedUser.vehicleInfo.year} {selectedUser.vehicleInfo.make} {selectedUser.vehicleInfo.model}
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>License Plate</Text>
                      <Text style={styles.infoValue}>{selectedUser.vehicleInfo.licensePlate}</Text>
                    </View>
                  </View>
                </View>
              )}
               {selectedUser.role === 'employee' && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Employee Information</Text>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Department</Text>
                      <Text style={styles.infoValue}>{selectedUser.department}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Permissions</Text>
                      <Text style={styles.infoValue}>{selectedUser.permissions.join(', ')}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Suspension Info */}
              {selectedUser.status === 'suspended' && selectedUser.suspensionReason && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Suspension Details</Text>
                  <View style={styles.suspensionCard}>
                    <Text style={styles.suspensionReason}>{selectedUser.suspensionReason}</Text>
                  </View>
                </View>
              )}

              {/* Actions */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Actions</Text>
                <View style={styles.actionButtons}>
                  {selectedUser.status === 'active' ? (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.suspendButton]}
                      onPress={() => {
                        setShowUserModal(false);
                        handleUserAction('suspend', selectedUser);
                      }}
                    >
                      <Text style={styles.suspendButtonText}>Suspend User</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.activateButton]}
                      onPress={() => {
                        setShowUserModal(false);
                        handleUserAction('activate', selectedUser);
                      }}
                    >
                      <Text style={styles.activateButtonText}>Activate User</Text>
                    </TouchableOpacity>
                  )}
                  {selectedUser.verificationStatus !== 'verified' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.verifyButton]}
                      onPress={() => {
                        setShowUserModal(false);
                        handleUserAction('verify', selectedUser);
                      }}
                    >
                      <Text style={styles.verifyButtonText}>Verify User</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => {
                      setShowUserModal(false);
                        handleUserAction('delete', selectedUser);
                    }}
                  >
                    <Text style={styles.deleteButtonText}>Delete User</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Role Switch Modal (no changes) */}
      <Modal
        visible={showRoleSwitchModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRoleSwitchModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowRoleSwitchModal(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Switch User Role</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.switchRoleText}>Select a new role for {selectedUser?.displayName}:</Text>
            <View style={styles.switchRoleOptions}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: getRoleColor('customer') + '15' }
                ]}
                onPress={() => handleSwitchRole('customer')}
              >
                <Text style={[styles.switchRoleButtonText, { color: getRoleColor('customer') }]}>Customer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: getRoleColor('contractor') + '15' }
                ]}
                onPress={() => handleSwitchRole('contractor')}
              >
                <Text style={[styles.switchRoleButtonText, { color: getRoleColor('contractor') }]}>Contractor</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: getRoleColor('employee') + '15' }
                ]}
                onPress={() => handleSwitchRole('employee')}
              >
                <Text style={[styles.switchRoleButtonText, { color: getRoleColor('employee') }]}>Employee</Text>
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F0FDF4',
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34A853',
  },
  content: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  filterContainer: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  activeFilterButton: {
    backgroundColor: '#34A853',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeFilterButtonText: {
    color: '#FFFFFF',
  },
  listContainer: {
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
    shadowRadius: 8,
    elevation: 4,
  },
  userHeader: {
    marginBottom: 12,
  },
  cardInfoTouchable: {
    // Make the touchable area cover the user info section
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  userMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    fontWeight: '600',
    color: '#1F2937',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 2,
    textAlign: 'right',
  },
  suspensionCard: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  suspensionReason: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  suspendButton: {
    backgroundColor: '#FEF2F2',
  },
  suspendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  activateButton: {
    backgroundColor: '#F0FDF4',
  },
  activateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34A853',
  },
  verifyButton: {
    backgroundColor: '#EBF8FF',
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  switchRoleButtonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    gap: 8,
  },
  switchRoleButtonTextCard: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
});

export default UserManagement;