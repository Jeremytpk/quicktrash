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
  Linking,
  Platform,
  Modal,
  SafeAreaView,
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
import SimpleLocationService from '../services/SimpleLocationService';
import MapView, { Marker, Circle } from './WebCompatibleMap';

const AvailableJobsList = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationService] = useState(() => new SimpleLocationService());
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [jobToAccept, setJobToAccept] = useState(null);
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [navigationJob, setNavigationJob] = useState(null);
  const [jobLocationPin, setJobLocationPin] = useState(null);

  // Get driver's current location
  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        const location = await locationService.getCurrentLocation();
        if (location) {
          setCurrentLocation(location);
          console.log('📍 Driver location obtained for job filtering:', location);
        }
      } catch (error) {
        console.error('❌ Error getting driver location:', error);
      }
    };

    getCurrentLocation();
  }, []);

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
            
            // Calculate real distance if driver location is available
            let jobCoordinates = null;
            if (jobData.location?.coordinates) {
              jobCoordinates = jobData.location.coordinates;
            } else if (jobData.pickupAddress?.coordinates) {
              jobCoordinates = jobData.pickupAddress.coordinates;
            }

            if (currentLocation && jobCoordinates && jobCoordinates.latitude && jobCoordinates.longitude) {
              jobData.distance = calculateRealDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                jobCoordinates.latitude,
                jobCoordinates.longitude
              );
            } else {
              // Fallback to mock distance if no location data
              jobData.distance = Math.floor(Math.random() * 15) + 1;
            }
            
            // Only include jobs within 5 miles of driver's location
            if (jobData.distance <= 5) {
              availableJobs.push(jobData);
              console.log(`✅ Job ${jobData.id} included - ${jobData.distance} miles away`);
            } else {
              console.log(`🚫 Job ${jobData.id} excluded - ${jobData.distance} miles away (>5mi)`);
            }
          });

          // Sort by distance (closest first)
          availableJobs.sort((a, b) => a.distance - b.distance);
          
          setJobs(availableJobs);
          setLoading(false);
          setRefreshing(false);
          
          console.log(`📋 Found ${availableJobs.length} jobs within 5 miles of driver`);
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
  }, [currentLocation]); // Re-fetch jobs when location changes

  const calculateRealDistance = (lat1, lon1, lat2, lon2) => {
    // Haversine formula to calculate distance between two points on Earth
    const R = 3959; // Earth's radius in miles
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in miles
    
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  const navigateToLocation = (job) => {
    // Check multiple possible location sources
    let coordinates = null;
    let address = 'Pickup Location';

    // Try different coordinate sources
    if (job.location?.coordinates) {
      coordinates = job.location.coordinates;
      address = job.location.address || address;
    } else if (job.pickupAddress?.coordinates) {
      coordinates = job.pickupAddress.coordinates;
      address = job.pickupAddress.fullAddress || job.pickupAddress.street || address;
    } else if (job.coordinates) {
      coordinates = job.coordinates;
    }

    if (!coordinates || !coordinates.latitude || !coordinates.longitude) {
      Alert.alert('Navigation Error', 'Job location coordinates not available.');
      console.log('Available job location data:', {
        location: job.location,
        pickupAddress: job.pickupAddress,
        coordinates: job.coordinates
      });
      return;
    }

    // Set up in-app navigation
    setNavigationJob(job);
    setJobLocationPin(coordinates);
    setShowNavigationModal(true);
  };

  const handleAcceptJob = async (jobId) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    
    setJobToAccept(job);
    setShowConfirmationModal(true);
  };

  const confirmJobAcceptance = async () => {
    if (!jobToAccept) return;

    try {
      const jobRef = doc(db, 'jobs', jobToAccept.id);
      await updateDoc(jobRef, {
        status: 'accepted',
        contractorId: auth.currentUser.uid,
        acceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setShowConfirmationModal(false);
      
      setTimeout(() => {
        Alert.alert(
          '🎉 Job Accepted!',
          `You accepted the ${jobToAccept.wasteType} pickup job. Opening navigation...`,
          [
            {
              text: 'Navigate Now',
              onPress: () => navigateToLocation(jobToAccept)
            }
          ]
        );
      }, 300);

    } catch (error) {
      console.error('Error accepting job:', error);
      Alert.alert('❌ Error', 'Failed to accept job. Please try again.');
    } finally {
      setJobToAccept(null);
    }
  };

  const cancelJobAcceptance = () => {
    setShowConfirmationModal(false);
    setJobToAccept(null);
  };

  const handlePinDragEnd = (coordinate) => {
    setJobLocationPin(coordinate);
    console.log('Pin moved to:', coordinate);
  };

  const confirmJobLocation = async () => {
    if (!navigationJob || !jobLocationPin) return;

    try {
      // Update job location in Firestore if pin was moved
      const jobRef = doc(db, 'jobs', navigationJob.id);
      await updateDoc(jobRef, {
        'pickupAddress.coordinates': jobLocationPin,
        updatedAt: serverTimestamp(),
      });

      Alert.alert(
        '📍 Location Updated',
        'Job pickup location has been updated successfully. You can now navigate to the corrected location.',
        [
          { text: 'OK', onPress: () => setShowNavigationModal(false) }
        ]
      );
    } catch (error) {
      console.error('Error updating job location:', error);
      Alert.alert('Error', 'Failed to update job location. Please try again.');
    }
  };

  const closeNavigation = () => {
    setShowNavigationModal(false);
    setNavigationJob(null);
    setJobLocationPin(null);
  };

  const openExternalNavigation = () => {
    if (!jobLocationPin) return;

    const address = navigationJob?.pickupAddress?.fullAddress || 
                   navigationJob?.location?.address || 
                   'Pickup Location';
    
    const url = Platform.select({
      ios: `maps:0,0?q=${jobLocationPin.latitude},${jobLocationPin.longitude}`,
      android: `geo:0,0?q=${jobLocationPin.latitude},${jobLocationPin.longitude}(${encodeURIComponent(address)})`,
      default: `https://www.google.com/maps/search/?api=1&query=${jobLocationPin.latitude},${jobLocationPin.longitude}`
    });

    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open external navigation app.');
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    
    // Update driver's location in case they've moved
    try {
      const location = await locationService.getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
        console.log('📍 Driver location refreshed for job filtering:', location);
      }
    } catch (error) {
      console.error('❌ Error refreshing driver location:', error);
    }
    
    // The real-time listener will automatically update the data based on new location
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
          <Text style={styles.acceptButtonText}>Accept & Navigate</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="map-outline" size={64} color="#9CA3AF" />
      <Text style={styles.emptyStateTitle}>No Jobs Within 5 Miles</Text>
      <Text style={styles.emptyStateDescription}>
        {currentLocation 
          ? "There are currently no pickup jobs within 5 miles of your location. Try refreshing or check back later."
          : "Getting your location to find nearby jobs..."
        }
      </Text>
      <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
        <Text style={styles.refreshButtonText}>Refresh Location</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#34A853" />
        <Text style={styles.loadingText}>
          {currentLocation 
            ? "Finding jobs within 5 miles..." 
            : "Getting your location..."
          }
        </Text>
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

      {/* Custom Job Acceptance Confirmation Modal */}
      <Modal 
        visible={showConfirmationModal} 
        animationType="fade" 
        transparent={true}
        onRequestClose={cancelJobAcceptance}
      >
        <View style={styles.confirmationOverlay}>
          <View style={styles.confirmationModal}>
            <View style={styles.confirmationHeader}>
              <View style={styles.confirmationIcon}>
                <Ionicons name="checkmark-circle" size={32} color="#34A853" />
              </View>
              <Text style={styles.confirmationTitle}>Accept This Job?</Text>
              <Text style={styles.confirmationSubtitle}>
                Review the details below before confirming
              </Text>
            </View>

            {jobToAccept && (
              <View style={styles.confirmationContent}>
                <View style={styles.jobConfirmationCard}>
                  <View style={styles.jobConfirmationHeader}>
                    <View style={styles.wasteTypeContainer}>
                      <Ionicons name="trash" size={20} color="#FFFFFF" />
                      <Text style={styles.wasteTypeText}>{jobToAccept.wasteType}</Text>
                    </View>
                    <View style={styles.urgencyContainer}>
                      <Text style={[
                        styles.urgencyText,
                        jobToAccept.isASAP ? styles.urgencyASAP : styles.urgencyScheduled
                      ]}>
                        {jobToAccept.isASAP ? 'ASAP' : 'SCHEDULED'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.jobConfirmationDetails}>
                    <View style={styles.confirmationDetailRow}>
                      <Ionicons name="cube-outline" size={18} color="#6B7280" />
                      <Text style={styles.confirmationDetailText}>{jobToAccept.volume}</Text>
                    </View>
                    
                    <View style={styles.confirmationDetailRow}>
                      <Ionicons name="location-outline" size={18} color="#6B7280" />
                      <Text style={styles.confirmationDetailText} numberOfLines={2}>
                        {jobToAccept.location?.address || jobToAccept.pickupAddress?.fullAddress || 'Address not specified'}
                      </Text>
                    </View>

                    <View style={styles.confirmationDetailRow}>
                      <Ionicons name="navigate-outline" size={18} color="#6B7280" />
                      <Text style={styles.confirmationDetailText}>{jobToAccept.distance} miles away</Text>
                    </View>

                    <View style={styles.earningsHighlight}>
                      <View style={styles.earningsRow}>
                        <Ionicons name="cash" size={24} color="#34A853" />
                        <View style={styles.earningsInfo}>
                          <Text style={styles.earningsAmount}>${jobToAccept.pricing?.contractorPayout || 'N/A'}</Text>
                          <Text style={styles.earningsLabel}>Your Earnings</Text>
                        </View>
                      </View>
                    </View>

                    {jobToAccept.pickupAddress?.instructions && (
                      <View style={styles.instructionsHighlight}>
                        <Ionicons name="information-circle" size={16} color="#2563EB" />
                        <Text style={styles.instructionsHighlightText}>
                          {jobToAccept.pickupAddress.instructions}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )}

            <View style={styles.confirmationActions}>
              <TouchableOpacity 
                style={styles.cancelConfirmationButton} 
                onPress={cancelJobAcceptance}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelConfirmationText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.acceptConfirmationButton} 
                onPress={confirmJobAcceptance}
                activeOpacity={0.8}
              >
                <Ionicons name="navigate" size={20} color="#FFFFFF" />
                <Text style={styles.acceptConfirmationText}>Accept & Navigate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* In-App Navigation Modal */}
      <Modal 
        visible={showNavigationModal} 
        animationType="slide" 
        presentationStyle="pageSheet"
        onRequestClose={closeNavigation}
      >
        <SafeAreaView style={styles.navigationModalContainer}>
          <View style={styles.navigationHeader}>
            <TouchableOpacity onPress={closeNavigation} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.navigationTitle}>Navigate to Pickup</Text>
            <TouchableOpacity onPress={openExternalNavigation} style={styles.externalNavButton}>
              <Ionicons name="navigate-outline" size={20} color="#3B82F6" />
            </TouchableOpacity>
          </View>

          {navigationJob && currentLocation && jobLocationPin && (
            <View style={styles.navigationMapContainer}>
              <MapView
                style={styles.navigationMap}
                initialRegion={{
                  latitude: (currentLocation.latitude + jobLocationPin.latitude) / 2,
                  longitude: (currentLocation.longitude + jobLocationPin.longitude) / 2,
                  latitudeDelta: Math.abs(currentLocation.latitude - jobLocationPin.latitude) * 2.5 || 0.02,
                  longitudeDelta: Math.abs(currentLocation.longitude - jobLocationPin.longitude) * 2.5 || 0.02,
                }}
                showsUserLocation={false}
                showsMyLocationButton={false}
              >
                {/* Contractor's current location */}
                <Marker
                  coordinate={{
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                  }}
                  title="Your Location"
                  description="Current position"
                >
                  <View style={styles.contractorMarker}>
                    <View style={styles.contractorMarkerInner}>
                      <Ionicons name="car" size={16} color="#FFFFFF" />
                    </View>
                  </View>
                </Marker>

                {/* Job pickup location (draggable) */}
                <Marker
                  coordinate={jobLocationPin}
                  title="Pickup Location"
                  description="Drag to adjust location"
                  draggable={true}
                  onDragEnd={(e) => handlePinDragEnd(e.nativeEvent.coordinate)}
                >
                  <View style={styles.jobMarker}>
                    <View style={styles.jobMarkerInner}>
                      <Ionicons name="location" size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.jobMarkerStem} />
                  </View>
                </Marker>
              </MapView>

              {/* Navigation Info Card */}
              <View style={styles.navigationInfoCard}>
                <View style={styles.navigationInfoHeader}>
                  <View style={styles.jobTypeIndicator}>
                    <Ionicons name="trash" size={16} color="#FFFFFF" />
                    <Text style={styles.jobTypeIndicatorText}>{navigationJob.wasteType}</Text>
                  </View>
                  <Text style={styles.navigationDistance}>
                    {jobLocationPin && currentLocation ? 
                      `${calculateRealDistance(
                        currentLocation.latitude,
                        currentLocation.longitude,
                        jobLocationPin.latitude,
                        jobLocationPin.longitude
                      )} miles` 
                      : 'Calculating...'}
                  </Text>
                </View>

                <View style={styles.addressContainer}>
                  <Ionicons name="location-outline" size={16} color="#6B7280" />
                  <Text style={styles.navigationAddress} numberOfLines={2}>
                    {navigationJob.pickupAddress?.fullAddress || 
                     navigationJob.location?.address || 
                     'Address not specified'}
                  </Text>
                </View>

                <View style={styles.navigationInstructions}>
                  <Ionicons name="information-circle-outline" size={16} color="#3B82F6" />
                  <Text style={styles.instructionsText}>
                    Drag the red pin to adjust pickup location if needed
                  </Text>
                </View>

                <View style={styles.navigationActions}>
                  <TouchableOpacity 
                    style={styles.confirmLocationButton} 
                    onPress={confirmJobLocation}
                  >
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    <Text style={styles.confirmLocationText}>Confirm Location</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.externalNavFullButton} 
                    onPress={openExternalNavigation}
                  >
                    <Ionicons name="navigate" size={18} color="#3B82F6" />
                    <Text style={styles.externalNavFullText}>Open External GPS</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>
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
  // Custom Confirmation Modal Styles
  confirmationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmationModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  confirmationHeader: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  confirmationIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#BBF7D0',
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmationSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  confirmationContent: {
    paddingHorizontal: 24,
  },
  jobConfirmationCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  jobConfirmationHeader: {
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  wasteTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wasteTypeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
    textTransform: 'capitalize',
  },
  urgencyContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  urgencyASAP: {
    color: '#FEF3C7',
  },
  urgencyScheduled: {
    color: '#DBEAFE',
  },
  jobConfirmationDetails: {
    padding: 20,
  },
  confirmationDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmationDetailText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
    lineHeight: 22,
  },
  earningsHighlight: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  earningsInfo: {
    marginLeft: 12,
  },
  earningsAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#15803D',
    lineHeight: 28,
  },
  earningsLabel: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
  },
  instructionsHighlight: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  instructionsHighlightText: {
    fontSize: 14,
    color: '#1E40AF',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  confirmationActions: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
  },
  cancelConfirmationButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelConfirmationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  acceptConfirmationButton: {
    flex: 2,
    backgroundColor: '#34A853',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#34A853',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptConfirmationText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  // In-App Navigation Modal Styles
  navigationModalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  navigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  closeButton: {
    padding: 8,
  },
  navigationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  externalNavButton: {
    padding: 8,
  },
  navigationMapContainer: {
    flex: 1,
  },
  navigationMap: {
    flex: 1,
  },
  contractorMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contractorMarkerInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#34A853',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  jobMarker: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  jobMarkerInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  jobMarkerStem: {
    width: 2,
    height: 8,
    backgroundColor: '#EF4444',
    marginTop: -1,
  },
  navigationInfoCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  navigationInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  jobTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  jobTypeIndicatorText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    textTransform: 'capitalize',
  },
  navigationDistance: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34A853',
  },
  navigationAddress: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
    lineHeight: 22,
  },
  navigationInstructions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  instructionsText: {
    fontSize: 14,
    color: '#1E40AF',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  navigationActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  confirmLocationButton: {
    flex: 2,
    backgroundColor: '#34A853',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#34A853',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  confirmLocationText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  externalNavFullButton: {
    flex: 1,
    backgroundColor: '#F0F9FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  externalNavFullText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default AvailableJobsList;
