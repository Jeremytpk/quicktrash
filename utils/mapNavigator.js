import { Platform, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Get the user's preferred map navigator
 * @returns {Promise<string>} 'google' or 'apple'
 */
export const getDefaultMapNavigator = async () => {
  try {
    const savedMap = await AsyncStorage.getItem('defaultMapNavigator');
    return savedMap || 'google'; // Default to Google Maps
  } catch (error) {
    console.error('Error getting map preference:', error);
    return 'google';
  }
};

/**
 * Open navigation to a specific location using the user's preferred map app
 * @param {number} latitude - Destination latitude
 * @param {number} longitude - Destination longitude
 * @param {string} label - Optional label for the destination
 */
export const openMapNavigation = async (latitude, longitude, label = '') => {
  const mapPreference = await getDefaultMapNavigator();
  
  let url = '';
  
  if (mapPreference === 'apple' && Platform.OS === 'ios') {
    // Apple Maps
    url = `maps://app?daddr=${latitude},${longitude}${label ? `&q=${encodeURIComponent(label)}` : ''}`;
  } else {
    // Google Maps (default for Android and if Google is selected on iOS)
    url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}${label ? `&destination_place_id=${encodeURIComponent(label)}` : ''}`;
  }
  
  try {
    const supported = await Linking.canOpenURL(url);
    
    if (supported) {
      await Linking.openURL(url);
    } else {
      // Fallback to Google Maps web if preferred app is not available
      const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      await Linking.openURL(fallbackUrl);
    }
  } catch (error) {
    console.error('Error opening map navigation:', error);
    Alert.alert('Error', 'Failed to open map navigation. Please ensure you have a map app installed.');
  }
};

/**
 * Open a specific address in the map app
 * @param {string} address - The full address to navigate to
 */
export const openMapNavigationByAddress = async (address) => {
  const mapPreference = await getDefaultMapNavigator();
  
  let url = '';
  const encodedAddress = encodeURIComponent(address);
  
  if (mapPreference === 'apple' && Platform.OS === 'ios') {
    // Apple Maps
    url = `maps://app?daddr=${encodedAddress}`;
  } else {
    // Google Maps
    url = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
  }
  
  try {
    const supported = await Linking.canOpenURL(url);
    
    if (supported) {
      await Linking.openURL(url);
    } else {
      // Fallback to Google Maps web
      const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
      await Linking.openURL(fallbackUrl);
    }
  } catch (error) {
    console.error('Error opening map navigation:', error);
    Alert.alert('Error', 'Failed to open map navigation. Please ensure you have a map app installed.');
  }
};
