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
import { auth } from '../firebaseConfig' // Assuming db is not needed on this screen

// This prop is automatically passed by React Navigation to screen components.
const Login = ({ navigation }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.')
      return
    }
    try {
      await signInWithEmailAndPassword(auth, email, password)
      // On a real app, you would navigate to the main part of your app here.
      // For now, the success alert is fine.
      Alert.alert('Login Successful', 'You have been signed in!')
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
      <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
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
