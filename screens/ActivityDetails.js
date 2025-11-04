import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SharedHeader from '../components/SharedHeader';
import { db } from '../firebaseConfig';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const ActivityDetails = ({ navigation, route }) => {
  const { activity } = route.params;
  const [loading, setLoading] = useState(false);
  const [activityDetails, setActivityDetails] = useState(activity);
  const [contractorInfo, setContractorInfo] = useState(null);
  const [customerInfo, setCustomerInfo] = useState(null);

  useEffect(() => {
    fetchActivityDetails();
  }, []);

  const fetchActivityDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch contractor info
      if (activity.contractorId) {
        const contractorDoc = await getDoc(doc(db, 'users', activity.contractorId));
        if (contractorDoc.exists()) {
          setContractorInfo(contractorDoc.data());
        }
      }

      // Fetch customer info
      if (activity.customerId) {
        const customerDoc = await getDoc(doc(db, 'users', activity.customerId));
        if (customerDoc.exists()) {
          setCustomerInfo(customerDoc.data());
        }
      }

      // If it's a job activity, fetch full job details
      if (activity.type === 'job') {
        const jobDoc = await getDoc(doc(db, 'jobs', activity.id));
        if (jobDoc.exists()) {
          setActivityDetails(jobDoc.data());
        }
      }

    } catch (error) {
      console.error('Error fetching activity details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = (newStatus) => {
    Alert.alert(
      'Update Status',
      `Are you sure you want to change the status to "${newStatus}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Update', onPress: () => updateActivityStatus(newStatus) }
      ]
    );
  };

  const updateActivityStatus = async (newStatus) => {
    try {
      setLoading(true);
      
      if (activity.type === 'job') {
        const jobRef = doc(db, 'jobs', activity.id);
        await updateDoc(jobRef, {
          status: newStatus,
          updatedAt: serverTimestamp()
        });
      }

      setActivityDetails(prev => ({ ...prev, status: newStatus }));
      Alert.alert('Success', 'Status updated successfully');
      
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'in_progress': return '#F59E0B';
      case 'pending': return '#6B7280';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const renderJobDetails = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Job Details</Text>
      
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Job ID:</Text>
        <Text style={styles.detailValue}>{activity.id}</Text>
      </View>
      
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Waste Type:</Text>
        <Text style={styles.detailValue}>{activityDetails.wasteType || 'N/A'}</Text>
      </View>
      
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Status:</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(activityDetails.status) }]}>
          <Text style={styles.statusText}>{activityDetails.status}</Text>
        </View>
      </View>
      
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Amount:</Text>
        <Text style={[styles.detailValue, { color: '#10B981', fontWeight: '600' }]}>
          ${activityDetails.pricing?.total?.toFixed(2) || '0.00'}
        </Text>
      </View>
      
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Created:</Text>
        <Text style={styles.detailValue}>{formatDate(activityDetails.createdAt)}</Text>
      </View>
      
      {activityDetails.updatedAt && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Last Updated:</Text>
          <Text style={styles.detailValue}>{formatDate(activityDetails.updatedAt)}</Text>
        </View>
      )}
    </View>
  );

  const renderLocationDetails = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Location</Text>
      
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Address:</Text>
        <Text style={styles.detailValue}>
          {activityDetails.pickupAddress?.street || 'N/A'}
        </Text>
      </View>
      
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>City:</Text>
        <Text style={styles.detailValue}>
          {activityDetails.pickupAddress?.city || 'N/A'}
        </Text>
      </View>
      
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>State:</Text>
        <Text style={styles.detailValue}>
          {activityDetails.pickupAddress?.state || 'N/A'}
        </Text>
      </View>
      
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>ZIP Code:</Text>
        <Text style={styles.detailValue}>
          {activityDetails.pickupAddress?.zipCode || 'N/A'}
        </Text>
      </View>
    </View>
  );

  const renderContractorDetails = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Contractor Information</Text>
      
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Name:</Text>
        <Text style={styles.detailValue}>
          {contractorInfo?.displayName || 'Unknown'}
        </Text>
      </View>
      
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Email:</Text>
        <Text style={styles.detailValue}>
          {contractorInfo?.email || 'N/A'}
        </Text>
      </View>
      
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Phone:</Text>
        <Text style={styles.detailValue}>
          {contractorInfo?.phoneNumber || 'N/A'}
        </Text>
      </View>
      
      {contractorInfo?.contractorData?.vehicleInfo && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Vehicle:</Text>
          <Text style={styles.detailValue}>
            {contractorInfo.contractorData.vehicleInfo.make} {contractorInfo.contractorData.vehicleInfo.model}
          </Text>
        </View>
      )}
    </View>
  );

  const renderCustomerDetails = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Customer Information</Text>
      
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Name:</Text>
        <Text style={styles.detailValue}>
          {customerInfo?.displayName || 'Unknown'}
        </Text>
      </View>
      
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Email:</Text>
        <Text style={styles.detailValue}>
          {customerInfo?.email || 'N/A'}
        </Text>
      </View>
      
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Phone:</Text>
        <Text style={styles.detailValue}>
          {customerInfo?.phoneNumber || 'N/A'}
        </Text>
      </View>
    </View>
  );

  const renderRatingDetails = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Rating Details</Text>
      
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Rating:</Text>
        <View style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= activityDetails.rating ? 'star' : 'star-outline'}
              size={20}
              color="#F59E0B"
            />
          ))}
          <Text style={styles.ratingText}>({activityDetails.rating}/5)</Text>
        </View>
      </View>
      
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Review:</Text>
        <Text style={styles.detailValue}>
          {activityDetails.review || 'No review provided'}
        </Text>
      </View>
      
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Date:</Text>
        <Text style={styles.detailValue}>{formatDate(activityDetails.createdAt)}</Text>
      </View>
    </View>
  );

  const renderStatusActions = () => {
    if (activity.type !== 'job') return null;

    const statusOptions = ['pending', 'in_progress', 'completed', 'cancelled'];
    const currentStatus = activityDetails.status;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status Actions</Text>
        <View style={styles.actionsContainer}>
          {statusOptions.map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.actionButton,
                currentStatus === status && styles.activeActionButton
              ]}
              onPress={() => handleStatusUpdate(status)}
              disabled={currentStatus === status}
            >
              <Text style={[
                styles.actionButtonText,
                currentStatus === status && styles.activeActionButtonText
              ]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <SharedHeader 
        title="Activity Details" 
        showBackButton 
        subtitle={activity.title}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Activity Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerIcon}>
            <Ionicons 
              name={activity.type === 'job' ? 'briefcase' : 'star'} 
              size={32} 
              color="#3B82F6" 
            />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{activity.title}</Text>
            <Text style={styles.headerDescription}>{activity.description}</Text>
            <View style={[styles.headerStatus, { backgroundColor: getStatusColor(activityDetails.status) }]}>
              <Text style={styles.headerStatusText}>{activityDetails.status}</Text>
            </View>
          </View>
        </View>

        {/* Activity Details */}
        {activity.type === 'job' ? renderJobDetails() : renderRatingDetails()}
        
        {/* Location Details (for jobs) */}
        {activity.type === 'job' && renderLocationDetails()}
        
        {/* Contractor Details */}
        {contractorInfo && renderContractorDetails()}
        
        {/* Customer Details */}
        {customerInfo && renderCustomerDetails()}
        
        {/* Status Actions (for jobs) */}
        {renderStatusActions()}
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
  headerCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  headerStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
    color: '#1F2937',
    marginLeft: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeActionButton: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeActionButtonText: {
    color: '#FFFFFF',
  },
});

export default ActivityDetails;
