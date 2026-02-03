import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import SharedHeader from '../components/SharedHeader';

const { width } = Dimensions.get('window');

const OrderHistory = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  
  const allSelected = orders.length > 0 && selectedOrders.length === orders.length;

  const handleSelectOrder = (orderId) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(order => order.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedOrders.length === 0) return;
    Alert.alert(
      'Delete Selected Orders',
      `Are you sure you want to permanently delete ${selectedOrders.length} order(s)? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(selectedOrders.map(orderId => deleteDoc(doc(db, 'jobs', orderId))));
              setSelectedOrders([]);
              Alert.alert('Deleted', 'Selected orders deleted successfully.');
            } catch (error) {
              console.error('Error deleting selected orders:', error);
              Alert.alert('Error', 'Failed to delete selected orders.');
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    if (!auth.currentUser) {
      navigation.navigate('Login');
      return;
    }

    const ordersRef = collection(db, 'jobs');
    const q = query(
      ordersRef,
      where('customerId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orderList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        completedAt: doc.data().completedAt?.toDate(),
      }));

      orderList.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt - a.createdAt;
      });

      // Filter to show only paid orders
      const paidOrders = orderList.filter(order => order.status === 'paid');
      setOrders(paidOrders);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error('Error fetching orders:', error);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FF8F00';
      case 'assigned': return '#1E88E5';
      case 'in_progress': return '#9C27B0';
      case 'completed': return '#34A853';
      case 'paid': return '#34A853';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'assigned': return 'Assigned';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'paid': return 'Paid';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
  };

  const getWasteTypeIcon = (wasteType) => {
    switch (wasteType) {
      case 'household': return 'home';
      case 'bulk': return 'cube';
      case 'yard': return 'leaf';
      case 'construction': return 'construct';
      case 'recyclables': return 'refresh';
      default: return 'trash';
    }
  };

  const handleReorder = (order) => {
    Alert.alert(
      'Reorder Pickup',
      'Would you like to create a new pickup order with the same details?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reorder', 
          onPress: () => navigation.navigate('CreateOrder', { 
            wasteType: { 
              id: order.wasteType, 
              name: order.wasteType.charAt(0).toUpperCase() + order.wasteType.slice(1) 
            },
            prefillData: {
              volume: order.volume,
              description: order.description,
              address: order.pickupAddress,
            }
          })
        },
      ]
    );
  };

  const handleCancelOrder = async (orderId) => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this pickup order?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            try {
              const orderRef = doc(db, 'jobs', orderId);
              await updateDoc(orderRef, {
                status: 'cancelled',
                cancelledAt: new Date(),
              });
              Alert.alert('Success', 'Order has been cancelled.');
            } catch (error) {
              console.error('Error cancelling order:', error);
              Alert.alert('Error', 'Failed to cancel order.');
            }
          }
        },
      ]
    );
  };

  const handleDeleteOrder = (orderId) => {
    Alert.alert(
      'Delete Order',
      'Are you sure you want to permanently delete this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'jobs', orderId));
              Alert.alert('Deleted', 'Order deleted successfully.');
            } catch (error) {
              console.error('Error deleting order:', error);
              Alert.alert('Error', 'Failed to delete order.');
            }
          }
        }
      ]
    );
  };

  const renderOrderItem = ({ item }) => {
    const canCancel = ['pending', 'assigned'].includes(item.status);
    const canReorder = ['completed', 'cancelled', 'paid'].includes(item.status);
    const isSelected = selectedOrders.includes(item.id);

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => handleSelectOrder(item.id)}
          >
            <Ionicons
              name={isSelected ? 'checkbox' : 'square-outline'}
              size={22}
              color={isSelected ? '#34A853' : '#9CA3AF'}
            />
          </TouchableOpacity>
          <View style={styles.orderInfo}>
            <View style={styles.orderTypeRow}>
              <Ionicons name={getWasteTypeIcon(item.wasteType)} size={20} color="#34A853" />
              <Text style={styles.orderType}>
                {item.wasteType?.charAt(0).toUpperCase() + item.wasteType?.slice(1)} Pickup
              </Text>
            </View>
            <Text style={styles.orderVolume}>{item.volume?.replace('_', '-')}</Text>
            <Text style={styles.orderDate}>
              {item.createdAt?.toLocaleDateString()} at {item.createdAt?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </Text>
          </View>
          <View style={styles.orderStatus}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}> 
              <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
            </View>
            <Text style={styles.orderPrice}>${item.pricing?.total?.toFixed(2) || '0.00'}</Text>
          </View>
        </View>

        {item.pickupAddress && (
          <View style={styles.addressSection}>
            <Ionicons name="location-outline" size={16} color="#6B7280" />
            <Text style={styles.addressText}>
              {item.pickupAddress.street}, {item.pickupAddress.city}
            </Text>
          </View>
        )}

        <View style={styles.orderActions}>
          {canReorder && (
            <TouchableOpacity style={styles.reorderButton} onPress={() => handleReorder(item)}>
              <Ionicons name="refresh" size={16} color="#34A853" />
              <Text style={styles.reorderText}>Reorder</Text>
            </TouchableOpacity>
          )}

          {canCancel && (
            <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancelOrder(item.id)}>
              <Ionicons name="close-circle" size={16} color="#EF4444" />
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteOrder(item.id)}>
            <Ionicons name="trash" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="basket-outline" size={64} color="#9CA3AF" />
      <Text style={styles.emptyStateTitle}>No Paid Orders</Text>
      <Text style={styles.emptyStateText}>Your successfully paid orders will appear here.</Text>
      <TouchableOpacity
        style={styles.createOrderButton}
        onPress={() => navigation.navigate('CustomerDashboard')}
      >
        <Text style={styles.createOrderText}>Create an Order</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <SharedHeader
        title="Order History"
        subtitle={`${orders.length} paid order${orders.length !== 1 ? 's' : ''}`}
        showBackButton={true}
        showHomeButton={true}
      />
      {orders.length > 0 && (
        <View style={styles.bulkActionsBar}>
          <TouchableOpacity style={styles.selectAllButton} onPress={handleSelectAll}>
            <Ionicons name={allSelected ? 'checkbox' : 'square-outline'} size={20} color={allSelected ? '#34A853' : '#9CA3AF'} />
            <Text style={styles.selectAllText}>{allSelected ? 'Unselect All' : 'Select All'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.deleteSelectedButton, selectedOrders.length === 0 && { opacity: 0.5 }]}
            onPress={handleDeleteSelected}
            disabled={selectedOrders.length === 0}
          >
            <Ionicons name="trash" size={18} color="#fff" />
            <Text style={styles.deleteSelectedText}>Delete Selected</Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        style={styles.ordersList}
        contentContainerStyle={orders.length === 0 ? styles.emptyContainer : styles.listContainer}
        showsVerticalScrollIndicator={false}
        extraData={selectedOrders}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#34A853']} />
        }
        ListEmptyComponent={!loading ? renderEmptyState : null}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  ordersList: { flex: 1 },
  listContainer: { paddingHorizontal: 16, paddingVertical: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bulkActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  deleteSelectedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginLeft: 12,
  },
  deleteSelectedText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 14,
  },
  checkbox: {
    marginRight: 10,
    padding: 2,
  },
  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orderHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  orderInfo: { flex: 1 },
  orderTypeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  orderType: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginLeft: 8 },
  orderVolume: { fontSize: 14, color: '#4B5563', marginBottom: 2 },
  orderDate: { fontSize: 12, color: '#9CA3AF' },
  orderStatus: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 4 },
  statusText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  orderPrice: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  addressSection: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  addressText: { fontSize: 14, color: '#4B5563', marginLeft: 6 },
  orderActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, alignItems: 'center' },
  viewDetailsButton: { flex: 1, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8 },
  viewDetailsText: { fontSize: 14, color: '#374151', fontWeight: '600', textAlign: 'center' },
  reorderButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9F4', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, marginRight: 8 },
  reorderText: { fontSize: 14, color: '#34A853', fontWeight: '600', marginLeft: 4 },
  cancelButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, marginRight: 8 },
  cancelText: { fontSize: 14, color: '#EF4444', fontWeight: '600', marginLeft: 4 },
  deleteButton: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FEE2E2', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingHorizontal: 32 },
  emptyStateTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginTop: 16, marginBottom: 8 },
  emptyStateText: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  createOrderButton: { backgroundColor: '#34A853', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  createOrderText: { fontSize: 16, color: '#FFFFFF', fontWeight: 'bold' },
});

export default OrderHistory;