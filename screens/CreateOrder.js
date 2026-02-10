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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import SharedHeader from '../components/SharedHeader';
import OrderBasket from '../components/OrderBasket';

const { width } = Dimensions.get('window');

const CreateOrder = ({ navigation, route }) => {
  const { wasteType, pricingData: routePricingData } = route.params || {};
  
  const [selectedWasteType, setSelectedWasteType] = useState(wasteType?.id || 'household');
  const [selectedBagSize, setSelectedBagSize] = useState(null);
  const [selectedVolume, setSelectedVolume] = useState(null);
  const [description, setDescription] = useState('');
  const [pickupLocation, setPickupLocation] = useState(null);
  const [isASAP, setIsASAP] = useState(true);
  const [scheduledDate, setScheduledDate] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pricingData, setPricingData] = useState(routePricingData || null);

  const wasteTypes = [
    { id: 'household', name: 'Household Trash', icon: 'home', color: '#34A853' },
    { id: 'bulk', name: 'Bulk Items', icon: 'cube', color: '#FF8F00' },
    { id: 'yard', name: 'Yard Waste', icon: 'leaf', color: '#4CAF50' },
    { id: 'construction', name: 'Construction Debris', icon: 'construct', color: '#795548' },
    { id: 'recyclables', name: 'Recyclables', icon: 'refresh', color: '#2196F3' },
  ];

  // Get pricing data from Firestore if not passed from route
  useEffect(() => {
    fetchPricingData();
  }, []);

  // Refetch pricing when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchPricingData();
    }, [])
  );

  const fetchPricingData = async () => {
    if (routePricingData) {
      // Use pricing data passed from previous screen
      return;
    }
    
    try {
      const pricingDoc = await getDoc(doc(db, 'pricings', 'default'));
      if (pricingDoc.exists()) {
        console.log('Fetched pricing data in CreateOrder:', pricingDoc.data());
        setPricingData(pricingDoc.data());
      }
    } catch (error) {
      console.error('Error fetching pricing:', error);
    }
  };

  // Use pricing data from Firestore or fallback to defaults
  const bagSizes = pricingData?.bagSizes || [
    { id: 'S', name: 'Small', description: 'Up to 13 gallons', priceMultiplier: 1.0 },
    { id: 'M', name: 'Medium', description: '13-30 gallons', priceMultiplier: 1.2 },
    { id: 'L', name: 'Large', description: '30-45 gallons', priceMultiplier: 1.5 },
    { id: 'XL', name: 'Extra Large', description: '45-60 gallons', priceMultiplier: 1.8 },
    { id: 'XXL', name: 'XX Large', description: '60+ gallons', priceMultiplier: 2.0 },
  ];

  const volumeOptions = pricingData?.volumeOptions || [
    { 
      id: '1-5_bags', 
      name: '1-5 Bags', 
      description: 'Small household bags',
      icon: 'bag',
      basePrice: 15
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
    if (selectedVolume && selectedBagSize && pricingData) {
      calculatePricing();
    }
  }, [selectedWasteType, selectedVolume, selectedBagSize, pricingData]);

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

  const calculatePricing = () => {
    const volumeOption = volumeOptions.find(v => v.id === selectedVolume);
    const bagSize = bagSizes.find(b => b.id === selectedBagSize);
    if (!volumeOption || !bagSize || !pricingData) return;

    // Check for waste-type specific custom pricing
    const customPriceKey = `${selectedVolume}_${selectedBagSize}`;
    const customPrice = pricingData.wasteTypePricing?.[selectedWasteType]?.[customPriceKey];
    
    // Use custom price if available, otherwise calculate from base price and multiplier
    const baseFee = customPrice !== undefined 
      ? customPrice 
      : volumeOption.basePrice * bagSize.priceMultiplier;
    
    // Use service fee and contractor payout from pricing data
    const serviceFeePercent = pricingData.serviceFeePercentage || 0.15;
    const contractorPayoutPercent = pricingData.contractorPayoutPercentage || 0.80;
    
    const serviceFee = Math.round(baseFee * serviceFeePercent * 100) / 100;
    const disposalFee = Math.round(baseFee * 0.10 * 100) / 100; // 10% disposal fee
    const total = baseFee + serviceFee + disposalFee;

    setPricing({
      baseFee,
      serviceFee,
      disposalFee,
      total,
      contractorPayout: Math.round(total * contractorPayoutPercent * 100) / 100,
    });
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
    if (!selectedVolume || !selectedBagSize || !pickupLocation) {
      Alert.alert('Missing Information', 'Please select bag size, volume and confirm your pickup location.');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        customerId: auth.currentUser.uid,
        contractorId: null,
        status: 'pending',
        
        wasteType: selectedWasteType,
        bagSize: selectedBagSize,
        volume: selectedVolume,
        description: description.trim(),
        
        pickupAddress: {
          ...pickupLocation.address,
          coordinates: pickupLocation.coordinates,
          instructions: description.trim()
        },
        
        scheduledPickup: isASAP ? null : scheduledDate,
        isASAP,
        
        pricing,
        
        photos: {
          beforePickup: [], // Photos would be uploaded to storage first
          afterPickup: [],
          disposalProof: []
        },
        
        createdAt: serverTimestamp(),
        
        services: {
          weLoadService: false,
          urgentPickup: isASAP
        }
      };

      const docRef = await addDoc(collection(db, 'jobs'), orderData);
      navigation.navigate('PaymentModal', { orderId: docRef.id });
    } catch (error) {
      console.error('Error creating order:', error);
      Alert.alert('Error', 'Failed to create your order. Please try again.');
    } finally {
      setLoading(false);
    }
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

        {/* Bag Size Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bag Size</Text>
          <Text style={styles.sectionSubtitle}>Select the size of your bags</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {bagSizes.map((size) => (
              <TouchableOpacity
                key={size.id}
                style={[
                  styles.bagSizeCard,
                  selectedBagSize === size.id && styles.selectedBagSize
                ]}
                onPress={() => setSelectedBagSize(size.id)}
              >
                <View style={styles.bagSizeHeader}>
                  <Text style={[
                    styles.bagSizeId,
                    selectedBagSize === size.id && styles.selectedBagSizeText
                  ]}>
                    {size.id}
                  </Text>
                </View>
                <Text style={[
                  styles.bagSizeName,
                  selectedBagSize === size.id && styles.selectedBagSizeText
                ]}>
                  {size.name}
                </Text>
                <Text style={[
                  styles.bagSizeDescription,
                  selectedBagSize === size.id && styles.selectedBagSizeDescText
                ]}>
                  {size.description}
                </Text>
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
          <Text style={styles.sectionTitle}>Pickup Location</Text>
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

        {/* Scheduling section hidden as requested */}

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
          style={[styles.createButton, (!selectedVolume || !selectedBagSize || !pickupLocation || loading) && styles.createButtonDisabled]}
          onPress={createOrder}
          disabled={!selectedVolume || !selectedBagSize || !pickupLocation || loading}
        >
          <Text style={styles.createButtonText}>
            {loading ? 'Creating Order...' : `Create Order${pricing ? ` - $${pricing.total.toFixed(2)}` : ''}`}
          </Text>
        </TouchableOpacity>
      </View>
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
  bagSizeCard: {
    alignItems: 'center',
    marginRight: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    width: 110,
  },
  selectedBagSize: {
    borderColor: '#34A853',
    backgroundColor: '#34A85310',
  },
  bagSizeHeader: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  bagSizeId: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
  },
  bagSizeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  bagSizeDescription: {
    fontSize: 11,
    textAlign: 'center',
    color: '#6B7280',
  },
  selectedBagSizeText: {
    color: '#34A853',
  },
  selectedBagSizeDescText: {
    color: '#16A34A',
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
