import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SharedHeader from '../components/SharedHeader';
import { db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

const TransactionDetails = ({ navigation, route }) => {
  const { transaction } = route.params;
  const [loading, setLoading] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState(transaction);
  const [jobDetails, setJobDetails] = useState(null);
  const [contractorInfo, setContractorInfo] = useState(null);
  const [customerInfo, setCustomerInfo] = useState(null);

  useEffect(() => {
    fetchTransactionDetails();
  }, []);

  const fetchTransactionDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch job details if available
      if (transaction.jobId) {
        const jobDoc = await getDoc(doc(db, 'jobs', transaction.jobId));
        if (jobDoc.exists()) {
          setJobDetails(jobDoc.data());
        }
      }

      // Fetch contractor info
      if (transaction.contractorId) {
        const contractorDoc = await getDoc(doc(db, 'users', transaction.contractorId));
        if (contractorDoc.exists()) {
          setContractorInfo(contractorDoc.data());
        }
      }

      // Fetch customer info
      if (transaction.customerId) {
        const customerDoc = await getDoc(doc(db, 'users', transaction.customerId));
        if (customerDoc.exists()) {
          setCustomerInfo(customerDoc.data());
        }
      }

    } catch (error) {
      console.error('Error fetching transaction details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'revenue': return 'trending-up';
      case 'payout': return 'trending-down';
      case 'fee': return 'card';
      default: return 'list';
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'revenue': return '#10B981';
      case 'payout': return '#EF4444';
      case 'fee': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const renderTransactionHeader = () => (
    <View style={styles.headerCard}>
      <View style={styles.headerIcon}>
        <Ionicons 
          name={getTransactionIcon(transaction.type)} 
          size={32} 
          color={getTransactionColor(transaction.type)} 
        />
      </View>
      <View style={styles.headerInfo}>
        <Text style={styles.headerTitle}>{transaction.description}</Text>
        <Text style={styles.headerAmount}>
          {transaction.amount >= 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
        </Text>
        <View style={[styles.typeBadge, { backgroundColor: getTransactionColor(transaction.type) }]}>
          <Text style={styles.typeText}>{transaction.type.toUpperCase()}</Text>
        </View>
      </View>
    </View>
  );

  const renderTransactionDetails = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Transaction Details</Text>
      
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Transaction ID:</Text>
        <Text style={styles.detailValue}>{transaction.id}</Text>
      </View>
      
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Type:</Text>
        <Text style={styles.detailValue}>{transaction.type}</Text>
      </View>
      
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Amount:</Text>
        <Text style={[styles.detailValue, { 
          color: transaction.amount >= 0 ? '#10B981' : '#EF4444',
          fontWeight: '600'
        }]}>
          {transaction.amount >= 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
        </Text>
      </View>
      
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Date:</Text>
        <Text style={styles.detailValue}>{formatDate(transaction.createdAt)}</Text>
      </View>
      
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Status:</Text>
        <View style={[styles.statusBadge, { backgroundColor: '#10B981' }]}>
          <Text style={styles.statusText}>Completed</Text>
        </View>
      </View>
    </View>
  );

  const renderJobDetails = () => {
    if (!jobDetails) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Job Details</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Job ID:</Text>
          <Text style={styles.detailValue}>{transaction.jobId}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Waste Type:</Text>
          <Text style={styles.detailValue}>{jobDetails.wasteType || 'N/A'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Job Status:</Text>
          <View style={[styles.statusBadge, { backgroundColor: '#3B82F6' }]}>
            <Text style={styles.statusText}>{jobDetails.status}</Text>
          </View>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total Job Amount:</Text>
          <Text style={[styles.detailValue, { color: '#10B981', fontWeight: '600' }]}>
            ${jobDetails.pricing?.total?.toFixed(2) || '0.00'}
          </Text>
        </View>
        
        {jobDetails.pricing?.serviceFee && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Service Fee:</Text>
            <Text style={[styles.detailValue, { color: '#F59E0B', fontWeight: '600' }]}>
              ${jobDetails.pricing.serviceFee.toFixed(2)}
            </Text>
          </View>
        )}
        
        {jobDetails.pricing?.contractorPayout && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Contractor Payout:</Text>
            <Text style={[styles.detailValue, { color: '#EF4444', fontWeight: '600' }]}>
              ${jobDetails.pricing.contractorPayout.toFixed(2)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderLocationDetails = () => {
    if (!jobDetails?.pickupAddress) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Address:</Text>
          <Text style={styles.detailValue}>
            {jobDetails.pickupAddress.street || 'N/A'}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>City:</Text>
          <Text style={styles.detailValue}>
            {jobDetails.pickupAddress.city || 'N/A'}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>State:</Text>
          <Text style={styles.detailValue}>
            {jobDetails.pickupAddress.state || 'N/A'}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>ZIP Code:</Text>
          <Text style={styles.detailValue}>
            {jobDetails.pickupAddress.zipCode || 'N/A'}
          </Text>
        </View>
      </View>
    );
  };

  const renderContractorDetails = () => {
    if (!contractorInfo) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contractor Information</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Name:</Text>
          <Text style={styles.detailValue}>
            {contractorInfo.displayName || 'Unknown'}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email:</Text>
          <Text style={styles.detailValue}>
            {contractorInfo.email || 'N/A'}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Phone:</Text>
          <Text style={styles.detailValue}>
            {contractorInfo.phoneNumber || 'N/A'}
          </Text>
        </View>
        
        {contractorInfo.contractorData?.vehicleInfo && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Vehicle:</Text>
            <Text style={styles.detailValue}>
              {contractorInfo.contractorData.vehicleInfo.make} {contractorInfo.contractorData.vehicleInfo.model}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderCustomerDetails = () => {
    if (!customerInfo) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Information</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Name:</Text>
          <Text style={styles.detailValue}>
            {customerInfo.displayName || 'Unknown'}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email:</Text>
          <Text style={styles.detailValue}>
            {customerInfo.email || 'N/A'}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Phone:</Text>
          <Text style={styles.detailValue}>
            {customerInfo.phoneNumber || 'N/A'}
          </Text>
        </View>
      </View>
    );
  };

  const renderFinancialBreakdown = () => {
    if (!jobDetails?.pricing) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Financial Breakdown</Text>
        
        <View style={styles.financialItem}>
          <Text style={styles.financialLabel}>Total Job Amount</Text>
          <Text style={[styles.financialValue, { color: '#1F2937' }]}>
            ${jobDetails.pricing.total?.toFixed(2) || '0.00'}
          </Text>
        </View>
        
        <View style={styles.financialItem}>
          <Text style={styles.financialLabel}>Platform Fee (15%)</Text>
          <Text style={[styles.financialValue, { color: '#F59E0B' }]}>
            -${jobDetails.pricing.serviceFee?.toFixed(2) || '0.00'}
          </Text>
        </View>
        
        <View style={styles.financialItem}>
          <Text style={styles.financialLabel}>Contractor Payout (80%)</Text>
          <Text style={[styles.financialValue, { color: '#EF4444' }]}>
            -${jobDetails.pricing.contractorPayout?.toFixed(2) || '0.00'}
          </Text>
        </View>
        
        <View style={[styles.financialItem, styles.financialTotal]}>
          <Text style={[styles.financialLabel, { fontWeight: '600' }]}>Net Profit</Text>
          <Text style={[styles.financialValue, { 
            color: '#10B981', 
            fontWeight: '600',
            fontSize: 16
          }]}>
            ${(jobDetails.pricing.total - jobDetails.pricing.serviceFee - jobDetails.pricing.contractorPayout).toFixed(2)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <SharedHeader 
        title="Transaction Details" 
        showBackButton 
        subtitle={transaction.type.toUpperCase()}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Transaction Header */}
        {renderTransactionHeader()}

        {/* Transaction Details */}
        {renderTransactionDetails()}
        
        {/* Job Details */}
        {renderJobDetails()}
        
        {/* Financial Breakdown */}
        {renderFinancialBreakdown()}
        
        {/* Location Details */}
        {renderLocationDetails()}
        
        {/* Contractor Details */}
        {renderContractorDetails()}
        
        {/* Customer Details */}
        {renderCustomerDetails()}
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
  headerCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
    textAlign: 'right',
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
    textTransform: 'uppercase',
  },
  financialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  financialTotal: {
    borderBottomWidth: 0,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
    paddingTop: 12,
  },
  financialLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  financialValue: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default TransactionDetails;
