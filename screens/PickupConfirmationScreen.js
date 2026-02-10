import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebaseConfig';
import MAPS_CONFIG from '../config/mapsConfig';

const Colors = {
  primary: '#34A853',
  secondary: '#3B82F6',
  warning: '#F59E0B',
  textDark: '#1F2937',
  textMedium: '#6B7280',
  background: '#F9FAFB',
  card: '#FFFFFF',
};

const STEP_LABELS = ['Verify Order', 'Before Photo', 'After Photo', 'Confirm', 'Select Dumpster'];

// Haversine distance in feet
const calculateDistanceFeet = (coord1, coord2) => {
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(coord1.latitude)) * Math.cos(toRad(coord2.latitude)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 3.28084;
};

const PickupConfirmationScreen = ({ route, navigation }) => {
  const { jobId, coordinates, address, payout, description, skipToStep } = route.params || {};

  const [currentStep, setCurrentStep] = useState(skipToStep || 1);
  const [jobData, setJobData] = useState(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [beforePhoto, setBeforePhoto] = useState(null);
  const [afterPhoto, setAfterPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dumpsters, setDumpsters] = useState([]);
  const [loadingDumpsters, setLoadingDumpsters] = useState(false);
  const [contractorLocation, setContractorLocation] = useState(null);

  // Fetch job data on mount
  useEffect(() => {
    const fetchJob = async () => {
      if (!jobId) {
        setLoadingJob(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'jobs', jobId));
        if (snap.exists()) {
          setJobData(snap.data());
        }
      } catch (err) {
        console.error('Error fetching job:', err);
      } finally {
        setLoadingJob(false);
      }
    };
    fetchJob();
  }, [jobId]);

  // Get contractor location for dumpster distance sorting
  useEffect(() => {
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setContractorLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      } catch (e) {
        console.warn('Could not get contractor location:', e);
      }
    };
    getLocation();
  }, []);

  // Auto-fetch dumpsters when skipping directly to step 5
  useEffect(() => {
    if (skipToStep === 5 && (contractorLocation || coordinates)) {
      fetchNearbyDumpsters();
    }
  }, [skipToStep, contractorLocation]);

  const takePhoto = async (setter) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, base64: false });
    if (!result.canceled) {
      setter(result.assets?.[0]?.uri || result.uri);
    }
  };

  const uploadPhoto = async (uri, label) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const timestamp = Date.now();
    const storageRef = ref(storage, `pickup_photos/${jobId}/${label}_${timestamp}.jpg`);
    await uploadBytes(storageRef, blob);
    return getDownloadURL(storageRef);
  };

  const handleConfirmPickup = async () => {
    if (!jobId || !beforePhoto || !afterPhoto) return;
    setUploading(true);
    try {
      const [beforeUrl, afterUrl] = await Promise.all([
        uploadPhoto(beforePhoto, 'before'),
        uploadPhoto(afterPhoto, 'after'),
      ]);

      const jobRef = doc(db, 'jobs', jobId);
      await updateDoc(jobRef, {
        status: 'picked_up',
        pickedUpAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        'photos.afterPickup': [beforeUrl, afterUrl],
      });

      // Advance to dumpster selection
      setCurrentStep(5);
      fetchNearbyDumpsters();
    } catch (error) {
      console.error('Error confirming pickup:', error);
      Alert.alert('Error', 'Failed to confirm pickup. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const fetchNearbyDumpsters = async () => {
    setLoadingDumpsters(true);
    try {
      const apiKey = MAPS_CONFIG.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        Alert.alert('Config Error', 'Maps API key not configured.');
        return;
      }
      const base = contractorLocation || coordinates;
      if (!base) return;

      const location = `${base.latitude},${base.longitude}`;
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=5000&keyword=${encodeURIComponent('public dumpster waste disposal')}&key=${apiKey}`;
      const resp = await fetch(url);
      const data = await resp.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.warn('Places API error', data);
        return;
      }

      const places = (data.results || []).map((p) => ({
        id: p.place_id,
        name: p.name,
        location: { latitude: p.geometry.location.lat, longitude: p.geometry.location.lng },
        vicinity: p.vicinity,
        rating: p.rating,
      }));

      const sortBase = contractorLocation || coordinates;
      places.sort((a, b) => calculateDistanceFeet(sortBase, a.location) - calculateDistanceFeet(sortBase, b.location));
      setDumpsters(places);
    } catch (error) {
      console.error('Error fetching dumpsters:', error);
    } finally {
      setLoadingDumpsters(false);
    }
  };

  const handleSelectDumpster = (dumpster) => {
    navigation.replace('NavigationScreen', {
      jobId,
      targetLocation: dumpster.location,
      address: dumpster.vicinity || dumpster.name,
      payout,
      description: `Navigate to dumpster: ${dumpster.name}`,
      mode: 'dumpster',
    });
  };

  // --- Step Indicator ---
  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;
        return (
          <View key={stepNum} style={styles.stepItem}>
            <View style={[
              styles.stepCircle,
              isActive && styles.stepCircleActive,
              isCompleted && styles.stepCircleCompleted,
            ]}>
              {isCompleted ? (
                <Ionicons name="checkmark" size={14} color="#fff" />
              ) : (
                <Text style={[styles.stepNumber, (isActive || isCompleted) && styles.stepNumberActive]}>
                  {stepNum}
                </Text>
              )}
            </View>
            <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]} numberOfLines={1}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );

  // --- Step 1: Verify Order ---
  const renderStep1 = () => (
    <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepContentInner}>
      <Text style={styles.stepTitle}>Verify Order Information</Text>
      <Text style={styles.stepSubtitle}>Confirm the details match what you see at the location.</Text>

      {loadingJob ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Waste Type</Text>
              <Text style={styles.infoValue}>
                {(jobData?.wasteType || 'N/A').charAt(0).toUpperCase() + (jobData?.wasteType || 'N/A').slice(1)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Bag Size</Text>
              <Text style={styles.infoValue}>{jobData?.bagSize || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Volume</Text>
              <Text style={styles.infoValue}>{jobData?.volume || 'N/A'}</Text>
            </View>
            {jobData?.description ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Notes</Text>
                <Text style={styles.infoValue}>{jobData.description}</Text>
              </View>
            ) : null}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{address || jobData?.pickupAddress?.fullAddress || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payout</Text>
              <Text style={[styles.infoValue, { color: Colors.primary, fontWeight: '700' }]}>
                ${jobData?.pricing?.contractorPayout || payout || 0}
              </Text>
            </View>
          </View>

          {/* Customer photos */}
          {jobData?.photos?.beforePickup?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Customer Photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
                {jobData.photos.beforePickup.map((uri, idx) => (
                  <Image key={idx} source={{ uri }} style={styles.customerPhoto} />
                ))}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity style={styles.primaryButton} onPress={() => setCurrentStep(2)}>
            <Text style={styles.primaryButtonText}>Confirm Info</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );

  // --- Step 2: Before Photo ---
  const renderStep2 = () => (
    <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepContentInner}>
      <Text style={styles.stepTitle}>Before Pickup Photo</Text>
      <Text style={styles.stepSubtitle}>Take a photo of the bags at the customer's location before loading.</Text>

      {beforePhoto ? (
        <View style={styles.photoPreviewContainer}>
          <Image source={{ uri: beforePhoto }} style={styles.photoPreview} />
          <TouchableOpacity style={styles.retakeButton} onPress={() => takePhoto(setBeforePhoto)}>
            <Ionicons name="camera-reverse" size={20} color={Colors.secondary} />
            <Text style={styles.retakeText}>Retake</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.cameraCard} onPress={() => takePhoto(setBeforePhoto)}>
          <Ionicons name="camera" size={48} color={Colors.textMedium} />
          <Text style={styles.cameraCardText}>Tap to take photo</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.primaryButton, !beforePhoto && styles.disabledButton]}
        onPress={() => setCurrentStep(3)}
        disabled={!beforePhoto}
      >
        <Text style={styles.primaryButtonText}>Continue</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </ScrollView>
  );

  // --- Step 3: After Photo ---
  const renderStep3 = () => (
    <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepContentInner}>
      <Text style={styles.stepTitle}>After Loading Photo</Text>
      <Text style={styles.stepSubtitle}>Take a photo of the bags loaded in your vehicle.</Text>

      {afterPhoto ? (
        <View style={styles.photoPreviewContainer}>
          <Image source={{ uri: afterPhoto }} style={styles.photoPreview} />
          <TouchableOpacity style={styles.retakeButton} onPress={() => takePhoto(setAfterPhoto)}>
            <Ionicons name="camera-reverse" size={20} color={Colors.secondary} />
            <Text style={styles.retakeText}>Retake</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.cameraCard} onPress={() => takePhoto(setAfterPhoto)}>
          <Ionicons name="camera" size={48} color={Colors.textMedium} />
          <Text style={styles.cameraCardText}>Tap to take photo</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.primaryButton, !afterPhoto && styles.disabledButton]}
        onPress={() => setCurrentStep(4)}
        disabled={!afterPhoto}
      >
        <Text style={styles.primaryButtonText}>Continue</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </ScrollView>
  );

  // --- Step 4: Review & Confirm ---
  const renderStep4 = () => (
    <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepContentInner}>
      <Text style={styles.stepTitle}>Review & Confirm Pickup</Text>
      <Text style={styles.stepSubtitle}>Review your photos and confirm the pickup.</Text>

      <View style={styles.reviewPhotos}>
        <View style={styles.reviewPhotoItem}>
          <Text style={styles.reviewPhotoLabel}>Before</Text>
          {beforePhoto && <Image source={{ uri: beforePhoto }} style={styles.reviewPhoto} />}
        </View>
        <View style={styles.reviewPhotoItem}>
          <Text style={styles.reviewPhotoLabel}>After</Text>
          {afterPhoto && <Image source={{ uri: afterPhoto }} style={styles.reviewPhoto} />}
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Job</Text>
          <Text style={styles.infoValue}>
            {(jobData?.wasteType || 'Waste').charAt(0).toUpperCase() + (jobData?.wasteType || 'waste').slice(1)} - {jobData?.bagSize || 'N/A'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Payout</Text>
          <Text style={[styles.infoValue, { color: Colors.primary, fontWeight: '700' }]}>
            ${jobData?.pricing?.contractorPayout || payout || 0}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, uploading && styles.disabledButton]}
        onPress={handleConfirmPickup}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Confirm Pickup</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  // --- Step 5: Select Dumpster ---
  const renderStep5 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepContentInner}>
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
          <Text style={styles.successText}>Pickup confirmed!</Text>
        </View>

        <Text style={styles.stepTitle}>Select a Dumpster</Text>
        <Text style={styles.stepSubtitle}>Choose the nearest dumpster to dispose of the waste.</Text>
      </View>

      {loadingDumpsters ? (
        <ActivityIndicator size="large" color={Colors.secondary} style={{ marginTop: 40 }} />
      ) : dumpsters.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="trash-outline" size={48} color={Colors.textMedium} />
          <Text style={styles.emptyText}>No dumpsters found nearby.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchNearbyDumpsters}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.dumpsterList} contentContainerStyle={{ paddingBottom: 20 }}>
          {dumpsters.map((d) => {
            const distMiles = contractorLocation
              ? (calculateDistanceFeet(contractorLocation, d.location) / 5280).toFixed(2)
              : null;
            return (
              <TouchableOpacity key={d.id} style={styles.dumpsterRow} onPress={() => handleSelectDumpster(d)}>
                <View style={styles.dumpsterIcon}>
                  <MaterialIcons name="delete-sweep" size={24} color={Colors.primary} />
                </View>
                <View style={styles.dumpsterInfo}>
                  <Text style={styles.dumpsterName} numberOfLines={1}>{d.name}</Text>
                  <Text style={styles.dumpsterVicinity} numberOfLines={1}>{d.vicinity}</Text>
                </View>
                {distMiles && <Text style={styles.dumpsterDist}>{distMiles} mi</Text>}
                <Ionicons name="chevron-forward" size={20} color={Colors.textMedium} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return renderStep1();
    }
  };

  return (
    <View style={styles.container}>
      {renderStepIndicator()}
      {renderCurrentStep()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: Colors.secondary,
  },
  stepCircleCompleted: {
    backgroundColor: Colors.primary,
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMedium,
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 10,
    color: Colors.textMedium,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: Colors.secondary,
    fontWeight: '600',
  },

  // Step Content
  stepContent: {
    flex: 1,
  },
  stepContentInner: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 14,
    color: Colors.textMedium,
    marginBottom: 20,
    lineHeight: 20,
  },

  // Info Card
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textMedium,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    color: Colors.textDark,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
    maxWidth: '60%',
  },

  // Sections
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 10,
  },
  photoRow: {
    flexDirection: 'row',
  },
  customerPhoto: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: '#E5E7EB',
  },

  // Camera
  cameraCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  cameraCardText: {
    fontSize: 16,
    color: Colors.textMedium,
    marginTop: 12,
  },

  // Photo Preview
  photoPreviewContainer: {
    marginBottom: 20,
  },
  photoPreview: {
    width: '100%',
    height: 280,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 6,
  },
  retakeText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary,
  },

  // Review Photos
  reviewPhotos: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  reviewPhotoItem: {
    flex: 1,
  },
  reviewPhotoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMedium,
    marginBottom: 6,
    textAlign: 'center',
  },
  reviewPhoto: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
  },

  // Buttons
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
  },

  // Success Banner
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  successText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B5E20',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textMedium,
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary,
  },

  // Dumpster List
  dumpsterList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  dumpsterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  dumpsterIcon: {
    padding: 6,
    backgroundColor: `${Colors.primary}15`,
    borderRadius: 6,
    marginRight: 12,
  },
  dumpsterInfo: {
    flex: 1,
    marginRight: 10,
  },
  dumpsterName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textDark,
  },
  dumpsterVicinity: {
    fontSize: 12,
    color: Colors.textMedium,
    marginTop: 2,
  },
  dumpsterDist: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
    marginRight: 8,
  },
});

export default PickupConfirmationScreen;
