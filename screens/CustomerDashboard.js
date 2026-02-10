import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import SharedHeader from '../components/SharedHeader';
// import OrderBasket from '../components/OrderBasket'; // Removed OrderBasket
import LocationService from '../services/LocationService';
import { useUser } from '../contexts/UserContext';
import { db } from '../firebaseConfig';
import { collection, query, where, onSnapshot, orderBy, limit, doc, getDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

const CustomerDashboard = ({ navigation }) => {
  const { user } = useUser();
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [pricingData, setPricingData] = useState(null);
  const [loadingPricing, setLoadingPricing] = useState(true);

  useEffect(() => {
    // Initialize location service for customers (with Atlanta default)
    const initLocation = async () => {
      // Get current location (defaults to Atlanta if no permission)
      const location = await LocationService.getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
      }
    };

    initLocation();
  }, []);

  // Fetch pricing data from Firestore
  useEffect(() => {
    fetchPricingData();
  }, []);

  // Refetch pricing when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchPricingData();
    }, [])
  );

  const fetchPricingData = async () => {
    try {
      setLoadingPricing(true);
      const pricingDoc = await getDoc(doc(db, 'pricings', 'default'));
      
      if (pricingDoc.exists()) {
        console.log('Fetched pricing data:', pricingDoc.data());
        setPricingData(pricingDoc.data());
      } else {
        console.log('No pricing document found');
      }
    } catch (error) {
      console.error('Error fetching pricing:', error);
    } finally {
      setLoadingPricing(false);
    }
  };

  const wasteTypes = [
    { id: 'household', name: 'Household Trash', icon: 'home', color: '#34A853' },
    { id: 'bulk', name: 'Bulk Items', icon: 'cube', color: '#FF8F00' },
    { id: 'yard', name: 'Yard Waste', icon: 'leaf', color: '#4CAF50' },
    { id: 'construction', name: 'Construction Debris', icon: 'construct', color: '#795548' },
    { id: 'recyclables', name: 'Recyclables', icon: 'refresh', color: '#2196F3' },
  ];

  // Volume sizes from pricing data
  const volumeSizes = pricingData?.volumeOptions || [
    { id: '1-5_bags', name: '1-5 Bags', description: 'Small household bags', icon: 'bag', basePrice: 15 },
    { id: 'pickup_load', name: 'Pickup Load', description: 'Half truck bed', icon: 'car', basePrice: 45 },
    { id: 'trailer_load', name: 'Trailer Load', description: 'Full trailer', icon: 'bus', basePrice: 85 },
  ];

  // Fetch recent orders from Firestore
  useEffect(() => {
    if (!user) return;

    setLoadingOrders(true);
    const jobsRef = collection(db, 'jobs');
    const q = query(
      jobsRef,
      where('customerId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const orders = [];
      querySnapshot.forEach((doc) => {
        const jobData = doc.data();
        orders.push({
          id: doc.id,
          type: jobData.wasteType || 'General Waste',
          date: jobData.createdAt?.toDate ? jobData.createdAt.toDate().toLocaleDateString() : 'N/A',
          status: getStatusDisplay(jobData.status),
          amount: jobData.pricing?.total ? `$${jobData.pricing.total.toFixed(2)}` : '$0',
          statusColor: getStatusColor(jobData.status),
          rawStatus: jobData.status,
        });
      });
      setRecentOrders(orders);
      setLoadingOrders(false);
    }, (error) => {
      console.error('Error fetching recent orders:', error);
      setLoadingOrders(false);
    });

    return () => unsubscribe();
  }, [user]);

  const getStatusDisplay = (status) => {
    const statusMap = {
      'pending': 'Pending Payment',
      'paid': 'Paid',
      'available': 'Available',
      'accepted': 'Accepted',
      'scheduled': 'Scheduled',
      'in_progress': 'In Progress',
      'picked_up': 'Picked Up',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    const colorMap = {
      'pending': '#F59E0B',
      'paid': '#3B82F6',
      'available': '#8B5CF6',
      'accepted': '#6366F1',
      'scheduled': '#0EA5E9',
      'in_progress': '#F97316',
      'picked_up': '#FB923C',
      'completed': '#34A853',
      'cancelled': '#EF4444',
    };
    return colorMap[status] || '#6B7280';
  };

  const handleNewOrder = () => {
    setShowOrderModal(true);
  };

  const handleOrderType = (wasteType) => {
    setShowOrderModal(false);
    navigation.navigate('CreateOrder', { 
      wasteType,
      pricingData // Pass pricing data to CreateOrder
    });
  };

  return (
    <View style={styles.container}>
      <SharedHeader 
        title="Good morning!"
        subtitle="Ready for pickup?"
        showBackButton={false}
        rightComponent={
          <View style={styles.headerActions}>
            {/* Replaced OrderBasket with a recycling icon */}
            <TouchableOpacity style={styles.recyclingButton}>
              <Ionicons name="trash-bin-outline" size={24} color="#333" /> 
            </TouchableOpacity>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Order Section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.quickOrderButton} onPress={handleNewOrder}>
            <View style={styles.quickOrderContent}>
              <Ionicons name="add-circle" size={48} color="#34A853" />
              <View style={styles.quickOrderText}>
                <Text style={styles.quickOrderTitle}>Request Pickup</Text>
                <Text style={styles.quickOrderSubtitle}>Get trash picked up now or schedule later</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Services Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Services</Text>
          <View style={styles.servicesGrid}>
            {wasteTypes.slice(0, 4).map((service) => (
              <TouchableOpacity
                key={service.id}
                style={[styles.serviceCard, { borderColor: service.color }]}
                onPress={() => handleOrderType(service)}
              >
                <Ionicons name={service.icon} size={32} color={service.color} />
                <Text style={styles.serviceText}>{service.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Orders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity onPress={() => navigation.navigate('OrderHistory')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {loadingOrders ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#34A853" />
              <Text style={styles.loadingText}>Loading orders...</Text>
            </View>
          ) : recentOrders.length > 0 ? (
            recentOrders.map((order) => (
              <TouchableOpacity 
                key={order.id} 
                style={styles.orderCard}
                onPress={() => navigation.navigate('OrderHistory')}
              >
                <View style={styles.orderInfo}>
                  <Text style={styles.orderType}>{order.type}</Text>
                  <Text style={styles.orderDate}>{order.date}</Text>
                </View>
                <View style={styles.orderStatus}>
                  <Text style={styles.orderAmount}>{order.amount}</Text>
                  <Text style={[styles.statusText, { color: order.statusColor }]}>{order.status}</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>No orders yet</Text>
              <Text style={styles.emptyStateSubtext}>Your pickup history will appear here</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Order Type Modal */}
      <Modal
        visible={showOrderModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowOrderModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Waste Type</Text>
            <TouchableOpacity onPress={() => setShowOrderModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {wasteTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={styles.wasteTypeOption}
                onPress={() => handleOrderType(type)}
              >
                <View style={[styles.wasteTypeIcon, { backgroundColor: type.color }]}>
                  <Ionicons name={type.icon} size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.wasteTypeName}>{type.name}</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Added new style for recycling button
  recyclingButton: { 
    padding: 8,
  },
  notificationButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  seeAllText: {
    fontSize: 14,
    color: '#34A853',
    fontWeight: '600',
  },
  quickOrderButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quickOrderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickOrderText: {
    marginLeft: 16,
    flex: 1,
  },
  quickOrderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  quickOrderSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceText: {
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  orderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderInfo: {
    flex: 1,
  },
  orderType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  orderStatus: {
    alignItems: 'flex-end',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
    paddingTop: 16,
  },
  wasteTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  wasteTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  wasteTypeName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
});

export default CustomerDashboard;