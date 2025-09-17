import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SharedHeader from '../components/SharedHeader';

const SafetyToolkit = () => {
  const [emergencyModalVisible, setEmergencyModalVisible] = useState(false);
  const [checkInTimer, setCheckInTimer] = useState(null);
  const [isOnJob, setIsOnJob] = useState(false);

  const emergencyContacts = [
    { name: '911 Emergency', number: '911', type: 'emergency' },
    { name: 'QuickTrash Support', number: '1-800-QTRASH', type: 'support' },
    { name: 'Roadside Assistance', number: '1-800-HELP', type: 'roadside' },
  ];

  const safetyChecklist = [
    { id: 1, text: 'Vehicle inspection completed', checked: true },
    { id: 2, text: 'Safety equipment present (gloves, vest)', checked: true },
    { id: 3, text: 'Route planned and reviewed', checked: false },
    { id: 4, text: 'Emergency contacts updated', checked: true },
    { id: 5, text: 'Insurance documents accessible', checked: true },
  ];

  const [checklist, setChecklist] = useState(safetyChecklist);

  const handleEmergencyCall = (number) => {
    Alert.alert(
      'Emergency Call',
      `Call ${number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call', 
          onPress: () => {
            Linking.openURL(`tel:${number}`);
            setEmergencyModalVisible(false);
          }
        }
      ]
    );
  };

  const startSafetyCheckIn = () => {
    setIsOnJob(true);
    Alert.alert(
      'Safety Check-In Started',
      'We\'ll check in with you every 2 hours. Stay safe!'
    );
  };

  const stopSafetyCheckIn = () => {
    setIsOnJob(false);
    Alert.alert(
      'Safety Check-In Stopped',
      'You\'re no longer being monitored. Thank you for staying safe!'
    );
  };

  const shareLocation = () => {
    Alert.alert(
      'Location Shared',
      'Your current location has been shared with your emergency contacts.'
    );
  };

  const toggleChecklistItem = (id) => {
    setChecklist(prev =>
      prev.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const getChecklistProgress = () => {
    const completed = checklist.filter(item => item.checked).length;
    return Math.round((completed / checklist.length) * 100);
  };

  return (
    <View style={styles.container}>
      <SharedHeader 
        title="Safety Toolkit" 
        showBackButton 
        rightComponent={
          <TouchableOpacity 
            style={styles.emergencyButton}
            onPress={() => setEmergencyModalVisible(true)}
          >
            <Ionicons name="warning" size={20} color="#DC2626" />
            <Text style={styles.emergencyButtonText}>Emergency</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Safety Actions</Text>
          
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => setEmergencyModalVisible(true)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="warning" size={24} color="#DC2626" />
              </View>
              <Text style={styles.quickActionTitle}>Emergency</Text>
              <Text style={styles.quickActionSubtitle}>Get help now</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={shareLocation}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#EBF8FF' }]}>
                <Ionicons name="location" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.quickActionTitle}>Share Location</Text>
              <Text style={styles.quickActionSubtitle}>Send to contacts</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={isOnJob ? stopSafetyCheckIn : startSafetyCheckIn}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: isOnJob ? '#FEF3C7' : '#F0FDF4' }]}>
                <Ionicons name={isOnJob ? "timer" : "shield-checkmark"} size={24} color={isOnJob ? "#F59E0B" : "#34A853"} />
              </View>
              <Text style={styles.quickActionTitle}>
                {isOnJob ? 'Stop Check-In' : 'Start Check-In'}
              </Text>
              <Text style={styles.quickActionSubtitle}>
                {isOnJob ? 'End monitoring' : 'Auto monitoring'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => Linking.openURL('tel:1-800-QTRASH')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="headset" size={24} color="#7C3AED" />
              </View>
              <Text style={styles.quickActionTitle}>Support</Text>
              <Text style={styles.quickActionSubtitle}>24/7 help line</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Safety Status */}
        {isOnJob && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Status</Text>
            <View style={styles.statusCard}>
              <View style={styles.statusHeader}>
                <View style={styles.statusIndicator}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.statusText}>Active Job - Monitoring</Text>
                </View>
                <TouchableOpacity onPress={stopSafetyCheckIn}>
                  <Text style={styles.stopButton}>Stop</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.statusDescription}>
                Next check-in: 1h 45m • Last update: 2 minutes ago
              </Text>
            </View>
          </View>
        )}

        {/* Pre-Job Safety Checklist */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Checklist ({getChecklistProgress()}% Complete)</Text>
          <View style={styles.checklistCard}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${getChecklistProgress()}%` }]} />
            </View>
            
            {checklist.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.checklistItem}
                onPress={() => toggleChecklistItem(item.id)}
              >
                <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
                  {item.checked && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
                <Text style={[styles.checklistText, item.checked && styles.checklistTextChecked]}>
                  {item.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Safety Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Tips</Text>
          
          <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <Ionicons name="bulb" size={20} color="#F59E0B" />
              <Text style={styles.tipTitle}>Vehicle Safety</Text>
            </View>
            <Text style={styles.tipText}>
              • Always lock your vehicle when making pickups{'\n'}
              • Keep your keys with you at all times{'\n'}
              • Park in well-lit areas when possible{'\n'}
              • Trust your instincts - if something feels wrong, leave
            </Text>
          </View>

          <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <Ionicons name="people" size={20} color="#3B82F6" />
              <Text style={styles.tipTitle}>Customer Interactions</Text>
            </View>
            <Text style={styles.tipText}>
              • Stay professional and courteous{'\n'}
              • Use the in-app chat for communication{'\n'}
              • Don't enter customers' homes{'\n'}
              • If threatened, leave immediately and call 911
            </Text>
          </View>

          <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <Ionicons name="fitness" size={20} color="#34A853" />
              <Text style={styles.tipTitle}>Physical Safety</Text>
            </View>
            <Text style={styles.tipText}>
              • Wear protective gloves and safety vest{'\n'}
              • Lift with your legs, not your back{'\n'}
              • Stay hydrated, especially in hot weather{'\n'}
              • Take breaks when needed
            </Text>
          </View>
        </View>

        {/* Emergency Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Information</Text>
          <View style={styles.emergencyInfoCard}>
            <Text style={styles.emergencyInfoTitle}>Your Emergency Contacts</Text>
            <Text style={styles.emergencyInfoText}>
              Make sure your emergency contacts are up to date in your profile. 
              They will be notified if you miss a safety check-in.
            </Text>
            <TouchableOpacity style={styles.updateContactsButton}>
              <Text style={styles.updateContactsText}>Update Emergency Contacts</Text>
              <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Emergency Modal */}
      <Modal
        visible={emergencyModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEmergencyModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEmergencyModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Emergency Contacts</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.emergencyWarning}>
              <Ionicons name="warning" size={24} color="#DC2626" />
              <Text style={styles.emergencyWarningText}>
                For immediate life-threatening emergencies, call 911 directly
              </Text>
            </View>

            {emergencyContacts.map((contact, index) => (
              <TouchableOpacity
                key={index}
                style={styles.emergencyContactCard}
                onPress={() => handleEmergencyCall(contact.number)}
              >
                <View style={styles.contactIcon}>
                  <Ionicons 
                    name={contact.type === 'emergency' ? 'medical' : 
                          contact.type === 'support' ? 'headset' : 'car'} 
                    size={24} 
                    color={contact.type === 'emergency' ? '#DC2626' : '#3B82F6'} 
                  />
                </View>
                <View style={styles.contactDetails}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactNumber}>{contact.number}</Text>
                </View>
                <Ionicons name="call" size={20} color="#34A853" />
              </TouchableOpacity>
            ))}
          </ScrollView>
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
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
    gap: 4,
  },
  emergencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    marginHorizontal: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  quickActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#34A853',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34A853',
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  stopButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  statusDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  checklistCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    marginBottom: 20,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34A853',
    borderRadius: 2,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#34A853',
    borderColor: '#34A853',
  },
  checklistText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  checklistTextChecked: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  tipCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  emergencyInfoCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emergencyInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emergencyInfoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  updateContactsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  updateContactsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCancel: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalHeaderSpacer: {
    width: 60,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  emergencyWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  emergencyWarningText: {
    flex: 1,
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
  },
  emergencyContactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  contactNumber: {
    fontSize: 14,
    color: '#6B7280',
  },
});

export default SafetyToolkit;
