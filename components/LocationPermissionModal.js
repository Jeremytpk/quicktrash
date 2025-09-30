import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import EnhancedLocationService from '../services/EnhancedLocationService';

const LocationPermissionModal = ({ 
  visible, 
  onClose, 
  userRole = 'customer', 
  userId,
  onLocationGranted 
}) => {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestLocation = async () => {
    setIsRequesting(true);
    try {
      const locationData = await EnhancedLocationService.requestLocationWithAddress(
        userId,
        userRole,
        true
      );
      
      if (locationData && locationData.address) {
        onLocationGranted(locationData);
        onClose();
      } else {
        Alert.alert(
          'Location Not Available',
          'We couldn\'t get your exact location. You can still use the app, but some features may be limited.',
          [{ text: 'Continue', onPress: onClose }]
        );
      }
    } catch (error) {
      console.error('Error requesting location:', error);
      Alert.alert(
        'Location Error',
        'There was an error getting your location. You can still use the app.',
        [{ text: 'Continue', onPress: onClose }]
      );
    } finally {
      setIsRequesting(false);
    }
  };

  const getRoleSpecificMessage = () => {
    switch (userRole) {
      case 'customer':
        return {
          title: 'Welcome to QuickTrash!',
          message: 'To show you nearby contractors and provide accurate pickup estimates, we need access to your location.',
          benefits: [
            'Find contractors near you',
            'Get accurate pickup estimates',
            'Track your pickup requests'
          ]
        };
      case 'contractor':
      case 'driver':
        return {
          title: 'Welcome to QuickTrash!',
          message: 'To show you nearby jobs and track your location for customers, we need access to your location.',
          benefits: [
            'See available jobs near you',
            'Track your location for customers',
            'Get navigation to pickup locations'
          ]
        };
      default:
        return {
          title: 'Location Access',
          message: 'QuickTrash needs location access to provide you with the best experience.',
          benefits: [
            'Personalized experience',
            'Nearby services',
            'Accurate information'
          ]
        };
    }
  };

  const { title, message, benefits } = getRoleSpecificMessage();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
          </View>

          <View style={styles.benefitsContainer}>
            <Text style={styles.benefitsTitle}>This will help us:</Text>
            {benefits.map((benefit, index) => (
              <View key={index} style={styles.benefitItem}>
                <Text style={styles.benefitBullet}>•</Text>
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.allowButton]}
              onPress={handleRequestLocation}
              disabled={isRequesting}
            >
              {isRequesting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.allowButtonText}>Allow Location Access</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.skipButton]}
              onPress={onClose}
              disabled={isRequesting}
            >
              <Text style={styles.skipButtonText}>Skip for Now</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.privacyText}>
            Your location data is used only to provide you with relevant services and is not shared with third parties.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
  benefitsContainer: {
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  benefitBullet: {
    fontSize: 16,
    color: '#34A853',
    marginRight: 8,
    marginTop: 2,
  },
  benefitText: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    marginBottom: 16,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  allowButton: {
    backgroundColor: '#34A853',
  },
  allowButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  skipButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '500',
  },
  privacyText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default LocationPermissionModal;