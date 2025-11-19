import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebaseConfig'
import { useUser } from '../contexts/UserContext'
import LocationService from '../services/LocationService'
import QuickTrashLogo from '../assets/logo/qt_logo_vide.png';
import { Ionicons } from '@expo/vector-icons';


// This prop is automatically passed by React Navigation to screen components.
const Login = ({ navigation, route }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false); // New state for password visibility
  const userRole = route.params?.userRole || 'customer'
  const { setUserRole } = useUser()

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.')
      return
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      
      // Determine which boolean flag to set based on userRole
      const roleFlags = {};
      switch (userRole) {
        case 'contractor':
          roleFlags.isContractor = true;
          break;
        case 'employee':
          roleFlags.isEmployee = true;
          break;
        default: // 'customer'
          roleFlags.isCustomer = true;
          break;
      }

      // Store user role flags in Firestore if this is the first login
      const userRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userRef, {
        email: userCredential.user.email,
        displayName: userCredential.user.displayName || email.split('@')[0],
        ...roleFlags, // Spread the role flags into the document
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
      }, { merge: true });
      
      Alert.alert('Login Successful', 'You have been signed in!')
      
      // Request location permission for all users on first login
      const isFirstTime = await LocationService.isFirstTimeLocationRequest(userCredential.user.uid)
      if (isFirstTime) {
        await LocationService.requestPermissions(userCredential.user.uid, true)
      }

      // Navigate to the central Transit component
      navigation.navigate('Transit');

    } catch (error) {
      Alert.alert('Login Failed', error.message);
      console.error(error);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={40}
    >
      <Text style={styles.title}>LOGIN</Text>
      <Image source={QuickTrashLogo} style={styles.logo} /> 
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
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Log In</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('RoleSelection')}>
        <Text style={styles.link}>Don't have an account? Sign Up</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
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
  logo: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    marginBottom: 20,
    borderRadius: 100,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 10,
    bottom: 30,
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