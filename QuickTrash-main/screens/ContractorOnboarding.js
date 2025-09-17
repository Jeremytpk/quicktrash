import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  RefreshControl,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SharedHeader from '../components/SharedHeader';

const { width } = Dimensions.get('window');

const ContractorOnboarding = ({ navigation }) => {
  const [pendingApplications, setPendingApplications] = useState([]);
  const [approvedContractors, setApprovedContractors] = useState([]);
  const [rejectedApplications, setRejectedApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('pending');

  useEffect(() => {
    loadContractorApplications();
  }, []);

  const loadContractorApplications = async () => {
    try {
      // Mock data - in production, this would fetch from Firestore
      const mockData = {
        pending: [
          {
            id: 'APP001',
            applicantName: 'Michael Johnson',
            email: 'michael.johnson@email.com',
            phone: '(404) 555-0123',
            address: '123 Contractor St, Atlanta, GA 30309',
            applicationDate: '2024-01-15',
            vehicleInfo: {
              make: 'Ford',
              model: 'F-150',
              year: 2020,
              licensePlate: 'ABC-1234',
              color: 'Blue',
              capacity: 'Large',
            },
            documents: {
              driversLicense: { status: 'verified', url: 'doc_001' },
              insurance: { status: 'pending', url: 'doc_002' },
              backgroundCheck: { status: 'verified', url: 'doc_003' },
              vehicleRegistration: { status: 'verified', url: 'doc_004' },
            },
            backgroundCheck: {
              status: 'passed',
              score: 95,
              issues: [],
            },
            onboardingProgress: {
              profileSetup: 100,
              documentVerification: 75,
              backgroundCheck: 100,
              vehicleInspection: 0,
              training: 0,
              finalApproval: 0,
            },
            estimatedApprovalTime: '2-3 business days',
            priority: 'normal',
          },
          {
            id: 'APP002',
            applicantName: 'Sarah Williams',
            email: 'sarah.williams@email.com',
            phone: '(678) 555-0456',
            address: '456 Driver Ave, Decatur, GA 30030',
            applicationDate: '2024-01-14',
            vehicleInfo: {
              make: 'Chevrolet',
              model: 'Silverado',
              year: 2019,
              licensePlate: 'XYZ-5678',
              color: 'White',
              capacity: 'Large',
            },
            documents: {
              driversLicense: { status: 'verified', url: 'doc_005' },
              insurance: { status: 'verified', url: 'doc_006' },
              backgroundCheck: { status: 'verified', url: 'doc_007' },
              vehicleRegistration: { status: 'pending', url: 'doc_008' },
            },
            backgroundCheck: {
              status: 'passed',
              score: 88,
              issues: [],
            },
            onboardingProgress: {
              profileSetup: 100,
              documentVerification: 100,
              backgroundCheck: 100,
              vehicleInspection: 0,
              training: 0,
              finalApproval: 0,
            },
            estimatedApprovalTime: '1-2 business days',
            priority: 'high',
          },
        ],
        approved: [
          {
            id: 'CON001',
            contractorName: 'John Smith',
            email: 'john.smith@email.com',
            phone: '(770) 555-0789',
            joinDate: '2024-01-10',
            vehicleInfo: {
              make: 'Ford',
              model: 'Transit',
              year: 2020,
              licensePlate: 'DEF-9012',
              color: 'Gray',
              capacity: 'Large',
            },
            performance: {
              rating: 4.8,
              totalJobs: 45,
              completionRate: 98,
              earnings: 1250.50,
            },
            compliance: {
              lastInspection: '2024-01-12',
              nextInspection: '2024-02-12',
              violations: 0,
              status: 'compliant',
            },
            status: 'active',
          },
        ],
        rejected: [
          {
            id: 'REJ001',
            applicantName: 'Robert Davis',
            email: 'robert.davis@email.com',
            phone: '(404) 555-0321',
            applicationDate: '2024-01-12',
            rejectionReason: 'Background check failed - previous DUI conviction',
            rejectionDate: '2024-01-13',
            reviewer: 'Admin User',
          },
        ],
      };

      setPendingApplications(mockData.pending);
      setApprovedContractors(mockData.approved);
      setRejectedApplications(mockData.rejected);
      setRefreshing(false);
    } catch (error) {
      console.error('Error loading contractor applications:', error);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadContractorApplications();
  };

  const handleApplicationAction = (applicationId, action) => {
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${action} this application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            console.log(`${action} application ${applicationId}`);
            Alert.alert('Success', `Application ${action}ed successfully`);
          }
        }
      ]
    );
  };

  const getDocumentStatusColor = (status) => {
    switch (status) {
      case 'verified': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'rejected': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getDocumentStatusIcon = (status) => {
    switch (status) {
      case 'verified': return 'checkmark-circle';
      case 'pending': return 'time';
      case 'rejected': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'normal': return '#34A853';
      case 'low': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getCurrentData = () => {
    switch (filterStatus) {
      case 'pending': return pendingApplications;
      case 'approved': return approvedContractors;
      case 'rejected': return rejectedApplications;
      default: return pendingApplications;
    }
  };

  const renderApplicationCard = (application) => (
    <TouchableOpacity 
      key={application.id} 
      style={styles.applicationCard}
      onPress={() => {
        setSelectedApplication(application);
        setShowApplicationModal(true);
      }}
    >
      <View style={styles.applicationHeader}>
        <View style={styles.applicationInfo}>
          <Text style={styles.applicantName}>{application.applicantName}</Text>
          <Text style={styles.applicationEmail}>{application.email}</Text>
          <Text style={styles.applicationPhone}>{application.phone}</Text>
        </View>
        <View style={styles.applicationMeta}>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(application.priority) }]}>
            <Text style={styles.priorityText}>{application.priority?.toUpperCase() || 'NORMAL'}</Text>
          </View>
          <Text style={styles.applicationDate}>
            {application.applicationDate || application.joinDate}
          </Text>
        </View>
      </View>

      <View style={styles.vehicleInfo}>
        <View style={styles.detailRow}>
          <Ionicons name="car-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>
            {application.vehicleInfo?.year} {application.vehicleInfo?.make} {application.vehicleInfo?.model}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="document-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>License: {application.vehicleInfo?.licensePlate}</Text>
        </View>
      </View>

      {application.onboardingProgress && (
        <View style={styles.progressSection}>
          <Text style={styles.progressTitle}>Onboarding Progress</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${Object.values(application.onboardingProgress).reduce((a, b) => a + b, 0) / 6}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round(Object.values(application.onboardingProgress).reduce((a, b) => a + b, 0) / 6)}% Complete
          </Text>
        </View>
      )}

      {application.performance && (
        <View style={styles.performanceSection}>
          <View style={styles.performanceItem}>
            <Text style={styles.performanceValue}>{application.performance.rating}</Text>
            <Text style={styles.performanceLabel}>Rating</Text>
          </View>
          <View style={styles.performanceItem}>
            <Text style={styles.performanceValue}>{application.performance.totalJobs}</Text>
            <Text style={styles.performanceLabel}>Jobs</Text>
          </View>
          <View style={styles.performanceItem}>
            <Text style={styles.performanceValue}>{application.performance.completionRate}%</Text>
            <Text style={styles.performanceLabel}>Completion</Text>
          </View>
          <View style={styles.performanceItem}>
            <Text style={styles.performanceValue}>${application.performance.earnings}</Text>
            <Text style={styles.performanceLabel}>Earnings</Text>
          </View>
        </View>
      )}

      <View style={styles.applicationActions}>
        {filterStatus === 'pending' && (
          <>
            <TouchableOpacity 
              style={[styles.actionButton, styles.approveButton]}
              onPress={(e) => {
                e.stopPropagation();
                handleApplicationAction(application.id, 'approve');
              }}
            >
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Approve</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.rejectButton]}
              onPress={(e) => {
                e.stopPropagation();
                handleApplicationAction(application.id, 'reject');
              }}
            >
              <Ionicons name="close" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity 
          style={[styles.actionButton, styles.viewButton]}
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate('ContractorDetails', { contractorId: application.id });
          }}
        >
          <Ionicons name="eye" size={16} color="#34A853" />
          <Text style={styles.actionButtonText}>View Details</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.contactButton]}
          onPress={(e) => {
            e.stopPropagation();
            handleApplicationAction(application.id, 'contact');
          }}
        >
          <Ionicons name="call" size={16} color="#3B82F6" />
          <Text style={styles.actionButtonText}>Contact</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SharedHeader 
        title="Contractor Onboarding" 
        subtitle="Manage contractor applications and compliance"
        showBackButton 
      />

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterButton, filterStatus === 'pending' && styles.filterButtonActive]}
          onPress={() => setFilterStatus('pending')}
        >
          <Text style={[styles.filterButtonText, filterStatus === 'pending' && styles.filterButtonTextActive]}>
            Pending ({pendingApplications.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, filterStatus === 'approved' && styles.filterButtonActive]}
          onPress={() => setFilterStatus('approved')}
        >
          <Text style={[styles.filterButtonText, filterStatus === 'approved' && styles.filterButtonTextActive]}>
            Approved ({approvedContractors.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, filterStatus === 'rejected' && styles.filterButtonActive]}
          onPress={() => setFilterStatus('rejected')}
        >
          <Text style={[styles.filterButtonText, filterStatus === 'rejected' && styles.filterButtonTextActive]}>
            Rejected ({rejectedApplications.length})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Applications List */}
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
        {getCurrentData().length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyTitle}>No Applications Found</Text>
            <Text style={styles.emptySubtitle}>
              {filterStatus === 'pending' && 'No pending applications at the moment'}
              {filterStatus === 'approved' && 'No approved contractors found'}
              {filterStatus === 'rejected' && 'No rejected applications found'}
            </Text>
          </View>
        ) : (
          getCurrentData().map(renderApplicationCard)
        )}
      </ScrollView>

      {/* Application Details Modal */}
      <Modal
        visible={showApplicationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowApplicationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedApplication?.applicantName || selectedApplication?.contractorName}
              </Text>
              <TouchableOpacity onPress={() => setShowApplicationModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedApplication && (
              <ScrollView style={styles.applicationDetailsModal}>
                {/* Personal Information */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Personal Information</Text>
                  <View style={styles.detailRow}>
                    <Ionicons name="person-outline" size={20} color="#6B7280" />
                    <Text style={styles.detailValue}>
                      {selectedApplication.applicantName || selectedApplication.contractorName}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="mail-outline" size={20} color="#6B7280" />
                    <Text style={styles.detailValue}>{selectedApplication.email}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="call-outline" size={20} color="#6B7280" />
                    <Text style={styles.detailValue}>{selectedApplication.phone}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={20} color="#6B7280" />
                    <Text style={styles.detailValue}>{selectedApplication.address}</Text>
                  </View>
                </View>

                {/* Vehicle Information */}
                {selectedApplication.vehicleInfo && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Vehicle Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Vehicle:</Text>
                      <Text style={styles.detailValue}>
                        {selectedApplication.vehicleInfo.year} {selectedApplication.vehicleInfo.make} {selectedApplication.vehicleInfo.model}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>License Plate:</Text>
                      <Text style={styles.detailValue}>{selectedApplication.vehicleInfo.licensePlate}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Color:</Text>
                      <Text style={styles.detailValue}>{selectedApplication.vehicleInfo.color}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Capacity:</Text>
                      <Text style={styles.detailValue}>{selectedApplication.vehicleInfo.capacity}</Text>
                    </View>
                  </View>
                )}

                {/* Document Verification */}
                {selectedApplication.documents && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Document Verification</Text>
                    {Object.entries(selectedApplication.documents).map(([docType, docInfo]) => (
                      <View key={docType} style={styles.documentRow}>
                        <View style={styles.documentInfo}>
                          <Text style={styles.documentName}>
                            {docType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </Text>
                          <View style={[styles.documentStatus, { backgroundColor: getDocumentStatusColor(docInfo.status) }]}>
                            <Ionicons name={getDocumentStatusIcon(docInfo.status)} size={12} color="#FFFFFF" />
                            <Text style={styles.documentStatusText}>{docInfo.status.toUpperCase()}</Text>
                          </View>
                        </View>
                        <TouchableOpacity style={styles.viewDocumentButton}>
                          <Text style={styles.viewDocumentText}>View</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Background Check */}
                {selectedApplication.backgroundCheck && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Background Check</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status:</Text>
                      <Text style={[styles.detailValue, { 
                        color: selectedApplication.backgroundCheck.status === 'passed' ? '#10B981' : '#EF4444' 
                      }]}>
                        {selectedApplication.backgroundCheck.status.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Score:</Text>
                      <Text style={styles.detailValue}>{selectedApplication.backgroundCheck.score}/100</Text>
                    </View>
                    {selectedApplication.backgroundCheck.issues.length > 0 && (
                      <View style={styles.issuesSection}>
                        <Text style={styles.issuesTitle}>Issues Found:</Text>
                        {selectedApplication.backgroundCheck.issues.map((issue, index) => (
                          <Text key={index} style={styles.issueText}>• {issue}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Onboarding Progress */}
                {selectedApplication.onboardingProgress && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Onboarding Progress</Text>
                    {Object.entries(selectedApplication.onboardingProgress).map(([step, progress]) => (
                      <View key={step} style={styles.progressItem}>
                        <Text style={styles.progressStepName}>
                          {step.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </Text>
                        <View style={styles.progressItemBar}>
                          <View style={[styles.progressItemFill, { width: `${progress}%` }]} />
                        </View>
                        <Text style={styles.progressStepValue}>{progress}%</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Performance Metrics */}
                {selectedApplication.performance && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Performance Metrics</Text>
                    <View style={styles.performanceGrid}>
                      <View style={styles.performanceGridItem}>
                        <Text style={styles.performanceGridValue}>{selectedApplication.performance.rating}</Text>
                        <Text style={styles.performanceGridLabel}>Rating</Text>
                      </View>
                      <View style={styles.performanceGridItem}>
                        <Text style={styles.performanceGridValue}>{selectedApplication.performance.totalJobs}</Text>
                        <Text style={styles.performanceGridLabel}>Total Jobs</Text>
                      </View>
                      <View style={styles.performanceGridItem}>
                        <Text style={styles.performanceGridValue}>{selectedApplication.performance.completionRate}%</Text>
                        <Text style={styles.performanceGridLabel}>Completion Rate</Text>
                      </View>
                      <View style={styles.performanceGridItem}>
                        <Text style={styles.performanceGridValue}>${selectedApplication.performance.earnings}</Text>
                        <Text style={styles.performanceGridLabel}>Total Earnings</Text>
                      </View>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}
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
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  applicationCard: {
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
  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  applicationInfo: {
    flex: 1,
  },
  applicantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  applicationEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  applicationPhone: {
    fontSize: 14,
    color: '#6B7280',
  },
  applicationMeta: {
    alignItems: 'flex-end',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  applicationDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  vehicleInfo: {
    marginBottom: 12,
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
  progressSection: {
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34A853',
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
  },
  performanceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  performanceItem: {
    alignItems: 'center',
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  performanceLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  applicationActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    minWidth: 100,
    justifyContent: 'center',
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  viewButton: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#34A853',
  },
  contactButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    color: '#FFFFFF',
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
    height: '90%',
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
  applicationDetailsModal: {
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
    width: 120,
  },
  documentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  documentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  documentStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  viewDocumentButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  viewDocumentText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  issuesSection: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
  },
  issuesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 8,
  },
  issueText: {
    fontSize: 12,
    color: '#DC2626',
    marginBottom: 4,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressStepName: {
    fontSize: 14,
    color: '#374151',
    width: 140,
  },
  progressItemBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  progressItemFill: {
    height: '100%',
    backgroundColor: '#34A853',
  },
  progressStepValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    width: 40,
    textAlign: 'right',
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  performanceGridItem: {
    flex: 1,
    minWidth: 100,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  performanceGridValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  performanceGridLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default ContractorOnboarding;
