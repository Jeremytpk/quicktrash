import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SharedHeader from '../components/SharedHeader';

const VehicleInfo = () => {
  const [vehicleData, setVehicleData] = useState({
    make: 'Ford',
    model: 'F-150',
    year: '2019',
    color: 'Blue',
    licensePlate: 'ABC1234',
    capacity: '1000 lbs',
    type: 'pickup',
    insurance: {
      provider: 'State Farm',
      policyNumber: 'SF123456789',
      expiryDate: '12/15/2025',
    },
    registration: {
      expiryDate: '08/30/2025',
    },
    documents: {
      insuranceCard: 'uploaded',
      registration: 'uploaded',
      driversLicense: 'uploaded',
    }
  });

  const [editMode, setEditMode] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  const handleSave = () => {
    Alert.alert('Success', 'Vehicle information updated successfully');
    setEditMode(false);
  };

  const handleDocumentUpload = (documentType) => {
    setSelectedDocument(documentType);
    setShowDocumentModal(true);
  };

  const getVehicleIcon = (type) => {
    switch (type) {
      case 'pickup': return 'car-outline';
      case 'van': return 'bus-outline';
      case 'truck': return 'bus-outline';
      default: return 'car-outline';
    }
  };

  const getDocumentStatus = (status) => {
    switch (status) {
      case 'uploaded': return { icon: 'checkmark-circle', color: '#34A853', text: 'Verified' };
      case 'pending': return { icon: 'time', color: '#F59E0B', text: 'Pending Review' };
      case 'rejected': return { icon: 'close-circle', color: '#DC2626', text: 'Rejected' };
      default: return { icon: 'cloud-upload-outline', color: '#6B7280', text: 'Upload Required' };
    }
  };

  const renderInfoRow = (label, value, field, editable = true) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      {editMode && editable ? (
        <TextInput
          style={styles.infoInput}
          value={value}
          onChangeText={(text) => setVehicleData(prev => ({ ...prev, [field]: text }))}
          placeholder={label}
        />
      ) : (
        <Text style={styles.infoValue}>{value}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <SharedHeader 
        title="Vehicle Information" 
        showBackButton 
        rightComponent={
          <TouchableOpacity 
            style={styles.editButton}
            onPress={editMode ? handleSave : () => setEditMode(true)}
          >
            <Ionicons 
              name={editMode ? "checkmark" : "create-outline"} 
              size={20} 
              color={editMode ? "#34A853" : "#6B7280"} 
            />
            <Text style={[styles.editButtonText, editMode && styles.saveButtonText]}>
              {editMode ? 'Save' : 'Edit'}
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Vehicle Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Overview</Text>
          <View style={styles.vehicleCard}>
            <View style={styles.vehicleHeader}>
              <View style={styles.vehicleIcon}>
                <Ionicons name={getVehicleIcon(vehicleData.type)} size={32} color="#34A853" />
              </View>
              <View style={styles.vehicleDetails}>
                <Text style={styles.vehicleName}>
                  {vehicleData.year} {vehicleData.make} {vehicleData.model}
                </Text>
                <Text style={styles.vehicleSpecs}>
                  {vehicleData.color} • {vehicleData.capacity} capacity
                </Text>
                <Text style={styles.licensePlate}>License: {vehicleData.licensePlate}</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Active</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Vehicle Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Details</Text>
          <View style={styles.detailsCard}>
            {renderInfoRow('Make', vehicleData.make, 'make')}
            {renderInfoRow('Model', vehicleData.model, 'model')}
            {renderInfoRow('Year', vehicleData.year, 'year')}
            {renderInfoRow('Color', vehicleData.color, 'color')}
            {renderInfoRow('License Plate', vehicleData.licensePlate, 'licensePlate')}
            {renderInfoRow('Load Capacity', vehicleData.capacity, 'capacity')}
          </View>
        </View>

        {/* Insurance Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Insurance Information</Text>
          <View style={styles.detailsCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Insurance Provider</Text>
              <Text style={styles.infoValue}>{vehicleData.insurance.provider}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Policy Number</Text>
              <Text style={styles.infoValue}>{vehicleData.insurance.policyNumber}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Expiry Date</Text>
              <Text style={[
                styles.infoValue,
                new Date(vehicleData.insurance.expiryDate) < new Date() && styles.expiredText
              ]}>
                {vehicleData.insurance.expiryDate}
              </Text>
            </View>
          </View>
        </View>

        {/* Registration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Registration</Text>
          <View style={styles.detailsCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Registration Expiry</Text>
              <Text style={[
                styles.infoValue,
                new Date(vehicleData.registration.expiryDate) < new Date() && styles.expiredText
              ]}>
                {vehicleData.registration.expiryDate}
              </Text>
            </View>
          </View>
        </View>

        {/* Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Required Documents</Text>
          
          {Object.entries(vehicleData.documents).map(([docType, status]) => {
            const docStatus = getDocumentStatus(status);
            const docName = docType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            
            return (
              <TouchableOpacity
                key={docType}
                style={styles.documentCard}
                onPress={() => handleDocumentUpload(docType)}
              >
                <View style={styles.documentIcon}>
                  <Ionicons name={docStatus.icon} size={24} color={docStatus.color} />
                </View>
                <View style={styles.documentDetails}>
                  <Text style={styles.documentName}>{docName}</Text>
                  <Text style={[styles.documentStatus, { color: docStatus.color }]}>
                    {docStatus.text}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Compliance Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compliance Status</Text>
          <View style={styles.complianceCard}>
            <View style={styles.complianceHeader}>
              <Ionicons name="shield-checkmark" size={24} color="#34A853" />
              <Text style={styles.complianceTitle}>Vehicle Approved</Text>
            </View>
            <Text style={styles.complianceDescription}>
              Your vehicle meets all QuickTrash requirements and is approved for pickups.
            </Text>
            
            <View style={styles.complianceList}>
              <View style={styles.complianceItem}>
                <Ionicons name="checkmark-circle" size={16} color="#34A853" />
                <Text style={styles.complianceItemText}>Insurance verified</Text>
              </View>
              <View style={styles.complianceItem}>
                <Ionicons name="checkmark-circle" size={16} color="#34A853" />
                <Text style={styles.complianceItemText}>Registration current</Text>
              </View>
              <View style={styles.complianceItem}>
                <Ionicons name="checkmark-circle" size={16} color="#34A853" />
                <Text style={styles.complianceItemText}>Vehicle capacity adequate</Text>
              </View>
              <View style={styles.complianceItem}>
                <Ionicons name="checkmark-circle" size={16} color="#34A853" />
                <Text style={styles.complianceItemText}>Driver license verified</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Document Upload Modal */}
      <Modal
        visible={showDocumentModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDocumentModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDocumentModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Upload Document</Text>
            <TouchableOpacity>
              <Text style={styles.modalSave}>Upload</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.uploadArea}>
              <Ionicons name="cloud-upload-outline" size={64} color="#9CA3AF" />
              <Text style={styles.uploadTitle}>Upload {selectedDocument}</Text>
              <Text style={styles.uploadDescription}>
                Take a photo or select from your photo library
              </Text>
              
              <View style={styles.uploadButtons}>
                <TouchableOpacity style={styles.uploadButton}>
                  <Ionicons name="camera" size={20} color="#34A853" />
                  <Text style={styles.uploadButtonText}>Take Photo</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.uploadButton}>
                  <Ionicons name="images" size={20} color="#34A853" />
                  <Text style={styles.uploadButtonText}>Photo Library</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  editButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  saveButtonText: {
    color: '#34A853',
    fontWeight: '600',
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
  vehicleCard: {
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
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  vehicleDetails: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  vehicleSpecs: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  licensePlate: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    textAlign: 'right',
  },
  infoInput: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    textAlign: 'right',
    borderBottomWidth: 1,
    borderBottomColor: '#34A853',
    paddingVertical: 4,
  },
  expiredText: {
    color: '#DC2626',
  },
  documentCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
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
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  documentDetails: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  documentStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  complianceCard: {
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
  complianceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  complianceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 12,
  },
  complianceDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  complianceList: {
    gap: 8,
  },
  complianceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  complianceItemText: {
    fontSize: 14,
    color: '#374151',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
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
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34A853',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  uploadArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  uploadDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34A853',
  },
});

export default VehicleInfo;
