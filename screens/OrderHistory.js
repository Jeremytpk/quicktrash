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
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, increment } from 'firebase/firestore';
import RateUserModal from '../components/RateUserModal';
import { auth, db } from '../firebaseConfig';
import SharedHeader from '../components/SharedHeader';

const { width } = Dimensions.get('window');

const OrderHistory = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [showRateModal, setShowRateModal] = useState(false);
  const [rateContext, setRateContext] = useState(null); // { jobId, contractorId, contractorName }
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) {
      navigation.navigate('Login');
      return;
    }

    // Listen to user's orders in real-time (simplified query to avoid index requirements)
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

      // Sort orders client-side by creation date (most recent first)
      orderList.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt - a.createdAt;
      });

      setOrders(orderList);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error('Error fetching orders:', error);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
  };

  const maybePromptRating = (order) => {
    if (order.status === 'completed' && order.contractorId) {
      setRateContext({ jobId: order.id, contractorId: order.contractorId, contractorName: order.contractorName });
      setShowRateModal(true);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#FF8F00';
      case 'assigned':
        return '#1E88E5';
      case 'in_progress':
        return '#9C27B0';
      case 'completed':
        return '#34A853';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'assigned':
        return 'Assigned';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  const getWasteTypeIcon = (wasteType) => {
    switch (wasteType) {
      case 'household':
        return 'home';
      case 'bulk':
        return 'cube';
      case 'yard':
        return 'leaf';
      case 'construction':
        return 'construct';
      case 'recyclables':
        return 'refresh';
      default:
        return 'trash';
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
              Alert.alert('Error', 'Failed to cancel order. Please try again.');
            }
          }
        },
      ]
    );
  };

  const renderOrderItem = ({ item }) => {
    const canCancel = ['pending', 'assigned'].includes(item.status);
    const canReorder = ['completed', 'cancelled'].includes(item.status);

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <View style={styles.orderTypeRow}>
              <Ionicons 
                name={getWasteTypeIcon(item.wasteType)} 
                size={20} 
                color="#34A853" 
              />
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
          <TouchableOpacity 
            style={styles.viewDetailsButton}
            onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
          >
            <Text style={styles.viewDetailsText}>View Details</Text>
          </TouchableOpacity>

          {canReorder && (
            <TouchableOpacity 
              style={styles.reorderButton}
              onPress={() => handleReorder(item)}
            >
              <Ionicons name="refresh" size={16} color="#34A853" />
              <Text style={styles.reorderText}>Reorder</Text>
            </TouchableOpacity>
          )}

          {canCancel && (
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => handleCancelOrder(item.id)}
            >
              <Ionicons name="close-circle" size={16} color="#EF4444" />
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}

          {item.status === 'completed' && (
            <TouchableOpacity 
              style={[styles.reorderButton, { backgroundColor: '#FFF7ED' }]}
              onPress={() => maybePromptRating(item)}
            >
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Text style={[styles.reorderText, { color: '#9A3412' }]}>Rate Contractor</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="basket-outline" size={64} color="#9CA3AF" />
      <Text style={styles.emptyStateTitle}>No Orders Yet</Text>
      <Text style={styles.emptyStateText}>
        When you place your first pickup order, it will appear here.
      </Text>
      <TouchableOpacity 
        style={styles.createOrderButton}
        onPress={() => navigation.navigate('CustomerDashboard')}
      >
        <Text style={styles.createOrderText}>Create Your First Order</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <SharedHeader 
        title="Order History"
        subtitle={`${orders.length} order${orders.length !== 1 ? 's' : ''} total`}
        showBackButton={true}
        showHomeButton={true}
      />

      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        style={styles.ordersList}
        contentContainerStyle={orders.length === 0 ? styles.emptyContainer : styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#34A853']}
            tintColor="#34A853"
          />
        }
        ListEmptyComponent={!loading ? renderEmptyState : null}
      />

      <RateUserModal
        visible={showRateModal}
        onClose={() => setShowRateModal(false)}
        title={rateContext?.contractorName ? `Rate ${rateContext.contractorName}` : 'Rate Contractor'}
        onSubmit={async ({ rating, review }) => {
          try {
            if (!rateContext || !auth.currentUser) return;
            await addDoc(collection(db, 'ratings'), {
              jobId: rateContext.jobId,
              raterId: auth.currentUser.uid,
              raterRole: 'customer',
              ratedUserId: rateContext.contractorId,
              rating,
              review: review || '',
              createdAt: serverTimestamp(),
            });
            const ratedUserRef = doc(db, 'users', rateContext.contractorId);
            await updateDoc(ratedUserRef, {
              'ratings.count': increment(1),
              'ratings.sum': increment(rating),
            });
          } catch (e) {
            console.error('Error submitting customer rating:', e);
          } finally {
            setShowRateModal(false);
            setRateContext(null);
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  ordersList: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderCard: {
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
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 8,
  },
  orderVolume: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  orderStatus: {
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
  orderPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  addressText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
    flex: 1,
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewDetailsButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
    textAlign: 'center',
  },
  reorderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9F4',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 4,
  },
  reorderText: {
    fontSize: 14,
    color: '#34A853',
    fontWeight: '600',
    marginLeft: 4,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 4,
  },
  cancelText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  createOrderButton: {
    backgroundColor: '#34A853',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  createOrderText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default OrderHistory;
