import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SharedHeader from '../components/SharedHeader';

const { width } = Dimensions.get('window');

const Earnings = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('week'); // week, month, year
  
  const earningsData = {
    week: {
      total: 485.50,
      jobs: 12,
      average: 40.46,
      trend: '+12%',
      breakdown: [
        { day: 'Mon', amount: 95.50, jobs: 3 },
        { day: 'Tue', amount: 67.25, jobs: 2 },
        { day: 'Wed', amount: 0, jobs: 0 },
        { day: 'Thu', amount: 123.75, jobs: 4 },
        { day: 'Fri', amount: 88.00, jobs: 2 },
        { day: 'Sat', amount: 111.00, jobs: 1 },
        { day: 'Sun', amount: 0, jobs: 0 },
      ]
    },
    month: {
      total: 2150.75,
      jobs: 52,
      average: 41.36,
      trend: '+8%',
      breakdown: [
        { week: 'Week 1', amount: 485.50, jobs: 12 },
        { week: 'Week 2', amount: 567.25, jobs: 14 },
        { week: 'Week 3', amount: 523.00, jobs: 13 },
        { week: 'Week 4', amount: 575.00, jobs: 13 },
      ]
    },
    year: {
      total: 25800.00,
      jobs: 620,
      average: 41.61,
      trend: '+15%',
      breakdown: [
        { month: 'Jan', amount: 2150.75, jobs: 52 },
        { month: 'Feb', amount: 1980.50, jobs: 48 },
        { month: 'Mar', amount: 2340.25, jobs: 58 },
        { month: 'Apr', amount: 2210.00, jobs: 54 },
        { month: 'May', amount: 2450.75, jobs: 61 },
        { month: 'Jun', amount: 2180.25, jobs: 53 },
        { month: 'Jul', amount: 2520.50, jobs: 63 },
        { month: 'Aug', amount: 2380.00, jobs: 59 },
        { month: 'Sep', amount: 2190.75, jobs: 54 },
        { month: 'Oct', amount: 2250.50, jobs: 56 },
        { month: 'Nov', amount: 2065.00, jobs: 51 },
        { month: 'Dec', amount: 2070.00, jobs: 51 },
      ]
    }
  };

  const currentData = earningsData[selectedPeriod];

  const recentPayouts = [
    {
      id: '1',
      date: new Date(Date.now() - 24 * 60 * 60 * 1000),
      amount: 125.50,
      jobs: 3,
      status: 'completed',
      period: 'Jan 8-14, 2025'
    },
    {
      id: '2',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      amount: 98.75,
      jobs: 2,
      status: 'completed',
      period: 'Jan 1-7, 2025'
    },
    {
      id: '3',
      date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      amount: 156.25,
      jobs: 4,
      status: 'completed',
      period: 'Dec 25-31, 2024'
    },
  ];

  const getBarHeight = (amount, maxAmount) => {
    return Math.max((amount / maxAmount) * 120, 4);
  };

  const maxAmount = Math.max(...currentData.breakdown.map(item => item.amount));

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

        {/* Payment Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          <View style={styles.paymentInfoCard}>
            <View style={styles.paymentRow}>
              <View style={styles.paymentIconContainer}>
                <Ionicons name="card" size={20} color="#34A853" />
              </View>
              <View style={styles.paymentDetails}>
                <Text style={styles.paymentMethod}>Bank Account</Text>
                <Text style={styles.paymentAccount}>****1234</Text>
              </View>
              <TouchableOpacity>
                <Text style={styles.changeText}>Change</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.paymentSchedule}>
              <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
              <Text style={styles.scheduleText}>
                Payments are processed weekly on Mondays for the previous week's earnings.
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
    backgroundColor: '#ffffff',
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
