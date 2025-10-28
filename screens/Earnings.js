import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Alert,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SharedHeader from '../components/SharedHeader';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, onSnapshot, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

const { width } = Dimensions.get('window');

const Earnings = () => {
  const navigation = useNavigation();
  const [selectedPeriod, setSelectedPeriod] = useState('week'); // week, month, year

  // Live jobs for this contractor
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  // Saved payout method
  const [payoutMethod, setPayoutMethod] = useState(null);

  useEffect(() => {
    if (!auth?.currentUser) {
      setJobs([]);
      setLoadingJobs(false);
      return;
    }

    const jobsRef = collection(db, 'jobs');
    const q = query(
      jobsRef,
      where('contractorId', '==', auth.currentUser.uid),
      where('status', '==', 'completed')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        completedAt: d.data().completedAt?.toDate?.() || (d.data().completedAt instanceof Date ? d.data().completedAt : null),
      }));

      // sort newest first (coerce Dates to numbers safely)
      list.sort((a, b) => {
        const aMs = a.completedAt ? (+a.completedAt) : 0;
        const bMs = b.completedAt ? (+b.completedAt) : 0;
        return bMs - aMs;
      });

      setJobs(list);
      setLoadingJobs(false);
    }, (error) => {
      console.error('Error loading contractor jobs for earnings:', error);
      setJobs([]);
      setLoadingJobs(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen for saved payout methods (most recent)
  useEffect(() => {
    if (!auth?.currentUser) return;

    const payoutRef = collection(db, 'users', auth.currentUser.uid, 'payoutMethods');
    const pQuery = query(payoutRef, orderBy('createdAt', 'desc'), limit(1));

    const unsub = onSnapshot(pQuery, (snap) => {
      if (snap.empty) {
        setPayoutMethod(null);
        return;
      }
      const doc = snap.docs[0];
      setPayoutMethod({ id: doc.id, ...doc.data() });
    }, (err) => {
      console.error('Error listening to payoutMethods:', err);
      setPayoutMethod(null);
    });

    return () => unsub();
  }, []);

  const handleDeletePayout = async (payoutId) => {
    if (!payoutId || !auth?.currentUser) return;

    Alert.alert(
      'Delete Payout Method',
      'Are you sure you want to remove this saved payout method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const ref = doc(db, 'users', auth.currentUser.uid, 'payoutMethods', payoutId);
              await deleteDoc(ref);
            } catch (e) {
              console.error('Error deleting payout method', e);
              Alert.alert('Error', 'Failed to delete payout method.');
            }
          }
        }
      ]
    );
  };

  const earningsData = useMemo(() => {
    // Helper to safely get contractor payout value from a job
    const payoutFor = (job) => {
      return Number(job.pricing?.contractorPayout ?? job.contractorPayout ?? 0) || 0;
    };

    const now = new Date();

    // Week: last 7 days (including today)
    const weekDays = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (6 - i)); // oldest -> newest
      return { date: d, label: d.toLocaleDateString(undefined, { weekday: 'short' }), amount: 0, jobs: 0 };
    });

    // Month: 4 weekly buckets covering last 28 days (Week 1..4)
    const monthWeeks = [0,1,2,3].map(i => ({ label: `Week ${i+1}`, amount: 0, jobs: 0 }));

    // Year: months Jan..Dec
    const monthNames = Array.from({ length: 12 }).map((_, i) => new Date(now.getFullYear(), i, 1).toLocaleString(undefined, { month: 'short' }));
    const yearMonths = monthNames.map(name => ({ month: name, amount: 0, jobs: 0 }));

    let weekTotal = 0, weekJobs = 0;
    let monthTotal = 0, monthJobs = 0;
    let yearTotal = 0, yearJobs = 0;

    jobs.forEach(job => {
      const completed = job.completedAt;
      if (!completed) return;
      const amt = payoutFor(job);

      // Week (last 7 days)
      const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      if (completed >= sevenDaysAgo && completed <= now) {
        // find matching day slot
        const slotIndex = weekDays.findIndex(w => w.date.toDateString() === completed.toDateString());
        if (slotIndex >= 0) {
          weekDays[slotIndex].amount += amt;
          weekDays[slotIndex].jobs += 1;
        }
        weekTotal += amt;
        weekJobs += 1;
      }

      // Month (last 28 days grouped into 4 weeks)
      const twentyEightDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 27);
      if (completed >= twentyEightDaysAgo && completed <= now) {
        const daysDiff = Math.floor((now - completed) / (1000*60*60*24)); // 0..27
        const weekIndex = Math.floor(daysDiff / 7); // 0..3
        const bucket = 3 - weekIndex; // reverse so Week 1 is oldest
        if (bucket >= 0 && bucket < 4) {
          monthWeeks[bucket].amount += amt;
          monthWeeks[bucket].jobs += 1;
        }
        monthTotal += amt;
        monthJobs += 1;
      }

      // Year (calendar year months)
      if (completed.getFullYear() === now.getFullYear()) {
        const m = completed.getMonth();
        yearMonths[m].amount += amt;
        yearMonths[m].jobs += 1;
        yearTotal += amt;
        yearJobs += 1;
      }
    });

    const weekAvg = weekJobs ? weekTotal / weekJobs : 0;
    const monthAvg = monthJobs ? monthTotal / monthJobs : 0;
    const yearAvg = yearJobs ? yearTotal / yearJobs : 0;

    return {
      week: {
        total: weekTotal,
        jobs: weekJobs,
        average: weekAvg,
        trend: weekJobs ? `${Math.round((weekTotal / Math.max(1, weekJobs)) * 100) / 100}` : '+0%',
        breakdown: weekDays.map(d => ({ day: d.label, amount: d.amount, jobs: d.jobs }))
      },
      month: {
        total: monthTotal,
        jobs: monthJobs,
        average: monthAvg,
        trend: monthJobs ? '+0%' : '+0%',
        breakdown: monthWeeks.map(w => ({ week: w.label, amount: w.amount, jobs: w.jobs }))
      },
      year: {
        total: yearTotal,
        jobs: yearJobs,
        average: yearAvg,
        trend: yearJobs ? '+0%' : '+0%',
        breakdown: yearMonths.map(m => ({ month: m.month, amount: m.amount, jobs: m.jobs }))
      }
    };
  }, [jobs]);

  const currentData = earningsData[selectedPeriod];

  // total available balance (sum of all completed job payouts)
  const availableBalance = jobs.reduce((sum, j) => {
    const amt = Number(j.pricing?.contractorPayout ?? j.contractorPayout ?? 0) || 0;
    return sum + amt;
  }, 0);

  const [withdrawing, setWithdrawing] = useState(false);

  const handleWithdraw = () => {
    if (!payoutMethod) {
      Alert.alert('No payout method', 'Please add a debit card before withdrawing.');
      return;
    }
    if (availableBalance <= 0) {
      Alert.alert('Nothing to withdraw', 'You have no available balance to withdraw.');
      return;
    }

    // Custom modal for professional Withdraw UI
    navigation.navigate('WithdrawModal', {
      amount: availableBalance,
      payoutMethod,
      onConfirm: async () => {
        setWithdrawing(true);
  const base = 'https://us-central1-quicktrash.cloudfunctions.net/api';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
          // Fetch user data from Firestore
          let userData = {};
          try {
            const userDocRef = doc(db, 'users', auth.currentUser.uid);
            const userSnap = await import('firebase/firestore').then(firestore => firestore.getDoc(userDocRef));
            if (userSnap.exists()) {
              userData = userSnap.data();
            }
          } catch (err) {
            console.error('Error fetching user data for withdraw:', err);
          }

          const payload = {
            amount: Number(availableBalance.toFixed(2)),
            payoutMethodId: payoutMethod.id,
            userId: auth?.currentUser?.uid || null,
            userData,
            payoutMethod,
          };

          const resp = await fetch(base + '/withdraw-to-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          clearTimeout(timeout);
          const json = await resp.json().catch(() => ({}));

          if (!resp.ok) {
            console.error('Withdraw failed response', { status: resp.status, statusText: resp.statusText, body: json, endpoint: base + '/withdraw-to-card' });
            const message = json?.error || json?.message || 'Withdraw failed';
            Alert.alert('Withdraw failed', String(message));
          } else {
            console.log('Withdraw requested', { status: resp.status, body: json });
            Alert.alert('Withdraw requested', json?.message || 'Withdraw request accepted.');
          }
        } catch (e) {
          console.error('Withdraw request exception', {
            errorName: e?.name,
            errorMessage: e?.message,
            stack: e?.stack,
            endpoint: base + '/withdraw-to-card',
          });
          if (e.name === 'AbortError') {
            Alert.alert('Network timeout', 'Request timed out. Ensure the payment server is running and reachable.');
          } else if (e.message && e.message.toLowerCase().includes('network')) {
            Alert.alert('Network error', 'Network request failed. If you are using an Android emulator, ensure the payment server is accessible at http://10.0.2.2:3001. For iOS simulator use http://localhost:3001. Also ensure backend/server.js is running.');
          } else {
            Alert.alert('Error', 'Failed to contact payout server. Check server and network.');
          }
        } finally {
          clearTimeout(timeout);
          setWithdrawing(false);
        }
      }
    });
  };

  // Compute recent payouts from completed jobs (group by payout date or most recent jobs)
  const recentPayouts = useMemo(() => {
    // Show the most recent 6 completed jobs as payouts entries
    return jobs.slice(0, 6).map(j => ({
      id: j.id,
      date: j.completedAt || new Date(),
      amount: Number(j.pricing?.contractorPayout ?? j.contractorPayout ?? 0) || 0,
      jobs: 1,
      status: 'completed',
      period: j.completedAt ? j.completedAt.toLocaleDateString() : ''
    }));
  }, [jobs]);

  const getBarHeight = (amount, maxAmount) => {
    return Math.max((amount / maxAmount) * 120, 4);
  };

  const maxAmount = Math.max(1, ...(currentData.breakdown.map(item => item.amount || 0)));

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
      <View style={styles.chart}>
        {currentData.breakdown.map((item, index) => {
          const barHeight = getBarHeight(item.amount, maxAmount);
          const label = item.day || item.week || item.month;
          
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
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <SharedHeader 
        title="Earnings" 
        showBackButton 
        rightComponent={
          <TouchableOpacity style={styles.downloadButton}>
            <Ionicons name="download-outline" size={20} color="#6B7280" />
            <Text style={styles.downloadText}>Export</Text>
          </TouchableOpacity>
        }
      />

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
              <Text style={styles.statValue}>${currentData.total.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Earnings</Text>
              <View style={styles.trendContainer}>
                <Ionicons name="trending-up" size={14} color="#34A853" />
                <Text style={styles.trendText}>{currentData.trend} vs last {selectedPeriod}</Text>
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
                  <Text style={styles.payoutJobs}>{payout.jobs} jobs completed</Text>
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

        {/* Payment Info (Redesigned) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          <View style={styles.paymentInfoCard}>
            <View style={styles.paymentMethodRow}>
              
              {/* LEFT: Payout Method Icon & Details */}
              <View style={styles.paymentLeft}>
                <View style={styles.paymentIconContainer}>
                  <Ionicons name="card" size={24} color="#059669" />
                </View>
                <View style={styles.paymentDetails}>
                  <Text style={styles.paymentMethod}>
                    {payoutMethod?.type === 'debit_card' ? 'Debit Card' : 'Add Method'}
                  </Text>
                  <Text style={styles.paymentAccount}>
                    {payoutMethod?.cardMask || 'Secure method required for withdrawal'}
                  </Text>
                </View>
              </View>

              {/* RIGHT: Available Balance */}
              <View style={styles.paymentBalance}>
                <Text style={styles.balanceText}>${availableBalance.toFixed(2)}</Text>
                <Text style={styles.balanceLabel}>Available</Text>
              </View>
            </View>

            {/* Actions Block (Full Width Row) */}
            <View style={styles.paymentActionsBlock}>
              
              {/* Primary Action: Withdraw */}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (withdrawing || availableBalance <= 0 || !payoutMethod) && styles.disabledButton
                ]}
                onPress={handleWithdraw}
                disabled={withdrawing || availableBalance <= 0 || !payoutMethod}
              >
                <Ionicons name="wallet-outline" size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>{withdrawing ? 'Withdrawing...' : 'Withdraw Funds'}</Text>
              </TouchableOpacity>

              {/* Secondary Actions (Grouped) */}
              <View style={styles.secondaryActions}>
                <TouchableOpacity 
                  style={styles.secondaryButton} 
                  onPress={() => navigation.navigate('WithdrawToDebit')}
                >
                  <Text style={styles.secondaryButtonText}>{payoutMethod ? 'Replace/Update Card' : 'Add Debit Card'}</Text>
                </TouchableOpacity>

                {payoutMethod && (
                  <TouchableOpacity style={styles.dangerButton} onPress={() => handleDeletePayout(payoutMethod.id)}>
                    <Ionicons name="trash" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Schedule Note */}
            <View style={styles.paymentSchedule}>
              <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
              <Text style={styles.scheduleText}>
                Payments are typically processed weekly on Mondays for the previous week's earnings.
              </Text>
            </View>
              {/* Dev helper: ping payment server to diagnose network issues */}
              {__DEV__ && (
                <TouchableOpacity
                  style={{ marginTop: 8 }}
                  onPress={async () => {
                    const base = 'https://us-central1-quicktrash.cloudfunctions.net/api';
                    try {
                      const resp = await fetch(base + '/health', { method: 'GET' });
                      if (resp.ok) {
                        Alert.alert('Server OK', `Cloud backend reachable at ${base}`);
                      } else {
                        Alert.alert('Server responded', `Status: ${resp.status} at ${base}`);
                      }
                    } catch (err) {
                      console.error('Health ping error', err);
                      Alert.alert('Ping failed', `Unable to reach ${base}. Ensure the cloud backend is deployed and accessible.`);
                    }
                  }}
                >
                  <Text style={{ color: '#6B7280', fontSize: 13 }}>Check server connection</Text>
                </TouchableOpacity>
              )}
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
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 160,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
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
  },
  barAmount: {
    fontSize: 10,
    color: '#374151',
    fontWeight: '500',
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
  
  // --- REDESIGNED PAYMENT INFO STYLES ---

  paymentInfoCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16, // Slightly larger radius for prominence
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, // More emphasis on this card
    shadowRadius: 10,
    elevation: 6,
  },
  paymentMethodRow: { // Replaced paymentRow
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  paymentLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 2, // Take up more space
  },
  paymentIconContainer: {
    width: 48, // Larger icon area
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#D9F99D',
  },
  paymentDetails: {
    flex: 1,
  },
  paymentMethod: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  paymentAccount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  paymentBalance: { // Right side balance display
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  balanceText: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: '#059669', // Strong color for balance
  },
  balanceLabel: { 
    fontSize: 12, 
    color: '#6B7280', 
    fontWeight: '600' 
  },
  
  // --- Action Block ---
  paymentActionsBlock: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  primaryButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#059669', 
    paddingVertical: 14, 
    paddingHorizontal: 16, 
    borderRadius: 10, 
    marginBottom: 10,
  },
  primaryButtonText: { 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 16,
    marginLeft: 8,
  },
  disabledButton: { 
    opacity: 0.5,
    backgroundColor: '#34D399',
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  secondaryButton: { 
    flex: 1,
    backgroundColor: '#F3F4F6', 
    paddingVertical: 10, 
    paddingHorizontal: 12, 
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: { 
    color: '#374151', 
    fontWeight: '600', 
    fontSize: 13,
  },
  dangerButton: { 
    backgroundColor: '#EF4444', 
    padding: 10, 
    borderRadius: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // --- Schedule Note (Kept Clean) ---
  paymentSchedule: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 20,
  },
  scheduleText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  
  // --- Tax Card ---
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