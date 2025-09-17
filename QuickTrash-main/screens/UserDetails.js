import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SharedHeader from '../components/SharedHeader';

const { width } = Dimensions.get('window');

const UserDetails = ({ navigation, route }) => {
  const { userId } = route.params;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(null);

  useEffect(() => {
    loadUserDetails();
  }, [userId]);

  const loadUserDetails = async () => {
    try {
      // Mock data - in production, this would fetch from Firestore
      const mockUser = {
        id: userId,
        name: 'John Smith',
        email: 'john@example.com',
        phone: '+1 (555) 123-4567',
        role: 'contractor',
        rating: 4.8,
        totalJobs: 45,
        completionRate: 98,
        status: 'active',
        joinDate: new Date('2023-06-15'),
        lastActive: new Date('2024-01-15'),
        warnings: 0,
        earnings: 1250.50,
        location: 'Atlanta, GA',
        vehicle: {
          make: 'Ford',
          model: 'Transit',
          year: 2020,
          license: 'ABC-1234',
        },
        recentRatings: [
          { 
            rating: 5, 
            review: 'Excellent service! Very professional and on time.', 
            date: new Date('2024-01-14'),
            from: 'Sarah Johnson',
            jobId: 'job_001'
          },
          { 
            rating: 4, 
            review: 'Good job, arrived on time and completed quickly.', 
            date: new Date('2024-01-12'),
            from: 'Mike Davis',
            jobId: 'job_002'
          },
          { 
            rating: 5, 
            review: 'Very professional and friendly. Highly recommended!', 
            date: new Date('2024-01-10'),
            from: 'Emily Wilson',
            jobId: 'job_003'
          },
          { 
            rating: 4, 
            review: 'Good service overall, minor delay but handled well.', 
            date: new Date('2024-01-08'),
            from: 'David Brown',
            jobId: 'job_004'
          },
        ],
        performanceHistory: [
          { month: 'Jan 2024', jobs: 12, rating: 4.8, earnings: 320.50 },
          { month: 'Dec 2023', jobs: 15, rating: 4.7, earnings: 380.75 },
          { month: 'Nov 2023', jobs: 10, rating: 4.9, earnings: 285.25 },
          { month: 'Oct 2023', jobs: 8, rating: 4.6, earnings: 264.00 },
        ],
        violations: [],
        achievements: [
          { title: 'Top Performer', date: new Date('2024-01-01'), description: 'Highest rating in December 2023' },
          { title: 'Reliability Award', date: new Date('2023-12-15'), description: '100% completion rate for 3 months' },
        ],
      };

      setUser(mockUser);
      setLoading(false);
    } catch (error) {
      console.error('Error loading user details:', error);
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#34A853';
      case 'warning': return '#F59E0B';
      case 'suspended': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return 'checkmark-circle';
      case 'warning': return 'warning';
      case 'suspended': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const handleUserAction = (action) => {
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${action} ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            // In production, this would update the user's status
            console.log(`${action} action for ${user.name}`);
            Alert.alert('Success', `Action completed for ${user.name}`);
          }
        }
      ]
    );
  };

  const viewRatingDetails = (rating) => {
    setSelectedRating(rating);
    setShowRatingModal(true);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <SharedHeader title="User Details" showBackButton />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading user details...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SharedHeader 
        title="User Details" 
        subtitle={user.name}
        showBackButton 
      />

      <ScrollView style={styles.content}>
        {/* User Header */}
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <Text style={styles.userPhone}>{user.phone}</Text>
            
            <View style={styles.userMeta}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(user.status) }]}>
                <Ionicons name={getStatusIcon(user.status)} size={12} color="white" />
                <Text style={styles.statusText}>{user.status.toUpperCase()}</Text>
              </View>
              <Text style={styles.userRole}>{user.role}</Text>
            </View>
          </View>
          
          <View style={styles.ratingSection}>
            <View style={styles.ratingDisplay}>
              <Ionicons name="star" size={24} color="#FFB300" />
              <Text style={styles.ratingValue}>{user.rating}</Text>
            </View>
            <Text style={styles.ratingCount}>
              {user.totalJobs} jobs completed
            </Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{user.completionRate}%</Text>
            <Text style={styles.statLabel}>Completion Rate</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>${user.earnings}</Text>
            <Text style={styles.statLabel}>Total Earnings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: user.warnings > 0 ? '#F59E0B' : '#34A853' }]}>
              {user.warnings}
            </Text>
            <Text style={styles.statLabel}>Warnings</Text>
          </View>
        </View>

        {/* User Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Join Date</Text>
              <Text style={styles.infoValue}>{user.joinDate.toLocaleDateString()}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Last Active</Text>
              <Text style={styles.infoValue}>{user.lastActive.toLocaleDateString()}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{user.location}</Text>
            </View>
            {user.vehicle && (
              <>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Vehicle</Text>
                  <Text style={styles.infoValue}>{user.vehicle.year} {user.vehicle.make} {user.vehicle.model}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>License Plate</Text>
                  <Text style={styles.infoValue}>{user.vehicle.license}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Recent Ratings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Ratings</Text>
          {user.recentRatings.map((rating, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.ratingItem}
              onPress={() => viewRatingDetails(rating)}
            >
              <View style={styles.ratingHeader}>
                <View style={styles.ratingStars}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Ionicons 
                      key={i} 
                      name={i < rating.rating ? "star" : "star-outline"} 
                      size={16} 
                      color="#FFB300" 
                    />
                  ))}
                </View>
                <Text style={styles.ratingDate}>{rating.date.toLocaleDateString()}</Text>
              </View>
              <Text style={styles.ratingReview}>{rating.review}</Text>
              <Text style={styles.ratingFrom}>From: {rating.from}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Performance History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance History</Text>
          {user.performanceHistory.map((month, index) => (
            <View key={index} style={styles.performanceItem}>
              <View style={styles.performanceHeader}>
                <Text style={styles.performanceMonth}>{month.month}</Text>
                <Text style={styles.performanceRating}>{month.rating} ⭐</Text>
              </View>
              <View style={styles.performanceStats}>
                <Text style={styles.performanceStat}>{month.jobs} jobs</Text>
                <Text style={styles.performanceStat}>${month.earnings}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Achievements */}
        {user.achievements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            {user.achievements.map((achievement, index) => (
              <View key={index} style={styles.achievementItem}>
                <Ionicons name="trophy" size={20} color="#FFB300" />
                <View style={styles.achievementContent}>
                  <Text style={styles.achievementTitle}>{achievement.title}</Text>
                  <Text style={styles.achievementDescription}>{achievement.description}</Text>
                  <Text style={styles.achievementDate}>{achievement.date.toLocaleDateString()}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.warnButton]}
            onPress={() => handleUserAction('warn')}
          >
            <Ionicons name="warning" size={20} color="#F59E0B" />
            <Text style={styles.actionButtonText}>Issue Warning</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.suspendButton]}
            onPress={() => handleUserAction('suspend')}
          >
            <Ionicons name="ban" size={20} color="#EF4444" />
            <Text style={styles.actionButtonText}>Suspend User</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.contactButton]}
            onPress={() => handleUserAction('contact')}
          >
            <Ionicons name="mail" size={20} color="#3B82F6" />
            <Text style={styles.actionButtonText}>Contact User</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Rating Details Modal */}
      <Modal
        visible={showRatingModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rating Details</Text>
              <TouchableOpacity onPress={() => setShowRatingModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedRating && (
              <>
                <View style={styles.ratingDetails}>
                  <View style={styles.ratingStars}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Ionicons 
                        key={i} 
                        name={i < selectedRating.rating ? "star" : "star-outline"} 
                        size={24} 
                        color="#FFB300" 
                      />
                    ))}
                  </View>
                  <Text style={styles.ratingText}>{selectedRating.rating}/5</Text>
                </View>

                <Text style={styles.ratingReviewText}>{selectedRating.review}</Text>
                
                <View style={styles.ratingMeta}>
                  <Text style={styles.ratingFromText}>From: {selectedRating.from}</Text>
                  <Text style={styles.ratingDateText}>{selectedRating.date.toLocaleDateString()}</Text>
                  <Text style={styles.ratingJobText}>Job ID: {selectedRating.jobId}</Text>
                </View>
              </>
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
    padding: 16,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  userRole: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  ratingSection: {
    alignItems: 'center',
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 8,
  },
  ratingCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoItem: {
    width: '50%',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  ratingItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 12,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingStars: {
    flexDirection: 'row',
  },
  ratingDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  ratingReview: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 4,
    lineHeight: 20,
  },
  ratingFrom: {
    fontSize: 12,
    color: '#6B7280',
  },
  performanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  performanceHeader: {
    flex: 1,
  },
  performanceMonth: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  performanceRating: {
    fontSize: 12,
    color: '#6B7280',
  },
  performanceStats: {
    flexDirection: 'row',
    gap: 16,
  },
  performanceStat: {
    fontSize: 12,
    color: '#6B7280',
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  achievementContent: {
    flex: 1,
    marginLeft: 12,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  achievementDate: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  actionSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    minWidth: 120,
    justifyContent: 'center',
  },
  warnButton: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  suspendButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  contactButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
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
    padding: 24,
    width: width * 0.9,
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  ratingDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 12,
  },
  ratingReviewText: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 24,
    marginBottom: 16,
  },
  ratingMeta: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  ratingFromText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  ratingDateText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  ratingJobText: {
    fontSize: 12,
    color: '#6B7280',
  },
});

export default UserDetails;
