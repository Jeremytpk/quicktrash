import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
  Alert,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, query, where, updateDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import SharedHeader from '../components/SharedHeader';
import * as Location from 'expo-location';
import { auth } from '../firebaseConfig';
import MapView, { Marker, Circle } from '../components/WebCompatibleMap';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const formatDate = (timestamp) => {
  if (!timestamp || !timestamp.toDate) return 'N/A';
  return timestamp.toDate().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const ContractorDashboard = ({ navigation }) => {
  const [isOnline, setIsOnline] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [activeJob, setActiveJob] = useState(null);
  const [countdown, setCountdown] = useState(40);
  const [showJobsContainer, setShowJobsContainer] = useState(true);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [jobToAccept, setJobToAccept] = useState(null);
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [navigationJob, setNavigationJob] = useState(null);
  const [jobLocationPin, setJobLocationPin] = useState(null);
  const [isWithinPickupRange, setIsWithinPickupRange] = useState(false);
  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isLocationTracking, setIsLocationTracking] = useState(false);
  const [mapRegion, setMapRegion] = useState(null);
  const isInitialLoad = useRef(true); // Ref to track the first load
  const locationSubscription = useRef(null);
  const mapRef = useRef(null);

  // Location tracking functions
  const startLocationTracking = async () => {
    try {
      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied');
        Alert.alert('Permission Required', 'Location access is required to receive job offers and track your position.');
        return;
      }

      // Get current location first
      const currentPos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const locationData = {
        latitude: currentPos.coords.latitude,
        longitude: currentPos.coords.longitude,
        accuracy: currentPos.coords.accuracy,
        timestamp: new Date(),
      };
      
      setCurrentLocation(locationData);
      setMapRegion({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
      await updateLocationInFirestore(locationData);

      // Start watching position
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 10, // Update when moved 10 meters
        },
        (position) => {
          const newLocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(),
          };
          
          setCurrentLocation(newLocationData);
          setMapRegion({
            latitude: newLocationData.latitude,
            longitude: newLocationData.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          });
          updateLocationInFirestore(newLocationData);
          
          // Check pickup range if navigation is active
          if (showNavigationModal && jobLocationPin) {
            checkPickupRange();
          }
        }
      );

      setIsLocationTracking(true);
      setLocationError(null);
      console.log('Location tracking started');

    } catch (error) {
      console.error('Error starting location tracking:', error);
      setLocationError('Failed to start location tracking');
      Alert.alert('Location Error', 'Unable to start location tracking. Please check your device settings.');
    }
  };

  const stopLocationTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    setIsLocationTracking(false);
    console.log('Location tracking stopped');
  };

  const updateLocationInFirestore = async (locationData) => {
    if (!auth.currentUser) return;

    try {
      const contractorRef = doc(db, 'contractors', auth.currentUser.uid);
      await setDoc(contractorRef, {
        userId: auth.currentUser.uid,
        email: auth.currentUser.email,
        isOnline: isOnline,
        currentLocation: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          timestamp: locationData.timestamp,
        },
        lastUpdated: new Date(),
      }, { merge: true });

      console.log('Location updated in Firestore:', locationData);
    } catch (error) {
      console.error('Error updating location in Firestore:', error);
    }
  };

  const centerMapOnLocation = () => {
    if (currentLocation && mapRef.current) {
      const region = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      mapRef.current.animateToRegion(region, 1000);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
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

  const handleJobOffer = useCallback((job) => {
    // Prevent a new pop-up if one is already showing
    if (showJobModal) return;
    
    // Only show job offers within 5 miles of driver's location
    let jobCoordinates = null;
    if (job.location?.coordinates) {
      jobCoordinates = job.location.coordinates;
    } else if (job.pickupAddress?.coordinates) {
      jobCoordinates = job.pickupAddress.coordinates;
    }

    if (currentLocation && jobCoordinates && jobCoordinates.latitude && jobCoordinates.longitude) {
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        jobCoordinates.latitude,
        jobCoordinates.longitude
      );
      
      if (distance > 5) {
        console.log(`🚫 Job ${job.id} is ${distance} miles away - outside 5 mile radius, skipping offer`);
        return;
      }
      
      console.log(`✅ Job ${job.id} is ${distance} miles away - within 5 mile radius, showing offer`);
    } else {
      console.log('⚠️ Missing location data for job offer filtering');
    }
    
    console.log('Triggering new job offer pop-up for job:', job.id);
    setActiveJob(job);
    setShowJobModal(true);
    setCountdown(40);
  }, [showJobModal, currentLocation]);

  useEffect(() => {
    console.log(`Setting up Firestore listener for all jobs...`);
    isInitialLoad.current = true; // Reset for each time the filter changes
    
    const jobsCollection = collection(db, 'jobs');
    const jobsQuery = query(jobsCollection);

    const unsubscribe = onSnapshot(
      jobsQuery,
      (querySnapshot) => {
        const jobs = [];
        querySnapshot.forEach((doc) => {
          const jobData = { id: doc.id, ...doc.data(), coordinates: doc.data().pickupAddress || {} };
          
          // Calculate distance if we have both current location and job location
          let jobCoordinates = null;
          if (jobData.location?.coordinates) {
            jobCoordinates = jobData.location.coordinates;
          } else if (jobData.pickupAddress?.coordinates) {
            jobCoordinates = jobData.pickupAddress.coordinates;
          }

          if (currentLocation && jobCoordinates && jobCoordinates.latitude && jobCoordinates.longitude) {
            jobData.distance = calculateDistance(
              currentLocation.latitude,
              currentLocation.longitude,
              jobCoordinates.latitude,
              jobCoordinates.longitude
            );
          } else {
            // Set a high distance for jobs without location data so they appear last
            jobData.distance = 999;
          }
          
          jobs.push(jobData);
        });

        // Sort by distance (closest first), then by creation date for jobs with same distance
        jobs.sort((a, b) => {
          if (a.distance !== b.distance) {
            return a.distance - b.distance;
          }
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
          return dateB - dateA;
        });
        
        setAllJobs(jobs);
        setLoading(false);

        // --- NEW LOGIC TO TRIGGER POP-UP ---
        // Only check for new available jobs after the initial list has been loaded.
        if (!isInitialLoad.current) {
          querySnapshot.docChanges().forEach((change) => {
            // If a new document was added and it's available, trigger the pop-up
            if (change.type === 'added') {
              const newJob = { id: change.doc.id, ...change.doc.data() };
              if (newJob.status === 'available') {
                handleJobOffer(newJob);
              }
            }
          });
        }
        
        // Mark the initial load as complete
        isInitialLoad.current = false;
      },
      (error) => {
        console.error('Error fetching jobs from Firestore:', error);
        setLoading(false);
        setAllJobs([]);
      }
    );

    return () => unsubscribe();
  }, [currentLocation, handleJobOffer]);

  const [performanceStats, setPerformanceStats] = useState({
    jobsCompleted: 0,
    earnings: '$0',
    hoursOnline: '0h 0m 0s',
    rating: 0,
    loading: true,
  });
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [currentSessionTime, setCurrentSessionTime] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const sessionTimerRef = useRef(null);

  // Session timer functions
  const startSessionTimer = () => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
    }

    const startTime = new Date();
    setSessionStartTime(startTime);

    sessionTimerRef.current = setInterval(() => {
      const now = new Date();
      const diffMs = now - startTime;
      
      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setCurrentSessionTime({ hours, minutes, seconds });
    }, 1000); // Update every second for real-time display
  };

  const stopSessionTimer = () => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    setSessionStartTime(null);
    setCurrentSessionTime({ hours: 0, minutes: 0, seconds: 0 });
  };

  const formatTimeDisplay = (sessionTime, totalStoredHours = 0) => {
    // Add stored hours to current session
    const totalHours = sessionTime.hours + Math.floor(totalStoredHours);
    const totalMinutes = sessionTime.minutes;
    const totalSeconds = sessionTime.seconds;

    return `${totalHours}h ${totalMinutes}m ${totalSeconds}s`;
  };

  // Fetch performance data from Firestore
  useEffect(() => {
    if (!auth.currentUser) return;

    const fetchPerformanceData = async () => {
      try {
        // Query completed jobs for this contractor
        const completedJobsQuery = query(
          collection(db, 'jobs'),
          where('contractorId', '==', auth.currentUser.uid),
          where('status', '==', 'completed')
        );

        const unsubscribeCompleted = onSnapshot(completedJobsQuery, (snapshot) => {
          let totalJobs = 0;
          let totalEarnings = 0;
          let totalRatings = 0;
          let ratingsCount = 0;

          snapshot.forEach((doc) => {
            const job = doc.data();
            totalJobs++;
            
            // Calculate earnings
            if (job.pricing?.contractorPayout) {
              const payout = typeof job.pricing.contractorPayout === 'string' 
                ? parseFloat(job.pricing.contractorPayout.replace('$', ''))
                : job.pricing.contractorPayout;
              totalEarnings += payout || 0;
            }

            // Calculate ratings
            if (job.rating && job.rating > 0) {
              totalRatings += job.rating;
              ratingsCount++;
            }
          });

          // Calculate average rating
          const avgRating = ratingsCount > 0 ? (totalRatings / ratingsCount) : 0;

          // Get contractor data for hours online calculation
          const contractorRef = doc(db, 'contractors', auth.currentUser.uid);
          onSnapshot(contractorRef, (contractorDoc) => {
            let hoursOnline = '0h 0m 0s';
            let storedHours = 0;
            
            if (contractorDoc.exists()) {
              const contractorData = contractorDoc.data();
              storedHours = contractorData.totalHoursOnline || 0;
              
              // If contractor is online and we have session time, combine with stored hours
              if (contractorData.isOnline && currentSessionTime) {
                hoursOnline = formatTimeDisplay(currentSessionTime, storedHours);
              } else if (storedHours > 0) {
                // Show only stored hours when offline
                const totalHours = Math.floor(storedHours);
                const totalMinutes = Math.floor((storedHours % 1) * 60);
                hoursOnline = `${totalHours}h ${totalMinutes}m 0s`;
              }
            }

            setPerformanceStats({
              jobsCompleted: totalJobs,
              earnings: `$${totalEarnings.toFixed(0)}`,
              hoursOnline,
              rating: parseFloat(avgRating.toFixed(1)),
              loading: false,
            });
          });
        });

        return unsubscribeCompleted;
      } catch (error) {
        console.error('Error fetching performance data:', error);
        setPerformanceStats(prev => ({ ...prev, loading: false }));
      }
    };

    const unsubscribe = fetchPerformanceData();
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, []);

  // Update performance stats when session time changes
  useEffect(() => {
    if (sessionStartTime && currentSessionTime) {
      // Trigger a re-render of performance stats with updated time
      setPerformanceStats(prev => ({
        ...prev,
        hoursOnline: formatTimeDisplay(currentSessionTime, 0) // Will be updated by Firestore listener
      }));
    }
  }, [currentSessionTime]);

  const handleToggleOnline = async () => {
    const newOnlineStatus = !isOnline;
    setIsOnline(newOnlineStatus);
    
    if (newOnlineStatus) {
      // Going online - start location tracking, record login time, and start session timer
      await startLocationTracking();
      startSessionTimer();
      
      if (auth.currentUser) {
        try {
          const contractorRef = doc(db, 'contractors', auth.currentUser.uid);
          await updateDoc(contractorRef, {
            isOnline: true,
            lastLoginTime: new Date(),
            lastUpdated: new Date(),
          });
        } catch (error) {
          console.error('Error updating online status:', error);
        }
      }
      
      Alert.alert('Going Online', 'You are now available to receive job offers! Location tracking is active.');
    } else {
      // Going offline - stop location tracking, session timer, and calculate session hours
      stopLocationTracking();
      stopSessionTimer();
      
      if (auth.currentUser) {
        try {
          const contractorRef = doc(db, 'contractors', auth.currentUser.uid);
          const contractorSnap = await getDoc(contractorRef);
          
          const updateData = {
            isOnline: false,
            lastUpdated: new Date(),
          };

          if (contractorSnap.exists()) {
            const data = contractorSnap.data();
            if (data.lastLoginTime) {
              const sessionStart = data.lastLoginTime.toDate();
              const sessionEnd = new Date();
              const sessionHours = (sessionEnd - sessionStart) / (1000 * 60 * 60);
              
              const currentTotal = data.totalHoursOnline || 0;
              updateData.totalHoursOnline = currentTotal + sessionHours;
            }
          }

          await updateDoc(contractorRef, updateData);
        } catch (error) {
          console.error('Error updating online status:', error);
        }
      }
      
      Alert.alert('Going Offline', 'You will no longer receive job offers. Location tracking stopped.');
    }
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

  const handleAcceptJob = async () => {
    if (!activeJob) return;
    setJobToAccept(activeJob);
    setShowConfirmationModal(true);
  };

  const handleDeclineJob = () => {
    setShowJobModal(false);
    setActiveJob(null);
    Alert.alert('Job Declined', 'Looking for more jobs in your area...');
  };

  const handleAcceptJobFromList = async (job) => {
    setJobToAccept(job);
    setShowConfirmationModal(true);
  };

  const confirmJobAcceptance = async () => {
    if (!jobToAccept) return;

    try {
      // Update job status in Firestore
      const jobRef = doc(db, 'jobs', jobToAccept.id);
      await updateDoc(jobRef, { 
        status: 'accepted', 
        acceptedAt: new Date(), 
        contractorId: auth.currentUser?.uid || 'current-user-id' 
      });

      // Close modals
      setShowConfirmationModal(false);
      setShowJobModal(false);
      
      // Show success and navigate
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
      console.error("Error accepting job:", error);
      Alert.alert('❌ Error', 'Could not accept job. Please try again.');
    } finally {
      setJobToAccept(null);
      setActiveJob(null);
    }
  };

  const cancelJobAcceptance = () => {
    setShowConfirmationModal(false);
    setJobToAccept(null);
  };

  const handlePinDragEnd = (coordinate) => {
    setJobLocationPin(coordinate);
    console.log('Pin moved to:', coordinate);
    checkPickupRange(coordinate);
  };

  const checkPickupRange = (jobCoords = jobLocationPin) => {
    if (!currentLocation || !jobCoords) return;

    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      jobCoords.latitude,
      jobCoords.longitude
    );

    // Convert 100 feet to miles (100 feet = 0.0189394 miles)
    const rangeInMiles = 100 / 5280; // 100 feet in miles
    const withinRange = distance <= rangeInMiles;
    
    setIsWithinPickupRange(withinRange);
    console.log(`Distance to pickup: ${(distance * 5280).toFixed(0)} feet, Within range: ${withinRange}`);
  };

  const confirmJobLocation = async () => {
    if (!navigationJob || !jobLocationPin) return;

    try {
      // Update job location in Firestore if pin was moved
      const jobRef = doc(db, 'jobs', navigationJob.id);
      await updateDoc(jobRef, {
        'pickupAddress.coordinates': jobLocationPin,
        updatedAt: new Date(),
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

  const handlePickupConfirmation = async () => {
    if (!navigationJob || !isWithinPickupRange) return;

    Alert.alert(
      '🚛 Confirm Pickup',
      `Are you ready to confirm pickup for this ${navigationJob.wasteType} job?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Pickup',
          style: 'default',
          onPress: async () => {
            try {
              const jobRef = doc(db, 'jobs', navigationJob.id);
              await updateDoc(jobRef, {
                status: 'in_progress',
                pickedUpAt: new Date(),
                contractorId: auth.currentUser?.uid || 'current-user-id'
              });

              setShowNavigationModal(false);
              Alert.alert(
                '✅ Pickup Confirmed!',
                'Job status updated to in progress. Safe travels!',
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Error confirming pickup:', error);
              Alert.alert('Error', 'Failed to confirm pickup. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleRejectJobFromList = (job) => {
    Alert.alert('Reject Job?', `Are you sure you want to reject this ${job.wasteType} job?`,
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Reject', style: 'destructive', onPress: async () => {
        try {
          const jobRef = doc(db, 'jobs', job.id);
          await updateDoc(jobRef, { status: 'rejected', rejectedAt: new Date(), contractorId: 'current-user-id' });
          Alert.alert('Job Rejected', 'The job has been removed from your list.');
        } catch (error) {
          console.error('Error rejecting job:', error);
          Alert.alert('Error', 'Failed to reject job. Please try again.');
        }
      }}]
    );
  };
  
  useEffect(() => {
    let timer;
    if (showJobModal && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (showJobModal && countdown === 0) {
      handleDeclineJob();
    }
    return () => clearTimeout(timer);
  }, [showJobModal, countdown]);

  // Check pickup range when location or job location changes
  useEffect(() => {
    if (showNavigationModal && currentLocation && jobLocationPin) {
      checkPickupRange();
    }
  }, [currentLocation, jobLocationPin, showNavigationModal]);

  // Cleanup location tracking on unmount
  useEffect(() => {
    return () => {
      stopLocationTracking();
    };
  }, []);

  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const userToken = await AsyncStorage.getItem('userToken');
        if (userToken) {
          // Validate token or reauthenticate user
          const user = auth.currentUser;
          if (user) {
            console.log('User is still logged in:', user.email);
          } else {
            console.log('Token expired or user not found.');
          }
        }
      } catch (error) {
        console.error('Error checking user session:', error);
      }
    };

    checkUserSession();
  }, []);

  const handleLogin = async (token) => {
    try {
      await AsyncStorage.setItem('userToken', token);
      console.log('User token saved successfully.');
    } catch (error) {
      console.error('Error saving user token:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      console.log('User token removed successfully.');
    } catch (error) {
      console.error('Error removing user token:', error);
    }
  };

  return (
    <View style={styles.container}>
      <SharedHeader 
        title="Welcome back, Driver!"
        subtitle={
          <View style={styles.headerStatusContainer}>
            <View style={styles.onlineStatus}>
              <Switch value={isOnline} onValueChange={handleToggleOnline} trackColor={{ false: '#E5E7EB', true: '#34A853' }} thumbColor={isOnline ? '#FFFFFF' : '#9CA3AF'} />
              <Text style={[styles.statusText, { color: isOnline ? '#34A853' : '#6B7280' }]}>{isOnline ? 'Online' : 'Offline'}</Text>
            </View>
            {isOnline && (
              <View style={styles.locationStatus}>
                <Ionicons 
                  name={isLocationTracking ? "location" : "location-outline"} 
                  size={14} 
                  color={isLocationTracking ? '#34A853' : '#EF4444'} 
                />
                <Text style={[styles.locationText, { color: isLocationTracking ? '#34A853' : '#EF4444' }]}>
                  {isLocationTracking ? 'GPS Active' : 'GPS Inactive'}
                </Text>
              </View>
            )}
          </View>
        }
        showBackButton={false}
        rightComponent={
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#333" />
            <View style={styles.notificationBadge}><Text style={styles.badgeText}>2</Text></View>
          </TouchableOpacity>
        }
      />

      {isOnline && (
        <View style={styles.jobsContainer}>
          <View style={styles.jobsHeader}>
            <View style={styles.jobsHeaderLeft}>
              <Text style={styles.jobsTitle}>Jobs</Text>
              <Text style={styles.jobsCount}>{loading ? 'Loading...' : `${allJobs.length} matching jobs found`}</Text>
            </View>
            <TouchableOpacity style={styles.toggleButton} onPress={() => setShowJobsContainer(!showJobsContainer)}>
              <Ionicons name={showJobsContainer ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
              <Text style={styles.toggleText}>{showJobsContainer ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterContainer}>
            <TouchableOpacity style={[styles.filterButton, styles.activeFilter]}>
              <Text style={[styles.filterText, styles.activeFilterText]}>All Jobs (Sorted by Distance)</Text>
            </TouchableOpacity>
          </View>
          
          {showJobsContainer && (
            <ScrollView style={styles.jobsScrollView} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              {loading ? (
                <View style={styles.loadingContainer}><Ionicons name="hourglass-outline" size={48} color="#9CA3AF" /><Text style={styles.loadingText}>Loading jobs...</Text></View>
              ) : allJobs.map((job) => {
                const payout = job.pricing?.contractorPayout || 0;
                return (
                  <TouchableOpacity key={job.id} style={styles.jobCardContainer} onPress={() => navigation.navigate('MyJobs')} activeOpacity={0.85}>
                    <View style={[ styles.jobCardNew, payout >= 45 && styles.highPayoutJob, payout >= 25 && payout < 45 && styles.mediumPayoutJob ]}>
                      <View style={styles.jobCardHeader}>
                        <View style={styles.jobTypeContainer}>
                          <View style={[styles.urgencyBadge, job.isASAP ? styles.urgencyHigh : styles.urgencyNormal]}>
                            <Text style={[styles.urgencyText, job.isASAP ? styles.urgencyTextHigh : styles.urgencyTextNormal]}>{job.isASAP ? "ASAP" : "SCHEDULED"}</Text>
                          </View>
                          <View style={styles.jobTitleContainer}>
                             <Text style={styles.jobTypeNew}>{job.wasteType}</Text>
                             <View style={styles.statusBadge}><Text style={styles.statusTextBadge}>{job.status?.toUpperCase()}</Text></View>
                          </View>
                        </View>
                        <View style={styles.earningsContainer}>
                          <Text style={styles.earningsAmountNew}>${payout}</Text>
                          <Text style={styles.earningsLabelNew}>Your Payout</Text>
                        </View>
                      </View>
                      <View style={styles.jobDetailsSection}>
                        <Text style={styles.jobVolumeNew}>{job.volume}</Text>
                        {job.pickupAddress?.instructions && (
                          <View style={styles.instructionsContainer}>
                            <Ionicons name="information-circle-outline" size={18} color="#2563EB" />
                            <Text style={styles.instructionsText}>{job.pickupAddress.instructions}</Text>
                          </View>
                        )}
                        <View style={styles.jobMetrics}>
                          <View style={styles.metric}>
                             <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                             <Text style={styles.metricText}>Created: {formatDate(job.createdAt)}</Text>
                          </View>
                          {job.scheduledPickup && (
                            <View style={styles.metric}>
                              <Ionicons name="time-outline" size={16} color="#6B7280" />
                              <Text style={styles.metricText}>Scheduled: {formatDate(job.scheduledPickup)}</Text>
                            </View>
                          )}
                          <View style={styles.metric}>
                            <Ionicons name="cash-outline" size={16} color="#6B7280" />
                            <Text style={styles.metricText}>Your Payout: <Text style={{fontWeight: 'bold'}}>${payout}</Text></Text>
                          </View>
                          {job.distance !== 999 && (
                            <View style={styles.metric}>
                              <Ionicons name="location-outline" size={16} color="#6B7280" />
                              <Text style={styles.metricText}>Distance: <Text style={{fontWeight: 'bold'}}>{job.distance} miles</Text></Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.jobAddressNew}>{job.pickupAddress?.fullAddress || 'No address provided'}</Text>
                      </View>
                      <View style={styles.jobActions}>
                        <TouchableOpacity style={styles.rejectJobButton} onPress={() => handleRejectJobFromList(job)}><Ionicons name="close-outline" size={18} color="#EF4444" /><Text style={styles.rejectJobText}>Reject</Text></TouchableOpacity>
                        {job.status === 'available' && (
                          <TouchableOpacity style={styles.acceptJobButton} onPress={() => handleAcceptJobFromList(job)}><Ionicons name="checkmark-outline" size={18} color="#FFFFFF" /><Text style={styles.acceptJobText}>Accept & Navigate</Text></TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
              
              {!loading && allJobs.length === 0 && (
                <View style={styles.noJobsContainer}><Ionicons name="briefcase-outline" size={48} color="#9CA3AF" /><Text style={styles.noJobsTitle}>No Jobs Found</Text><Text style={styles.noJobsText}>There are no jobs matching the current filter.</Text></View>
              )}
            </ScrollView>
          )}
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Live Location Map Section */}
        {isOnline && currentLocation && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Live Location</Text>
            <View style={styles.mapCard}>
              <View style={styles.mapHeader}>
                <View style={styles.locationHeaderInfo}>
                  <Ionicons name="location" size={18} color="#34A853" />
                  <Text style={styles.mapTitle}>GPS Tracking Active</Text>
                </View>
                <View style={styles.accuracyBadge}>
                  <Text style={styles.accuracyText}>±{Math.round(currentLocation.accuracy)}m</Text>
                </View>
              </View>
              
              <View style={styles.mapContainer}>
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  region={mapRegion}
                  showsUserLocation={false} // We'll use custom marker instead
                  showsMyLocationButton={false}
                  showsCompass={true}
                  showsScale={true}
                  mapType="standard"
                  followsUserLocation={false}
                  showsPointsOfInterest={true}
                  showsBuildings={true}
                  showsTraffic={false}
                >
                  <Marker
                    coordinate={{
                      latitude: currentLocation.latitude,
                      longitude: currentLocation.longitude,
                    }}
                    title="Your Current Location"
                    description={`GPS Accuracy: ±${Math.round(currentLocation.accuracy)} meters`}
                  >
                    <View style={styles.customMarker}>
                      <View style={styles.markerInner}>
                        <Ionicons name="car" size={16} color="#FFFFFF" />
                      </View>
                      <View style={styles.markerPulse} />
                    </View>
                  </Marker>
                </MapView>
                
                {/* Center location button */}
                <TouchableOpacity 
                  style={styles.centerButton} 
                  onPress={centerMapOnLocation}
                  activeOpacity={0.8}
                >
                  <Ionicons name="locate" size={20} color="#34A853" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.mapFooter}>
                <View style={styles.coordsInfo}>
                  <Text style={styles.coordsText}>
                    {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                  </Text>
                </View>
                <Text style={styles.lastUpdateText}>
                  Updated: {currentLocation.timestamp?.toLocaleTimeString() || 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Error display for location issues */}
        {isOnline && locationError && (
          <View style={styles.section}>
            <View style={styles.errorCard}>
              <Ionicons name="warning" size={20} color="#EF4444" />
              <Text style={styles.errorText}>{locationError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={startLocationTracking}>
                <Text style={styles.retryButtonText}>Retry Location</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle" size={24} color="#34A853" />
              <Text style={styles.statNumber}>
                {performanceStats.loading ? '...' : performanceStats.jobsCompleted}
              </Text>
              <Text style={styles.statLabel}>Jobs Completed</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="cash" size={24} color="#FF8F00" />
              <Text style={styles.statNumber}>
                {performanceStats.loading ? '...' : performanceStats.earnings}
              </Text>
              <Text style={styles.statLabel}>Earnings</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="time" size={24} color="#1E88E5" />
              <Text style={styles.statNumber}>
                {performanceStats.loading ? '...' : performanceStats.hoursOnline}
              </Text>
              <Text style={styles.statLabel}>Hours Online</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="star" size={24} color="#FFB300" />
              <Text style={styles.statNumber}>
                {performanceStats.loading ? '...' : (performanceStats.rating || 'N/A')}
              </Text>
              <Text style={styles.statLabel}>Ratings</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal visible={showJobModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowJobModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Job Offer</Text>
            <View style={styles.countdownContainer}><Text style={styles.countdownText}>{countdown}s</Text></View>
          </View>
          {activeJob && (
            <View style={styles.modalContent}>
              <View style={styles.jobOfferCard}>
                <Text style={styles.jobOfferType}>{activeJob.wasteType}</Text>
                <Text style={styles.jobOfferDetails}>{activeJob.volume}</Text>
                <View style={styles.addressContainer}>
                  <Ionicons name="location-outline" size={16} color="#6B7280" />
                  <Text style={styles.jobOfferAddress}>{activeJob.pickupAddress?.fullAddress || activeJob.location?.address || 'Address not specified'}</Text>
                </View>
                <View style={styles.offerStats}>
                  <View style={styles.offerStat}><Ionicons name="location" size={20} color="#6B7280" /><Text style={styles.offerStatText}>{activeJob.distance || 'N/A'}</Text></View>
                  <View style={styles.offerStat}><Ionicons name="cash" size={20} color="#34A853" /><Text style={styles.offerStatText}>${activeJob.pricing?.contractorPayout}</Text></View>
                  <View style={styles.offerStat}><Ionicons name="person" size={20} color="#6B7280" /><Text style={styles.offerStatText}>{activeJob.customerName || 'Customer'}</Text></View>
                </View>
              </View>
              {/* Location Preview Button */}
              <TouchableOpacity 
                style={styles.locationButton} 
                onPress={() => navigateToLocation(activeJob)}
              >
                <Ionicons name="navigate-outline" size={20} color="#3B82F6" />
                <Text style={styles.locationButtonText}>View Location</Text>
              </TouchableOpacity>

              <View style={styles.actionButtons}>
                <TouchableOpacity style={[styles.actionButton, styles.declineButton]} onPress={handleDeclineJob}><Text style={styles.declineButtonText}>Decline</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.acceptButton]} onPress={handleAcceptJob}><Text style={styles.acceptButtonText}>Accept & Navigate</Text></TouchableOpacity>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>

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

                    {jobToAccept.distance !== 999 && (
                      <View style={styles.confirmationDetailRow}>
                        <Ionicons name="navigate-outline" size={18} color="#6B7280" />
                        <Text style={styles.confirmationDetailText}>{jobToAccept.distance} miles away</Text>
                      </View>
                    )}

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
                  latitude: jobLocationPin.latitude,
                  longitude: jobLocationPin.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
                showsUserLocation={false}
                showsMyLocationButton={false}
                mapType="standard"
                showsCompass={true}
                showsScale={false}
                showsPointsOfInterest={false}
                showsBuildings={true}
                showsTraffic={false}
              >
                {/* Pickup range circle (100 feet radius) */}
                <Circle
                  center={jobLocationPin}
                  radius={30.48} // 100 feet in meters
                  fillColor="rgba(52, 168, 83, 0.15)"
                  strokeColor="#34A853"
                  strokeWidth={2}
                />

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
                    <View style={[styles.contractorMarkerInner, isWithinPickupRange && styles.contractorMarkerActive]}>
                      <Ionicons name="car" size={16} color="#FFFFFF" />
                    </View>
                    {isWithinPickupRange && <View style={styles.contractorMarkerPulse} />}
                  </View>
                </Marker>

                {/* Job pickup location (draggable) */}
                <Marker
                  coordinate={jobLocationPin}
                  title="Pickup Location"
                  description="Job pickup point"
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
                      `${calculateDistance(
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
                    {navigationJob.pickupAddress?.fullAddress || navigationJob.location?.address || 'Address not specified'}
                  </Text>
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
    headerStatusContainer: { flexDirection: 'column', alignItems: 'flex-start' },
    onlineStatus: { flexDirection: 'row', alignItems: 'center' },
    statusText: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
    locationStatus: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    locationText: { fontSize: 12, fontWeight: '500', marginLeft: 4 },
    notificationButton: { padding: 8, position: 'relative' },
    notificationBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#EF4444', borderRadius: 8, width: 16, height: 16, justifyContent: 'center', alignItems: 'center' },
    badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
    content: { flex: 1 },
    section: { paddingHorizontal: 20, paddingVertical: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 16 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    statCard: { width: (width - 60) / 2, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    statNumber: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginTop: 8 },
    statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4, textAlign: 'center' },
    modalContainer: { flex: 1, backgroundColor: '#F8F9FA' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
    countdownContainer: { backgroundColor: '#EF4444', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
    countdownText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
    modalContent: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
    jobOfferCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
    jobOfferType: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
    jobOfferDetails: { fontSize: 16, color: '#6B7280', marginBottom: 8 },
    jobOfferAddress: { fontSize: 14, color: '#374151', marginLeft: 6, flex: 1, lineHeight: 20 },
    offerStats: { flexDirection: 'row', justifyContent: 'space-around' },
    offerStat: { alignItems: 'center' },
    offerStatText: { fontSize: 14, color: '#374151', marginTop: 4, fontWeight: '600' },
    actionButtons: { flexDirection: 'row', gap: 12 },
    actionButton: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    declineButton: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#D1D5DB' },
    acceptButton: { backgroundColor: '#34A853' },
    declineButtonText: { fontSize: 16, fontWeight: 'bold', color: '#6B7280' },
    acceptButtonText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
    jobsContainer: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    jobsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16 },
    jobsHeaderLeft: { flex: 1 },
    jobsTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 2 },
    jobsCount: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
    toggleButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
    toggleText: { fontSize: 14, color: '#6B7280', fontWeight: '500', marginLeft: 4 },
    filterContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 10 },
    filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
    activeFilter: { backgroundColor: '#34A853', borderColor: '#34A853' },
    filterText: { fontSize: 14, fontWeight: '600', color: '#374151' },
    activeFilterText: { color: '#FFFFFF' },
    jobsScrollView: { maxHeight: 400, paddingHorizontal: 20, paddingBottom: 16 },
    jobCardContainer: { marginTop: 16 },
    jobCardNew: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4, overflow: 'hidden' },
    jobCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
    jobTypeContainer: { flex: 1 },
    urgencyBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
    urgencyHigh: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
    urgencyNormal: { backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#BFDBFE' },
    urgencyText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    urgencyTextHigh: { color: '#DC2626' },
    urgencyTextNormal: { color: '#2563EB' },
    jobTypeNew: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', textTransform: 'capitalize' },
    earningsContainer: { alignItems: 'flex-end' },
    earningsAmountNew: { fontSize: 24, fontWeight: 'bold', color: '#34A853', marginBottom: 2 },
    earningsLabelNew: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
    jobDetailsSection: { paddingHorizontal: 20, paddingBottom: 16 },
    jobDescription: { fontSize: 14, color: '#6B7280', marginBottom: 8, fontStyle: 'italic' },
    jobVolumeNew: { fontSize: 16, color: '#374151', fontWeight: '600', marginBottom: 12 },
    jobMetrics: { flexDirection: 'column', gap: 8, marginBottom: 12 },
    metric: { flexDirection: 'row', alignItems: 'center' },
    metricText: { fontSize: 12, color: '#6B7280', marginLeft: 6, fontWeight: '500' },
    jobAddressNew: { fontSize: 14, color: '#374151', fontWeight: '500' },
    jobActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#F9FAFB' },
    rejectJobButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRightWidth: 1, borderRightColor: '#F3F4F6' },
    rejectJobText: { fontSize: 14, fontWeight: '600', color: '#EF4444', marginLeft: 6 },
    acceptJobButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, backgroundColor: '#34A853' },
    acceptJobText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginLeft: 6 },
    loadingContainer: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32 },
    loadingText: { fontSize: 16, color: '#6B7280', marginTop: 12, textAlign: 'center' },
    noJobsContainer: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32 },
    noJobsTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginTop: 16, marginBottom: 8 },
    noJobsText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
    mapCard: { backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    mapHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    locationHeaderInfo: { flexDirection: 'row', alignItems: 'center' },
    mapTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginLeft: 8 },
    accuracyBadge: { backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#BBF7D0' },
    accuracyText: { fontSize: 12, fontWeight: '600', color: '#15803D' },
    mapContainer: { height: 200, backgroundColor: '#F3F4F6', position: 'relative' },
    map: { flex: 1 },
    centerButton: { position: 'absolute', top: 10, right: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 5, borderWidth: 1, borderColor: '#E5E7EB' },
    customMarker: { alignItems: 'center', justifyContent: 'center' },
    markerInner: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#34A853', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 5 },
    markerPulse: { position: 'absolute', width: 50, height: 50, borderRadius: 25, backgroundColor: '#34A853', opacity: 0.3, borderWidth: 2, borderColor: '#34A853' },
    mapFooter: { padding: 12, backgroundColor: '#F9FAFB', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    coordsInfo: { alignItems: 'center', marginBottom: 4 },
    coordsText: { fontSize: 14, fontWeight: '600', color: '#1F2937', fontFamily: 'monospace' },
    lastUpdateText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
    errorCard: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
    errorText: { fontSize: 14, color: '#DC2626', marginLeft: 8, flex: 1 },
    retryButton: { backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    retryButtonText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
    locationButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F0F9FF',
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#7DD3FC',
    },
    locationButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#3B82F6',
      marginLeft: 8,
    },
    addressContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginVertical: 8,
      paddingHorizontal: 4,
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
    contractorMarkerActive: {
      backgroundColor: '#2D7D32',
      borderColor: '#E8F5E8',
      borderWidth: 4,
    },
    contractorMarkerPulse: {
      position: 'absolute',
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#34A853',
      opacity: 0.4,
      borderWidth: 2,
      borderColor: '#34A853',
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
      padding: 16,
      paddingBottom: 28,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 8,
      maxHeight: '35%',
    },
    navigationInfoHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
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
      padding: 10,
      marginVertical: 10,
      borderWidth: 1,
      borderColor: '#BFDBFE',
    },
    navigationInstructionsSuccess: {
      backgroundColor: '#F0FDF4',
      borderColor: '#BBF7D0',
    },
    instructionsText: {
      fontSize: 14,
      color: '#1E40AF',
      marginLeft: 8,
      flex: 1,
      lineHeight: 20,
    },
    instructionsTextSuccess: {
      color: '#15803D',
      fontWeight: '600',
    },
    navigationActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 6,
    },
    pickupConfirmButton: {
      flex: 2,
      backgroundColor: '#34A853',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      shadowColor: '#34A853',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 2,
      borderColor: '#2D7D32',
    },
    pickupConfirmText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 8,
    },
    navigateButton: {
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
    navigateText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 6,
    },
    adjustLocationButton: {
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
    adjustLocationText: {
      color: '#3B82F6',
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 4,
    },
});

export default ContractorDashboard;
