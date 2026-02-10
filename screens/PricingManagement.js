import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SharedHeader from '../components/SharedHeader';
import { db } from '../firebaseConfig';
import { doc, updateDoc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

const PricingManagement = ({ navigation, route }) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWasteType, setSelectedWasteType] = useState(route.params?.wasteTypeId || null);

  // Waste types from CustomerDashboard
  const wasteTypes = [
    { id: 'household', name: 'Household Trash', icon: 'home', color: '#34A853' },
    { id: 'bulk', name: 'Bulk Items', icon: 'cube', color: '#FF8F00' },
    { id: 'yard', name: 'Yard Waste', icon: 'leaf', color: '#4CAF50' },
    { id: 'construction', name: 'Construction Debris', icon: 'construct', color: '#795548' },
    { id: 'recyclables', name: 'Recyclables', icon: 'refresh', color: '#2196F3' },
  ];

  const [systemSettings, setSystemSettings] = useState({
    // Volume options with base prices
    volumeOptions: [
      { id: '1-5_bags', name: '1-5 Bags', description: 'Small household bags', icon: 'bag', basePrice: 15.00 },
      { id: 'pickup_load', name: 'Pickup Load', description: 'Half truck bed full', icon: 'car', basePrice: 45.00 },
      { id: 'trailer_load', name: 'Trailer Load', description: 'Full trailer or truck bed', icon: 'bus', basePrice: 85.00 },
    ],
    // Bag sizes with price multipliers
    bagSizes: [
      { id: 'S', name: 'Small', description: 'Up to 13 gallons', priceMultiplier: 1.0 },
      { id: 'M', name: 'Medium', description: '13-30 gallons', priceMultiplier: 1.2 },
      { id: 'L', name: 'Large', description: '30-45 gallons', priceMultiplier: 1.5 },
      { id: 'XL', name: 'Extra Large', description: '45-60 gallons', priceMultiplier: 1.8 },
      { id: 'XXL', name: 'XX Large', description: '60+ gallons', priceMultiplier: 2.0 },
    ],
    // Waste type specific pricing (volume x bag size combinations)
    wasteTypePricing: {
      household: {},
      bulk: {},
      yard: {},
      construction: {},
      recyclables: {}
    },
    serviceFeePercentage: 15,
    contractorPayoutPercentage: 80,
  });

  useEffect(() => {
    fetchSystemSettings();
  }, []);

  const fetchSystemSettings = async () => {
    try {
      setLoading(true);
      
      // Fetch pricing configuration from pricings collection
      const pricingDoc = await getDoc(doc(db, 'pricings', 'default'));
      
      if (pricingDoc.exists()) {
        const pricingData = pricingDoc.data();
        setSystemSettings(prevSettings => ({
          ...prevSettings,
          volumeOptions: pricingData.volumeOptions || prevSettings.volumeOptions,
          bagSizes: pricingData.bagSizes || prevSettings.bagSizes,
          wasteTypePricing: pricingData.wasteTypePricing || prevSettings.wasteTypePricing,
          serviceFeePercentage: (pricingData.serviceFeePercentage || 0.15) * 100,
          contractorPayoutPercentage: (pricingData.contractorPayoutPercentage || 0.80) * 100
        }));
      } else {
        // If no pricing document exists, create it with default values
        await setDoc(doc(db, 'pricings', 'default'), {
          volumeOptions: systemSettings.volumeOptions,
          bagSizes: systemSettings.bagSizes,
          wasteTypePricing: systemSettings.wasteTypePricing,
          serviceFeePercentage: systemSettings.serviceFeePercentage / 100,
          contractorPayoutPercentage: systemSettings.contractorPayoutPercentage / 100,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
    } catch (error) {
      console.error('Error fetching system settings:', error);
      Alert.alert('Error', 'Failed to load pricing settings');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSystemSettings().finally(() => {
      setRefreshing(false);
    });
  };

  const handleSaveChanges = async () => {
    try {
      setLoading(true);
      
      console.log('Saving pricing data...');
      console.log('Volume Options:', systemSettings.volumeOptions);
      console.log('Bag Sizes:', systemSettings.bagSizes);
      console.log('Waste Type Pricing:', systemSettings.wasteTypePricing);
      
      // Save all pricing data to pricings collection
      const pricingRef = doc(db, 'pricings', 'default');
      const pricingData = {
        volumeOptions: systemSettings.volumeOptions,
        bagSizes: systemSettings.bagSizes,
        wasteTypePricing: systemSettings.wasteTypePricing,
        serviceFeePercentage: systemSettings.serviceFeePercentage / 100,
        contractorPayoutPercentage: systemSettings.contractorPayoutPercentage / 100,
        updatedAt: serverTimestamp()
      };

      console.log('Pricing data to save:', pricingData);

      // Check if document exists
      const docSnap = await getDoc(pricingRef);
      
      if (docSnap.exists()) {
        // Update existing document
        console.log('Updating existing document...');
        await updateDoc(pricingRef, pricingData);
        console.log('Document updated successfully');
      } else {
        // Create new document
        console.log('Creating new document...');
        await setDoc(pricingRef, {
          ...pricingData,
          createdAt: serverTimestamp()
        });
        console.log('Document created successfully');
      }
      
      Alert.alert('Success', 'Pricing updated successfully. Changes will be reflected for all users.', [
        {
          text: 'OK',
          onPress: () => {
            // Refetch to confirm changes
            fetchSystemSettings();
            if (selectedWasteType) {
              setSelectedWasteType(null);
            } else {
              navigation.goBack();
            }
          }
        }
      ]);
    } catch (error) {
      console.error('Error updating pricing:', error);
      console.error('Error details:', error.message);
      Alert.alert('Error', `Failed to update pricing: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getWasteTypePrice = (wasteTypeId, volumeId, bagSizeId) => {
    const key = `${volumeId}_${bagSizeId}`;
    const customPrice = systemSettings.wasteTypePricing?.[wasteTypeId]?.[key];
    
    if (customPrice !== undefined) {
      return customPrice;
    }
    
    // Calculate default price from base price and multiplier
    const volume = systemSettings.volumeOptions.find(v => v.id === volumeId);
    const bagSize = systemSettings.bagSizes.find(b => b.id === bagSizeId);
    
    if (volume && bagSize) {
      return volume.basePrice * bagSize.priceMultiplier;
    }
    
    return 0;
  };

  const setWasteTypePrice = (wasteTypeId, volumeId, bagSizeId, price) => {
    const key = `${volumeId}_${bagSizeId}`;
    setSystemSettings(prev => ({
      ...prev,
      wasteTypePricing: {
        ...prev.wasteTypePricing,
        [wasteTypeId]: {
          ...prev.wasteTypePricing[wasteTypeId],
          [key]: price
        }
      }
    }));
  };

  const resetToDefault = (wasteTypeId, volumeId, bagSizeId) => {
    const key = `${volumeId}_${bagSizeId}`;
    setSystemSettings(prev => {
      const newPricing = { ...prev.wasteTypePricing };
      if (newPricing[wasteTypeId]) {
        delete newPricing[wasteTypeId][key];
      }
      return {
        ...prev,
        wasteTypePricing: newPricing
      };
    });
  };

  if (!selectedWasteType) {
    // Waste Type Selection View
    return (
      <SafeAreaView style={styles.container}>
        <SharedHeader 
          title="Pricing Management" 
          showBackButton 
          onBackPress={() => navigation.goBack()}
        />

        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Waste Type</Text>
            <Text style={styles.sectionDescription}>
              Choose a waste type to configure its pricing
            </Text>
            <View style={styles.wasteTypeGrid}>
              {wasteTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={styles.wasteTypeCard}
                  onPress={() => setSelectedWasteType(type.id)}
                >
                  <View style={[styles.wasteTypeCardIcon, { backgroundColor: type.color }]}>
                    <Ionicons name={type.icon} size={32} color="#FFFFFF" />
                  </View>
                  <Text style={styles.wasteTypeCardName}>{type.name}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Global Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Default Volume Base Prices</Text>
            <Text style={styles.sectionDescription}>
              These base prices are used to calculate default pricing
            </Text>
            <View style={styles.priceGrid}>
              {systemSettings.volumeOptions.map((volume, index) => (
                <View key={volume.id} style={styles.priceItem}>
                  <View style={styles.priceItemHeader}>
                    <Ionicons name={volume.icon} size={20} color="#6B7280" />
                    <View style={styles.priceItemInfo}>
                      <Text style={styles.priceLabel}>{volume.name}</Text>
                      <Text style={styles.priceDescription}>{volume.description}</Text>
                    </View>
                  </View>
                  <TextInput
                    style={styles.priceInput}
                    value={`$${volume.basePrice.toFixed(2)}`}
                    keyboardType="numeric"
                    onChangeText={(text) => {
                      const value = parseFloat(text.replace('$', '')) || 0;
                      const updatedVolumes = [...systemSettings.volumeOptions];
                      updatedVolumes[index] = { ...updatedVolumes[index], basePrice: value };
                      setSystemSettings({
                        ...systemSettings,
                        volumeOptions: updatedVolumes
                      });
                    }}
                  />
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bag Size Multipliers</Text>
            <Text style={styles.sectionDescription}>
              Multipliers applied to base prices
            </Text>
            <View style={styles.bagSizeRow}>
              {systemSettings.bagSizes.map((bag, index) => (
                <View key={bag.id} style={styles.bagSizeCard}>
                  <View style={styles.bagSizeIcon}>
                    <Text style={styles.bagSizeIconText}>{bag.id}</Text>
                  </View>
                  <Text style={styles.bagSizeName}>{bag.name}</Text>
                  <TextInput
                    style={styles.bagSizeInput}
                    value={`${bag.priceMultiplier.toFixed(1)}x`}
                    keyboardType="numeric"
                    onChangeText={(text) => {
                      const value = parseFloat(text.replace('x', '')) || 1.0;
                      const updatedBags = [...systemSettings.bagSizes];
                      updatedBags[index] = { ...updatedBags[index], priceMultiplier: value };
                      setSystemSettings({
                        ...systemSettings,
                        bagSizes: updatedBags
                      });
                    }}
                  />
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fee Structure</Text>
            <View style={styles.feeItem}>
              <Text style={styles.feeLabel}>Service Fee Percentage</Text>
              <TextInput
                style={styles.feeInput}
                value={`${systemSettings.serviceFeePercentage}%`}
                keyboardType="numeric"
                onChangeText={(text) => {
                  const value = parseInt(text.replace('%', '')) || 0;
                  setSystemSettings({ ...systemSettings, serviceFeePercentage: value });
                }}
              />
            </View>
            <View style={styles.feeItem}>
              <Text style={styles.feeLabel}>Contractor Payout Percentage</Text>
              <TextInput
                style={styles.feeInput}
                value={`${systemSettings.contractorPayoutPercentage}%`}
                keyboardType="numeric"
                onChangeText={(text) => {
                  const value = parseInt(text.replace('%', '')) || 0;
                  setSystemSettings({ ...systemSettings, contractorPayoutPercentage: value });
                }}
              />
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSaveChanges}
            disabled={loading}
          >
            {loading && <ActivityIndicator color="#FFFFFF" style={{ marginRight: 8 }} />}
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : 'Save All Changes'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Waste Type Specific Pricing View
  const currentWasteType = wasteTypes.find(w => w.id === selectedWasteType);

  return (
    <SafeAreaView style={styles.container}>
      <SharedHeader 
        title={currentWasteType?.name || 'Pricing'} 
        showBackButton 
        onBackPress={() => setSelectedWasteType(null)}
      />

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.section}>
          <View style={styles.wasteTypeHeader}>
            <View style={[styles.wasteTypeHeaderIcon, { backgroundColor: currentWasteType?.color }]}>
              <Ionicons name={currentWasteType?.icon} size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.wasteTypeHeaderText}>
              Configure pricing for each volume and bag size combination
            </Text>
          </View>
        </View>

        {/* Pricing Table */}
        {systemSettings.volumeOptions.map((volume) => (
          <View key={volume.id} style={styles.volumeSection}>
            <View style={styles.volumeHeader}>
              <Ionicons name={volume.icon} size={20} color="#1F2937" />
              <Text style={styles.volumeTitle}>{volume.name}</Text>
              <Text style={styles.volumeSubtitle}>{volume.description}</Text>
            </View>
            
            <View style={styles.priceTable}>
              {systemSettings.bagSizes.map((bagSize) => {
                const currentPrice = getWasteTypePrice(selectedWasteType, volume.id, bagSize.id);
                const defaultPrice = volume.basePrice * bagSize.priceMultiplier;
                const isCustom = systemSettings.wasteTypePricing?.[selectedWasteType]?.[`${volume.id}_${bagSize.id}`] !== undefined;
                
                return (
                  <View key={bagSize.id} style={styles.priceRow}>
                    <View style={styles.priceRowLeft}>
                      <View style={styles.bagSizeIconSmall}>
                        <Text style={styles.bagSizeIconSmallText}>{bagSize.id}</Text>
                      </View>
                      <View style={styles.priceRowInfo}>
                        <Text style={styles.priceRowLabel}>{bagSize.name}</Text>
                        <Text style={styles.priceRowDescription}>{bagSize.description}</Text>
                        {!isCustom && (
                          <Text style={styles.priceRowDefault}>
                            Default: ${defaultPrice.toFixed(2)}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.priceRowRight}>
                      <TextInput
                        style={[styles.priceRowInput, isCustom && styles.priceRowInputCustom]}
                        value={`$${currentPrice.toFixed(2)}`}
                        keyboardType="numeric"
                        onChangeText={(text) => {
                          const value = parseFloat(text.replace('$', '')) || 0;
                          setWasteTypePrice(selectedWasteType, volume.id, bagSize.id, value);
                        }}
                      />
                      {isCustom && (
                        <TouchableOpacity
                          style={styles.resetButton}
                          onPress={() => resetToDefault(selectedWasteType, volume.id, bagSize.id)}
                        >
                          <Ionicons name="refresh" size={16} color="#6B7280" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        <View style={styles.section}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={24} color="#3B82F6" />
            <View style={styles.infoBoxText}>
              <Text style={styles.infoBoxTitle}>Custom Pricing</Text>
              <Text style={styles.infoBoxDescription}>
                Prices shown in blue are custom. Tap the refresh icon to reset to default pricing formula.
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSaveChanges}
          disabled={loading}
        >
          {loading && <ActivityIndicator color="#FFFFFF" style={{ marginRight: 8 }} />}
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save All Changes'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  wasteTypeGrid: {
    gap: 12,
  },
  wasteTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  wasteTypeCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wasteTypeCardName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  priceGrid: {
    gap: 12,
  },
  priceItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  priceItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  priceItemInfo: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  priceDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  priceInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    textAlign: 'center',
  },
  bagSizeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  bagSizeCard: {
    flex: 1,
    minWidth: 90,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bagSizeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  bagSizeIconText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3B82F6',
  },
  bagSizeName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  bagSizeInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 50,
  },
  feeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  feeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  feeInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#1F2937',
    minWidth: 80,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  wasteTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  wasteTypeHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wasteTypeHeaderText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  volumeSection: {
    marginBottom: 20,
  },
  volumeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    gap: 8,
  },
  volumeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  volumeSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 'auto',
  },
  priceTable: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderTopWidth: 0,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  priceRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  bagSizeIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bagSizeIconSmallText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6',
  },
  priceRowInfo: {
    flex: 1,
  },
  priceRowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  priceRowDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  priceRowDefault: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
    fontStyle: 'italic',
  },
  priceRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceRowInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    minWidth: 80,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  priceRowInputCustom: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    color: '#3B82F6',
  },
  resetButton: {
    padding: 4,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoBoxText: {
    flex: 1,
  },
  infoBoxTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  infoBoxDescription: {
    fontSize: 14,
    color: '#3B82F6',
    lineHeight: 20,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#34A853',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default PricingManagement;
