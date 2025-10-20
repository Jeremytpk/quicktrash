import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SharedHeader from '../components/SharedHeader';
import AvailableJobsList from '../components/AvailableJobsList';

const AvailableJobs = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    distance: 'all', // all, 5, 10, 15
    jobType: 'all', // all, household, bulk, yard, construction, recyclables
    earnings: 'all', // all, 10, 25, 50
  });

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleToggleOnline = () => {
    setIsOnline(!isOnline);
    Alert.alert(
      isOnline ? 'Going Offline' : 'Going Online',
      isOnline ? 'You will no longer receive job offers.' : 'You are now available to receive job offers!'
    );
  };

  const renderFilterChip = (label, value, currentValue, onPress) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        currentValue === value && styles.activeFilterChip
      ]}
      onPress={() => onPress(value)}
    >
      <Text style={[
        styles.filterChipText,
        currentValue === value && styles.activeFilterChipText
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SharedHeader 
        title="Available Jobs" 
        subtitle={isOnline ? 'You\'re online and ready for jobs' : 'You\'re offline'}
        showBackButton 
        rightComponent={
          <TouchableOpacity 
            style={[styles.statusToggle, isOnline && styles.onlineToggle]}
            onPress={handleToggleOnline}
          >
            <View style={[styles.statusDot, isOnline && styles.onlineDot]} />
            <Text style={[styles.statusText, isOnline && styles.onlineText]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </TouchableOpacity>
        }
      />

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
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Opportunities</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>Available Jobs</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>$180</Text>
              <Text style={styles.statLabel}>Potential Earnings</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>3.2 mi</Text>
              <Text style={styles.statLabel}>Avg Distance</Text>
            </View>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Filters</Text>
          
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Distance</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {renderFilterChip('All', 'all', filters.distance, (value) => 
                setFilters(prev => ({ ...prev, distance: value }))
              )}
              {renderFilterChip('Within 5 mi', '5', filters.distance, (value) => 
                setFilters(prev => ({ ...prev, distance: value }))
              )}
              {renderFilterChip('Within 10 mi', '10', filters.distance, (value) => 
                setFilters(prev => ({ ...prev, distance: value }))
              )}
              {renderFilterChip('Within 15 mi', '15', filters.distance, (value) => 
                setFilters(prev => ({ ...prev, distance: value }))
              )}
            </ScrollView>
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Job Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {renderFilterChip('All Types', 'all', filters.jobType, (value) => 
                setFilters(prev => ({ ...prev, jobType: value }))
              )}
              {renderFilterChip('Household', 'household', filters.jobType, (value) => 
                setFilters(prev => ({ ...prev, jobType: value }))
              )}
              {renderFilterChip('Bulk Items', 'bulk', filters.jobType, (value) => 
                setFilters(prev => ({ ...prev, jobType: value }))
              )}
              {renderFilterChip('Yard Waste', 'yard', filters.jobType, (value) => 
                setFilters(prev => ({ ...prev, jobType: value }))
              )}
              {renderFilterChip('Construction', 'construction', filters.jobType, (value) => 
                setFilters(prev => ({ ...prev, jobType: value }))
              )}
            </ScrollView>
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Minimum Earnings</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {renderFilterChip('Any Amount', 'all', filters.earnings, (value) => 
                setFilters(prev => ({ ...prev, earnings: value }))
              )}
              {renderFilterChip('$10+', '10', filters.earnings, (value) => 
                setFilters(prev => ({ ...prev, earnings: value }))
              )}
              {renderFilterChip('$25+', '25', filters.earnings, (value) => 
                setFilters(prev => ({ ...prev, earnings: value }))
              )}
              {renderFilterChip('$50+', '50', filters.earnings, (value) => 
                setFilters(prev => ({ ...prev, earnings: value }))
              )}
            </ScrollView>
          </View>
        </View>

        {/* Jobs List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Jobs</Text>
            <TouchableOpacity style={styles.sortButton}>
              <Ionicons name="swap-vertical" size={16} color="#6B7280" />
              <Text style={styles.sortText}>Sort by Distance</Text>
            </TouchableOpacity>
          </View>
          
          {isOnline ? (
            <AvailableJobsList />
          ) : (
            <View style={styles.offlineState}>
              <Ionicons name="moon-outline" size={64} color="#9CA3AF" />
              <Text style={styles.offlineTitle}>You're Offline</Text>
              <Text style={styles.offlineDescription}>
                Turn online to start seeing available jobs in your area
              </Text>
              <TouchableOpacity 
                style={styles.goOnlineButton}
                onPress={handleToggleOnline}
              >
                <Ionicons name="power" size={20} color="#FFFFFF" />
                <Text style={styles.goOnlineText}>Go Online</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tips Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pro Tips</Text>
          <View style={styles.tipCard}>
            <Ionicons name="lightbulb" size={24} color="#F59E0B" />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Maximize Your Earnings</Text>
              <Text style={styles.tipText}>
                • Accept jobs quickly - they go fast!{'\n'}
                • Work during peak hours (weekends, evenings){'\n'}
                • Complete jobs efficiently to get more offers{'\n'}
                • Maintain a high rating for priority access
              </Text>
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
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  onlineToggle: {
    backgroundColor: '#DCFCE7',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9CA3AF',
  },
  onlineDot: {
    backgroundColor: '#34A853',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  onlineText: {
    color: '#059669',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginHorizontal: 16,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  sortText: {
    fontSize: 14,
    color: '#6B7280',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginHorizontal: 16,
  },
  filterScroll: {
    paddingLeft: 16,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeFilterChip: {
    backgroundColor: '#34A853',
    borderColor: '#34A853',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeFilterChipText: {
    color: '#FFFFFF',
  },
  offlineState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  offlineTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  offlineDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  goOnlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34A853',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  goOnlineText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tipCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tipContent: {
    flex: 1,
    marginLeft: 16,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});

export default AvailableJobs;
