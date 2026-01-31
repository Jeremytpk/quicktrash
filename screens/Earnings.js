import React, { useState } from 'react';
import { useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SharedHeader from '../components/SharedHeader';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const Earnings = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('week'); // week, month, year
  const { user } = useUser();
  const navigation = useNavigation(); // Hook for navigation
  const [earningsData, setEarningsData] = useState({
    week: { total: 0, jobs: 0, average: 0, trend: '', breakdown: [] },
    month: { total: 0, jobs: 0, average: 0, trend: '', breakdown: [] },
    year: { total: 0, jobs: 0, average: 0, trend: '', breakdown: [] },
  });
  const [recentPayouts, setRecentPayouts] = useState([]);
  const [paymentInfo, setPaymentInfo] = useState({ method: '', account: '', schedule: '' });
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(0);

  // Withdraw handler (Moved here, outside the return block)
  const handleWithdraw = () => {
  // Calculate total available from completed jobs (same as Recent Payouts)
  const totalAvailable = recentPayouts.reduce((sum, payout) => sum + (typeof payout.amount === 'number' ? payout.amount : 0), 0);
  setWithdrawAmount(totalAvailable);
  setWithdrawModalVisible(true);
  };

  useEffect(() => {
    if (!user) return;
    
    // --- 1. Fetch Recent Payouts and calculate earnings from jobs's contractorPayout field ---
    const jobsRef = collection(db, 'jobs');
    const q = query(jobsRef, where('contractorId', '==', user.uid), where('status', '==', 'completed'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobs = [];
      const payouts = [];
      let totalEarned = 0;
      snapshot.forEach(doc => {
  const job = doc.data();
  const completedAt = job.completedAt?.toDate ? job.completedAt.toDate() : new Date(job.completedAt);
  const payout = job.pricing?.contractorPayout || 0;
        jobs.push(job);
        totalEarned += payout;
        payouts.push({
          id: doc.id,
          date: completedAt,
          amount: payout,
          jobs: 1,
          status: 'completed',
          period: completedAt.toLocaleDateString(),
        });
      });

      payouts.sort((a, b) => b.date - a.date);
      setRecentPayouts(payouts.slice(0, 10));

      // --- 2. Calculate week, month, year earnings ---
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0,0,0,0);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      let weekTotal = 0, weekJobs = 0, weekBreakdown = Array(7).fill({ amount: 0, jobs: 0 });
      let monthTotal = 0, monthJobs = 0, monthBreakdown = [];
      let yearTotal = 0, yearJobs = 0, yearBreakdown = Array(12).fill({ amount: 0, jobs: 0 });

      jobs.forEach(job => {
  const completedAt = job.completedAt?.toDate ? job.completedAt.toDate() : new Date(job.completedAt);
  const payout = job.pricing?.contractorPayout || 0;

        // Week
        if (completedAt >= startOfWeek) {
          weekTotal += payout;
          weekJobs++;
          const dayIdx = completedAt.getDay();
          weekBreakdown[dayIdx] = {
            amount: (weekBreakdown[dayIdx]?.amount || 0) + payout,
            jobs: (weekBreakdown[dayIdx]?.jobs || 0) + 1
          };
        }
        // Month
        if (completedAt >= startOfMonth) {
          monthTotal += payout;
          monthJobs++;
          const weekIdx = Math.floor((completedAt.getDate() - 1) / 7);
          if (!monthBreakdown[weekIdx]) monthBreakdown[weekIdx] = { amount: 0, jobs: 0, week: `Week ${weekIdx+1}` };
          monthBreakdown[weekIdx].amount += payout;
          monthBreakdown[weekIdx].jobs += 1;
        }
        // Year
        if (completedAt >= startOfYear) {
          yearTotal += payout;
          yearJobs++;
          const monthIdx = completedAt.getMonth();
          yearBreakdown[monthIdx] = {
            amount: (yearBreakdown[monthIdx]?.amount || 0) + payout,
            jobs: (yearBreakdown[monthIdx]?.jobs || 0) + 1,
            month: completedAt.toLocaleString('default', { month: 'short' })
          };
        }
      });

      weekBreakdown = weekBreakdown.map((item, idx) => ({ ...item, day: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][idx] }));
      yearBreakdown = yearBreakdown.map((item, idx) => ({ ...item, month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][idx] }));

      setEarningsData({
        week: {
          total: weekTotal,
          jobs: weekJobs,
          average: weekJobs ? weekTotal / weekJobs : 0,
          trend: '',
          breakdown: weekBreakdown
        },
        month: {
          total: monthTotal,
          jobs: monthJobs,
          average: monthJobs ? monthTotal / monthJobs : 0,
          trend: '',
          breakdown: monthBreakdown
        },
        year: {
          total: yearTotal,
          jobs: yearJobs,
          average: yearJobs ? yearTotal / yearJobs : 0,
          trend: '',
          breakdown: yearBreakdown
        }
      });
    });

    // --- 3. Fetch Payment Information from users collection ---
    const fetchPaymentInfo = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          let method = 'Bank Account';
          let account = '';
          // Prefer payoutMethods if available
          if (Array.isArray(data.payoutMethods) && data.payoutMethods.length > 0) {
            const defaultPayout = data.payoutMethods.find(pm => pm.isDefault) || data.payoutMethods[0];
            if (defaultPayout.type === 'card') {
              method = `${defaultPayout.brand?.toUpperCase() || 'CARD'} ••••${defaultPayout.last4 || ''}`;
              account = defaultPayout.last4 ? `••••${defaultPayout.last4}` : '';
            } else if (defaultPayout.type === 'bank') {
              method = 'Bank Account';
              account = defaultPayout.accountNumber ? `••••${defaultPayout.accountNumber}` : '';
            }
          } else if (Array.isArray(data.paymentMethods) && data.paymentMethods.length > 0) {
            const defaultCard = data.paymentMethods.find(pm => pm.isDefault) || data.paymentMethods[0];
            if (defaultCard.type === 'card') {
              // Always show last4 of default card in Bank Account field
              method = 'Bank Account';
              account = defaultCard.last4 ? `••••${defaultCard.last4}` : '';
            }
          } else if (data.contractorData?.bankAccount) {
            method = 'Bank Account';
            account = data.contractorData.bankAccount.accountNumber ? `••••${data.contractorData.bankAccount.accountNumber}` : '';
          }
          setPaymentInfo({
            method,
            account,
            schedule: data.paymentSchedule || 'Payments are processed weekly on Mondays for the previous week\'s earnings.'
          });
        }
      } catch (error) {
        console.error("Error fetching payment info:", error);
      }
    };
    
    fetchPaymentInfo();

    // --- Cleanup Function ---
    // Returns a function to unsubscribe from the Firestore listener when the component unmounts
    return () => unsubscribe();
  }, [user]); // Run effect only when the user object changes or is first available
  

  const currentData = earningsData[selectedPeriod];


  const getBarHeight = (amount, maxAmount) => {
    return Math.max((amount / maxAmount) * 120, 4);
  };

  const maxAmount = Math.max(1, ...currentData.breakdown.map(item => item.amount));

  const renderPeriodButton = (period, label) => (
    <TouchableOpacity
      style={[
        styles.periodButton,
        selectedPeriod === period && styles.activePeriodButton
      ]}
      onPress={() => setSelectedPeriod(period)}
    >
      <Text style={[
        styles.periodButtonText,
        selectedPeriod === period && styles.activePeriodButtonText
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderBarChart = () => (
    <View style={styles.chartContainer}>
      <ScrollView horizontal contentContainerStyle={styles.chart} showsHorizontalScrollIndicator={false}>
        {currentData.breakdown.map((item, index) => {
          const barHeight = getBarHeight(item.amount, maxAmount);
          // Use a robust way to get the label: day, week, or month
          const label = item.day || item.month || item.week; 
          
          return (
            <View key={index} style={styles.barContainer}>
              <View style={styles.barWrapper}>
                <View 
                  style={[
                    styles.bar, 
                    { height: barHeight },
                    item.amount === 0 && styles.emptyBar
                  ]} 
                />
              </View>
              <Text style={styles.barLabel}>{label}</Text>
              <Text style={styles.barAmount}>
                {item.amount > 0 ? `$${item.amount.toFixed(0)}` : ''}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <SharedHeader title="Earnings" showBackButton onBackPress={() => navigation.goBack()} />
      {/* Withdraw Modal */}
      {withdrawModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Withdraw Earnings</Text>
            <Text style={styles.modalLabel}>Total Available:</Text>
            <Text style={{fontWeight: 'bold', fontSize: 28, color: '#222', marginBottom: 16}}>
              ${recentPayouts.reduce((sum, payout) => sum + (typeof payout.amount === 'number' ? payout.amount : 0), 0).toFixed(2)}
            </Text>
            <Text style={styles.modalLabel}>
              Instant payout will be sent to your saved debit card.{'\n'}
              {!paymentInfo.account && 'Add a debit card in Payment Methods first.'}
            </Text>
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setWithdrawModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={async () => {
                  setWithdrawModalVisible(false);
                  try {
                    const totalAmount = recentPayouts.reduce((sum, payout) => sum + (typeof payout.amount === 'number' ? payout.amount : 0), 0);
                    
                    if (totalAmount <= 0) {
                      Alert.alert('Error', 'No funds available to withdraw');
                      return;
                    }

                    // Call backend API to trigger Stripe instant payout to debit card
                    console.log('Initiating withdrawal for amount:', totalAmount);
                    const res = await fetch('https://us-central1-quicktrash-1cdff.cloudfunctions.net/api/contractor-payout', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: user.uid, amount: totalAmount })
                    });
                    
                    console.log('Response status:', res.status);
                    const data = await res.json();
                    console.log('Response data:', data);
                    
                    if (data.success) {
                      // Deduct the full available amount from contractorPayouts in jobs
                      let remaining = totalAmount;
                      for (const payout of recentPayouts) {
                        if (remaining <= 0) break;
                        const jobId = payout.id;
                        const currentPayout = payout.amount;
                        const deduct = Math.min(currentPayout, remaining);
                        await import('firebase/firestore').then(({ updateDoc, doc }) => {
                          updateDoc(doc(db, 'jobs', jobId), {
                            'pricing.contractorPayout': currentPayout - deduct
                          });
                        });
                        remaining -= deduct;
                      }
                      
                      Alert.alert('Success', `Instant payout of $${totalAmount.toFixed(2)} sent to your card!`);
                    } else {
                      console.error('Withdrawal error:', data.error);
                      
                      // Check if onboarding is required
                      if (data.requiresOnboarding && data.onboardingUrl) {
                        Alert.alert(
                          'Complete Verification in Browser', 
                          data.message || 'For security, verification must be completed through Stripe. This will open in your browser and only takes a few minutes.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { 
                              text: 'Continue', 
                              onPress: () => {
                                Linking.openURL(data.onboardingUrl).catch(err => {
                                  console.error('Failed to open onboarding URL:', err);
                                  Alert.alert('Error', 'Failed to open verification page. Please try again.');
                                });
                              }
                            }
                          ]
                        );
                      } else if (data.error && data.error.toLowerCase().includes('card')) {
                        Alert.alert(
                          'Card Required', 
                          'Please add a debit card in Payment Methods to receive instant payouts. Credit cards are not supported.',
                          [{ text: 'Go to Payment Methods', onPress: () => navigation.navigate('PaymentMethods') }]
                        );
                      } else {
                        Alert.alert('Error', data.error || 'Withdrawal failed. Please try again.');
                      }
                    }
                  } catch (err) {
                    console.error('Withdrawal exception:', err);
                    Alert.alert('Error', err.message || 'Withdrawal failed.');
                  }
                }}
                disabled={recentPayouts.reduce((sum, payout) => sum + (typeof payout.amount === 'number' ? payout.amount : 0), 0) <= 0}
              >
                <Text style={styles.modalConfirmText}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={styles.section}>
          <View style={styles.periodSelector}>
            {renderPeriodButton('week', 'Week')}
            {renderPeriodButton('month', 'Month')}
            {renderPeriodButton('year', 'Year')}
          </View>
        </View>

        {/* Stats Overview */}
        <View style={styles.section}>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>${currentData.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              <Text style={styles.statLabel}>Total Earnings</Text>
              <View style={styles.trendContainer}>
                {/* Placeholder trend icon, replace logic with actual trend calculation */}
                <Ionicons name="trending-up" size={14} color="#34A853" />
                <Text style={styles.trendText}>{currentData.trend || 'N/A'} vs last {selectedPeriod}</Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <View style={styles.miniStatCard}>
                <Text style={styles.miniStatValue}>{currentData.jobs}</Text>
                <Text style={styles.miniStatLabel}>Jobs Completed</Text>
              </View>
              <View style={styles.miniStatCard}>
                <Text style={styles.miniStatValue}>${currentData.average.toFixed(2)}</Text>
                <Text style={styles.miniStatLabel}>Avg per Job</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Earnings Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earnings Breakdown</Text>
          {renderBarChart()}
        </View>

        {/* Recent Payouts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Payouts</Text>
          {recentPayouts.map(payout => (
            <View key={payout.id} style={styles.payoutCard}>
              <View style={styles.payoutHeader}>
                <View style={styles.payoutInfo}>
                  <Text style={styles.payoutAmount}>${payout.amount.toFixed(2)}</Text>
                  <Text style={styles.payoutPeriod}>{payout.period}</Text>
                  <Text style={styles.payoutJobs}>{payout.jobs} job{payout.jobs > 1 ? 's' : ''} completed</Text>
                </View>
                <View style={styles.payoutStatus}>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>Paid</Text>
                  </View>
                  <Text style={styles.payoutDate}>
                    {payout.date.toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
          ))}
          
          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All Payouts</Text>
            <Ionicons name="chevron-forward" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Payment Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          <View style={styles.paymentInfoCard}>
            <View style={styles.paymentRow}>
              <View style={styles.paymentIconContainer}>
                <Ionicons name="card" size={20} color="#34A853" />
              </View>
              <View style={styles.paymentDetails}>
                <Text style={styles.paymentMethod}>{paymentInfo.method}</Text>
                <Text style={styles.paymentAccount}>{paymentInfo.account}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => navigation.navigate('PaymentMethods')}>
                  <Text style={styles.changeText}>Change</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.withdrawButton} onPress={handleWithdraw}>
                  <Text style={styles.withdrawText}>Withdraw</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.paymentSchedule}>
              <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
              <Text style={styles.scheduleText}>
                {paymentInfo.schedule}
              </Text>
            </View>
          </View>
        </View>

        {/* Tax Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tax Documents</Text>
          <View style={styles.taxCard}>
            <View style={styles.taxHeader}>
              <Ionicons name="document-text" size={24} color="#3B82F6" />
              <View style={styles.taxInfo}>
                <Text style={styles.taxTitle}>2024 Tax Summary</Text>
                <Text style={styles.taxSubtitle}>1099 form available</Text>
              </View>
              <TouchableOpacity style={styles.downloadTaxButton}>
                <Ionicons name="download" size={16} color="#3B82F6" />
                <Text style={styles.downloadTaxText}>Download</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(31,41,55,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputPrefix: {
    fontSize: 18,
    color: '#059669',
    fontWeight: '700',
    marginRight: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 8,
    fontSize: 18,
    width: 120,
    textAlign: 'center',
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 12,
    marginRight: 8,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 16,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#34A853',
    borderRadius: 8,
    paddingVertical: 12,
    marginLeft: 8,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  withdrawButton: {
    marginLeft: 12,
    backgroundColor: '#34A853',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  withdrawText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // --- Start of existing styles ---
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: Platform.OS === 'android' ? 25 : 20,
    paddingBottom: Platform.OS === 'android' ? 45 : 2,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  downloadText: {
    fontSize: 14,
    color: '#6B7280',
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
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
    marginHorizontal: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activePeriodButton: {
    backgroundColor: '#34A853',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activePeriodButtonText: {
    color: '#FFFFFF',
  },
  statsContainer: {
    paddingHorizontal: 16,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 14,
    color: '#34A853',
    fontWeight: '600',
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
  },
  miniStatCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  miniStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  miniStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    // Add maxHeight if the chart grows too large vertically
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 160,
  },
  barContainer: {
    alignItems: 'center',
    width: 60, // Fixed width for each bar for better horizontal scrolling
    marginHorizontal: 5,
  },
  barWrapper: {
    height: 120,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
  },
  bar: {
    width: 20,
    backgroundColor: '#34A853',
    borderRadius: 10,
    minHeight: 4,
  },
  emptyBar: {
    backgroundColor: '#E5E7EB',
  },
  barLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  barAmount: {
    fontSize: 10,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
  },
  payoutCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  payoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payoutInfo: {
    flex: 1,
  },
  payoutAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  payoutPeriod: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  payoutJobs: {
    fontSize: 14,
    color: '#6B7280',
  },
  payoutStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  payoutDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 16,
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 4,
  },
  paymentInfoCard: {
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
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentDetails: {
    flex: 1,
  },
  paymentMethod: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  paymentAccount: {
    fontSize: 14,
    color: '#6B7280',
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  paymentSchedule: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  scheduleText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  taxCard: {
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
  taxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taxInfo: {
    flex: 1,
    marginLeft: 16,
  },
  taxTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  taxSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  downloadTaxButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EBF8FF',
    gap: 4,
  },
  downloadTaxText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
});

export default Earnings;