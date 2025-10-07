import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Dimensions,
  Switch,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import SharedHeader from '../components/SharedHeader';
import OrderBasket from '../components/OrderBasket';
import PaymentModal from '../components/PaymentModal';
import { initializeStripe } from '../services/PaymentService';

const { width } = Dimensions.get('window');

const CreateOrder = ({ navigation, route }) => {
  const { wasteType } = route.params || {};
  
  const [selectedWasteType, setSelectedWasteType] = useState(wasteType?.id || 'household');
  const [selectedVolume, setSelectedVolume] = useState(null);
  const [description, setDescription] = useState('');
  const [pickupLocation, setPickupLocation] = useState(null);
  const [isASAP, setIsASAP] = useState(true);
  const [scheduledDate, setScheduledDate] = useState(null);
  const [scheduledTime, setScheduledTime] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [orderData, setOrderData] = useState(null);
  
  // Manual address states
  const [isManualAddress, setIsManualAddress] = useState(false);
  const [manualAddress, setManualAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    instructions: ''
  });

  const wasteTypes = [
    { id: 'household', name: 'Household Trash', icon: 'home', color: '#34A853' },
    { id: 'bulk', name: 'Bulk Items', icon: 'cube', color: '#FF8F00' },
    { id: 'yard', name: 'Yard Waste', icon: 'leaf', color: '#4CAF50' },
    { id: 'construction', name: 'Construction Debris', icon: 'construct', color: '#795548' },
    { id: 'recyclables', name: 'Recyclables', icon: 'refresh', color: '#2196F3' },
  ];

  const volumeOptions = [
    { 
      id: '1-5_bags', 
      name: '1-5 Bags', 
      description: 'Small household bags',
      icon: 'bag',
      basePrice: 1
    },
    { 
      id: 'pickup_load', 
      name: 'Pickup Load', 
      description: 'Half truck bed full',
      icon: 'car',
      basePrice: 45
    },
    { 
      id: 'trailer_load', 
      name: 'Trailer Load', 
      description: 'Full trailer or truck bed',
      icon: 'bus',
      basePrice: 85
    },
  ];

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    if (selectedVolume) {
      calculatePricing();
    }
  }, [selectedWasteType, selectedVolume]);

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      getCurrentLocation();
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      if (address[0]) {
        setPickupLocation({
          coordinates: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          address: {
            street: `${address[0].streetNumber || ''} ${address[0].street || ''}`.trim(),
            city: address[0].city,
            state: address[0].region,
            zipCode: address[0].postalCode,
          }
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Location Error', 'Unable to get your current location. Please enter it manually.');
    }
  };

  const handleManualAddressToggle = (value) => {
    setIsManualAddress(value);
    if (value) {
      // Clear GPS location when switching to manual
      setPickupLocation(null);
    } else {
      // Clear manual address when switching to GPS
      setManualAddress({
        street: '',
        city: '',
        state: '',
        zipCode: '',
        instructions: ''
      });
      // Try to get current location again
      getCurrentLocation();
    }
  };

  const validateManualAddress = () => {
    const { street, city, state, zipCode } = manualAddress;
    return street.trim() && city.trim() && state.trim() && zipCode.trim();
  };

  const getFullManualAddress = () => {
    const { street, city, state, zipCode } = manualAddress;
    return `${street.trim()}, ${city.trim()}, ${state.trim()} ${zipCode.trim()}`;
  };

  const calculatePricing = () => {
    const volumeOption = volumeOptions.find(v => v.id === selectedVolume);
    if (!volumeOption) return;

    const baseFee = volumeOption.basePrice;
    const serviceFee = Math.round(baseFee * 0.15 * 100) / 100; // 15%
    const disposalFee = Math.round(baseFee * 0.10 * 100) / 100; // 10%
    const total = baseFee + serviceFee + disposalFee;

    setPricing({
      baseFee,
      serviceFee,
      disposalFee,
      total,
      contractorPayout: Math.round(total * 0.80 * 100) / 100, // 80% to contractor
    });
  };

  // Date and Time handling functions
  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || scheduledDate;
    setShowDatePicker(Platform.OS === 'ios');
    
    if (selectedDate) {
      // Ensure the selected date is not in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        Alert.alert('Invalid Date', 'Please select a future date for pickup.');
        return;
      }
      
      setScheduledDate(selectedDate);
      
      // If no time is selected yet, default to 9 AM
      if (!scheduledTime) {
        const defaultTime = new Date(selectedDate);
        defaultTime.setHours(9, 0, 0, 0);
        setScheduledTime(defaultTime);
      }
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    const currentTime = selectedTime || scheduledTime;
    setShowTimePicker(Platform.OS === 'ios');
    
    if (selectedTime) {
      // Validate business hours (7 AM to 7 PM)
      const hours = selectedTime.getHours();
      if (hours < 7 || hours >= 19) {
        Alert.alert('Invalid Time', 'Please select a time between 7:00 AM and 7:00 PM.');
        return;
      }
      
      setScheduledTime(selectedTime);
    }
  };

  const formatScheduledDateTime = () => {
    if (!scheduledDate) return 'Select Date & Time';
    
    const dateStr = scheduledDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    
    const timeStr = scheduledTime ? scheduledTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }) : '9:00 AM';
    
    return `${dateStr} at ${timeStr}`;
  };

  const getMinimumDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  };

  const getMaximumDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30); // Allow scheduling up to 30 days in advance
    return maxDate;
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotos(prev => [...prev, result.assets[0]]);
    }
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const createOrder = async () => {
    if (!selectedVolume) {
      Alert.alert('Missing Information', 'Please select volume size.');
      return;
    }

    if (!isManualAddress && !pickupLocation) {
      Alert.alert('Missing Information', 'Please confirm your pickup location or enter address manually.');
      return;
    }

    if (isManualAddress && !validateManualAddress()) {
      Alert.alert('Invalid Address', 'Please fill in all address fields (street, city, state, zip code).');
      return;
    }

    // Validate scheduling if not ASAP
    if (!isASAP) {
      if (!scheduledDate) {
        Alert.alert('Missing Information', 'Please select a pickup date.');
        return;
      }
      if (!scheduledTime) {
        Alert.alert('Missing Information', 'Please select a pickup time.');
        return;
      }
      
      // Ensure scheduled time is at least 24 hours from now
      const now = new Date();
      const scheduledDateTime = new Date(scheduledDate);
      scheduledDateTime.setHours(scheduledTime.getHours(), scheduledTime.getMinutes(), 0, 0);
      
      const hoursDifference = (scheduledDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursDifference < 24) {
        Alert.alert('Invalid Schedule', 'Please schedule pickup at least 24 hours in advance.');
        return;
      }
    }

    // Prepare order data for payment
    const preparedOrderData = {
      customerId: auth.currentUser.uid,
      contractorId: null,
      status: 'pending_payment',
      
      wasteType: selectedWasteType,
      volume: selectedVolume,
      description: description.trim(),
      
      pickupAddress: isManualAddress ? {
        street: manualAddress.street.trim(),
        city: manualAddress.city.trim(),
        state: manualAddress.state.trim(),
        zipCode: manualAddress.zipCode.trim(),
        fullAddress: getFullManualAddress(),
        coordinates: null,
        instructions: description.trim(),
        isManualEntry: true
      } : {
        ...pickupLocation.address,
        fullAddress: `${pickupLocation.address.street}, ${pickupLocation.address.city}, ${pickupLocation.address.state} ${pickupLocation.address.zipCode}`,
        coordinates: pickupLocation.coordinates,
        instructions: description.trim(),
        isManualEntry: false
      },
      
      scheduledPickup: isASAP ? null : {
        date: scheduledDate,
        time: scheduledTime,
        formattedDateTime: formatScheduledDateTime(),
        timestamp: (() => {
          const dateTime = new Date(scheduledDate);
          dateTime.setHours(scheduledTime.getHours(), scheduledTime.getMinutes(), 0, 0);
          return dateTime;
        })()
      },
      isASAP,
      
      pricing,
      
      photos: {
        beforePickup: [],
        afterPickup: [],
        disposalProof: []
      },
      
      createdAt: serverTimestamp(),
      
      services: {
        weLoadService: false,
        urgentPickup: isASAP
      }
    };

    setOrderData(preparedOrderData);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (paymentResult) => {
    setLoading(true);
    try {
      // Update order with payment info
      const finalOrderData = {
        ...orderData,
        status: 'pending',
        payment: {
          id: paymentResult.id,
          amount: pricing?.total || 0,
          currency: 'usd',
          status: 'completed',
          processedAt: serverTimestamp()
        }
      };

      const docRef = await addDoc(collection(db, 'jobs'), finalOrderData);
      
      setShowPaymentModal(false);
      Alert.alert(
        'Order Created Successfully!',
        'Your pickup request has been submitted and payment processed. We\'ll notify you when a picker accepts your job.',
        [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]
      );
    } catch (error) {
      console.error('Error creating order:', error);
      Alert.alert('Error', 'Failed to create your order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentError = (error) => {
    setShowPaymentModal(false);
    Alert.alert('Payment Failed', error.message || 'Please try again.');
  };

  const selectedWasteTypeInfo = wasteTypes.find(w => w.id === selectedWasteType);

  return (
    <View style={styles.container}>
      <SharedHeader 
        title="Create Pickup Order"
        showBackButton={true}
        showHomeButton={true}
        rightComponent={<OrderBasket />}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Waste Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Waste Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {wasteTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.wasteTypeCard,
                  selectedWasteType === type.id && styles.selectedWasteType
                ]}
                onPress={() => setSelectedWasteType(type.id)}
              >
                <View style={[styles.wasteTypeIcon, { backgroundColor: type.color }]}>
                  <Ionicons name={type.icon} size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.wasteTypeName}>{type.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Volume Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Volume Size</Text>
          {volumeOptions.map((volume) => (
            <TouchableOpacity
              key={volume.id}
              style={[
                styles.volumeCard,
                selectedVolume === volume.id && styles.selectedVolume
              ]}
              onPress={() => setSelectedVolume(volume.id)}
            >
              <View style={styles.volumeContent}>
                <Ionicons name={volume.icon} size={32} color="#34A853" />
                <View style={styles.volumeInfo}>
                  <Text style={styles.volumeName}>{volume.name}</Text>
                  <Text style={styles.volumeDescription}>{volume.description}</Text>
                </View>
                <Text style={styles.volumePrice}>${volume.basePrice}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Location */}
        <View style={styles.section}>
          <View style={styles.locationHeader}>
            <Text style={styles.sectionTitle}>Pickup Location</Text>
            <View style={styles.manualToggle}>
              <Text style={styles.toggleLabel}>Manual Entry</Text>
              <Switch
                value={isManualAddress}
                onValueChange={handleManualAddressToggle}
                trackColor={{ false: '#E5E7EB', true: '#34A853' }}
                thumbColor={isManualAddress ? '#FFFFFF' : '#9CA3AF'}
              />
            </View>
          </View>

          {!isManualAddress ? (
            // GPS Location Card
            <View style={styles.locationCard}>
              <Ionicons name="location" size={24} color="#34A853" />
              <View style={styles.locationInfo}>
                {pickupLocation ? (
                  <>
                    <Text style={styles.locationAddress}>
                      {pickupLocation.address.street}
                    </Text>
                    <Text style={styles.locationCity}>
                      {pickupLocation.address.city}, {pickupLocation.address.state} {pickupLocation.address.zipCode}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.locationPlaceholder}>Getting your location...</Text>
                )}
              </View>
              <TouchableOpacity onPress={getCurrentLocation}>
                <Ionicons name="refresh" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          ) : (
            // Manual Address Form
            <View style={styles.manualAddressForm}>
              <Text style={styles.manualAddressNote}>
                Enter a different address for pickup (e.g., family member, rental property)
              </Text>
              
              <TextInput
                style={styles.addressInput}
                value={manualAddress.street}
                onChangeText={(text) => setManualAddress(prev => ({ ...prev, street: text }))}
                placeholder="Street Address"
                placeholderTextColor="#9CA3AF"
              />
              
              <View style={styles.addressRow}>
                <TextInput
                  style={[styles.addressInput, styles.cityInput]}
                  value={manualAddress.city}
                  onChangeText={(text) => setManualAddress(prev => ({ ...prev, city: text }))}
                  placeholder="City"
                  placeholderTextColor="#9CA3AF"
                />
                
                <TextInput
                  style={[styles.addressInput, styles.stateInput]}
                  value={manualAddress.state}
                  onChangeText={(text) => setManualAddress(prev => ({ ...prev, state: text }))}
                  placeholder="State"
                  placeholderTextColor="#9CA3AF"
                  maxLength={2}
                />
                
                <TextInput
                  style={[styles.addressInput, styles.zipInput]}
                  value={manualAddress.zipCode}
                  onChangeText={(text) => setManualAddress(prev => ({ ...prev, zipCode: text }))}
                  placeholder="ZIP"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>

              {/* Address Preview */}
              {validateManualAddress() && (
                <View style={styles.addressPreview}>
                  <Ionicons name="checkmark-circle" size={16} color="#34A853" />
                  <Text style={styles.addressPreviewText}>
                    {getFullManualAddress()}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Description/Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Special Instructions</Text>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g., Trash bags are by the garage door, large items in backyard..."
            multiline
            numberOfLines={3}
            maxLength={200}
          />
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos (Optional)</Text>
          <Text style={styles.sectionSubtitle}>Help the picker by showing the location of items</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
              <Ionicons name="camera" size={32} color="#6B7280" />
              <Text style={styles.photoButtonText}>Add Photo</Text>
            </TouchableOpacity>
            
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image source={{ uri: photo.uri }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => removePhoto(index)}
                >
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Scheduling */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>When do you need pickup?</Text>
          <View style={styles.schedulingOptions}>
            <TouchableOpacity
              style={[styles.schedulingOption, isASAP && styles.selectedOption]}
              onPress={() => {
                setIsASAP(true);
                setScheduledDate(null);
                setScheduledTime(null);
              }}
            >
              <Ionicons name="flash" size={20} color={isASAP ? "#FFFFFF" : "#34A853"} />
              <Text style={[styles.optionText, isASAP && styles.selectedOptionText]}>
                ASAP
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.schedulingOption, !isASAP && styles.selectedOption]}
              onPress={() => setIsASAP(false)}
            >
              <Ionicons name="calendar" size={20} color={!isASAP ? "#FFFFFF" : "#34A853"} />
              <Text style={[styles.optionText, !isASAP && styles.selectedOptionText]}>
                Schedule Later
              </Text>
            </TouchableOpacity>
          </View>

          {/* Date/Time Selection when Schedule Later is selected */}
          {!isASAP && (
            <View style={styles.dateTimeContainer}>
              <Text style={styles.dateTimeLabel}>Select Pickup Date & Time</Text>
              
              <View style={styles.dateTimeRow}>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#34A853" />
                  <Text style={styles.dateTimeButtonText}>
                    {scheduledDate ? scheduledDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    }) : 'Select Date'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dateTimeButton, !scheduledDate && styles.dateTimeButtonDisabled]}
                  onPress={() => scheduledDate && setShowTimePicker(true)}
                  disabled={!scheduledDate}
                >
                  <Ionicons 
                    name="time-outline" 
                    size={20} 
                    color={scheduledDate ? "#34A853" : "#9CA3AF"} 
                  />
                  <Text style={[
                    styles.dateTimeButtonText,
                    !scheduledDate && styles.dateTimeButtonTextDisabled
                  ]}>
                    {scheduledTime ? scheduledTime.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    }) : 'Select Time'}
                  </Text>
                </TouchableOpacity>
              </View>

              {scheduledDate && scheduledTime && (
                <View style={styles.scheduleSummary}>
                  <Ionicons name="checkmark-circle" size={16} color="#34A853" />
                  <Text style={styles.scheduleSummaryText}>
                    Pickup scheduled for {formatScheduledDateTime()}
                  </Text>
                </View>
              )}

              <Text style={styles.scheduleNote}>
                • Available Monday - Saturday, 7:00 AM - 7:00 PM{'\n'}
                • Schedule at least 24 hours in advance{'\n'}
                • Weather conditions may affect pickup time
              </Text>
            </View>
          )}

          {/* Date/Time Pickers */}
          {showDatePicker && (
            <DateTimePicker
              testID="datePicker"
              value={scheduledDate || getMinimumDate()}
              mode="date"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={getMinimumDate()}
              maximumDate={getMaximumDate()}
            />
          )}

          {showTimePicker && scheduledDate && (
            <DateTimePicker
              testID="timePicker"
              value={scheduledTime || new Date()}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
            />
          )}
        </View>

        {/* Pricing Summary */}
        {pricing && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing Summary</Text>
            <View style={styles.pricingCard}>
              <View style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>Base Fee</Text>
                <Text style={styles.pricingValue}>${pricing.baseFee.toFixed(2)}</Text>
              </View>
              <View style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>Service Fee</Text>
                <Text style={styles.pricingValue}>${pricing.serviceFee.toFixed(2)}</Text>
              </View>
              <View style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>Disposal Fee</Text>
                <Text style={styles.pricingValue}>${pricing.disposalFee.toFixed(2)}</Text>
              </View>
              <View style={[styles.pricingRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>${pricing.total.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Create Order Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.createButton, 
            (!selectedVolume || 
             (!isManualAddress && !pickupLocation) || 
             (isManualAddress && !validateManualAddress()) || 
             loading
            ) && styles.createButtonDisabled
          ]}
          onPress={createOrder}
          disabled={
            !selectedVolume || 
            (!isManualAddress && !pickupLocation) || 
            (isManualAddress && !validateManualAddress()) || 
            loading
          }
        >
          <Text style={styles.createButtonText}>
            {loading ? 'Creating Order...' : `Create Order${pricing ? ` - $${pricing.total.toFixed(2)}` : ''}`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Payment Modal */}
      <PaymentModal
        visible={showPaymentModal}
        amount={pricing?.total || 0}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentError={handlePaymentError}
        onClose={() => setShowPaymentModal(false)}
        orderData={orderData}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  wasteTypeCard: {
    alignItems: 'center',
    marginRight: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#FFFFFF',
    width: 100,
  },
  selectedWasteType: {
    borderColor: '#34A853',
  },
  wasteTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  wasteTypeName: {
    fontSize: 12,
    textAlign: 'center',
    color: '#374151',
    fontWeight: '500',
  },
  volumeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedVolume: {
    borderColor: '#34A853',
  },
  volumeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  volumeInfo: {
    flex: 1,
    marginLeft: 16,
  },
  volumeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  volumeDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  volumePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34A853',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  locationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  locationAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  locationCity: {
    fontSize: 14,
    color: '#6B7280',
  },
  locationPlaceholder: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  manualToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  manualAddressForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  manualAddressNote: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  addressInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  addressRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cityInput: {
    flex: 2,
    marginBottom: 0,
  },
  stateInput: {
    flex: 1,
    marginBottom: 0,
  },
  zipInput: {
    flex: 1,
    marginBottom: 0,
  },
  addressPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  addressPreviewText: {
    fontSize: 14,
    color: '#15803D',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  descriptionInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    textAlignVertical: 'top',
  },
  photoButton: {
    width: 100,
    height: 100,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  photoButtonText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  photoContainer: {
    position: 'relative',
    marginRight: 12,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  schedulingOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  schedulingOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  selectedOption: {
    backgroundColor: '#34A853',
    borderColor: '#34A853',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34A853',
    marginLeft: 8,
  },
  selectedOptionText: {
    color: '#FFFFFF',
  },
  dateTimeContainer: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  dateTimeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateTimeButtonDisabled: {
    backgroundColor: '#F9FAFB',
    opacity: 0.6,
  },
  dateTimeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 8,
  },
  dateTimeButtonTextDisabled: {
    color: '#9CA3AF',
  },
  scheduleSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  scheduleSummaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#166534',
    marginLeft: 8,
  },
  scheduleNote: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  pricingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    marginTop: 8,
    marginBottom: 0,
  },
  pricingLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  pricingValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34A853',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: 40,
  },
  createButton: {
    backgroundColor: '#34A853',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default CreateOrder;
