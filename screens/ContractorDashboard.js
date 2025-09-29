import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, Circle } from 'react-native-maps';
import SharedHeader from '../components/SharedHeader';
import AvailableJobsList from '../components/AvailableJobsList';
import LocationService from '../services/NewLocationService';
import MAPS_CONFIG from '../config/mapsConfig';

const { width, height } = Dimensions.get('window');

const ContractorDashboard = ({ navigation }) => {
  const [isOnline, setIsOnline] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [activeJob, setActiveJob] = useState(null);
  const [countdown, setCountdown] = useState(40);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [route, setRoute] = useState(null);
  const [nearbyJobs, setNearbyJobs] = useState([]);
  const [locationPolling, setLocationPolling] = useState(null);
  const [showJobsContainer, setShowJobsContainer] = useState(true);
  const [allJobs, setAllJobs] = useState([]);
  const [newJobNotification, setNewJobNotification] = useState(null);
  const [notificationCountdown, setNotificationCountdown] = useState(60);
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  
  // Animation for pulsing location icon
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim1 = useRef(new Animated.Value(1)).current;
  const ringAnim2 = useRef(new Animated.Value(1)).current;
  const ringAnim3 = useRef(new Animated.Value(1)).current;

  // Mock data for available jobs (expanded dataset)
  const [availableJobs] = useState([
    {
      id: 1,
      type: 'Household Trash',
      volume: '3 bags',
      distance: '1.2 miles',
      earnings: '$15',
      address: '123 Oak Street',
      customerName: 'Sarah J.',
      coordinates: { latitude: 33.7490, longitude: -84.3880 },
      urgency: 'normal',
      estimatedTime: '30 min',
      description: 'Regular household trash pickup',
    },
    {
      id: 2,
      type: 'Bulk Items',
      volume: 'Old sofa',
      distance: '2.8 miles',
      earnings: '$45',
      address: '456 Pine Avenue',
      customerName: 'Mike R.',
      coordinates: { latitude: 33.7590, longitude: -84.3780 },
      urgency: 'high',
      estimatedTime: '45 min',
      description: 'Large furniture removal',
    },
    {
      id: 3,
      type: 'Yard Waste',
      volume: '2 bags + branches',
      distance: '0.8 miles',
      earnings: '$25',
      address: '789 Maple Drive',
      customerName: 'Jennifer L.',
      coordinates: { latitude: 33.7390, longitude: -84.3980 },
      urgency: 'normal',
      estimatedTime: '25 min',
      description: 'Garden cleanup waste',
    },
    {
      id: 4,
      type: 'Electronics',
      volume: 'Old TV + microwave',
      distance: '3.5 miles',
      earnings: '$35',
      address: '321 Cedar Lane',
      customerName: 'David K.',
      coordinates: { latitude: 33.7690, longitude: -84.3680 },
      urgency: 'low',
      estimatedTime: '40 min',
      description: 'Electronic waste disposal',
    },
    {
      id: 5,
      type: 'Construction Debris',
      volume: '1 ton',
      distance: '4.2 miles',
      earnings: '$85',
      address: '654 Birch Street',
      customerName: 'Lisa M.',
      coordinates: { latitude: 33.7290, longitude: -84.4080 },
      urgency: 'high',
      estimatedTime: '90 min',
      description: 'Renovation debris removal',
    },
    {
      id: 6,
      type: 'Appliances',
      volume: 'Washing machine',
      distance: '2.1 miles',
      earnings: '$40',
      address: '987 Elm Avenue',
      customerName: 'Robert T.',
      coordinates: { latitude: 33.7590, longitude: -84.3580 },
      urgency: 'normal',
      estimatedTime: '35 min',
      description: 'Large appliance pickup',
    },
  ]);

  const [todayStats] = useState({
    jobsCompleted: 3,
    earnings: '$95',
    hoursOnline: '4.5h',
    rating: 4.8,
  });

  const handleToggleOnline = () => {
    setIsOnline(!isOnline);
    if (!isOnline) {
      Alert.alert('Going Online', 'You are now available to receive job offers!');
    } else {
      Alert.alert('Going Offline', 'You will no longer receive job offers.');
    }
  };

  const handleJobOffer = (job) => {
    setActiveJob(job);
    setShowJobModal(true);
    setCountdown(40);
  };

  const handleAcceptJob = async () => {
    if (activeJob && currentLocation) {
      // Generate route to the pickup location
      const jobRoute = LocationService.generateRoute({
        latitude: activeJob.coordinates.latitude,
        longitude: activeJob.coordinates.longitude
      });
      
      if (jobRoute) {
        // Create polyline coordinates for the route
        const routeCoordinates = [
          currentLocation,
          {
            latitude: activeJob.coordinates.latitude,
            longitude: activeJob.coordinates.longitude
          }
        ];
        
        setRoute({
          ...jobRoute,
          coordinates: routeCoordinates
        });
      }

      // Open navigation
      await LocationService.openNavigation(
        {
          latitude: activeJob.coordinates.latitude,
          longitude: activeJob.coordinates.longitude
        },
        activeJob.type + ' pickup'
      );
    }

    setShowJobModal(false);
    Alert.alert('Job Accepted!', `You accepted the ${activeJob?.type} pickup job. Navigation started!`);
    // navigation.navigate('ActiveJob', { job: activeJob });
  };

  const handleDeclineJob = () => {
    setShowJobModal(false);
    setActiveJob(null);
    Alert.alert('Job Declined', 'Looking for more jobs in your area...');
  };

  const handleAcceptJobFromList = async (job) => {
    Alert.alert(
      'Accept Job?',
      `Accept this ${job.type} job for ${job.earnings}?\n\nLocation: ${job.address}\nEstimated time: ${job.estimatedTime}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Accept Job', 
          onPress: async () => {
            // Remove job from available jobs
            const updatedJobs = availableJobs.filter(j => j.id !== job.id);
            setAllJobs(updatedJobs);
            
            // Start navigation if location is available
            if (currentLocation) {
              await LocationService.openNavigation(
                job.coordinates,
                job.type + ' pickup'
              );
            }
            
            Alert.alert('Job Accepted!', `You accepted the ${job.type} pickup job. Navigation started!`);
            // navigation.navigate('ActiveJob', { job });
          }
        }
      ]
    );
  };

  const handleRejectJobFromList = (job) => {
    Alert.alert(
      'Reject Job?',
      `Are you sure you want to reject this ${job.type} job?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reject', 
          style: 'destructive',
          onPress: () => {
            // Remove job from available jobs
            const updatedJobs = allJobs.filter(j => j.id !== job.id);
            setAllJobs(updatedJobs);
            Alert.alert('Job Rejected', 'The job has been removed from your list.');
          }
        }
      ]
    );
  };

  const simulateNewJob = () => {
    // Simulate new job coming in every 30-60 seconds when online
    if (!isOnline) return;
    
    const newJobTemplates = [
      {
        type: 'Emergency Cleanup',
        volume: '5 bags + debris',
        distance: `${(Math.random() * 3 + 0.5).toFixed(1)} miles`,
        earnings: `$${Math.floor(Math.random() * 40 + 20)}`,
        address: '123 Emergency Lane',
        customerName: 'Emergency Call',
        coordinates: { 
          latitude: 33.7490 + (Math.random() - 0.5) * 0.01, 
          longitude: -84.3880 + (Math.random() - 0.5) * 0.01 
        },
        urgency: 'high',
        estimatedTime: `${Math.floor(Math.random() * 30 + 20)} min`,
        description: 'Urgent cleanup required',
      },
      {
        type: 'Furniture Removal',
        volume: 'Dining table set',
        distance: `${(Math.random() * 2 + 1).toFixed(1)} miles`,
        earnings: `$${Math.floor(Math.random() * 30 + 30)}`,
        address: '456 Furniture Street',
        customerName: 'Moving Customer',
        coordinates: { 
          latitude: 33.7490 + (Math.random() - 0.5) * 0.01, 
          longitude: -84.3880 + (Math.random() - 0.5) * 0.01 
        },
        urgency: 'normal',
        estimatedTime: `${Math.floor(Math.random() * 20 + 30)} min`,
        description: 'Large furniture pickup',
      },
      {
        type: 'Garden Waste',
        volume: '3 bags + branches',
        distance: `${(Math.random() * 1.5 + 0.8).toFixed(1)} miles`,
        earnings: `$${Math.floor(Math.random() * 20 + 15)}`,
        address: '789 Garden Avenue',
        customerName: 'Garden Owner',
        coordinates: { 
          latitude: 33.7490 + (Math.random() - 0.5) * 0.01, 
          longitude: -84.3880 + (Math.random() - 0.5) * 0.01 
        },
        urgency: 'low',
        estimatedTime: `${Math.floor(Math.random() * 15 + 20)} min`,
        description: 'Garden cleanup and pruning waste',
      }
    ];

    const template = newJobTemplates[Math.floor(Math.random() * newJobTemplates.length)];
    const newJob = {
      ...template,
      id: Date.now() + Math.random(), // Unique ID
    };

    showNewJobNotification(newJob);
  };

  const showNewJobNotification = (job) => {
    setNewJobNotification(job);
    setShowNewJobModal(true);
    setNotificationCountdown(60);
  };

  const handleAcceptNewJob = async () => {
    if (newJobNotification) {
      // Add to jobs list
      setAllJobs(prevJobs => [newJobNotification, ...prevJobs]);
      
      // Start navigation if location is available
      if (currentLocation) {
        await LocationService.openNavigation(
          newJobNotification.coordinates,
          newJobNotification.type + ' pickup'
        );
      }
      
      Alert.alert('Job Accepted!', `You accepted the ${newJobNotification.type} pickup job. Navigation started!`);
    }
    
    setShowNewJobModal(false);
    setNewJobNotification(null);
    setNotificationCountdown(60);
  };

  const handleRejectNewJob = () => {
    Alert.alert('Job Rejected', 'Looking for more jobs in your area...');
    setShowNewJobModal(false);
    setNewJobNotification(null);
    setNotificationCountdown(60);
  };

  const handleJobPress = (job) => {
    // Show job details or handle job selection
    Alert.alert(
      'Job Details',
      `${job.type} - ${job.volume}\n${job.address}\nEarnings: ${job.earnings}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Details', onPress: () => {
          // Navigate to job details or show more info
          console.log('Viewing job details:', job);
        }}
      ]
    );
  };

  useEffect(() => {
    let timer;
    if (showJobModal && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
      handleDeclineJob();
    }
    return () => clearTimeout(timer);
  }, [showJobModal, countdown]);

  // Initialize location services
  useEffect(() => {
    initializeLocation();
    return () => {
      // Clean up location services
      try {
        LocationService.stopWatching();
      } catch (error) {
        console.log('⚠️ Error stopping location watch during cleanup:', error);
      }
      
      if (locationPolling) {
        clearInterval(locationPolling);
      }
    };
  }, [locationPolling]);

  // Start pulsing animation for location icon and rings
  useEffect(() => {
    if (currentLocation) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );

      const ring1 = Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim1, {
            toValue: 1.5,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(ringAnim1, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );

      const ring2 = Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim2, {
            toValue: 1.3,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(ringAnim2, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );

      const ring3 = Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim3, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(ringAnim3, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );

      pulse.start();
      ring1.start();
      ring2.start();
      ring3.start();
      
      return () => {
        pulse.stop();
        ring1.stop();
        ring2.stop();
        ring3.stop();
      };
    }
  }, [currentLocation, pulseAnim, ringAnim1, ringAnim2, ringAnim3]);

  // Update nearby jobs when location changes
  useEffect(() => {
    if (currentLocation) {
      updateNearbyJobs();
    }
  }, [currentLocation, availableJobs]);

  // Initialize all jobs
  useEffect(() => {
    setAllJobs(availableJobs);
  }, [availableJobs]);

  // New job notification countdown
  useEffect(() => {
    let timer;
    if (showNewJobModal && notificationCountdown > 0) {
      timer = setTimeout(() => setNotificationCountdown(notificationCountdown - 1), 1000);
    } else if (notificationCountdown === 0 && showNewJobModal) {
      // Auto-add to jobs list if not responded to
      if (newJobNotification) {
        setAllJobs(prevJobs => [newJobNotification, ...prevJobs]);
        Alert.alert('Job Auto-Added', 'The job was automatically added to your available jobs list.');
      }
      setShowNewJobModal(false);
      setNewJobNotification(null);
      setNotificationCountdown(60);
    }
    return () => clearTimeout(timer);
  }, [showNewJobModal, notificationCountdown, newJobNotification]);

  // Simulate new jobs coming in
  useEffect(() => {
    let jobSimulator;
    if (isOnline) {
      // Start simulating new jobs every 45-90 seconds
      jobSimulator = setInterval(() => {
        simulateNewJob();
      }, Math.random() * 45000 + 45000); // 45-90 seconds
    }
    
    return () => {
      if (jobSimulator) {
        clearInterval(jobSimulator);
      }
    };
  }, [isOnline]);

  const initializeLocation = async () => {
    try {
      console.log('🚀 Initializing location services...');
      
      // Show loading message
      Alert.alert(
        'Getting Your Location',
        'Please wait while we get your current location...',
        [],
        { cancelable: false }
      );
      
      // Check if location services are enabled first
      const isLocationEnabled = await LocationService.hasServicesEnabledAsync();
      if (!isLocationEnabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services in your device settings to use QuickTrash.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => LocationService.openSettingsAsync() }
          ]
        );
        return;
      }

      // Request permission with more aggressive prompting
      const hasPermission = await LocationService.requestPermission();
      setLocationPermission(hasPermission);

      if (hasPermission) {
        console.log('✅ Permission granted, getting location...');
        
        // Get initial location with multiple retry attempts
        let location = null;
        let attempts = 0;
        const maxAttempts = 5; // Increased attempts
        
        while (!location && attempts < maxAttempts) {
          attempts++;
          console.log(`🔄 Location attempt ${attempts}/${maxAttempts}`);
          
          try {
            location = await LocationService.getCurrentLocation();
        if (location) {
              console.log('📍 Location obtained on attempt', attempts, ':', location);
              
              // Check if this is a default location
              const isDefaultLocation = (
                (location.latitude >= 37.7 && location.latitude <= 37.8 && 
                 location.longitude >= -122.5 && location.longitude <= -122.4) || // San Francisco
                (location.latitude >= 33.7 && location.latitude <= 33.8 && 
                 location.longitude >= -84.4 && location.longitude <= -84.3) || // Atlanta
                (location.latitude >= 34.0 && location.latitude <= 34.1 && 
                 location.longitude >= -118.3 && location.longitude <= -118.2)    // Los Angeles
              );
              
              if (isDefaultLocation) {
                console.log('⚠️ Default location detected! Stopping location watching to prevent infinite loop.');
                // Stop location watching immediately to prevent infinite loop
                if (locationPolling) {
                  locationPolling.remove();
                  setLocationPolling(null);
                }
                LocationService.stopWatching();
                console.log('🛑 Location watching stopped due to default location');
                break; // Exit the retry loop
              }
              
              break;
            }
          } catch (error) {
            console.error(`❌ Location attempt ${attempts} failed:`, error);
          }
          
          if (!location && attempts < maxAttempts) {
            console.log('⏳ Waiting before retry...');
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
        
        if (location) {
          console.log('📍 Final location obtained:', location);
          setCurrentLocation(location);
          
          // Show success message with coordinates
          Alert.alert(
            'Location Found!',
            `We found you at: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
            [{ text: 'Continue' }]
          );
      } else {
          console.log('❌ Failed to get location after all attempts');
        Alert.alert(
            'Location Error',
            'Unable to get your current location after multiple attempts. Please ensure location services are enabled and try again.',
          [
            { text: 'Retry', onPress: initializeLocation },
              { text: 'Continue Without Location', style: 'cancel' }
            ]
          );
          return;
        }

        // Add location listener for real-time updates (only if not already listening)
        if (!locationPolling) {
          const locationListener = LocationService.addListener((newLocation) => {
            console.log('📍 Location update received:', newLocation);
            
            // Check if this is a default location and stop if so
            const isDefaultLocation = (
              (newLocation.latitude >= 37.7 && newLocation.latitude <= 37.8 && 
               newLocation.longitude >= -122.5 && newLocation.longitude <= -122.4) || // San Francisco
              (newLocation.latitude >= 33.7 && newLocation.latitude <= 33.8 && 
               newLocation.longitude >= -84.4 && newLocation.longitude <= -84.3) || // Atlanta
              (newLocation.latitude >= 34.0 && newLocation.latitude <= 34.1 && 
               newLocation.longitude >= -118.3 && newLocation.longitude <= -118.2)    // Los Angeles
            );
            
            if (isDefaultLocation) {
              console.log('⚠️ Default location detected in listener! Stopping location watching.');
              LocationService.stopWatching();
              if (locationPolling) {
                locationPolling.remove();
                setLocationPolling(null);
              }
              return; // Don't update location with default coordinates
            }
            
            setCurrentLocation(newLocation);
            console.log('📍 Map should now center on:', newLocation.latitude, newLocation.longitude);
          });
          
          setLocationPolling(locationListener);
        }

        // EMERGENCY: Disable location watching to prevent infinite loop
        console.log('🚨 EMERGENCY: Disabling location watching to prevent infinite loop');
        
        // Stop any existing location services
        LocationService.stopWatching();
        if (locationPolling) {
          clearInterval(locationPolling);
          setLocationPolling(null);
        }
        
        // Show alert to user about location issue
        Alert.alert(
          'Location Service Disabled',
          'Location services have been temporarily disabled to prevent app freezing. The app detected an infinite location loop with default coordinates.',
          [
            { 
              text: 'OK', 
              onPress: () => {
                console.log('✅ User acknowledged location service disabled');
              }
            }
          ]
        );
        
        console.log('✅ Location watching disabled to prevent infinite loop');
      } else {
        console.log('❌ Location permission denied');
        Alert.alert(
          'Location Access Required',
          'QuickTrash needs access to your location to show you nearby jobs and provide navigation. This is essential for working as a contractor.',
          [
            { text: 'Enable Location', onPress: initializeLocation },
            { text: 'Go to Settings', onPress: () => LocationService.requestPermission() }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Error initializing location:', error);
      Alert.alert(
        'Location Error', 
        'Unable to access your location. Please check your device settings and ensure location services are enabled.',
        [
          { text: 'Retry', onPress: initializeLocation },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const updateNearbyJobs = async () => {
    try {
      const nearby = await LocationService.getNearbyJobs(availableJobs, 25); // 25km radius
      setNearbyJobs(nearby);
    } catch (error) {
      console.error('Error updating nearby jobs:', error);
    }
  };

  return (
    <View style={styles.container}>
      <SharedHeader 
        title="Welcome back, Driver!"
        subtitle={
          <View style={styles.onlineStatus}>
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              trackColor={{ false: '#E5E7EB', true: '#34A853' }}
              thumbColor={isOnline ? '#FFFFFF' : '#9CA3AF'}
            />
            <Text style={[styles.statusText, { color: isOnline ? '#34A853' : '#6B7280' }]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        }
        showBackButton={false}
        rightComponent={
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#333" />
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>2</Text>
            </View>
          </TouchableOpacity>
        }
      />

      {/* Jobs Container */}
      {isOnline && (
        <View style={styles.jobsContainer}>
          <View style={styles.jobsHeader}>
            <View style={styles.jobsHeaderLeft}>
              <Text style={styles.jobsTitle}>Available Jobs</Text>
              <Text style={styles.jobsCount}>{allJobs.length} jobs available</Text>
            </View>
            <TouchableOpacity 
              style={styles.toggleButton}
              onPress={() => setShowJobsContainer(!showJobsContainer)}
            >
              <Ionicons 
                name={showJobsContainer ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#6B7280" 
              />
              <Text style={styles.toggleText}>
                {showJobsContainer ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {showJobsContainer && (
            <ScrollView 
              style={styles.jobsScrollView}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {allJobs.map((job) => (
                <View key={job.id} style={styles.jobCardContainer}>
                  <View style={[
                    styles.jobCardNew,
                    job.urgency === 'high' && styles.urgentJob,
                    job.urgency === 'low' && styles.lowPriorityJob
                  ]}>
                    {/* Job Header */}
                    <View style={styles.jobCardHeader}>
                      <View style={styles.jobTypeContainer}>
                        <View style={[
                          styles.urgencyBadge,
                          job.urgency === 'high' && styles.urgencyHigh,
                          job.urgency === 'normal' && styles.urgencyNormal,
                          job.urgency === 'low' && styles.urgencyLow
                        ]}>
                          <Text style={[
                            styles.urgencyText,
                            job.urgency === 'high' && styles.urgencyTextHigh,
                            job.urgency === 'normal' && styles.urgencyTextNormal,
                            job.urgency === 'low' && styles.urgencyTextLow
                          ]}>
                            {job.urgency.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.jobTypeNew}>{job.type}</Text>
                      </View>
                      <View style={styles.earningsContainer}>
                        <Text style={styles.earningsAmountNew}>{job.earnings}</Text>
                        <Text style={styles.earningsLabelNew}>Estimated</Text>
                      </View>
                    </View>

                    {/* Job Details */}
                    <View style={styles.jobDetailsSection}>
                      <Text style={styles.jobDescription}>{job.description}</Text>
                      <Text style={styles.jobVolumeNew}>{job.volume}</Text>
                      <View style={styles.jobMetrics}>
                        <View style={styles.metric}>
                          <Ionicons name="location-outline" size={16} color="#6B7280" />
                          <Text style={styles.metricText}>{job.distance}</Text>
                        </View>
                        <View style={styles.metric}>
                          <Ionicons name="time-outline" size={16} color="#6B7280" />
                          <Text style={styles.metricText}>{job.estimatedTime}</Text>
                        </View>
                        <View style={styles.metric}>
                          <Ionicons name="person-outline" size={16} color="#6B7280" />
                          <Text style={styles.metricText}>{job.customerName}</Text>
                        </View>
                      </View>
                      <Text style={styles.jobAddressNew}>{job.address}</Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.jobActions}>
                      <TouchableOpacity
                        style={styles.rejectJobButton}
                        onPress={() => handleRejectJobFromList(job)}
                      >
                        <Ionicons name="close-outline" size={18} color="#EF4444" />
                        <Text style={styles.rejectJobText}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.acceptJobButton}
                        onPress={() => handleAcceptJobFromList(job)}
                      >
                        <Ionicons name="checkmark-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.acceptJobText}>Accept Job</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
              
              {allJobs.length === 0 && (
                <View style={styles.noJobsContainer}>
                  <Ionicons name="briefcase-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.noJobsTitle}>No Jobs Available</Text>
                  <Text style={styles.noJobsText}>
                    All jobs have been accepted or completed. New jobs will appear here when available.
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Today's Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Performance</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle" size={24} color="#34A853" />
              <Text style={styles.statNumber}>{todayStats.jobsCompleted}</Text>
              <Text style={styles.statLabel}>Jobs Completed</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="cash" size={24} color="#FF8F00" />
              <Text style={styles.statNumber}>{todayStats.earnings}</Text>
              <Text style={styles.statLabel}>Earnings</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="time" size={24} color="#1E88E5" />
              <Text style={styles.statNumber}>{todayStats.hoursOnline}</Text>
              <Text style={styles.statLabel}>Hours Online</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="star" size={24} color="#FFB300" />
              <Text style={styles.statNumber}>{todayStats.rating}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </View>

        {/* Map View */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {locationPermission ? 'Available Jobs Near You' : 'Location Required'}
          </Text>
          <View style={styles.mapContainer}>
            {!locationPermission ? (
              <View style={styles.locationRequiredView}>
                <Ionicons name="location-outline" size={64} color="#9CA3AF" />
                <Text style={styles.locationRequiredTitle}>Location Access Required</Text>
                <Text style={styles.locationRequiredText}>
                  Enable location services to see nearby jobs and receive navigation assistance.
                </Text>
                <TouchableOpacity 
                  style={styles.enableLocationButton}
                  onPress={initializeLocation}
                >
                  <Ionicons name="location" size={20} color="#FFFFFF" />
                  <Text style={styles.enableLocationText}>Enable Location</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.refreshLocationButton}
                  onPress={async () => {
                    try {
                      console.log('🔄 Manually refreshing location...');
                      Alert.alert(
                        'Getting Location',
                        'Please wait while we get your current location...',
                        [],
                        { cancelable: false }
                      );
                      
                      const location = await LocationService.getCurrentLocation();
                      if (location) {
                        setCurrentLocation(location);
                        console.log('📍 Manual location refresh successful:', location);
                        console.log('📍 Map should now center on:', location.latitude, location.longitude);
                        Alert.alert(
                          'Location Updated!',
                          `New location: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}\n\nThe map should now show your actual location.`
                        );
                      } else {
                        Alert.alert('Location Error', 'Could not get current location. Please check your device settings.');
                      }
                    } catch (error) {
                      console.error('❌ Error refreshing location:', error);
                      Alert.alert('Location Error', 'Failed to refresh location: ' + error.message);
                    }
                  }}
                >
                  <Ionicons name="refresh" size={16} color="#34A853" />
                  <Text style={styles.refreshLocationText}>Get My Location</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.refreshLocationButton, { backgroundColor: '#EF4444', marginTop: 8 }]}
                  onPress={() => {
                    console.log('🛑 EMERGENCY STOP: Killing all location services');
                    
                    // Emergency stop all location services
                    LocationService.emergencyStop();
                    if (locationPolling) {
                      clearInterval(locationPolling);
                      setLocationPolling(null);
                    }
                    
                    // Clear location state
                    setCurrentLocation(null);
                    
                    Alert.alert(
                      'Emergency Stop', 
                      'All location services have been stopped. The app should no longer freeze.',
                      [{ text: 'OK' }]
                    );
                  }}
                >
                  <Ionicons name="stop" size={16} color="#FFFFFF" />
                  <Text style={styles.refreshLocationText}>EMERGENCY STOP</Text>
                </TouchableOpacity>
                
                {/* Debug location display */}
                {currentLocation && (
                  <View style={styles.locationDebugInfo}>
                    <Text style={styles.locationDebugText}>
                      Current: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                    </Text>
                    <Text style={styles.locationDebugText}>
                      Accuracy: {currentLocation.accuracy}m
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <MapView
                style={styles.map}
                provider="google"
                initialRegion={currentLocation ? {
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                } : MAPS_CONFIG.DEFAULT_REGION}
                region={currentLocation ? {
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                } : undefined}
                showsUserLocation={true}
                showsMyLocationButton={true}
                followsUserLocation={true}
                showsCompass={true}
                showsScale={true}
                customMapStyle={MAPS_CONFIG.MAP_STYLE}
                mapType="standard"
                key={currentLocation ? `${currentLocation.latitude}-${currentLocation.longitude}` : 'default'}
                onUserLocationChange={(event) => {
                  console.log('📍 User location change event:', event.nativeEvent);
                  if (event.nativeEvent.coordinate) {
                    const newLocation = {
                      latitude: event.nativeEvent.coordinate.latitude,
                      longitude: event.nativeEvent.coordinate.longitude,
                      accuracy: event.nativeEvent.coordinate.accuracy,
                      timestamp: Date.now(),
                      isDefault: false
                    };
                    setCurrentLocation(newLocation);
                    console.log('📍 Real-time location update:', newLocation);
                    console.log('📍 Map should now center on:', newLocation.latitude, newLocation.longitude);
                    
                    // Update nearby jobs when location changes
                    updateNearbyJobs();
                  }
                }}
                onMapReady={() => {
                  console.log('🗺️ Map is ready');
                }}
                onRegionChangeComplete={(region) => {
                  console.log('🗺️ Map region changed:', region);
                }}
              >
                {/* Real-time location tracking */}
                {currentLocation && (
                  <>
                    {/* Main location marker */}
                  <Marker
                    coordinate={{
                      latitude: currentLocation.latitude,
                      longitude: currentLocation.longitude,
                    }}
                      title="Your Live Location"
                      description={`GPS Active • Accuracy: ${currentLocation.accuracy ? `${currentLocation.accuracy.toFixed(0)}m` : 'Unknown'} • Updated: ${new Date(currentLocation.timestamp).toLocaleTimeString()}`}
                      pinColor="#34A853"
                    >
                      <View style={styles.liveLocationMarker}>
                        <View style={styles.liveLocationIcon}>
                          <Ionicons name="location" size={16} color="#FFFFFF" />
                        </View>
                        <View style={styles.liveLocationPulse} />
                      </View>
                    </Marker>
                    
                    {/* Accuracy circle with pulsing effect */}
                    {currentLocation.accuracy && (
                      <Circle
                        center={{
                          latitude: currentLocation.latitude,
                          longitude: currentLocation.longitude,
                        }}
                        radius={currentLocation.accuracy}
                        strokeColor="rgba(52, 168, 83, 0.6)"
                        fillColor="rgba(52, 168, 83, 0.15)"
                        strokeWidth={3}
                      />
                    )}
                    
                    {/* Additional accuracy rings for better visualization */}
                    {currentLocation.accuracy && (
                      <>
                        <Circle
                          center={{
                            latitude: currentLocation.latitude,
                            longitude: currentLocation.longitude,
                          }}
                          radius={currentLocation.accuracy * 0.5}
                          strokeColor="rgba(52, 168, 83, 0.4)"
                          fillColor="rgba(52, 168, 83, 0.05)"
                          strokeWidth={2}
                        />
                        <Circle
                          center={{
                            latitude: currentLocation.latitude,
                            longitude: currentLocation.longitude,
                          }}
                          radius={currentLocation.accuracy * 1.5}
                          strokeColor="rgba(52, 168, 83, 0.2)"
                          fillColor="rgba(52, 168, 83, 0.02)"
                          strokeWidth={1}
                        />
                      </>
                    )}
                  </>
                )}

                {/* Available jobs markers */}
                {nearbyJobs.map((job) => (
                  <Marker
                    key={job.id}
                    coordinate={job.coordinates}
                    title={job.type}
                    description={`${job.earnings} • ${job.distance?.toFixed(1)}km away`}
                    pinColor={MAPS_CONFIG.MARKERS.JOB.color}
                    onPress={() => handleJobPress(job)}
                  />
                ))}

                {/* Route polyline */}
                {route && route.coordinates && (
                  <Polyline
                    coordinates={route.coordinates}
                    strokeColor="#3B82F6"
                    strokeWidth={4}
                    lineDashPattern={[5, 5]}
                  />
                )}
              </MapView>
            )}
            
          </View>
        </View>

        {/* Available Jobs List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Jobs Near You</Text>
          {isOnline ? (
            <View style={styles.jobsListContainer}>
            <AvailableJobsList />
            </View>
          ) : (
            <View style={styles.offlineState}>
              <Ionicons name="moon-outline" size={48} color="#9CA3AF" />
              <Text style={styles.offlineText}>You're offline</Text>
              <Text style={styles.offlineSubtext}>Turn online to start receiving job offers</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Job Offer Modal */}
      <Modal
        visible={showJobModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowJobModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Job Offer</Text>
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownText}>{countdown}s</Text>
            </View>
          </View>

          {activeJob && (
            <View style={styles.modalContent}>
              <View style={styles.jobOfferCard}>
                <Text style={styles.jobOfferType}>{activeJob.type}</Text>
                <Text style={styles.jobOfferDetails}>{activeJob.volume}</Text>
                <Text style={styles.jobOfferAddress}>{activeJob.address}</Text>
                
                <View style={styles.offerStats}>
                  <View style={styles.offerStat}>
                    <Ionicons name="location" size={20} color="#6B7280" />
                    <Text style={styles.offerStatText}>{activeJob.distance}</Text>
                  </View>
                  <View style={styles.offerStat}>
                    <Ionicons name="cash" size={20} color="#34A853" />
                    <Text style={styles.offerStatText}>{activeJob.earnings}</Text>
                  </View>
                  <View style={styles.offerStat}>
                    <Ionicons name="person" size={20} color="#6B7280" />
                    <Text style={styles.offerStatText}>{activeJob.customerName}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.declineButton]}
                  onPress={handleDeclineJob}
                >
                  <Text style={styles.declineButtonText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={handleAcceptJob}
                >
                  <Text style={styles.acceptButtonText}>Accept Job</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* New Job Notification Modal */}
      <Modal
        visible={showNewJobModal}
        animationType="slide"
        presentationStyle="overFullScreen"
        transparent={true}
        onRequestClose={() => setShowNewJobModal(false)}
      >
        <View style={styles.notificationOverlay}>
          <View style={styles.notificationContainer}>
            {/* Notification Header */}
            <View style={styles.notificationHeader}>
              <View style={styles.newJobBadge}>
                <Ionicons name="flash" size={16} color="#FFFFFF" />
                <Text style={styles.newJobBadgeText}>NEW JOB</Text>
              </View>
              <View style={styles.notificationCountdown}>
                <Ionicons name="timer-outline" size={16} color="#EF4444" />
                <Text style={styles.countdownTextNew}>{notificationCountdown}s</Text>
              </View>
            </View>

            {newJobNotification && (
              <>
                {/* Job Information */}
                <View style={styles.notificationJobInfo}>
                  <View style={styles.notificationJobHeader}>
                    <Text style={styles.notificationJobType}>{newJobNotification.type}</Text>
                    <Text style={styles.notificationJobEarnings}>{newJobNotification.earnings}</Text>
                  </View>
                  
                  <Text style={styles.notificationJobDescription}>
                    {newJobNotification.description}
                  </Text>
                  
                  <View style={styles.notificationJobDetails}>
                    <View style={styles.notificationDetailRow}>
                      <Ionicons name="cube-outline" size={16} color="#6B7280" />
                      <Text style={styles.notificationDetailText}>{newJobNotification.volume}</Text>
                    </View>
                    <View style={styles.notificationDetailRow}>
                      <Ionicons name="location-outline" size={16} color="#6B7280" />
                      <Text style={styles.notificationDetailText}>{newJobNotification.distance}</Text>
                    </View>
                    <View style={styles.notificationDetailRow}>
                      <Ionicons name="time-outline" size={16} color="#6B7280" />
                      <Text style={styles.notificationDetailText}>{newJobNotification.estimatedTime}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.notificationLocationInfo}>
                    <Ionicons name="person-outline" size={16} color="#6B7280" />
                    <Text style={styles.notificationCustomerName}>{newJobNotification.customerName}</Text>
                  </View>
                  <Text style={styles.notificationAddress}>{newJobNotification.address}</Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.notificationActions}>
                  <TouchableOpacity
                    style={styles.notificationRejectButton}
                    onPress={handleRejectNewJob}
                  >
                    <Ionicons name="close-outline" size={20} color="#EF4444" />
                    <Text style={styles.notificationRejectText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.notificationAcceptButton}
                    onPress={handleAcceptNewJob}
                  >
                    <Ionicons name="checkmark-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.notificationAcceptText}>Accept Job</Text>
                  </TouchableOpacity>
                </View>

                {/* Auto-add notice */}
                <Text style={styles.autoAddNotice}>
                  Job will be automatically added to your list if no action is taken
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  map: {
    flex: 1,
  },
  jobCard: {
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
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  jobInfo: {
    flex: 1,
  },
  jobType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  jobDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  jobAddress: {
    fontSize: 14,
    color: '#374151',
  },
  jobEarnings: {
    alignItems: 'flex-end',
  },
  earningsAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#34A853',
  },
  earningsLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  offlineState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  offlineText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 12,
  },
  offlineSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  jobsListContainer: {
    height: 400, // Fixed height to prevent VirtualizedList nesting
  },
  locationRequiredView: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 32,
  },
  locationRequiredTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  locationRequiredText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  enableLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34A853',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  enableLocationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  refreshLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#34A853',
    marginTop: 12,
  },
  refreshLocationText: {
    color: '#34A853',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  locationDebugInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  locationDebugText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  locationStatusOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 1000,
  },
  realtimeLocationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(52, 168, 83, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  locationIconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  locationPulse: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 168, 83, 0.3)',
    borderWidth: 2,
    borderColor: '#34A853',
    opacity: 0.6,
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  locationSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  locationStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34A853',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginRight: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  locationDetails: {
    padding: 16,
  },
  coordinateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  coordinateLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  coordinateValue: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '600',
    fontFamily: 'monospace',
    flex: 2,
    textAlign: 'right',
  },
  visualLocationContainer: {
    padding: 16,
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
  },
  locationVisualization: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gpsIndicator: {
    position: 'relative',
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gpsCenter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#34A853',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  gpsRing1: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(52, 168, 83, 0.6)',
    zIndex: 1,
  },
  gpsRing2: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(52, 168, 83, 0.4)',
    zIndex: 2,
  },
  gpsRing3: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(52, 168, 83, 0.2)',
    zIndex: 3,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  accuracyText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  updateTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  liveLocationMarker: {
    position: 'relative',
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveLocationIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#34A853',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 2,
  },
  liveLocationPulse: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(52, 168, 83, 0.3)',
    zIndex: 1,
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
  countdownContainer: {
    backgroundColor: '#EF4444',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  countdownText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  jobOfferCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  jobOfferType: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  jobOfferDetails: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  jobOfferAddress: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 20,
  },
  offerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  offerStat: {
    alignItems: 'center',
  },
  offerStatText: {
    fontSize: 14,
    color: '#374151',
    marginTop: 4,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  acceptButton: {
    backgroundColor: '#34A853',
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // Jobs Container Styles
  jobsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  jobsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  jobsHeaderLeft: {
    flex: 1,
  },
  jobsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  jobsCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toggleText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 4,
  },
  jobsScrollView: {
    maxHeight: 400,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  jobCardContainer: {
    marginTop: 16,
  },
  jobCardNew: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  urgentJob: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  lowPriorityJob: {
    borderColor: '#10B981',
    borderWidth: 1,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  jobTypeContainer: {
    flex: 1,
  },
  urgencyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  urgencyHigh: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  urgencyNormal: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  urgencyLow: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  urgencyTextHigh: {
    color: '#DC2626',
  },
  urgencyTextNormal: {
    color: '#2563EB',
  },
  urgencyTextLow: {
    color: '#059669',
  },
  jobTypeNew: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  earningsContainer: {
    alignItems: 'flex-end',
  },
  earningsAmountNew: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#34A853',
    marginBottom: 2,
  },
  earningsLabelNew: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  jobDetailsSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  jobDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  jobVolumeNew: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 12,
  },
  jobMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metricText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  jobAddressNew: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  jobActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
  },
  rejectJobButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
  },
  rejectJobText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 6,
  },
  acceptJobButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#34A853',
  },
  acceptJobText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  noJobsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  noJobsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  noJobsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  // New Job Notification Styles
  notificationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  notificationContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  newJobBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34A853',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  newJobBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  notificationCountdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  countdownTextNew: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  notificationJobInfo: {
    padding: 20,
  },
  notificationJobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  notificationJobType: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  notificationJobEarnings: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#34A853',
  },
  notificationJobDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  notificationJobDetails: {
    marginBottom: 16,
  },
  notificationDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationDetailText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    fontWeight: '500',
  },
  notificationLocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationCustomerName: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    fontWeight: '600',
  },
  notificationAddress: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 24,
  },
  notificationActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  notificationRejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#F9FAFB',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  notificationRejectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 6,
  },
  notificationAcceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#34A853',
  },
  notificationAcceptText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  autoAddNotice: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    fontStyle: 'italic',
  },
});

// Cleanup on unmount
useEffect(() => {
  return () => {
    console.log('🧹 Cleaning up location services...');
    if (locationPolling) {
      locationPolling.remove();
      setLocationPolling(null);
    }
    LocationService.stopWatching();
    console.log('✅ Location services cleaned up');
  };
}, []);

export default ContractorDashboard;
