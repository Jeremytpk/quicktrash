import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Logo from '../components/Logo';

const { width, height } = Dimensions.get('window');

const RoleSelection = ({ navigation }) => {
  const navigateToAuth = (role) => {
    navigation.navigate('Login', { userRole: role });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Logo size="xlarge" showText={true} />
        <Text style={styles.subtitle}>On-Demand Waste Management</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.welcomeText}>Welcome! How would you like to use QuickTrash?</Text>
        
        <TouchableOpacity
          style={[styles.roleButton, styles.customerButton]}
          onPress={() => navigation.navigate('Signup')}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="home" size={32} color="#FFFFFF" />
            <View style={styles.buttonText}>
              <Text style={styles.buttonTitle}>QuickTrash Client</Text>
              <Text style={styles.buttonSubtitle}>Request on-demand pickup service</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roleButton, styles.contractorButton]}
          onPress={() => navigation.navigate('SignupDriver')}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="car" size={32} color="#FFFFFF" />
            <View style={styles.buttonText}>
              <Text style={styles.buttonTitle}>Become a Picker</Text>
              <Text style={styles.buttonSubtitle}>Earn money picking up trash</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/*
        <TouchableOpacity
          style={[styles.roleButton, styles.employeeButton]}
          onPress={() => navigateToAuth('employee')}
        >
        
          <View style={styles.buttonContent}>
            <Ionicons name="business" size={32} color="#FFFFFF" />
            <View style={styles.buttonText}>
              <Text style={styles.buttonTitle}>Employee Access</Text>
              <Text style={styles.buttonSubtitle}>Staff & admin dashboard</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
        */}
      </View>
      

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#34A853',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 28,
  },
  roleButton: {
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  customerButton: {
    backgroundColor: '#34A853',
  },
  contractorButton: {
    backgroundColor: '#1E88E5',
  },
  employeeButton: {
    backgroundColor: '#FF8F00',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  buttonText: {
    flex: 1,
    marginLeft: 16,
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  buttonSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default RoleSelection;
