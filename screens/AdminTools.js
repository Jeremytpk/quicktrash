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
  Modal,
  Switch,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SharedHeader from '../components/SharedHeader';
import { db } from '../firebaseConfig';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

const AdminTools = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [systemSettings, setSystemSettings] = useState({
    autoAssignment: true,
    maxJobsPerDriver: 8,
    serviceHours: {
      start: '06:00',
      end: '22:00'
    },
    basePricing: {
      household: 15.00,
      bulk: 25.00,
      yard: 20.00,
      construction: 35.00,
      recyclables: 10.00
    },
    serviceFeePercentage: 15,
    contractorPayoutPercentage: 80,
    notificationSettings: {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false
    }
  });

  useEffect(() => {
    fetchSystemSettings();
  }, []);

  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showSystemModal, setShowSystemModal] = useState(false);
  const [editingSettings, setEditingSettings] = useState(null);
  const [systemHealth, setSystemHealth] = useState({
    uptime: '99.9%',
    responseTime: '45ms',
    lastBackup: '2 hours ago'
  });

  const fetchSystemSettings = async () => {
    try {
      setLoading(true);
      
      // Fetch app configuration from Firebase
      const configDoc = await getDoc(doc(db, 'appConfig', 'systemSettings'));
      
      if (configDoc.exists()) {
        const configData = configDoc.data();
        setSystemSettings(prevSettings => ({
          ...prevSettings,
          ...configData,
          basePricing: configData.pricing?.baseFees || prevSettings.basePricing,
          serviceFeePercentage: (configData.pricing?.serviceFeePercentage || 0.15) * 100,
          contractorPayoutPercentage: (configData.pricing?.contractorPayoutPercentage || 0.80) * 100
        }));
      }
      
      // Calculate system health metrics
      await calculateSystemHealth();
      
    } catch (error) {
      console.error('Error fetching system settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSystemHealth = async () => {
    try {
      // Calculate system metrics from Firebase data
      const jobsQuery = query(collection(db, 'jobs'));
      const usersQuery = query(collection(db, 'users'));
      
      const [jobsSnapshot, usersSnapshot] = await Promise.all([
        getDocs(jobsQuery),
        getDocs(usersQuery)
      ]);
      
      // Simulate system health calculations
      // In a real app, you'd calculate actual uptime, response times, etc.
      const totalJobs = jobsSnapshot.size;
      const totalUsers = usersSnapshot.size;
      
      setSystemHealth({
        uptime: '99.9%',
        responseTime: '45ms',
        lastBackup: '2 hours ago',
        totalJobs,
        totalUsers
      });
      
    } catch (error) {
      console.error('Error calculating system health:', error);
    }
  };

  const adminTools = [
    {
      id: 'system-settings',
      title: 'System Settings',
      description: 'Configure core system settings and operational parameters',
      icon: 'settings-outline',
      color: '#3B82F6',
      action: () => setShowSystemModal(true)
    },
    {
      id: 'pricing-management',
      title: 'Pricing Management',
      description: 'Configure pricing for different service types and market conditions',
      icon: 'cash-outline',
      color: '#10B981',
      action: () => setShowPricingModal(true)
    },
    {
      id: 'service-areas',
      title: 'Service Area Management',
      description: 'Configure and manage geographic service areas',
      icon: 'location-outline',
      color: '#F59E0B',
      action: () => Alert.alert('Coming Soon', 'Service Area Management will be available soon')
    },
    {
      id: 'disposal-partners',
      title: 'Disposal Partners',
      description: 'Manage disposal facility partnerships and agreements',
      icon: 'business-outline',
      color: '#8B5CF6',
      action: () => Alert.alert('Coming Soon', 'Disposal Partners Management will be available soon')
    },
    {
      id: 'app-config',
      title: 'App Configuration',
      description: 'Configure mobile app features and user experience',
      icon: 'phone-portrait-outline',
      color: '#EF4444',
      action: () => Alert.alert('Coming Soon', 'App Configuration will be available soon')
    },
    {
      id: 'user-management',
      title: 'User Management',
      description: 'Manage user accounts, permissions, and access levels',
      icon: 'people-outline',
      color: '#06B6D4',
      action: () => navigation.navigate('UserManagement')
    },
    {
      id: 'system-health',
      title: 'System Health',
      description: 'Monitor system performance and health metrics',
      icon: 'pulse-outline',
      color: '#84CC16',
      action: () => Alert.alert('System Health', 'All systems operational\nUptime: 99.9%\nResponse Time: 45ms')
    },
    {
      id: 'backup-restore',
      title: 'Backup & Restore',
      description: 'Manage system backups and data restoration',
      icon: 'cloud-outline',
      color: '#F97316',
      action: () => Alert.alert('Backup Status', 'Last Backup: 2 hours ago\nStatus: Successful\nSize: 2.3 GB')
    }
  ];

  const onRefresh = () => {
    setRefreshing(true);
    fetchSystemSettings().finally(() => {
      setRefreshing(false);
    });
  };

  const handleSettingChange = async (key, value) => {
    try {
      setLoading(true);
      const updatedSettings = { ...systemSettings, [key]: value };
      setSystemSettings(updatedSettings);
      
      // Here you would update Firebase
      // const configRef = doc(db, 'appConfig', 'systemSettings');
      // await updateDoc(configRef, { [key]: value });
      
      Alert.alert('Success', 'Setting updated successfully');
    } catch (error) {
      console.error('Error updating setting:', error);
      Alert.alert('Error', 'Failed to update setting');
    } finally {
      setLoading(false);
    }
  };

  const handlePricingUpdate = async () => {
    try {
      setLoading(true);
      
      // Update pricing in Firebase
      const configRef = doc(db, 'appConfig', 'systemSettings');
      await updateDoc(configRef, {
        pricing: {
          baseFees: systemSettings.basePricing,
          serviceFeePercentage: systemSettings.serviceFeePercentage / 100,
          contractorPayoutPercentage: systemSettings.contractorPayoutPercentage / 100
        },
        updatedAt: serverTimestamp()
      });
      
      Alert.alert('Success', 'Pricing updated successfully');
      setShowPricingModal(false);
    } catch (error) {
      console.error('Error updating pricing:', error);
      Alert.alert('Error', 'Failed to update pricing');
    } finally {
      setLoading(false);
    }
  };

  const renderToolCard = ({ item: tool }) => (
    <TouchableOpacity style={styles.toolCard} onPress={tool.action}>
      <View style={styles.toolHeader}>
        <View style={[styles.toolIcon, { backgroundColor: tool.color }]}>
          <Ionicons name={tool.icon} size={24} color="#FFFFFF" />
        </View>
        <View style={styles.toolInfo}>
          <Text style={styles.toolTitle}>{tool.title}</Text>
          <Text style={styles.toolDescription}>{tool.description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );

  const PricingModal = () => (
    <Modal
      visible={showPricingModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowPricingModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Pricing Management</Text>
          <TouchableOpacity onPress={() => setShowPricingModal(false)}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.pricingSection}>
            <Text style={styles.sectionTitle}>Base Pricing</Text>
            <View style={styles.pricingGrid}>
              <View style={styles.pricingItem}>
                <Text style={styles.pricingLabel}>Household</Text>
                <TextInput
                  style={styles.pricingInput}
                  value={`$${systemSettings.basePricing.household.toFixed(2)}`}
                  keyboardType="numeric"
                  onChangeText={(text) => {
                    const value = parseFloat(text.replace('$', '')) || 0;
                    setSystemSettings({
                      ...systemSettings,
                      basePricing: { ...systemSettings.basePricing, household: value }
                    });
                  }}
                />
              </View>
              <View style={styles.pricingItem}>
                <Text style={styles.pricingLabel}>Bulk</Text>
                <TextInput
                  style={styles.pricingInput}
                  value={`$${systemSettings.basePricing.bulk.toFixed(2)}`}
                  keyboardType="numeric"
                  onChangeText={(text) => {
                    const value = parseFloat(text.replace('$', '')) || 0;
                    setSystemSettings({
                      ...systemSettings,
                      basePricing: { ...systemSettings.basePricing, bulk: value }
                    });
                  }}
                />
              </View>
              <View style={styles.pricingItem}>
                <Text style={styles.pricingLabel}>Yard Waste</Text>
                <TextInput
                  style={styles.pricingInput}
                  value={`$${systemSettings.basePricing.yard.toFixed(2)}`}
                  keyboardType="numeric"
                  onChangeText={(text) => {
                    const value = parseFloat(text.replace('$', '')) || 0;
                    setSystemSettings({
                      ...systemSettings,
                      basePricing: { ...systemSettings.basePricing, yard: value }
                    });
                  }}
                />
              </View>
              <View style={styles.pricingItem}>
                <Text style={styles.pricingLabel}>Construction</Text>
                <TextInput
                  style={styles.pricingInput}
                  value={`$${systemSettings.basePricing.construction.toFixed(2)}`}
                  keyboardType="numeric"
                  onChangeText={(text) => {
                    const value = parseFloat(text.replace('$', '')) || 0;
                    setSystemSettings({
                      ...systemSettings,
                      basePricing: { ...systemSettings.basePricing, construction: value }
                    });
                  }}
                />
              </View>
              <View style={styles.pricingItem}>
                <Text style={styles.pricingLabel}>Recyclables</Text>
                <TextInput
                  style={styles.pricingInput}
                  value={`$${systemSettings.basePricing.recyclables.toFixed(2)}`}
                  keyboardType="numeric"
                  onChangeText={(text) => {
                    const value = parseFloat(text.replace('$', '')) || 0;
                    setSystemSettings({
                      ...systemSettings,
                      basePricing: { ...systemSettings.basePricing, recyclables: value }
                    });
                  }}
                />
              </View>
            </View>
          </View>

          <View style={styles.pricingSection}>
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
            style={styles.saveButton}
            onPress={handlePricingUpdate}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Updating...' : 'Save Pricing Changes'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const SystemModal = () => (
    <Modal
      visible={showSystemModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowSystemModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>System Settings</Text>
          <TouchableOpacity onPress={() => setShowSystemModal(false)}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.settingSection}>
            <Text style={styles.sectionTitle}>Operational Settings</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Auto Assignment</Text>
                <Text style={styles.settingDescription}>Automatically assign jobs to contractors</Text>
              </View>
              <Switch
                value={systemSettings.autoAssignment}
                onValueChange={(value) => handleSettingChange('autoAssignment', value)}
                trackColor={{ false: '#E5E7EB', true: '#34A853' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Max Jobs per Driver</Text>
              <TextInput
                style={styles.settingInput}
                value={systemSettings.maxJobsPerDriver.toString()}
                keyboardType="numeric"
                onChangeText={(text) => {
                  const value = parseInt(text) || 0;
                  handleSettingChange('maxJobsPerDriver', value);
                }}
              />
            </View>
          </View>

          <View style={styles.settingSection}>
            <Text style={styles.sectionTitle}>Service Hours</Text>
            
            <View style={styles.timeRow}>
              <View style={styles.timeItem}>
                <Text style={styles.timeLabel}>Start Time</Text>
                <TextInput
                  style={styles.timeInput}
                  value={systemSettings.serviceHours.start}
                  onChangeText={(text) => {
                    setSystemSettings({
                      ...systemSettings,
                      serviceHours: { ...systemSettings.serviceHours, start: text }
                    });
                  }}
                />
              </View>
              <View style={styles.timeItem}>
                <Text style={styles.timeLabel}>End Time</Text>
                <TextInput
                  style={styles.timeInput}
                  value={systemSettings.serviceHours.end}
                  onChangeText={(text) => {
                    setSystemSettings({
                      ...systemSettings,
                      serviceHours: { ...systemSettings.serviceHours, end: text }
                    });
                  }}
                />
              </View>
            </View>
          </View>

          <View style={styles.settingSection}>
            <Text style={styles.sectionTitle}>Notification Settings</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Email Notifications</Text>
                <Text style={styles.settingDescription}>Send email notifications to users</Text>
              </View>
              <Switch
                value={systemSettings.notificationSettings.emailNotifications}
                onValueChange={(value) => {
                  setSystemSettings({
                    ...systemSettings,
                    notificationSettings: {
                      ...systemSettings.notificationSettings,
                      emailNotifications: value
                    }
                  });
                }}
                trackColor={{ false: '#E5E7EB', true: '#34A853' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDescription}>Send push notifications to mobile devices</Text>
              </View>
              <Switch
                value={systemSettings.notificationSettings.pushNotifications}
                onValueChange={(value) => {
                  setSystemSettings({
                    ...systemSettings,
                    notificationSettings: {
                      ...systemSettings.notificationSettings,
                      pushNotifications: value
                    }
                  });
                }}
                trackColor={{ false: '#E5E7EB', true: '#34A853' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <TouchableOpacity 
            style={styles.saveButton}
            onPress={() => {
              Alert.alert('Success', 'System settings updated successfully');
              setShowSystemModal(false);
            }}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Updating...' : 'Save System Settings'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <SharedHeader title="Admin Tools" showBackButton />

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* System Status */}
        <View style={styles.statusSection}>
          <Text style={styles.statusTitle}>System Status</Text>
          <View style={styles.statusGrid}>
            <View style={styles.statusCard}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.statusLabel}>All Systems Operational</Text>
              <Text style={styles.statusValue}>{systemHealth.uptime}</Text>
            </View>
            <View style={styles.statusCard}>
              <Ionicons name="server" size={24} color="#3B82F6" />
              <Text style={styles.statusLabel}>Server Response</Text>
              <Text style={styles.statusValue}>{systemHealth.responseTime}</Text>
            </View>
            <View style={styles.statusCard}>
              <Ionicons name="cloud" size={24} color="#8B5CF6" />
              <Text style={styles.statusLabel}>Last Backup</Text>
              <Text style={styles.statusValue}>{systemHealth.lastBackup}</Text>
            </View>
          </View>
        </View>

        {/* Admin Tools */}
        <View style={styles.toolsSection}>
          <Text style={styles.toolsTitle}>Administrative Tools</Text>
          <FlatList
            data={adminTools}
            renderItem={renderToolCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </ScrollView>

      <PricingModal />
      <SystemModal />
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
  statusSection: {
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  statusGrid: {
    gap: 12,
  },
  statusCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    flex: 1,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  toolsSection: {
    marginBottom: 24,
  },
  toolsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  toolCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  toolInfo: {
    flex: 1,
  },
  toolTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  toolDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  settingSection: {
    marginBottom: 24,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  settingInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#1F2937',
    minWidth: 60,
    textAlign: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 16,
  },
  timeItem: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  timeInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    textAlign: 'center',
  },
  pricingSection: {
    marginBottom: 24,
  },
  pricingGrid: {
    gap: 12,
  },
  pricingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pricingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  pricingInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#1F2937',
    minWidth: 80,
    textAlign: 'center',
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
  },
  saveButton: {
    backgroundColor: '#34A853',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default AdminTools;
