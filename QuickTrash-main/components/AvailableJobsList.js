import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';

const AvailableJobsList = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const fetchAvailableJobs = () => {
      try {
        // Query for available jobs
        const jobsQuery = query(
          collection(db, 'jobs'),
          where('status', '==', 'available')
        );

        const unsubscribe = onSnapshot(jobsQuery, (snapshot) => {
          const availableJobs = [];
          snapshot.forEach((doc) => {
            const jobData = { id: doc.id, ...doc.data() };
            
            // Calculate distance if location is available (mock for now)
            jobData.distance = calculateDistance(jobData.location);
            
            availableJobs.push(jobData);
          });

          // Sort by distance (closest first)
          availableJobs.sort((a, b) => a.distance - b.distance);
          
          setJobs(availableJobs);
          setLoading(false);
          setRefreshing(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error fetching jobs:', error);
        setLoading(false);
        setRefreshing(false);
      }
    };

    const unsubscribe = fetchAvailableJobs();
    return () => unsubscribe && unsubscribe();
  }, []);

  const calculateDistance = (location) => {
    // Mock distance calculation - in real app, use GPS location
    // This would calculate distance between contractor location and job location
    return Math.floor(Math.random() * 15) + 1; // 1-15 miles
  };

  const handleAcceptJob = async (jobId) => {
    try {
      const jobRef = doc(db, 'jobs', jobId);
      await updateDoc(jobRef, {
        status: 'assigned',
        contractorId: auth.currentUser.uid,
        assignedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      Alert.alert(
        'Success!', 
        'Job accepted successfully! You can now view it in "My Jobs".',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error accepting job:', error);
      Alert.alert('Error', 'Failed to accept job. Please try again.');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    // The real-time listener will automatically update the data
  };

  const getJobTypeIcon = (type) => {
    switch (type) {
      case 'household': return 'home-outline';
      case 'bulk': return 'cube-outline';
      case 'yard': return 'leaf-outline';
      case 'construction': return 'construct-outline';
      case 'recyclables': return 'refresh-outline';
      default: return 'trash-outline';
    }
  };

  const getJobTypeColor = (type) => {
    switch (type) {
      case 'household': return '#10B981';
      case 'bulk': return '#F59E0B';
      case 'yard': return '#059669';
      case 'construction': return '#DC2626';
      case 'recyclables': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const formatEstimatedEarnings = (basePrice, serviceType) => {
    // Mock earnings calculation based on job type and distance
    const baseEarning = basePrice * 0.7; // 70% of job price goes to contractor
    return `$${baseEarning.toFixed(2)}`;
  };

  const renderJobCard = ({ item }) => (
    <View style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <View style={styles.jobTypeSection}>
          <View style={[styles.jobTypeIcon, { backgroundColor: getJobTypeColor(item.wasteType) }]}>
            <Ionicons 
              name={getJobTypeIcon(item.wasteType)} 
              size={20} 
              color="white" 
            />
          </View>
          <View style={styles.jobTypeInfo}>
            <Text style={styles.jobType}>
              {item.wasteType?.charAt(0).toUpperCase() + item.wasteType?.slice(1)} Waste
            </Text>
            <Text style={styles.jobVolume}>{item.volume} • {item.distance} miles away</Text>
          </View>
        </View>
        
        <View style={styles.earningsSection}>
          <Text style={styles.earningsLabel}>Est. Earnings</Text>
          <Text style={styles.earningsAmount}>
            {formatEstimatedEarnings(item.totalPrice)}
          </Text>
        </View>
      </View>

      <View style={styles.jobDetails}>
        <View style={styles.locationSection}>
          <Ionicons name="location-outline" size={16} color="#6B7280" />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.location?.address || 'Address not specified'}
          </Text>
        </View>
        
        <View style={styles.timeSection}>
          <Ionicons name="time-outline" size={16} color="#6B7280" />
          <Text style={styles.timeText}>
            {item.preferredTime === 'asap' ? 'ASAP' : item.preferredTime}
          </Text>
        </View>
      </View>

      {item.notes && (
        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>Notes:</Text>
          <Text style={styles.notesText} numberOfLines={2}>
            {item.notes}
          </Text>
        </View>
      )}

      <View style={styles.jobActions}>
        <TouchableOpacity 
          style={styles.viewDetailsButton}
          onPress={() => {/* Navigate to job details */}}
        >
          <Text style={styles.viewDetailsText}>View Details</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.acceptButton}
          onPress={() => handleAcceptJob(item.id)}
        >
          <Ionicons name="checkmark-circle" size={20} color="white" />
          <Text style={styles.acceptButtonText}>Accept Job</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="briefcase-outline" size={64} color="#9CA3AF" />
      <Text style={styles.emptyStateTitle}>No Jobs Available</Text>
      <Text style={styles.emptyStateDescription}>
        Check back later for new pickup opportunities in your area.
      </Text>
      <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#34A853" />
        <Text style={styles.loadingText}>Loading available jobs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={jobs}
        renderItem={renderJobCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={jobs.length === 0 ? styles.emptyContainer : styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#34A853']}
            tintColor="#34A853"
          />
        }
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  jobCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  jobTypeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  jobTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  jobTypeInfo: {
    flex: 1,
  },
  jobType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  jobVolume: {
    fontSize: 14,
    color: '#6B7280',
  },
  earningsSection: {
    alignItems: 'flex-end',
  },
  earningsLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  earningsAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  jobDetails: {
    marginBottom: 16,
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
    flex: 1,
  },
  timeSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
  },
  notesSection: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  jobActions: {
    flexDirection: 'row',
    gap: 12,
  },
  viewDetailsButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#34A853',
    gap: 8,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  emptyState: {
    alignItems: 'center',
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
    marginBottom: 24,
    lineHeight: 24,
  },
  refreshButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#34A853',
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});

export default AvailableJobsList;
