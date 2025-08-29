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
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebaseConfig'
import { useUser } from '../contexts/UserContext'
import LocationService from '../services/LocationService'

// This prop is automatically passed by React Navigation to screen components.
const Login = ({ navigation, route }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const userRole = route.params?.userRole || 'customer'
  const { setUserRole } = useUser()

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.')
      return
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      
      // Store user role in Firestore if this is first login
      const userRef = doc(db, 'users', userCredential.user.uid)
      await setDoc(userRef, {
        email: userCredential.user.email,
        displayName: userCredential.user.displayName || email.split('@')[0],
        role: userRole,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
      }, { merge: true })
      
      // Set role in context
      setUserRole(userRole)
      
      // Navigate to role-specific dashboard after successful login
      Alert.alert('Login Successful', 'You have been signed in!')
      
      // Navigate based on user role
      switch (userRole) {
        case 'customer':
          navigation.navigate('CustomerDashboard')
          break
        case 'contractor':
          // Request location permission for contractors before navigation
          const hasLocationPermission = await LocationService.requestPermissions()
          if (hasLocationPermission) {
            navigation.navigate('ContractorDashboard')
          } else {
            Alert.alert(
              'Location Required',
              'Location access is mandatory for contractors to receive job assignments and provide navigation. Please enable location permissions.',
              [
                {
                  text: 'Retry',
                  onPress: async () => {
                    const retryPermission = await LocationService.requestPermissions()
                    if (retryPermission) {
                      navigation.navigate('ContractorDashboard')
                    }
                  }
                },
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: () => {
                    // Logout the user if they don't grant permission
                    auth.signOut()
                    Alert.alert('Logged Out', 'You have been logged out. Location access is required for contractors.')
                  }
                }
              ]
            )
          }
          break
        case 'employee':
          navigation.navigate('EmployeeDashboard')
          break
        default:
          navigation.navigate('CustomerDashboard')
      }
    } catch (error) {
      Alert.alert('Login Failed', error.message)
      console.error(error)
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

      {/* We navigate to the 'Signup' route name defined in your navigator. */}
      <TouchableOpacity onPress={() => navigation.navigate('Signup', { userRole })}>
        <Text style={styles.link}>Don't have an account? Sign Up</Text>
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
