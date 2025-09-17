import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Circle } from 'react-native-maps';
import SharedHeader from '../components/SharedHeader';

const { width } = Dimensions.get('window');

const PartnerManagement = ({ navigation }) => {
  const [partners, setPartners] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showAddPartnerModal, setShowAddPartnerModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  // New partner form data
  const [newPartner, setNewPartner] = useState({
    name: '',
    type: 'landfill',
    address: '',
    contactPerson: '',
    phone: '',
    email: '',
    capacity: '',
    currentUsage: '',
    pricing: {
      perBag: '',
      perTonnage: '',
      monthlyFee: '',
    },
    restrictions: [],
    operatingHours: '',
    coordinates: { latitude: 0, longitude: 0 },
  });

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      // Mock data - in production, this would fetch from Firestore
      const mockPartners = [
        {
          id: 'P001',
          name: 'Atlanta Waste Management Center',
          type: 'landfill',
          address: '123 Industrial Blvd, Atlanta, GA 30309',
          contactPerson: 'John Mitchell',
          phone: '(404) 555-0123',
          email: 'john.mitchell@wastecenter.com',
          capacity: '1000 tons/day',
          currentUsage: '65%',
          pricing: {
            perBag: '$2.50',
            perTonnage: '$45/ton',
            monthlyFee: '$500',
          },
          restrictions: ['No hazardous materials', 'No electronics', 'Max 5 tons per visit'],
          operatingHours: '6 AM - 8 PM (Mon-Sat)',
          coordinates: { latitude: 33.7490, longitude: -84.3880 },
          status: 'active',
          utilizationRate: 78,
          monthlyVolume: 450,
          lastVisit: '2 hours ago',
          qrCode: 'QR_ATL_001',
          rating: 4.8,
          complianceScore: 95,
        },
        {
          id: 'P002',
          name: 'Georgia Recycling Facility',
          type: 'recycling',
          address: '456 Green Way, Decatur, GA 30030',
          contactPerson: 'Sarah Green',
          phone: '(678) 555-0456',
          email: 'sarah.green@georgiarecycling.com',
          capacity: '500 tons/day',
          currentUsage: '45%',
          pricing: {
            perBag: '$1.75',
            perTonnage: '$25/ton',
            monthlyFee: '$300',
          },
          restrictions: ['Recyclables only', 'No food waste', 'Sorted materials preferred'],
          operatingHours: '7 AM - 6 PM (Mon-Fri)',
          coordinates: { latitude: 33.7748, longitude: -84.2963 },
          status: 'active',
          utilizationRate: 62,
          monthlyVolume: 280,
          lastVisit: '4 hours ago',
          qrCode: 'QR_GA_REC_002',
          rating: 4.6,
          complianceScore: 88,
        },
        {
          id: 'P003',
          name: 'Metro Transfer Station',
          type: 'transfer',
          address: '789 Metro Drive, Marietta, GA 30060',
          contactPerson: 'Mike Rodriguez',
          phone: '(770) 555-0789',
          email: 'mike.rodriguez@metrotransfer.com',
          capacity: '2000 tons/day',
          currentUsage: '82%',
          pricing: {
            perBag: '$3.00',
            perTonnage: '$55/ton',
            monthlyFee: '$750',
          },
          restrictions: ['No construction debris over 4ft', 'No liquids', 'Must be contained'],
          operatingHours: '5 AM - 9 PM (Daily)',
          coordinates: { latitude: 33.9526, longitude: -84.5499 },
          status: 'warning',
          utilizationRate: 85,
          monthlyVolume: 620,
          lastVisit: '1 hour ago',
          qrCode: 'QR_METRO_003',
          rating: 4.2,
          complianceScore: 72,
        },
      ];

      setPartners(mockPartners);
      setRefreshing(false);
    } catch (error) {
      console.error('Error loading partners:', error);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPartners();
  };

  const getPartnerTypeColor = (type) => {
    switch (type) {
      case 'landfill': return '#8B5CF6';
      case 'recycling': return '#10B981';
      case 'transfer': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'warning': return '#F59E0B';
      case 'inactive': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const handleAddPartner = () => {
    if (!newPartner.name || !newPartner.address || !newPartner.contactPerson) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    Alert.alert(
      'Add New Partner',
      `Add ${newPartner.name} to the partner network?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add Partner',
          onPress: () => {
            // In production, this would save to Firestore
            console.log('Adding new partner:', newPartner);
            setShowAddPartnerModal(false);
            setNewPartner({
              name: '',
              type: 'landfill',
              address: '',
              contactPerson: '',
              phone: '',
              email: '',
              capacity: '',
              currentUsage: '',
              pricing: { perBag: '', perTonnage: '', monthlyFee: '' },
              restrictions: [],
              operatingHours: '',
              coordinates: { latitude: 0, longitude: 0 },
            });
            Alert.alert('Success', 'Partner added successfully');
          }
        }
      ]
    );
  };

  const handlePartnerAction = (partnerId, action) => {
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${action} this partner?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            console.log(`${action} partner ${partnerId}`);
            Alert.alert('Success', `Partner ${action}ed successfully`);
          }
        }
      ]
    );
  };

  const filteredPartners = partners.filter(partner => {
    const matchesSearch = partner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         partner.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || partner.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const renderPartnerCard = (partner) => (
    <TouchableOpacity 
      key={partner.id} 
      style={styles.partnerCard}
      onPress={() => {
        setSelectedPartner(partner);
        setShowPartnerModal(true);
      }}
    >
      <View style={styles.partnerHeader}>
        <View style={styles.partnerInfo}>
          <Text style={styles.partnerName}>{partner.name}</Text>
          <Text style={styles.partnerAddress}>{partner.address}</Text>
        </View>
        <View style={styles.partnerMeta}>
          <View style={[styles.typeBadge, { backgroundColor: getPartnerTypeColor(partner.type) }]}>
            <Text style={styles.typeText}>{partner.type.toUpperCase()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(partner.status) }]}>
            <Text style={styles.statusText}>{partner.status.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.partnerDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>{partner.contactPerson}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="call-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>{partner.phone}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>Last visit: {partner.lastVisit}</Text>
        </View>
      </View>

      <View style={styles.partnerStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{partner.utilizationRate}%</Text>
          <Text style={styles.statLabel}>Utilization</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{partner.monthlyVolume}</Text>
          <Text style={styles.statLabel}>Monthly Tons</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{partner.complianceScore}%</Text>
          <Text style={styles.statLabel}>Compliance</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{partner.rating}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>

      <View style={styles.partnerActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate('EditPartner', { partnerId: partner.id });
          }}
        >
          <Ionicons name="create-outline" size={16} color="#3B82F6" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.contactButton]}
          onPress={(e) => {
            e.stopPropagation();
            handlePartnerAction(partner.id, 'contact');
          }}
        >
          <Ionicons name="call-outline" size={16} color="#10B981" />
          <Text style={styles.actionButtonText}>Call</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.qrButton]}
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate('QRCodeGenerator', { partnerId: partner.id });
          }}
        >
          <Ionicons name="qr-code-outline" size={16} color="#8B5CF6" />
          <Text style={styles.actionButtonText}>QR Code</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SharedHeader 
        title="Partner Management" 
        subtitle="Waste disposal facility partners"
        showBackButton 
        rightComponent={
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowAddPartnerModal(true)}
          >
            <Ionicons name="add" size={24} color="#34A853" />
          </TouchableOpacity>
        }
      />

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search partners..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity 
            style={[styles.filterButton, filterType === 'all' && styles.filterButtonActive]}
            onPress={() => setFilterType('all')}
          >
            <Text style={[styles.filterButtonText, filterType === 'all' && styles.filterButtonTextActive]}>
              All Types
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, filterType === 'landfill' && styles.filterButtonActive]}
            onPress={() => setFilterType('landfill')}
          >
            <Text style={[styles.filterButtonText, filterType === 'landfill' && styles.filterButtonTextActive]}>
              Landfills
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, filterType === 'recycling' && styles.filterButtonActive]}
            onPress={() => setFilterType('recycling')}
          >
            <Text style={[styles.filterButtonText, filterType === 'recycling' && styles.filterButtonTextActive]}>
              Recycling
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, filterType === 'transfer' && styles.filterButtonActive]}
            onPress={() => setFilterType('transfer')}
          >
            <Text style={[styles.filterButtonText, filterType === 'transfer' && styles.filterButtonTextActive]}>
              Transfer
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Partners List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#34A853']}
            tintColor="#34A853"
          />
        }
      >
        {filteredPartners.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyTitle}>No Partners Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try adjusting your search criteria' : 'No partners match the current filters'}
            </Text>
          </View>
        ) : (
          filteredPartners.map(renderPartnerCard)
        )}
      </ScrollView>

      {/* Partner Details Modal */}
      <Modal
        visible={showPartnerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPartnerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedPartner?.name}</Text>
              <TouchableOpacity onPress={() => setShowPartnerModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedPartner && (
              <ScrollView style={styles.partnerDetailsModal}>
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Contact Information</Text>
                  <View style={styles.detailRow}>
                    <Ionicons name="person-outline" size={20} color="#6B7280" />
                    <Text style={styles.detailValue}>{selectedPartner.contactPerson}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="call-outline" size={20} color="#6B7280" />
                    <Text style={styles.detailValue}>{selectedPartner.phone}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="mail-outline" size={20} color="#6B7280" />
                    <Text style={styles.detailValue}>{selectedPartner.email}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={20} color="#6B7280" />
                    <Text style={styles.detailValue}>{selectedPartner.address}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Pricing Structure</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Per Bag:</Text>
                    <Text style={styles.detailValue}>{selectedPartner.pricing.perBag}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Per Tonnage:</Text>
                    <Text style={styles.detailValue}>{selectedPartner.pricing.perTonnage}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Monthly Fee:</Text>
                    <Text style={styles.detailValue}>{selectedPartner.pricing.monthlyFee}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Operations</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Capacity:</Text>
                    <Text style={styles.detailValue}>{selectedPartner.capacity}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Current Usage:</Text>
                    <Text style={styles.detailValue}>{selectedPartner.currentUsage}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Operating Hours:</Text>
                    <Text style={styles.detailValue}>{selectedPartner.operatingHours}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Restrictions</Text>
                  {selectedPartner.restrictions.map((restriction, index) => (
                    <View key={index} style={styles.restrictionItem}>
                      <Ionicons name="warning-outline" size={16} color="#F59E0B" />
                      <Text style={styles.restrictionText}>{restriction}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Partner Modal */}
      <Modal
        visible={showAddPartnerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddPartnerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Partner</Text>
              <TouchableOpacity onPress={() => setShowAddPartnerModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.addPartnerForm}>
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Basic Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Partner Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newPartner.name}
                    onChangeText={(text) => setNewPartner(prev => ({ ...prev, name: text }))}
                    placeholder="Enter partner name"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Partner Type</Text>
                  <View style={styles.typeSelector}>
                    {['landfill', 'recycling', 'transfer'].map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.typeOption,
                          newPartner.type === type && styles.typeOptionActive
                        ]}
                        onPress={() => setNewPartner(prev => ({ ...prev, type }))}
                      >
                        <Text style={[
                          styles.typeOptionText,
                          newPartner.type === type && styles.typeOptionTextActive
                        ]}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Address *</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={newPartner.address}
                    onChangeText={(text) => setNewPartner(prev => ({ ...prev, address: text }))}
                    placeholder="Enter full address"
                    multiline
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Contact Person *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newPartner.contactPerson}
                    onChangeText={(text) => setNewPartner(prev => ({ ...prev, contactPerson: text }))}
                    placeholder="Enter contact person name"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newPartner.phone}
                    onChangeText={(text) => setNewPartner(prev => ({ ...prev, phone: text }))}
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newPartner.email}
                    onChangeText={(text) => setNewPartner(prev => ({ ...prev, email: text }))}
                    placeholder="Enter email address"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Pricing</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Per Bag Rate</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newPartner.pricing.perBag}
                    onChangeText={(text) => setNewPartner(prev => ({ 
                      ...prev, 
                      pricing: { ...prev.pricing, perBag: text }
                    }))}
                    placeholder="e.g., $2.50"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Per Tonnage Rate</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newPartner.pricing.perTonnage}
                    onChangeText={(text) => setNewPartner(prev => ({ 
                      ...prev, 
                      pricing: { ...prev.pricing, perTonnage: text }
                    }))}
                    placeholder="e.g., $45/ton"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Monthly Fee</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newPartner.pricing.monthlyFee}
                    onChangeText={(text) => setNewPartner(prev => ({ 
                      ...prev, 
                      pricing: { ...prev.pricing, monthlyFee: text }
                    }))}
                    placeholder="e.g., $500"
                  />
                </View>
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setShowAddPartnerModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={handleAddPartner}
                >
                  <Text style={styles.addButtonText}>Add Partner</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  addButton: {
    padding: 8,
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1F2937',
  },
  filterScroll: {
    marginBottom: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#34A853',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  partnerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  partnerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  partnerAddress: {
    fontSize: 14,
    color: '#6B7280',
  },
  partnerMeta: {
    alignItems: 'flex-end',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  partnerDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  partnerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  partnerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  contactButton: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  qrButton: {
    backgroundColor: '#F3F0FF',
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: width * 0.9,
    height: '80%',
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  partnerDetailsModal: {
    flex: 1,
    padding: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  detailValue: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    width: 100,
  },
  restrictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  restrictionText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  addPartnerForm: {
    flex: 1,
    padding: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  typeOptionActive: {
    backgroundColor: '#34A853',
    borderColor: '#34A853',
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  typeOptionTextActive: {
    color: '#FFFFFF',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  addButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#34A853',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default PartnerManagement;
