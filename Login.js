import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native'
import { signInWithEmailAndPassword } from 'firebase/auth'
// MODIFIED: Import getDoc and updateDoc instead of setDoc
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore' 
import { auth, db } from '../firebaseConfig'
import { useUser } from '../contexts/UserContext'
import EnhancedLocationService from '../services/EnhancedLocationService'

const Login = ({ navigation }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // MODIFIED: We no longer need to get userRole from route.params here
  const { setUserRole } = useUser()

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.')
      return
    }
    try {
      // Step 1: Authenticate the user with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user;

      // --- NEW: Fetch user's role from Firestore after successful login ---
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // This is an edge case: user exists in Auth but not in Firestore.
        // We should log them out and show an error.
        auth.signOut();
        Alert.alert('Error', 'User profile not found. Please contact support.');
        return;
      }

      // Step 2: Read the verified role from the database
      const fetchedUserData = userSnap.data();
      const verifiedUserRole = fetchedUserData.role;
      
      // Step 3: Update the user's document (e.g., last login time) WITHOUT changing the role
      await updateDoc(userRef, {
        updatedAt: serverTimestamp(),
      });
      
      // Step 4: Set the verified role in the global context
      setUserRole(verifiedUserRole);
      
      // Request location permission and get current address BEFORE navigation
      try {
        console.log('Requesting location for user:', user.uid, 'role:', verifiedUserRole);
        
        // Show a more prominent location request
        Alert.alert(
          'Location Access Required',
          'QuickTrash needs access to your location to show you nearby services and provide accurate estimates. This will only take a moment.',
          [
            {
              text: 'Allow Location',
              onPress: async () => {
                try {
                  const locationData = await EnhancedLocationService.requestLocationWithAddress(
                    user.uid, 
                    verifiedUserRole, 
                    true // isFirstTime
                  );
                  
                  console.log('Location data received:', locationData);
                  
                  // Update user document with location data if available
                  if (locationData && locationData.address) {
                    await updateDoc(userRef, {
                      currentLocation: {
                        coordinates: {
                          lat: locationData.latitude,
                          lng: locationData.longitude
                        },
                        address: locationData.address.formattedAddress,
                        city: locationData.address.city,
                        region: locationData.address.region,
                        postalCode: locationData.address.postalCode,
                        lastUpdated: serverTimestamp()
                      }
                    });
                    console.log('Location data saved to Firestore');
                  }
                  
                  // Navigate after location is handled
                  navigateToDashboard(verifiedUserRole);
                } catch (locationError) {
                  console.error('Error getting location during login:', locationError);
                  // Still navigate even if location fails
                  navigateToDashboard(verifiedUserRole);
                }
              }
            },
            {
              text: 'Skip for Now',
              style: 'cancel',
              onPress: () => navigateToDashboard(verifiedUserRole)
            }
          ]
        );
      } catch (locationError) {
        console.error('Error requesting location during login:', locationError);
        // Navigate without location if there's an error
        navigateToDashboard(verifiedUserRole);
      }
    } catch (error) {
      Alert.alert('Login Failed', error.message);
      console.error(error);
    }
  }

  const navigateToDashboard = (userRole) => {
    Alert.alert('Login Successful', 'You have been signed in!');
    
    // Step 5: Navigate based on the VERIFIED role from the database
    switch (userRole) {
      case 'customer':
        navigation.navigate('CustomerDashboard');
        break;
      case 'contractor':
        navigation.navigate('ContractorDashboard');
        break;
      case 'driver':
        navigation.navigate('DashboardDriver');
        break;
      case 'employee':
        navigation.navigate('EmployeeDashboard');
        break;
      default:
        // Fallback to customer dashboard if role is unknown
        navigation.navigate('CustomerDashboard');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle1}>LOGIN</Text>
      <Text style={styles.title}>"Quick"</Text>
      <Text style={styles.subtitle}>Welcome Back</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholderTextColor="#999"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor="#999"
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Log In</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
        {/* MODIFIED: No need to pass userRole to Signup from here */}
        <Text style={styles.link}>Don't have an account? Sign Up</Text>
      </TouchableOpacity>
      
      {/* Temporary location test button */}
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: '#FF6B6B', marginTop: 20 }]} 
        onPress={async () => {
          try {
            console.log('Testing location service...');
            const location = await EnhancedLocationService.getCurrentLocation('customer');
            console.log('Test location result:', location);
            Alert.alert(
              'Location Test', 
              location ? 
                `Lat: ${location.latitude.toFixed(6)}\nLng: ${location.longitude.toFixed(6)}\nAddress: ${location.address?.formattedAddress || 'No address'}` :
                'No location data'
            );
          } catch (error) {
            console.error('Location test error:', error);
            Alert.alert('Error', 'Location test failed: ' + error.message);
          }
        }}
      >
        <Text style={styles.buttonText}>Test Location</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 35,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  subtitle: {
    fontSize: 25,
    marginBottom: 10,
    color: '#555',
  },
  subtitle1: {
    fontSize: 35,
    fontWeight: 'bold',
    marginBottom: 20,
    bottom: 90,
    color: '#34A853',
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
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#34A853',
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
    color: '#34A853',
    fontWeight: 'bold',
    fontSize: 16,
  },
})

export default Login
