import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import SharedHeader from '../components/SharedHeader';
import ScoringService from '../services/ScoringService';
import { useUser } from '../contexts/UserContext';

const { width } = Dimensions.get('window');

const RatingDashboard = ({ navigation }) => {
  const { user } = useUser();
  const [userScore, setUserScore] = useState(null);
  const [recentRatings, setRecentRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) {
      navigation.navigate('Login');
      return;
    }

    loadRatingData();
  }, []);

  const loadRatingData = async () => {
    try {
      // For now, show empty state since we don't have ratings data yet
      // This avoids the Firebase index error and provides a good user experience
      setRecentRatings([]);
      setUserScore(null);
      setLoading(false);
      setRefreshing(false);

      // TODO: Implement proper rating loading once the ratings collection is set up
      // This will be implemented when we have actual rating data in the database
      
    } catch (error) {
      console.error('Error loading rating data:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadBehaviorMetrics = async () => {
    // In a real app, this would come from user behavior tracking
    // For now, return mock data based on user role
    const mockMetrics = user?.role === 'contractor' ? {
      lateArrival: 0,
      noShow: 0,
      incompletePickup: 0,
      poorCommunication: 0,
      unprofessionalBehavior: 0,
      vehicleIssues: 0,
      earlyArrival: 3,
      exceedsExpectations: 2,
      handlesDifficultSituations: 1,
      highVolumeCapacity: 1,
      flexibleSchedule: 2,
      consistentPerformance: 1,
    } : {
      lastMinuteCancellation: 0,
      noShow: 0,
      unpreparedPickup: 0,
      incorrectVolume: 0,
      poorCommunication: 0,
      multipleDisputes: 0,
      earlyReady: 2,
      clearInstructions: 3,
      flexibleScheduling: 1,
      positiveFeedback: 1,
      frequentUser: 0,
      onTimePayment: 1,
    };

    return mockMetrics;
  };

  const loadPerformanceMetrics = async () => {
    // In a real app, this would come from job performance data
    // For now, return mock data
    return {
      completionRate: 0.96,
      cancellationRate: 0.02,
      avgResponseTime: 12, // minutes
      repeatRate: 0.35,
      totalJobs: 24,
    };
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRatingData();
  };

  const renderScoreCard = () => {
    if (!userScore) return null;

    const scoreColor = ScoringService.getScoreColor(userScore.level);
    const description = ScoringService.getScoreDescription(userScore.level);

    return (
      <View style={[styles.scoreCard, { borderColor: scoreColor }]}>
        <View style={styles.scoreHeader}>
          <View style={styles.scoreCircle}>
            <Text style={[styles.scoreNumber, { color: scoreColor }]}>
              {userScore.totalScore}
            </Text>
            <Text style={styles.scoreLabel}>Score</Text>
          </View>
          <View style={styles.scoreInfo}>
            <Text style={[styles.scoreLevel, { color: scoreColor }]}>
              {userScore.level}
            </Text>
            <Text style={styles.scoreDescription}>{description}</Text>
          </View>
        </View>

        <View style={styles.scoreBreakdown}>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Rating Score</Text>
            <Text style={styles.breakdownValue}>{userScore.ratingScore}</Text>
          </View>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Behavior</Text>
            <Text style={[styles.breakdownValue, { 
              color: userScore.behavioralScore >= 0 ? '#34A853' : '#EF4444' 
            }]}>
              {userScore.behavioralScore >= 0 ? '+' : ''}{userScore.behavioralScore}
            </Text>
          </View>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Performance</Text>
            <Text style={[styles.breakdownValue, { 
              color: userScore.performanceScore >= 0 ? '#34A853' : '#EF4444' 
            }]}>
              {userScore.performanceScore >= 0 ? '+' : ''}{userScore.performanceScore}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderRatingBreakdown = () => {
    if (!userScore?.breakdown?.ratingBreakdown) return null;

    const breakdown = userScore.breakdown.ratingBreakdown;

    return (
      <View style={styles.breakdownCard}>
        <Text style={styles.cardTitle}>Rating Breakdown</Text>
        <View style={styles.ratingBreakdown}>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingLabel}>Overall Rating</Text>
            <View style={styles.ratingStars}>
              {renderStars(parseFloat(breakdown.overall))}
              <Text style={styles.ratingValue}>{breakdown.overall}</Text>
            </View>
          </View>
          
          <View style={styles.ratingRow}>
            <Text style={styles.ratingLabel}>Timeliness</Text>
            <View style={styles.ratingStars}>
              {renderStars(parseFloat(breakdown.timeliness))}
              <Text style={styles.ratingValue}>{breakdown.timeliness}</Text>
            </View>
          </View>
          
          <View style={styles.ratingRow}>
            <Text style={styles.ratingLabel}>Communication</Text>
            <View style={styles.ratingStars}>
              {renderStars(parseFloat(breakdown.communication))}
              <Text style={styles.ratingValue}>{breakdown.communication}</Text>
            </View>
          </View>
          
          <View style={styles.ratingRow}>
            <Text style={styles.ratingLabel}>Professionalism</Text>
            <View style={styles.ratingStars}>
              {renderStars(parseFloat(breakdown.professionalism))}
              <Text style={styles.ratingValue}>{breakdown.professionalism}</Text>
            </View>
          </View>
          
          <View style={styles.ratingRow}>
            <Text style={styles.ratingLabel}>Quality</Text>
            <View style={styles.ratingStars}>
              {renderStars(parseFloat(breakdown.quality))}
              <Text style={styles.ratingValue}>{breakdown.quality}</Text>
            </View>
          </View>
        </View>
        
        <Text style={styles.totalRatings}>
          Based on {breakdown.totalRatings} rating{breakdown.totalRatings !== 1 ? 's' : ''}
        </Text>
      </View>
    );
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <View style={styles.starsContainer}>
        {Array.from({ length: fullStars }, (_, i) => (
          <Ionicons key={i} name="star" size={16} color="#FFB300" />
        ))}
        {hasHalfStar && (
          <Ionicons name="star-half" size={16} color="#FFB300" />
        )}
        {Array.from({ length: emptyStars }, (_, i) => (
          <Ionicons key={i} name="star-outline" size={16} color="#E5E7EB" />
        ))}
      </View>
    );
  };

  const renderRecommendations = () => {
    if (!userScore?.recommendations?.length) return null;

    return (
      <View style={styles.recommendationsCard}>
        <Text style={styles.cardTitle}>Improvement Tips</Text>
        {userScore.recommendations.map((rec, index) => (
          <TouchableOpacity key={index} style={styles.recommendationItem}>
            <View style={styles.recommendationHeader}>
              <View style={[
                styles.priorityBadge,
                { backgroundColor: rec.priority === 'HIGH' ? '#EF4444' : '#F59E0B' }
              ]}>
                <Text style={styles.priorityText}>{rec.priority}</Text>
              </View>
              <Text style={styles.recommendationTitle}>{rec.title}</Text>
            </View>
            <Text style={styles.recommendationDescription}>{rec.description}</Text>
            <Text style={styles.recommendationImpact}>{rec.impact}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderRecentRatings = () => {
    if (!recentRatings.length) return null;

    return (
      <View style={styles.recentRatingsCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Recent Ratings</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {recentRatings.slice(0, 5).map((rating) => (
          <View key={rating.id} style={styles.ratingItem}>
            <View style={styles.ratingItemHeader}>
              <Text style={styles.ratingItemTitle}>
                {rating.raterName} rated you
              </Text>
              <Text style={styles.ratingItemDate}>
                {rating.createdAt?.toLocaleDateString()}
              </Text>
            </View>
            
            <View style={styles.ratingItemRating}>
              {renderStars(rating.rating)}
              <Text style={styles.ratingItemValue}>{rating.rating}/5</Text>
            </View>
            
            {rating.review && (
              <Text style={styles.ratingItemReview} numberOfLines={2}>
                "{rating.review}"
              </Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <SharedHeader title="My Rating" showBackButton />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your rating data...</Text>
        </View>
      </View>
    );
  }

  // Show empty state if no ratings yet
  if (!loading && (!userScore || recentRatings.length === 0)) {
    return (
      <View style={styles.container}>
        <SharedHeader 
          title="My Rating" 
          subtitle={`${user?.role === 'contractor' ? 'Contractor' : 'Customer'} Score`}
          showBackButton 
        />
        
        <View style={styles.emptyState}>
          <Ionicons name="star-outline" size={80} color="#E5E7EB" />
          <Text style={styles.emptyTitle}>No Ratings Yet</Text>
          <Text style={styles.emptySubtitle}>
            {user?.role === 'contractor' 
              ? "Complete some jobs to start building your rating! Your performance will be rated by customers after each completed pickup." 
              : "Place some orders to start building your rating! You'll be able to rate contractors after each completed service."
            }
          </Text>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => navigation.navigate(user?.role === 'contractor' ? 'AvailableJobs' : 'CreateOrder')}
          >
            <Text style={styles.primaryButtonText}>
              {user?.role === 'contractor' ? 'Find Jobs' : 'Create Order'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SharedHeader 
        title="My Rating" 
        subtitle={`${user?.role === 'contractor' ? 'Contractor' : 'Customer'} Score`}
        showBackButton 
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
        {renderScoreCard()}
        {renderRatingBreakdown()}
        {renderRecommendations()}
        {renderRecentRatings()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginVertical: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  scoreInfo: {
    flex: 1,
  },
  scoreLevel: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  scoreDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  scoreBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  breakdownItem: {
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  ratingBreakdown: {
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    minWidth: 30,
    textAlign: 'right',
  },
  totalRatings: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  recommendationsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recommendationItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  priorityText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  recommendationDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 4,
  },
  recommendationImpact: {
    fontSize: 12,
    color: '#34A853',
    fontWeight: '500',
  },
  recentRatingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: '#34A853',
    fontWeight: '600',
  },
  ratingItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  ratingItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  ratingItemDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  ratingItemRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingItemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  ratingItemReview: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  // Empty state styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#34A853',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#34A853',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RatingDashboard;
