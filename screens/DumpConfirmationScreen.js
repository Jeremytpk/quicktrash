import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { doc, updateDoc, serverTimestamp, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

const DumpConfirmationScreen = ({ route, navigation }) => {
  const paramsJobId = route.params?.jobId;
  const [jobId, setJobId] = useState(paramsJobId || null);
  const [imageUri, setImageUri] = useState(null);
  const [uploading, setUploading] = useState(false);

  // If no jobId provided, attempt to find current contractor's in_progress job
  useEffect(() => {
    let cancelled = false;
    const findActiveJob = async () => {
      if (jobId) return;
      try {
        const contractorId = auth.currentUser?.uid;
        if (!contractorId) return;
        const jobsRef = collection(db, 'jobs');
        const q = query(jobsRef, where('contractorId', '==', contractorId), where('status', '==', 'in_progress'), limit(1));
        const snap = await getDocs(q);
        if (!cancelled && !snap.empty) {
          const docSnap = snap.docs[0];
          setJobId(docSnap.id);
        }
      } catch (err) {
        console.error('Error finding active job for dump confirmation:', err);
      }
    };

    findActiveJob();
    return () => { cancelled = true; };
  }, [jobId]);

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Camera permission is required to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      base64: false,
    });

    if (!result.cancelled) {
      setImageUri(result.assets?.[0]?.uri || result.uri);
    }
  };

  const uploadAndConfirm = async () => {
    if (!jobId) {
      Alert.alert('Missing job', 'Job id not available.');
      return;
    }
    if (!imageUri) {
      Alert.alert('Photo required', 'Please take a photo of the trash at the dumpster before confirming.');
      return;
    }

    setUploading(true);

    try {
      // Upload image to Firebase Storage under /dump_photos/{jobId}/{timestamp}.jpg
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const timestamp = Date.now();
      const storageRef = ref(storage, `dump_photos/${jobId}/${timestamp}.jpg`);
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);

      // Update job document: mark completed, attach dumpPhoto url, set completedAt and updatedAt
      const jobRef = doc(db, 'jobs', jobId);
      await updateDoc(jobRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        dumpPhoto: downloadUrl,
        dumpedBy: auth.currentUser?.uid || null,
      });

  Alert.alert('Success', 'Dumping confirmed. Earnings updated.');
  navigation.navigate('ContractorDashboard');
    } catch (error) {
      console.error('Error uploading dump photo or updating job:', error);
      Alert.alert('Error', 'Failed to confirm dump. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Confirm Dumping</Text>
      <Text style={styles.subtitle}>Please take a photo of the trash near the dumpster to confirm delivery.</Text>

      {jobId ? (
        <Text style={{ marginTop: 6, color: '#374151' }}>Job ID: <Text style={{ fontWeight: '700' }}>{jobId}</Text></Text>
      ) : (
        <Text style={{ marginTop: 6, color: '#B91C1C' }}>Looking up your active job... You will be able to confirm once a job is found.</Text>
      )}

      <TouchableOpacity style={styles.cameraButton} onPress={takePhoto}>
        <Ionicons name="camera" size={20} color="#fff" />
        <Text style={styles.cameraButtonText}>Take Photo</Text>
      </TouchableOpacity>

      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.preview} />
      )}

      <TouchableOpacity style={[styles.confirmButton, (!imageUri || !jobId) && styles.disabledButton]} onPress={uploadAndConfirm} disabled={!imageUri || uploading || !jobId}>
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.confirmButtonText}>Confirm Dumping & Finish Job</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F9FAFB' },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 18 },
  cameraButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#34A853', padding: 12, borderRadius: 8, width: '60%', justifyContent: 'center', gap: 8 },
  cameraButtonText: { color: '#fff', fontWeight: '700', marginLeft: 8 },
  preview: { width: '100%', height: 300, marginTop: 16, borderRadius: 8, backgroundColor: '#eee' },
  confirmButton: { backgroundColor: '#2563EB', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  confirmButtonText: { color: '#fff', fontWeight: '700' },
  disabledButton: { backgroundColor: '#9CA3AF' },
});

export default DumpConfirmationScreen;
