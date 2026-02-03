import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
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
import { useNavigation } from '@react-navigation/native';
import SharedHeader from '../components/SharedHeader';

const UserManagement = () => {
  const navigation = useNavigation();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
    const [roleSwitching, setRoleSwitching] = useState(false);
    const [newRole, setNewRole] = useState('');

  // Fetch users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersList);
        setFilteredUsers(usersList);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
      setRefreshing(false);
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = users;
    // Filter by role
    if (selectedRole !== 'all') {
      filtered = filtered.filter(user => user.role === selectedRole);
    }
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(user =>
        (user.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredUsers(filtered);
  }, [users, selectedRole, searchQuery]);

  const getRoleColor = (role) => {
    switch (role || '') {
      case 'customer': return '#3B82F6';
      case 'contractor': return '#34A853';
      case 'employee': return '#7C3AED';
      default: return '#6B7280';
    }
  };

  const getStatusColor = (status) => {
    switch (status || '') {
      case 'active': return '#34A853';
      case 'suspended': return '#DC2626';
      case 'pending': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getVerificationIcon = (status) => {
    switch (status || '') {
      case 'verified': return { name: 'checkmark-circle', color: '#34A853' };
      case 'pending': return { name: 'time', color: '#F59E0B' };
      case 'rejected': return { name: 'close-circle', color: '#DC2626' };
      default: return { name: 'help-circle', color: '#6B7280' };
    }
  };

  const handleUserAction = (action, user) => {
    switch (action) {
      case 'suspend':
        Alert.alert(
          'Suspend User',
          `Are you sure you want to suspend ${user.displayName}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Suspend', 
              style: 'destructive',
              onPress: () => {
                setUsers(prev => 
                  prev.map(u => 
                    u.id === user.id 
                      ? { ...u, status: 'suspended', suspensionReason: 'Admin action' }
                      : u
                  )
                );
                Alert.alert('Success', 'User has been suspended');
              }
            }
          ]
        );
        break;
      case 'activate':
        setUsers(prev => 
          prev.map(u => 
            u.id === user.id 
              ? { ...u, status: 'active', suspensionReason: undefined }
              : u
          )
        );
        Alert.alert('Success', 'User has been activated');
        break;
      case 'verify':
        setUsers(prev => 
          prev.map(u => 
            u.id === user.id 
              ? { ...u, verificationStatus: 'verified' }
              : u
          )
        );
        Alert.alert('Success', 'User has been verified');
        break;
      case 'delete':
        Alert.alert(
          'Delete User',
          `Are you sure you want to permanently delete ${user.displayName}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Delete', 
              style: 'destructive',
              onPress: () => {
                setUsers(prev => prev.filter(u => u.id !== user.id));
                Alert.alert('Success', 'User has been deleted');
              }
            }
          ]
        );
        break;
        case 'generateContractorId':
          // Generate a random contractorId (UUID-like)
          const contractorId = 'ctr_' + Math.random().toString(36).substr(2, 9);
          setUsers(prev =>
            prev.map(u =>
              u.id === user.id
                ? { ...u, contractorId }
                : u
            )
          );
          Alert.alert('Success', `Contractor ID generated: ${contractorId}`);
          break;
        case 'switchRole':
          if (!newRole) return;
          setUsers(prev =>
            prev.map(u =>
              u.id === user.id
                ? {
                    ...u,
                    role: newRole,
                    contractorId: newRole === 'contractor' ? (u.contractorId || ('ctr_' + Math.random().toString(36).substr(2, 9))) : undefined
                  }
                : u
            )
          );
          Alert.alert('Success', `Role switched to ${newRole.charAt(0).toUpperCase() + newRole.slice(1)}`);
          setRoleSwitching(false);
          setNewRole('');
          break;
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderUserCard = ({ item }) => {
    const verificationIcon = getVerificationIcon(item.verificationStatus);
    const displayName = item.displayName || '';
    const email = item.email || '';
    const role = item.role || '';
    const status = item.status || '';
    
    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => {
          setSelectedUser(item);
          setShowUserModal(true);
        }}
      >
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <View style={styles.userNameRow}>
              <Text style={styles.userName}>{displayName}</Text>
              <Ionicons 
                name={verificationIcon.name} 
                size={16} 
                color={verificationIcon.color} 
              />
            </View>
            <Text style={styles.userEmail}>{email}</Text>
            <View style={styles.userMeta}>
              <View style={[styles.roleBadge, { backgroundColor: getRoleColor(role) + '20' }]}> 
                <Text style={[styles.roleText, { color: getRoleColor(role) }]}> 
                  {role ? role.charAt(0).toUpperCase() + role.slice(1) : ''}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) + '20' }]}> 
                <Text style={[styles.statusText, { color: getStatusColor(status) }]}> 
                  {status ? status.charAt(0).toUpperCase() + status.slice(1) : ''}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.userStats}>
          {item.role === 'customer' && (
            <>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{item.totalOrders}</Text>
                <Text style={styles.statLabel}>Orders</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>${item.totalSpent?.toFixed(2)}</Text>
                <Text style={styles.statLabel}>Spent</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{item.rating}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </>
          )}
          
          {item.role === 'contractor' && (
            <>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{item.totalJobs}</Text>
                <Text style={styles.statLabel}>Jobs</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>${item.totalEarnings?.toFixed(2)}</Text>
                <Text style={styles.statLabel}>Earned</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{item.rating}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </>
          )}

          {item.role === 'employee' && (
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.department}</Text>
              <Text style={styles.statLabel}>Department</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
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
      />
  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 8, gap: 8 }}>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('Accounts')}>
          <Ionicons name="people" size={20} color="#2196F3" />
          <Text style={[styles.addButtonText, { color: '#2196F3' }]}>Accounts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={20} color="#34A853" />
          <Text style={styles.addButtonText}>Add User</Text>
        </TouchableOpacity>
        <Text style={{ marginLeft: 12, fontSize: 15, color: '#6B7280', fontWeight: '500' }}>
          Total: {filteredUsers.length}
        </Text>
      </View>

      <View style={styles.content}>
        {/* Search and Filters */}
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

        {/* Users List */}
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
      </View>

      {/* User Details Modal */}
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
                    {selectedUser.role === 'contractor' && (
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Contractor ID</Text>
                        <Text style={styles.infoValue}>{selectedUser.contractorId || 'Not generated'}</Text>
                        <TouchableOpacity
                          style={{ marginLeft: 8, backgroundColor: '#F0FDF4', borderRadius: 6, padding: 4 }}
                          onPress={() => {
                            setShowUserModal(false);
                            handleUserAction('generateContractorId', selectedUser);
                          }}
                        >
                          <Text style={{ color: '#34A853', fontWeight: '600', fontSize: 12 }}>Generate</Text>
                        </TouchableOpacity>
                      </View>
                    )}
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

              {/* Suspension Info */}
              {selectedUser.status === 'suspended' && selectedUser.suspensionReason && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Suspension Details</Text>
                  <View style={styles.suspensionCard}>
                    <Text style={styles.suspensionReason}>{selectedUser.suspensionReason}</Text>
                  </View>
                </View>
              )}

                {/* Switch Role Section */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Switch Role</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {['contractor', 'customer', 'employee'].map(role => (
                      <TouchableOpacity
                        key={role}
                        style={{
                          backgroundColor: selectedUser.role === role ? '#34A853' : '#F3F4F6',
                          borderRadius: 20,
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          marginRight: 8,
                        }}
                        onPress={() => {
                          setRoleSwitching(true);
                          setNewRole(role);
                          Alert.alert(
                            'Switch Role',
                            `Are you sure you want to switch this user to ${role.charAt(0).toUpperCase() + role.slice(1)}?`,
                            [
                              { text: 'Cancel', style: 'cancel', onPress: () => setRoleSwitching(false) },
                              { text: 'Confirm', style: 'default', onPress: () => {
                                setShowUserModal(false);
                                handleUserAction('switchRole', selectedUser);
                              } }
                            ]
                          );
                        }}
                      >
                        <Text style={{ color: selectedUser.role === role ? '#FFF' : '#34A853', fontWeight: '600' }}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
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
});

export default UserManagement;
