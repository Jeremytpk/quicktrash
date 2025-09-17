import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Circle } from 'react-native-maps';
import SharedHeader from '../components/SharedHeader';

const { width, height } = Dimensions.get('window');

const OperationsCommandCenter = ({ navigation }) => {
  const [activePickups, setActivePickups] = useState([]);
  const [availableContractors, setAvailableContractors] = useState([]);
  const [serviceMetrics, setServiceMetrics] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showMetricsModal, setShowMetricsModal] = useState(false);

  useEffect(() => {
    loadOperationsData();
  }, []);

  const loadOperationsData = async () => {
    try {
      // Mock data - in production, this would fetch from real-time APIs
      const mockData = {
        activePickups: [
          {
            id: 'PU001',
            customerName: 'Sarah Johnson',
            address: '123 Main St, Atlanta, GA',
            pickupTime: '2:15 PM',
            contractorId: 'C001',
            contractorName: 'John Smith',
            status: 'in_progress',
            priority: 'normal',
            coordinates: { latitude: 33.7490, longitude: -84.3880 },
            estimatedCompletion: '2:45 PM',
            trashType: 'Household',
            estimatedValue: 25.00,
          },
          {
            id: 'PU002',
            customerName: 'Mike Davis',
            address: '456 Oak Ave, Atlanta, GA',
            pickupTime: '2:30 PM',
            contractorId: 'C002',
            contractorName: 'Emily Wilson',
            status: 'assigned',
            priority: 'high',
            coordinates: { latitude: 33.7601, longitude: -84.3907 },
            estimatedCompletion: '3:00 PM',
            trashType: 'Bulk Items',
            estimatedValue: 45.00,
          },
          {
            id: 'PU003',
            customerName: 'David Brown',
            address: '789 Pine St, Atlanta, GA',
            pickupTime: '3:00 PM',
            contractorId: null,
            contractorName: null,
            status: 'pending',
            priority: 'normal',
            coordinates: { latitude: 33.7483, longitude: -84.3911 },
            estimatedCompletion: '3:30 PM',
            trashType: 'Yard Waste',
            estimatedValue: 30.00,
          },
        ],
        availableContractors: [
          {
            id: 'C003',
            name: 'Alex Rodriguez',
            rating: 4.8,
            location: { latitude: 33.7550, longitude: -84.3850 },
            vehicleType: 'Pickup Truck',
            capacity: 'Large',
            earnings: 125.50,
            jobsCompleted: 45,
            status: 'available',
            lastActive: '2 minutes ago',
          },
          {
            id: 'C004',
            name: 'Lisa Chen',
            rating: 4.6,
            location: { latitude: 33.7400, longitude: -84.3950 },
            vehicleType: 'Van',
            capacity: 'Medium',
            earnings: 98.75,
            jobsCompleted: 32,
            status: 'available',
            lastActive: '5 minutes ago',
          },
        ],
        serviceMetrics: {
          totalPickupsToday: 127,
          averageCompletionTime: 28,
          customerSatisfaction: 4.7,
          activeContractors: 23,
          pendingPickups: 8,
          revenueToday: 2847.50,
          completionRate: 96.8,
        },
        alerts: [
          {
            id: 'A001',
            type: 'warning',
            title: 'High Demand Zone',
            message: 'Downtown Atlanta experiencing 3x normal demand',
            timestamp: '2:20 PM',
            action: 'Surge pricing activated',
          },
          {
            id: 'A002',
            type: 'info',
            title: 'Contractor Alert',
            message: 'John Smith (C001) running 15 minutes behind',
            timestamp: '2:10 PM',
            action: 'Customer notified',
          },
          {
            id: 'A003',
            type: 'success',
            title: 'Quality Achievement',
            message: 'Zero complaints in last 2 hours',
            timestamp: '1:45 PM',
            action: 'Team congratulated',
          },
        ],
      };

      setActivePickups(mockData.activePickups);
      setAvailableContractors(mockData.availableContractors);
      setServiceMetrics(mockData.serviceMetrics);
      setAlerts(mockData.alerts);
      setRefreshing(false);
    } catch (error) {
      console.error('Error loading operations data:', error);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOperationsData();
  };

  const handlePickupAction = (pickupId, action) => {
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${action} pickup ${pickupId}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            console.log(`${action} pickup ${pickupId}`);
            Alert.alert('Success', `Pickup ${pickupId} ${action}ed successfully`);
          }
        }
      ]
    );
  };

  const assignContractor = (pickupId, contractorId) => {
    Alert.alert(
      'Assign Contractor',
      `Assign contractor to pickup ${pickupId}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign',
          onPress: () => {
            console.log(`Assigning contractor ${contractorId} to pickup ${pickupId}`);
            Alert.alert('Success', 'Contractor assigned successfully');
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'assigned': return '#3B82F6';
      case 'in_progress': return '#34A853';
      case 'completed': return '#6B7280';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'normal': return '#34A853';
      case 'low': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const renderPickupCard = (pickup) => (
    <View key={pickup.id} style={[styles.pickupCard, { borderLeftColor: getStatusColor(pickup.status) }]}>
      <View style={styles.pickupHeader}>
        <View style={styles.pickupInfo}>
          <Text style={styles.pickupId}>#{pickup.id}</Text>
          <Text style={styles.customerName}>{pickup.customerName}</Text>
          <Text style={styles.pickupAddress}>{pickup.address}</Text>
        </View>
        <View style={styles.pickupMeta}>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(pickup.priority) }]}>
            <Text style={styles.priorityText}>{pickup.priority.toUpperCase()}</Text>
          </View>
          <Text style={styles.estimatedValue}>${pickup.estimatedValue}</Text>
        </View>
      </View>

      <View style={styles.pickupDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>Scheduled: {pickup.pickupTime}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="trash-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>Type: {pickup.trashType}</Text>
        </View>
        {pickup.contractorName && (
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>Contractor: {pickup.contractorName}</Text>
          </View>
        )}
      </View>

      <View style={styles.pickupActions}>
        {pickup.status === 'pending' && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.assignButton]}
            onPress={() => assignContractor(pickup.id, 'C003')}
          >
            <Text style={styles.actionButtonText}>Assign Contractor</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.viewButton]}
          onPress={() => navigation.navigate('PickupDetails', { pickupId: pickup.id })}
        >
          <Text style={styles.actionButtonText}>View Details</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.contactButton]}
          onPress={() => handlePickupAction(pickup.id, 'contact')}
        >
          <Text style={styles.actionButtonText}>Contact</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderContractorCard = (contractor) => (
    <View key={contractor.id} style={styles.contractorCard}>
      <View style={styles.contractorHeader}>
        <View style={styles.contractorInfo}>
          <Text style={styles.contractorName}>{contractor.name}</Text>
          <Text style={styles.contractorVehicle}>{contractor.vehicleType}</Text>
        </View>
        <View style={styles.contractorRating}>
          <Ionicons name="star" size={16} color="#FFB300" />
          <Text style={styles.ratingValue}>{contractor.rating}</Text>
        </View>
      </View>

      <View style={styles.contractorDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="car-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>Capacity: {contractor.capacity}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>Today: ${contractor.earnings}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>Last active: {contractor.lastActive}</Text>
        </View>
      </View>

      <View style={styles.contractorActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.assignButton]}
          onPress={() => navigation.navigate('ContractorDetails', { contractorId: contractor.id })}
        >
          <Text style={styles.actionButtonText}>View Profile</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.contactButton]}
          onPress={() => handlePickupAction(contractor.id, 'contact')}
        >
          <Text style={styles.actionButtonText}>Contact</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAlert = (alert) => (
    <View key={alert.id} style={[styles.alertCard, { borderLeftColor: getStatusColor(alert.type) }]}>
      <View style={styles.alertHeader}>
        <Text style={styles.alertTitle}>{alert.title}</Text>
        <Text style={styles.alertTime}>{alert.timestamp}</Text>
      </View>
      <Text style={styles.alertMessage}>{alert.message}</Text>
      <Text style={styles.alertAction}>Action: {alert.action}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <SharedHeader 
        title="Operations Command Center" 
        subtitle="Real-time monitoring and control"
        showBackButton 
        rightComponent={
          <TouchableOpacity 
            style={styles.metricsButton}
            onPress={() => setShowMetricsModal(true)}
          >
            <Ionicons name="analytics" size={24} color="#34A853" />
          </TouchableOpacity>
        }
      />

      {/* Service Metrics */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{serviceMetrics.totalPickupsToday}</Text>
          <Text style={styles.metricLabel}>Pickups Today</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{serviceMetrics.activeContractors}</Text>
          <Text style={styles.metricLabel}>Active Contractors</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{serviceMetrics.completionRate}%</Text>
          <Text style={styles.metricLabel}>Completion Rate</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>${serviceMetrics.revenueToday}</Text>
          <Text style={styles.metricLabel}>Revenue Today</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterButton, selectedFilter === 'all' && styles.filterButtonActive]}
          onPress={() => setSelectedFilter('all')}
        >
          <Text style={[styles.filterButtonText, selectedFilter === 'all' && styles.filterButtonTextActive]}>
            All Pickups
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, selectedFilter === 'pending' && styles.filterButtonActive]}
          onPress={() => setSelectedFilter('pending')}
        >
          <Text style={[styles.filterButtonText, selectedFilter === 'pending' && styles.filterButtonTextActive]}>
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, selectedFilter === 'in_progress' && styles.filterButtonActive]}
          onPress={() => setSelectedFilter('in_progress')}
        >
          <Text style={[styles.filterButtonText, selectedFilter === 'in_progress' && styles.filterButtonTextActive]}>
            In Progress
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, selectedFilter === 'high_priority' && styles.filterButtonActive]}
          onPress={() => setSelectedFilter('high_priority')}
        >
          <Text style={[styles.filterButtonText, selectedFilter === 'high_priority' && styles.filterButtonTextActive]}>
            High Priority
          </Text>
        </TouchableOpacity>
      </ScrollView>

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
        {/* Active Pickups */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Pickups</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {activePickups
            .filter(pickup => selectedFilter === 'all' || 
              (selectedFilter === 'high_priority' ? pickup.priority === 'high' : pickup.status === selectedFilter))
            .map(renderPickupCard)}
        </View>

        {/* Available Contractors */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Contractors</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {availableContractors.map(renderContractorCard)}
        </View>

        {/* System Alerts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>System Alerts</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {alerts.map(renderAlert)}
        </View>
      </ScrollView>

      {/* Metrics Modal */}
      <Modal
        visible={showMetricsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMetricsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detailed Metrics</Text>
              <TouchableOpacity onPress={() => setShowMetricsModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.metricsDetail}>
              <View style={styles.metricDetailCard}>
                <Text style={styles.metricDetailTitle}>Performance Metrics</Text>
                <View style={styles.metricDetailRow}>
                  <Text style={styles.metricDetailLabel}>Average Completion Time:</Text>
                  <Text style={styles.metricDetailValue}>{serviceMetrics.averageCompletionTime} minutes</Text>
                </View>
                <View style={styles.metricDetailRow}>
                  <Text style={styles.metricDetailLabel}>Customer Satisfaction:</Text>
                  <Text style={styles.metricDetailValue}>{serviceMetrics.customerSatisfaction}/5.0</Text>
                </View>
                <View style={styles.metricDetailRow}>
                  <Text style={styles.metricDetailLabel}>Completion Rate:</Text>
                  <Text style={styles.metricDetailValue}>{serviceMetrics.completionRate}%</Text>
                </View>
              </View>

              <View style={styles.metricDetailCard}>
                <Text style={styles.metricDetailTitle}>Revenue Metrics</Text>
                <View style={styles.metricDetailRow}>
                  <Text style={styles.metricDetailLabel}>Today's Revenue:</Text>
                  <Text style={styles.metricDetailValue}>${serviceMetrics.revenueToday}</Text>
                </View>
                <View style={styles.metricDetailRow}>
                  <Text style={styles.metricDetailLabel}>Average Order Value:</Text>
                  <Text style={styles.metricDetailValue}>$22.40</Text>
                </View>
                <View style={styles.metricDetailRow}>
                  <Text style={styles.metricDetailLabel}>Revenue Growth:</Text>
                  <Text style={[styles.metricDetailValue, { color: '#34A853' }]}>+12.5%</Text>
                </View>
              </View>
            </ScrollView>
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
  metricsButton: {
    padding: 8,
  },
  metricsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
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
  pickupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pickupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  pickupInfo: {
    flex: 1,
  },
  pickupId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  pickupAddress: {
    fontSize: 12,
    color: '#6B7280',
  },
  pickupMeta: {
    alignItems: 'flex-end',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  estimatedValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34A853',
  },
  pickupDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  pickupActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  contractorCard: {
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
  contractorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  contractorInfo: {
    flex: 1,
  },
  contractorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  contractorVehicle: {
    fontSize: 14,
    color: '#6B7280',
  },
  contractorRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 4,
  },
  contractorDetails: {
    marginBottom: 16,
  },
  contractorActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  assignButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  viewButton: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#34A853',
  },
  contactButton: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  alertTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  alertMessage: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 4,
  },
  alertAction: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
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
    width: width * 0.9,
    height: height * 0.8,
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  metricsDetail: {
    flex: 1,
    padding: 20,
  },
  metricDetailCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  metricDetailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  metricDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  metricDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
});

export default OperationsCommandCenter;
