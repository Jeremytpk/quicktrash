import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import SharedHeader from '../components/SharedHeader';

const { width } = Dimensions.get('window');

const API_BASE = 'https://us-central1-quicktrash-1cdff.cloudfunctions.net/api';

const TXN_TYPE_CONFIG = {
  charge: { icon: 'arrow-down-circle', color: '#2E7D32', bg: '#E8F5E9', label: 'Charge' },
  payment: { icon: 'arrow-down-circle', color: '#2E7D32', bg: '#E8F5E9', label: 'Payment' },
  transfer: { icon: 'swap-horizontal', color: '#7B1FA2', bg: '#F3E5F5', label: 'Transfer' },
  payout: { icon: 'arrow-up-circle', color: '#E65100', bg: '#FFF3E0', label: 'Payout' },
  refund: { icon: 'return-down-back', color: '#C62828', bg: '#FFEBEE', label: 'Refund' },
  adjustment: { icon: 'construct', color: '#1565C0', bg: '#E3F2FD', label: 'Adjustment' },
};

const getTypeConfig = (type) =>
  TXN_TYPE_CONFIG[type] || { icon: 'ellipse', color: '#6B7280', bg: '#F3F4F6', label: type || 'Other' };

const formatDate = (unix) => {
  const d = new Date(unix * 1000);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTime = (unix) => {
  const d = new Date(unix * 1000);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const formatCurrency = (val) =>
  '$' +
  Math.abs(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'charge', label: 'Charges' },
  { key: 'transfer', label: 'Transfers' },
  { key: 'payout', label: 'Payouts' },
];

const Revenue = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPaidOut, setTotalPaidOut] = useState(0);
  const [contractorPayouts, setContractorPayouts] = useState([]);
  const [paidContractors, setPaidContractors] = useState([]);
  const [payingOut, setPayingOut] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [showPaidOnly, setShowPaidOnly] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);

  // Stripe transaction state
  const [transactions, setTransactions] = useState([]);
  const [txnLoading, setTxnLoading] = useState(false);
  const [txnLoadingMore, setTxnLoadingMore] = useState(false);
  const [txnHasMore, setTxnHasMore] = useState(false);
  const [txnFilter, setTxnFilter] = useState('all');
  const [stripeBalance, setStripeBalance] = useState({ available: 0, pending: 0 });

  // Transaction detail modal state
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [txnDetail, setTxnDetail] = useState(null);
  const [txnDetailLoading, setTxnDetailLoading] = useState(false);

  // Contractor detail modal state
  const [viewContractor, setViewContractor] = useState(null);
  const [contractorDetail, setContractorDetail] = useState(null);
  const [contractorDetailLoading, setContractorDetailLoading] = useState(false);

  useEffect(() => {
    fetchRevenueData();
    fetchStripeTransactions();
  }, []);

  const fetchStripeTransactions = useCallback(async (startingAfter, filterType) => {
    const isLoadMore = !!startingAfter;
    if (isLoadMore) {
      setTxnLoadingMore(true);
    } else {
      setTxnLoading(true);
    }

    try {
      const params = new URLSearchParams({ limit: '25' });
      if (startingAfter) params.append('starting_after', startingAfter);
      const activeFilter = filterType !== undefined ? filterType : txnFilter;
      if (activeFilter !== 'all') params.append('type', activeFilter);

      const res = await fetch(`${API_BASE}/list-transactions?${params.toString()}`);
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        console.warn('list-transactions returned non-JSON response. Deploy Cloud Functions first.');
        return;
      }
      const data = await res.json();

      if (data.success) {
        if (isLoadMore) {
          setTransactions((prev) => [...prev, ...data.transactions]);
        } else {
          setTransactions(data.transactions);
        }
        setTxnHasMore(data.has_more);
        if (data.balance) {
          setStripeBalance(data.balance);
        }
      } else {
        console.error('Failed to fetch transactions:', data.error);
      }
    } catch (err) {
      console.error('Error fetching Stripe transactions:', err);
    }

    if (isLoadMore) {
      setTxnLoadingMore(false);
    } else {
      setTxnLoading(false);
    }
  }, [txnFilter]);

  const handleTxnPress = async (txn) => {
    setSelectedTxn(txn);
    setTxnDetail(null);
    setTxnDetailLoading(true);
    try {
      const res = await fetch(`${API_BASE}/transaction-details?id=${txn.id}`);
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setTxnDetailLoading(false);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setTxnDetail(data.details);
      }
    } catch (err) {
      console.error('Error fetching transaction details:', err);
    }
    setTxnDetailLoading(false);
  };

  const handleContractorPress = async (contractor) => {
    setViewContractor(contractor);
    setContractorDetail(null);
    setContractorDetailLoading(true);
    try {
      const res = await fetch(`${API_BASE}/contractor-transfers?userId=${contractor.contractorId}`);
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setContractorDetailLoading(false);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setContractorDetail(data);
      }
    } catch (err) {
      console.error('Error fetching contractor transfers:', err);
    }
    setContractorDetailLoading(false);
  };

  const closeContractorModal = () => {
    setViewContractor(null);
    setContractorDetail(null);
  };

  const closeTxnModal = () => {
    setSelectedTxn(null);
    setTxnDetail(null);
  };

  const handleFilterChange = (key) => {
    setTxnFilter(key);
    setTransactions([]);
    fetchStripeTransactions(null, key);
  };

  const handleLoadMore = () => {
    if (transactions.length > 0 && txnHasMore) {
      fetchStripeTransactions(transactions[transactions.length - 1].id);
    }
  };

  const fetchRevenueData = async () => {
    setLoading(true);
    try {
      const jobsRef = collection(db, 'jobs');
      const snapshot = await getDocs(jobsRef);

      let revenue = 0;
      let paidOut = 0;
      const contractorMap = {};

      snapshot.forEach((jobDoc) => {
        const job = jobDoc.data();
        const jobTotal = job.pricing?.total || 0;
        const contractorPayout = job.pricing?.contractorPayout || 0;
        const jobStatus = (job.status || '').toLowerCase();
        const contractorPaidOut = job.contractorPaidOut || false;
        revenue += jobTotal;

        if (job.contractorId) {
          if (!contractorMap[job.contractorId]) {
            contractorMap[job.contractorId] = {
              contractorId: job.contractorId,
              name: job.contractorId,
              pendingAmount: 0,
              paidAmount: 0,
              jobCount: 0,
              paidJobCount: 0,
              jobs: [],
              paidJobs: [],
            };
          }

          // Check if contractor has been paid out
          if (contractorPaidOut && contractorPayout > 0) {
            contractorMap[job.contractorId].paidAmount += contractorPayout;
            contractorMap[job.contractorId].paidJobCount += 1;
            contractorMap[job.contractorId].paidJobs.push({
              jobId: jobDoc.id,
              amount: contractorPayout,
              status: 'paid',
              paidAt: job.contractorPaidOutAt,
              withdrawalMethod: job.withdrawalMethod,
            });
            paidOut += contractorPayout;
          } else if (jobStatus === 'completed' && contractorPayout > 0) {
            // Only show in pending if job is completed but not paid out yet
            contractorMap[job.contractorId].pendingAmount += contractorPayout;
            contractorMap[job.contractorId].jobCount += 1;
            contractorMap[job.contractorId].jobs.push({
              jobId: jobDoc.id,
              amount: contractorPayout,
              status: jobStatus,
            });
          }
        }
      });

      const contractorIds = Object.keys(contractorMap);
      await Promise.all(
        contractorIds.map(async (cId) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', cId));
            if (userDoc.exists()) {
              contractorMap[cId].name = userDoc.data().displayName || cId;
            }
          } catch (e) {
            // keep contractorId as fallback name
          }
        })
      );

      setTotalRevenue(revenue);
      setTotalPaidOut(paidOut);

      const payoutList = Object.values(contractorMap)
        .filter((c) => c.pendingAmount > 0)
        .sort((a, b) => b.pendingAmount - a.pendingAmount);

      const paidList = Object.values(contractorMap)
        .filter((c) => c.paidAmount > 0)
        .sort((a, b) => b.paidAmount - a.paidAmount);

      setContractorPayouts(payoutList);
      setPaidContractors(paidList);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      Alert.alert('Error', 'Failed to load revenue data.');
    }
    setLoading(false);
  };

  const handlePayout = (contractor) => {
    setSelectedContractor(contractor);
  };

  const processPayout = async (contractor) => {
    setPayingOut(contractor.contractorId);
    try {
      const res = await fetch(`${API_BASE}/contractor-payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: contractor.contractorId,
          amount: contractor.pendingAmount,
        }),
      });
      const data = await res.json();

      setSelectedContractor(null);
      if (data.success) {
        // Remove contractor from pending list immediately
        setContractorPayouts((prev) => 
          prev.filter((c) => c.contractorId !== contractor.contractorId)
        );
        
        Alert.alert(
          'Payout Sent',
          `$${contractor.pendingAmount.toFixed(2)} has been sent to ${contractor.name}.`
        );
        
        // Refresh data in background
        fetchRevenueData();
        fetchStripeTransactions();
      } else {
        Alert.alert('Payout Failed', data.error || 'Unable to process payout.');
      }
    } catch (err) {
      console.error('Payout error:', err);
      setSelectedContractor(null);
      Alert.alert('Error', 'Failed to process payout. Please try again.');
    }
    setPayingOut(null);
  };

  const handleRefresh = () => {
    fetchRevenueData();
    fetchStripeTransactions();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <SharedHeader
          title="Revenue"
          showBackButton
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9C27B0" />
          <Text style={styles.loadingText}>Loading revenue data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SharedHeader
        title="Revenue"
        showBackButton
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stripe Balance Summary */}
        <View style={styles.section}>
          <View style={styles.summaryCard}>
            <Ionicons name="logo-usd" size={32} color="#9C27B0" />
            <Text style={styles.summaryLabel}>Stripe Balance</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(stripeBalance.available)}
            </Text>
            <Text style={styles.summarySubLabel}>Available</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.miniCard, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="wallet" size={20} color="#2E7D32" />
              <Text style={styles.miniValue}>
                {formatCurrency(stripeBalance.pending)}
              </Text>
              <Text style={styles.miniLabel}>Pending</Text>
            </View>
            <View style={[styles.miniCard, { backgroundColor: '#F3E5F5' }]}>
              <Ionicons name="cash" size={20} color="#7B1FA2" />
              <Text style={styles.miniValue}>
                {formatCurrency(totalRevenue)}
              </Text>
              <Text style={styles.miniLabel}>Job Revenue</Text>
            </View>
            <View style={[styles.miniCard, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="arrow-up-circle" size={20} color="#E65100" />
              <Text style={styles.miniValue}>
                {formatCurrency(totalPaidOut)}
              </Text>
              <Text style={styles.miniLabel}>Paid Out</Text>
            </View>
          </View>
        </View>

        {/* Stripe Transactions */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeaderToggle} 
            onPress={() => setShowTransactions(!showTransactions)}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionTitle}>Stripe Transactions</Text>
            <Ionicons 
              name={showTransactions ? "chevron-up" : "chevron-down"} 
              size={24} 
              color="#9C27B0" 
            />
          </TouchableOpacity>

          {showTransactions && (
            <>
              {/* Type Filter */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterRow}
                contentContainerStyle={styles.filterRowContent}
              >
                {FILTER_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.filterChip,
                      txnFilter === opt.key && styles.filterChipActive,
                    ]}
                    onPress={() => handleFilterChange(opt.key)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        txnFilter === opt.key && styles.filterChipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {txnLoading ? (
                <View style={styles.txnLoadingContainer}>
                  <ActivityIndicator size="small" color="#9C27B0" />
                  <Text style={styles.txnLoadingText}>Loading transactions...</Text>
                </View>
              ) : transactions.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyText}>No transactions found.</Text>
                </View>
              ) : (
                transactions.map((txn) => {
                  const cfg = getTypeConfig(txn.type);
                  const isNegative = txn.amount < 0;
                  return (
                    <TouchableOpacity key={txn.id} style={styles.txnCard} onPress={() => handleTxnPress(txn)} activeOpacity={0.7}>
                      <View style={styles.txnRow}>
                        <View style={[styles.txnIcon, { backgroundColor: cfg.bg }]}>
                          <Ionicons name={cfg.icon} size={22} color={cfg.color} />
                        </View>
                        <View style={styles.txnDetails}>
                          <Text style={styles.txnType}>{cfg.label}</Text>
                          <Text style={styles.txnDesc} numberOfLines={1}>
                            {txn.description || 'No description'}
                          </Text>
                          <Text style={styles.txnDate}>
                            {formatDate(txn.created)} at {formatTime(txn.created)}
                          </Text>
                        </View>
                        <View style={styles.txnAmountCol}>
                          <Text
                            style={[
                              styles.txnAmount,
                              { color: isNegative ? '#C62828' : '#2E7D32' },
                            ]}
                          >
                            {isNegative ? '-' : '+'}{formatCurrency(txn.amount)}
                          </Text>
                          {txn.fee > 0 && (
                            <Text style={styles.txnFee}>
                              Fee: ${txn.fee.toFixed(2)}
                            </Text>
                          )}
                          <Text
                            style={[
                              styles.txnNet,
                              { color: txn.net < 0 ? '#C62828' : '#2E7D32' },
                            ]}
                          >
                            Net: {txn.net < 0 ? '-' : ''}{formatCurrency(txn.net)}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}

              {txnHasMore && (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={handleLoadMore}
                  disabled={txnLoadingMore}
                >
                  {txnLoadingMore ? (
                    <ActivityIndicator size="small" color="#9C27B0" />
                  ) : (
                    <>
                      <Ionicons name="chevron-down" size={18} color="#9C27B0" />
                      <Text style={styles.loadMoreText}>Load More</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Contractor Payouts */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Contractor Payouts</Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, !showPaidOnly && styles.toggleButtonActive]}
                onPress={() => setShowPaidOnly(false)}
              >
                <Text style={[styles.toggleText, !showPaidOnly && styles.toggleTextActive]}>
                  Pending
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, showPaidOnly && styles.toggleButtonActive]}
                onPress={() => setShowPaidOnly(true)}
              >
                <Text style={[styles.toggleText, showPaidOnly && styles.toggleTextActive]}>
                  Paid
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search contractor..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          {showPaidOnly ? (
            paidContractors.filter((c) =>
              c.name.toLowerCase().includes(searchQuery.toLowerCase())
            ).length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyText}>
                  No paid contractors yet.
                </Text>
              </View>
            ) : (
              paidContractors.filter((c) =>
                c.name.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((contractor) => (
                <TouchableOpacity key={contractor.contractorId} style={styles.contractorCard} onPress={() => handleContractorPress(contractor)} activeOpacity={0.7}>
                  <View style={styles.contractorInfo}>
                    <View style={[styles.contractorIcon, { backgroundColor: '#E8F5E9' }]}>
                      <Ionicons name="checkmark-circle" size={24} color="#2E7D32" />
                    </View>
                    <View style={styles.contractorDetails}>
                      <Text style={styles.contractorName}>{contractor.name}</Text>
                      <Text style={styles.contractorJobs}>
                        {contractor.paidJobCount} job{contractor.paidJobCount !== 1 ? 's' : ''} paid
                      </Text>
                    </View>
                    <View style={styles.contractorAmount}>
                      <Text style={[styles.amountText, { color: '#2E7D32' }]}>
                        ${contractor.paidAmount.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.paidBadge}>
                    <Ionicons name="checkmark-done" size={16} color="#2E7D32" />
                    <Text style={styles.paidBadgeText}>Paid Out</Text>
                    <Ionicons name="chevron-forward" size={16} color="#2E7D32" />
                  </View>
                </TouchableOpacity>
              ))
            )
          ) : (
            contractorPayouts.filter((c) =>
              c.name.toLowerCase().includes(searchQuery.toLowerCase())
            ).length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="checkmark-done-circle" size={48} color="#34A853" />
                <Text style={styles.emptyText}>
                  All contractors have been paid out.
                </Text>
              </View>
            ) : (
              contractorPayouts.filter((c) =>
                c.name.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((contractor) => (
                <View key={contractor.contractorId} style={styles.contractorCard}>
                  <TouchableOpacity style={styles.contractorInfo} onPress={() => handleContractorPress(contractor)} activeOpacity={0.7}>
                    <View style={styles.contractorIcon}>
                      <Ionicons name="person" size={24} color="#9C27B0" />
                    </View>
                    <View style={styles.contractorDetails}>
                      <Text style={styles.contractorName}>{contractor.name}</Text>
                      <Text style={styles.contractorJobs}>
                        {contractor.jobCount} job{contractor.jobCount !== 1 ? 's' : ''} completed
                      </Text>
                    </View>
                    <View style={styles.contractorAmount}>
                      <Text style={styles.amountText}>
                        ${contractor.pendingAmount.toFixed(2)}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={{ marginTop: 4 }} />
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.payoutButton}
                    onPress={() => handlePayout(contractor)}
                    disabled={payingOut === contractor.contractorId}
                  >
                    {payingOut === contractor.contractorId ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="send" size={16} color="#FFFFFF" />
                        <Text style={styles.payoutButtonText}>Pay Now</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ))
            )
          )}
        </View>

        {/* Refresh */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <Ionicons name="refresh" size={18} color="#6B7280" />
            <Text style={styles.refreshText}>Refresh Data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Payout Confirmation Modal */}
      <Modal
        visible={selectedContractor !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedContractor(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedContractor && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Confirm Payout</Text>
                  <TouchableOpacity onPress={() => setSelectedContractor(null)}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalContractorRow}>
                  <View style={styles.modalContractorIcon}>
                    <Ionicons name="person" size={28} color="#9C27B0" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalContractorName}>
                      {selectedContractor.name}
                    </Text>
                    <Text style={styles.modalContractorId}>
                      ID: {selectedContractor.contractorId}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalDetailsCard}>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Jobs Completed</Text>
                    <Text style={styles.modalDetailValue}>
                      {selectedContractor.jobCount}
                    </Text>
                  </View>
                  <View style={styles.modalDivider} />
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Pending Jobs</Text>
                    <Text style={styles.modalDetailValue}>
                      {selectedContractor.jobs.length}
                    </Text>
                  </View>
                  <View style={styles.modalDivider} />
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Already Paid</Text>
                    <Text style={styles.modalDetailValue}>
                      ${selectedContractor.paidAmount.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.modalDivider} />
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Payout Amount</Text>
                    <Text style={[styles.modalDetailValue, { color: '#9C27B0', fontSize: 20 }]}>
                      ${selectedContractor.pendingAmount.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {selectedContractor.jobs.length > 0 && (
                  <View style={styles.modalJobBreakdown}>
                    <Text style={styles.modalJobBreakdownTitle}>Job Breakdown</Text>
                    {selectedContractor.jobs.map((job, idx) => (
                      <View key={job.jobId} style={styles.modalJobRow}>
                        <Text style={styles.modalJobId} numberOfLines={1}>
                          {idx + 1}. {job.jobId}
                        </Text>
                        <Text style={styles.modalJobAmount}>
                          ${job.amount.toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.modalWarning}>
                  <Ionicons name="information-circle" size={18} color="#D97706" />
                  <Text style={styles.modalWarningText}>
                    This will send an instant payout to the contractor's connected account. This action cannot be undone.
                  </Text>
                </View>

                <View style={styles.modalButtonRow}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setSelectedContractor(null)}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalConfirmButton}
                    onPress={() => processPayout(selectedContractor)}
                    disabled={payingOut === selectedContractor.contractorId}
                  >
                    {payingOut === selectedContractor.contractorId ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="send" size={16} color="#FFFFFF" />
                        <Text style={styles.modalConfirmText}>
                          Pay ${selectedContractor.pendingAmount.toFixed(2)}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Transaction Detail Modal */}
      <Modal
        visible={selectedTxn !== null}
        animationType="slide"
        transparent
        onRequestClose={closeTxnModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transaction Details</Text>
              <TouchableOpacity onPress={closeTxnModal}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {txnDetailLoading ? (
              <View style={styles.txnModalLoading}>
                <ActivityIndicator size="large" color="#9C27B0" />
                <Text style={styles.txnLoadingText}>Loading details...</Text>
              </View>
            ) : txnDetail ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Type & Amount Header */}
                {(() => {
                  const cfg = getTypeConfig(txnDetail.type);
                  const isNeg = txnDetail.amount < 0;
                  return (
                    <View style={styles.txnModalHeader}>
                      <View style={[styles.txnModalIconLarge, { backgroundColor: cfg.bg }]}>
                        <Ionicons name={cfg.icon} size={32} color={cfg.color} />
                      </View>
                      <Text style={styles.txnModalTypeLabel}>{cfg.label}</Text>
                      <Text style={[styles.txnModalAmount, { color: isNeg ? '#C62828' : '#2E7D32' }]}>
                        {isNeg ? '-' : '+'}{formatCurrency(txnDetail.amount)}
                      </Text>
                      <Text style={styles.txnModalDate}>
                        {formatDate(txnDetail.created)} at {formatTime(txnDetail.created)}
                      </Text>
                    </View>
                  );
                })()}

                {/* Financial Breakdown */}
                <View style={styles.modalDetailsCard}>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Gross Amount</Text>
                    <Text style={styles.modalDetailValue}>{formatCurrency(txnDetail.amount)}</Text>
                  </View>
                  <View style={styles.modalDivider} />
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Stripe Fee</Text>
                    <Text style={[styles.modalDetailValue, { color: '#C62828' }]}>
                      -${txnDetail.fee.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.modalDivider} />
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Net Amount</Text>
                    <Text style={[styles.modalDetailValue, { color: '#9C27B0', fontWeight: '800' }]}>
                      {formatCurrency(txnDetail.net)}
                    </Text>
                  </View>
                  <View style={styles.modalDivider} />
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Status</Text>
                    <View style={styles.txnStatusBadge}>
                      <Text style={styles.txnStatusText}>{txnDetail.status}</Text>
                    </View>
                  </View>
                </View>

                {/* Receiver Info */}
                {txnDetail.receiver && (
                  <View style={styles.txnModalSection}>
                    <Text style={styles.txnModalSectionTitle}>
                      {txnDetail.type === 'charge' ? 'Customer' : 'Receiver'}
                    </Text>
                    <View style={styles.txnModalReceiverCard}>
                      <View style={styles.txnModalReceiverIcon}>
                        <Ionicons name="person" size={24} color="#9C27B0" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.txnModalReceiverName}>
                          {txnDetail.receiver.name}
                        </Text>
                        {txnDetail.receiver.email && (
                          <Text style={styles.txnModalReceiverEmail}>
                            {txnDetail.receiver.email}
                          </Text>
                        )}
                        <Text style={styles.txnModalReceiverId}>
                          ID: {txnDetail.receiver.userId}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Job Details */}
                {txnDetail.jobInfo && txnDetail.jobInfo.length > 0 && (
                  <View style={styles.txnModalSection}>
                    <Text style={styles.txnModalSectionTitle}>
                      Job Details ({txnDetail.jobInfo.length})
                    </Text>
                    {txnDetail.jobInfo.map((job) => (
                      <View key={job.jobId} style={styles.txnModalJobCard}>
                        <View style={styles.txnModalJobHeader}>
                          <Ionicons name="briefcase" size={16} color="#9C27B0" />
                          <Text style={styles.txnModalJobId} numberOfLines={1}>
                            {job.jobId}
                          </Text>
                          <View style={[
                            styles.txnModalJobStatus,
                            { backgroundColor: job.status === 'paid' ? '#E8F5E9' : '#FFF3E0' },
                          ]}>
                            <Text style={[
                              styles.txnModalJobStatusText,
                              { color: job.status === 'paid' ? '#2E7D32' : '#E65100' },
                            ]}>
                              {job.status}
                            </Text>
                          </View>
                        </View>
                        {job.customerName && (
                          <View style={styles.txnModalJobRow}>
                            <Ionicons name="person-outline" size={14} color="#9CA3AF" />
                            <Text style={styles.txnModalJobText}>Customer: {job.customerName}</Text>
                          </View>
                        )}
                        {job.wasteType && (
                          <View style={styles.txnModalJobRow}>
                            <Ionicons name="trash-outline" size={14} color="#9CA3AF" />
                            <Text style={styles.txnModalJobText}>Type: {job.wasteType}</Text>
                          </View>
                        )}
                        {job.address && (
                          <View style={styles.txnModalJobRow}>
                            <Ionicons name="location-outline" size={14} color="#9CA3AF" />
                            <Text style={styles.txnModalJobText} numberOfLines={2}>
                              {typeof job.address === 'string'
                                ? job.address
                                : job.address.fullAddress || [job.address.street, job.address.city, job.address.state, job.address.zipCode].filter(Boolean).join(', ')}
                            </Text>
                          </View>
                        )}
                        <View style={styles.txnModalJobAmounts}>
                          <View style={styles.txnModalJobAmountItem}>
                            <Text style={styles.txnModalJobAmountLabel}>Job Total</Text>
                            <Text style={styles.txnModalJobAmountValue}>${job.total.toFixed(2)}</Text>
                          </View>
                          <View style={styles.txnModalJobAmountItem}>
                            <Text style={styles.txnModalJobAmountLabel}>Contractor Pay</Text>
                            <Text style={styles.txnModalJobAmountValue}>${job.contractorPayout.toFixed(2)}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Payout Info */}
                {txnDetail.type === 'payout' && txnDetail.payoutMethod && (
                  <View style={styles.txnModalSection}>
                    <Text style={styles.txnModalSectionTitle}>Payout Info</Text>
                    <View style={styles.modalDetailsCard}>
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Method</Text>
                        <Text style={styles.modalDetailValue}>{txnDetail.payoutMethod}</Text>
                      </View>
                      {txnDetail.payoutStatus && (
                        <>
                          <View style={styles.modalDivider} />
                          <View style={styles.modalDetailRow}>
                            <Text style={styles.modalDetailLabel}>Payout Status</Text>
                            <Text style={styles.modalDetailValue}>{txnDetail.payoutStatus}</Text>
                          </View>
                        </>
                      )}
                      {txnDetail.arrivalDate && (
                        <>
                          <View style={styles.modalDivider} />
                          <View style={styles.modalDetailRow}>
                            <Text style={styles.modalDetailLabel}>Arrival Date</Text>
                            <Text style={styles.modalDetailValue}>
                              {formatDate(txnDetail.arrivalDate)}
                            </Text>
                          </View>
                        </>
                      )}
                    </View>
                  </View>
                )}

                {/* Description */}
                {txnDetail.description && (
                  <View style={styles.txnModalSection}>
                    <Text style={styles.txnModalSectionTitle}>Description</Text>
                    <Text style={styles.txnModalDescText}>{txnDetail.description}</Text>
                  </View>
                )}

                {/* Transaction ID */}
                <View style={[styles.txnModalSection, { marginBottom: 20 }]}>
                  <Text style={styles.txnModalSectionTitle}>Transaction ID</Text>
                  <Text style={styles.txnModalIdText}>{txnDetail.id}</Text>
                </View>
              </ScrollView>
            ) : selectedTxn ? (
              <View style={styles.txnModalLoading}>
                <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyText}>Could not load details.</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Contractor Detail Modal */}
      <Modal
        visible={viewContractor !== null}
        animationType="slide"
        transparent
        onRequestClose={closeContractorModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Contractor Details</Text>
              <TouchableOpacity onPress={closeContractorModal}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {contractorDetailLoading ? (
              <View style={styles.txnModalLoading}>
                <ActivityIndicator size="large" color="#9C27B0" />
                <Text style={styles.txnLoadingText}>Loading contractor details...</Text>
              </View>
            ) : contractorDetail ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Contractor Profile */}
                <View style={styles.txnModalHeader}>
                  <View style={[styles.txnModalIconLarge, { backgroundColor: '#F3E5F5' }]}>
                    <Ionicons name="person" size={32} color="#9C27B0" />
                  </View>
                  <Text style={styles.txnModalReceiverName}>
                    {contractorDetail.contractor.name}
                  </Text>
                  {contractorDetail.contractor.email && (
                    <Text style={styles.txnModalReceiverEmail}>
                      {contractorDetail.contractor.email}
                    </Text>
                  )}
                  {contractorDetail.contractor.phone && (
                    <Text style={styles.txnModalReceiverId}>
                      {contractorDetail.contractor.phone}
                    </Text>
                  )}
                </View>

                {/* Transfer Summary */}
                <View style={styles.modalDetailsCard}>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Total Transferred</Text>
                    <Text style={[styles.modalDetailValue, { color: '#9C27B0', fontWeight: '800' }]}>
                      {formatCurrency(contractorDetail.totalTransferred)}
                    </Text>
                  </View>
                  <View style={styles.modalDivider} />
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Transfers</Text>
                    <Text style={styles.modalDetailValue}>{contractorDetail.transfers.length}</Text>
                  </View>
                  <View style={styles.modalDivider} />
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Jobs</Text>
                    <Text style={styles.modalDetailValue}>{contractorDetail.jobs.length}</Text>
                  </View>
                  {contractorDetail.contractor.stripeAccountId && (
                    <>
                      <View style={styles.modalDivider} />
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Stripe Account</Text>
                        <Text style={[styles.modalDetailValue, { fontSize: 12 }]}>
                          {contractorDetail.contractor.stripeAccountId}
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                {/* Transfer History */}
                {contractorDetail.transfers.length > 0 && (
                  <View style={styles.txnModalSection}>
                    <Text style={styles.txnModalSectionTitle}>
                      Transfer History ({contractorDetail.transfers.length})
                    </Text>
                    {contractorDetail.transfers.map((t) => (
                      <View key={t.id} style={styles.ctrTransferCard}>
                        <View style={styles.ctrTransferRow}>
                          <View style={[styles.txnIcon, { backgroundColor: '#F3E5F5' }]}>
                            <Ionicons name="swap-horizontal" size={20} color="#7B1FA2" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.ctrTransferAmount}>
                              {formatCurrency(t.amount)}
                            </Text>
                            <Text style={styles.txnDate}>
                              {formatDate(t.created)} at {formatTime(t.created)}
                            </Text>
                            {t.description && (
                              <Text style={styles.txnDesc} numberOfLines={1}>{t.description}</Text>
                            )}
                          </View>
                          {t.reversed && (
                            <View style={[styles.txnModalJobStatus, { backgroundColor: '#FFEBEE' }]}>
                              <Text style={[styles.txnModalJobStatusText, { color: '#C62828' }]}>Reversed</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Jobs */}
                {contractorDetail.jobs.length > 0 && (
                  <View style={[styles.txnModalSection, { marginBottom: 20 }]}>
                    <Text style={styles.txnModalSectionTitle}>
                      Jobs ({contractorDetail.jobs.length})
                    </Text>
                    {contractorDetail.jobs.map((job) => (
                      <View key={job.jobId} style={styles.txnModalJobCard}>
                        <View style={styles.txnModalJobHeader}>
                          <Ionicons name="briefcase" size={16} color="#9C27B0" />
                          <Text style={styles.txnModalJobId} numberOfLines={1}>
                            {job.jobId}
                          </Text>
                          <View style={[
                            styles.txnModalJobStatus,
                            { backgroundColor: job.status === 'paid' ? '#E8F5E9' : '#FFF3E0' },
                          ]}>
                            <Text style={[
                              styles.txnModalJobStatusText,
                              { color: job.status === 'paid' ? '#2E7D32' : '#E65100' },
                            ]}>
                              {job.status}
                            </Text>
                          </View>
                        </View>
                        {job.customerName && (
                          <View style={styles.txnModalJobRow}>
                            <Ionicons name="person-outline" size={14} color="#9CA3AF" />
                            <Text style={styles.txnModalJobText}>Customer: {job.customerName}</Text>
                          </View>
                        )}
                        {job.wasteType && (
                          <View style={styles.txnModalJobRow}>
                            <Ionicons name="trash-outline" size={14} color="#9CA3AF" />
                            <Text style={styles.txnModalJobText}>Type: {job.wasteType}</Text>
                          </View>
                        )}
                        {job.address && (
                          <View style={styles.txnModalJobRow}>
                            <Ionicons name="location-outline" size={14} color="#9CA3AF" />
                            <Text style={styles.txnModalJobText} numberOfLines={2}>
                              {typeof job.address === 'string' ? job.address : job.address}
                            </Text>
                          </View>
                        )}
                        <View style={styles.txnModalJobAmounts}>
                          <View style={styles.txnModalJobAmountItem}>
                            <Text style={styles.txnModalJobAmountLabel}>Job Total</Text>
                            <Text style={styles.txnModalJobAmountValue}>${job.total.toFixed(2)}</Text>
                          </View>
                          <View style={styles.txnModalJobAmountItem}>
                            <Text style={styles.txnModalJobAmountLabel}>Contractor Pay</Text>
                            <Text style={styles.txnModalJobAmountValue}>${job.contractorPayout.toFixed(2)}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            ) : viewContractor ? (
              <View style={styles.txnModalLoading}>
                <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyText}>Could not load contractor details.</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingTop: Platform.OS === 'android' ? 25 : 20,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginTop: 14,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  summarySubLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  summaryValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  miniCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  miniValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 6,
  },
  miniLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 4,
  },
  // Filter chips
  filterRow: {
    marginBottom: 12,
  },
  filterRowContent: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterChipActive: {
    backgroundColor: '#9C27B0',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  // Transaction cards
  txnLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  txnLoadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  txnCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txnIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txnDetails: {
    flex: 1,
    marginRight: 8,
  },
  txnType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  txnDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  txnDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  txnAmountCol: {
    alignItems: 'flex-end',
  },
  txnAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  txnFee: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  txnNet: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
    gap: 6,
  },
  loadMoreText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9C27B0',
  },
  // Transaction detail modal styles
  txnModalLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  txnModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  txnModalIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  txnModalTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  txnModalAmount: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: 4,
  },
  txnModalDate: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  txnStatusBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  txnStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
    textTransform: 'capitalize',
  },
  txnModalSection: {
    marginBottom: 16,
  },
  txnModalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  txnModalReceiverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
  },
  txnModalReceiverIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3E5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txnModalReceiverName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  txnModalReceiverEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  txnModalReceiverId: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  txnModalJobCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  txnModalJobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  txnModalJobId: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  txnModalJobStatus: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  txnModalJobStatusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  txnModalJobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  txnModalJobText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  txnModalJobAmounts: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  txnModalJobAmountItem: {
    flex: 1,
    alignItems: 'center',
  },
  txnModalJobAmountLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  txnModalJobAmountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 2,
  },
  txnModalDescText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  txnModalIdText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  // Contractor transfer card styles
  ctrTransferCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  ctrTransferRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ctrTransferAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7B1FA2',
  },
  // Existing styles
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  toggleTextActive: {
    color: '#1F2937',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  paidBadgeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2E7D32',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    marginLeft: 8,
    paddingVertical: 0,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
  },
  contractorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  contractorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contractorIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3E5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contractorDetails: {
    flex: 1,
  },
  contractorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  contractorJobs: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  contractorAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  payoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9C27B0',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 8,
  },
  payoutButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  refreshText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'android' ? 24 : 36,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalContractorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalContractorIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F3E5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  modalContractorName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalContractorId: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  modalDetailsCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalDetailLabel: {
    fontSize: 15,
    color: '#6B7280',
  },
  modalDetailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  modalJobBreakdown: {
    marginBottom: 16,
  },
  modalJobBreakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  modalJobRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  modalJobId: {
    fontSize: 13,
    color: '#9CA3AF',
    flex: 1,
    marginRight: 12,
  },
  modalJobAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  modalWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#9C27B0',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default Revenue;
