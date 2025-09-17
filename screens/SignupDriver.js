import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  ActivityIndicator, // New import for loading state
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // Firebase Storage imports
import * as ImagePicker from 'expo-image-picker'; // Image Picker import
import { auth, db } from '../firebaseConfig';
import QuickTrashLogo from '../assets/logo/qt_logo_vide.png';
import { Ionicons } from '@expo/vector-icons';

const SignupDriver = ({ navigation, route }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [frontImage, setFrontImage] = useState(null); // State for front image URI
  const [backImage, setBackImage] = useState(null);   // State for back image URI
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false); // Loading state for async operations

  const userRole = 'contractor'; 
  const storage = getStorage();

  // Function to pick an image from the device
  const pickImage = async (setImage) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // Function to upload an image to Firebase Storage
  const uploadImage = async (uri, path) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob);
    return getDownloadURL(storageRef);
  };

  const handleDriverSignup = async () => {
    try {
      if (!email || !password || !vehicleType || !licensePlate || !frontImage || !backImage) {
        Alert.alert('Error', 'Please fill in all fields and upload both license images.');
        return;
      }

      setLoading(true);
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Upload images to Firebase Storage
      const frontImagePath = `driver-licenses/${uid}/front-license.jpg`;
      const backImagePath = `driver-licenses/${uid}/back-license.jpg`;

      const frontImageUrl = await uploadImage(frontImage, frontImagePath);
      const backImageUrl = await uploadImage(backImage, backImagePath);

      // Create a document for the new user in Firestore
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, {
        email: userCredential.user.email,
        displayName: email.split('@')[0],
        role: userRole,
        vehicleInfo: {
          type: vehicleType,
          licensePlate: licensePlate,
        },
        driverLicense: {
          frontUrl: frontImageUrl,
          backUrl: backImageUrl,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: false, // Set to false until admin verification
      });
      
      setLoading(false);

      Alert.alert(
        'Account Created',
        'Your account has been created and is pending verification. We will notify you once approved!',
        [{ text: 'OK', onPress: () => navigation.navigate('Login', { userRole }) }]
      );

      // Clear the input fields after successful signup
      setEmail('');
      setPassword('');
      setVehicleType('');
      setLicensePlate('');
      setFrontImage(null);
      setBackImage(null);
      
    } catch (error) {
      setLoading(false);
      Alert.alert('Signup Failed', error.message);
      console.error(error);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={QuickTrashLogo} style={styles.logo} />
      <Text style={styles.title}>DRIVER SIGN UP</Text>
      <Text style={styles.subtitle}>Become a Picker</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholderTextColor="#999"
      />
      <View style={styles.passwordContainer}> 
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!passwordVisible}
          placeholderTextColor="#999"
        />
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setPasswordVisible(!passwordVisible)}
        >
          <Ionicons 
            name={passwordVisible ? "eye" : "eye-off"}
            size={24} 
            color="#999" 
          />
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Vehicle Type (e.g., Truck, Van)"
        value={vehicleType}
        onChangeText={setVehicleType}
        placeholderTextColor="#999"
      />
      <TextInput
        style={styles.input}
        placeholder="Vehicle License Plate"
        value={licensePlate}
        onChangeText={setLicensePlate}
        autoCapitalize="characters"
        placeholderTextColor="#999"
      />
      
      {/* License Image Upload */}
      <View style={styles.imageUploadContainer}>
        <Text style={styles.uploadTitle}>Driver's License Photo</Text>
        <Text style={styles.uploadSubtitle}>Upload a clear photo of your driver's license (front and back).</Text>
        <View style={styles.imageButtons}>
          <TouchableOpacity 
            style={styles.imageButton} 
            onPress={() => pickImage(setFrontImage)}
          >
            {frontImage ? (
              <Image source={{ uri: frontImage }} style={styles.previewImage} />
            ) : (
              <Ionicons name="camera-outline" size={40} color="#6B7280" />
            )}
            <Text style={styles.imageButtonText}>Front</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.imageButton} 
            onPress={() => pickImage(setBackImage)}
          >
            {backImage ? (
              <Image source={{ uri: backImage }} style={styles.previewImage} />
            ) : (
              <Ionicons name="camera-reverse-outline" size={40} color="#6B7280" />
            )}
            <Text style={styles.imageButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.button}
        onPress={handleDriverSignup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign Up as a Picker</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => navigation.navigate('Login', { userRole })}>
        <Text style={styles.link}>Already have an account? Log In</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  logo: {
    width: 200,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 20,
    marginBottom: 10,
    color: '#555',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 15,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 10,
  },
  imageUploadContainer: {
    width: '100%',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 15,
  },
  imageButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  imageButton: {
    width: 120,
    height: 120,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    resizeMode: 'cover',
  },
  imageButtonText: {
    position: 'absolute',
    bottom: 10,
    fontSize: 14,
    color: '#1F2937',
    fontWeight: 'bold',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#1E88E5',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 15,
    color: '#1E88E5',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default SignupDriver;