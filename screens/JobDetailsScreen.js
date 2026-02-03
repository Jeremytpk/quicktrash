
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';


const JobDetailsScreen = ({ route, navigation }) => {
  // Accept either jobDetails or jobId as param
  const { jobDetails, jobId } = route.params || {};
  const [job, setJob] = useState(jobDetails || null);
  const [loading, setLoading] = useState(!jobDetails && !!jobId);
  const [image, setImage] = useState(null);
  const [isJobCompleted, setIsJobCompleted] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      if (!job && jobId) {
        setLoading(true);
        try {
          const jobRef = doc(db, 'jobs', jobId);
          const jobSnap = await getDoc(jobRef);
          if (jobSnap.exists()) {
            setJob({ id: jobSnap.id, ...jobSnap.data() });
          } else {
            Alert.alert('Error', 'Job not found.');
            navigation.goBack();
          }
        } catch (e) {
          Alert.alert('Error', 'Failed to load job details.');
          navigation.goBack();
        } finally {
          setLoading(false);
        }
      }
    };
    fetchJob();
  }, [jobId]);

  const pickImage = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleConfirmPickup = () => {
    if (image) {
      setIsJobCompleted(true);
      Alert.alert('Pickup Confirmed', 'The trash pickup has been successfully confirmed.');
      navigation.goBack();
    } else {
      Alert.alert('Error', 'Please take a picture before confirming the pickup.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}> 
        <ActivityIndicator size="large" color="#1E88E5" />
        <Text style={{ marginTop: 16 }}>Loading job details...</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}> 
        <Text style={{ color: 'red' }}>Job details not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Job Details</Text>
      <View style={styles.detailsContainer}>
        <Text style={styles.detailText}>Address: {job.pickupAddress?.fullAddress || job.address || 'N/A'}</Text>
        <Text style={styles.detailText}>Payout: ${job.pricing?.contractorPayout || job.payout || 'N/A'}</Text>
        <Text style={styles.detailText}>Description: {job.description || 'N/A'}</Text>
        {isJobCompleted && <Text style={styles.completedText}>Status: Completed</Text>}
      </View>

      <TouchableOpacity style={styles.cameraButton} onPress={pickImage}>
        <Text style={styles.cameraButtonText}>Take Picture</Text>
      </TouchableOpacity>

      {image && <Image source={{ uri: image }} style={styles.imagePreview} />}

      <TouchableOpacity
        style={[styles.confirmButton, image ? styles.activeButton : styles.inactiveButton]}
        onPress={handleConfirmPickup}
        disabled={!image}
      >
        <Text style={styles.confirmButtonText}>Confirm Pickup</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  detailsContainer: {
    marginBottom: 20,
  },
  detailText: {
    fontSize: 16,
    marginBottom: 10,
  },
  completedText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'green',
    marginTop: 10,
  },
  cameraButton: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  cameraButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    marginBottom: 20,
    borderRadius: 8,
  },
  confirmButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#34A853',
  },
  inactiveButton: {
    backgroundColor: '#9CA3AF',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default JobDetailsScreen;