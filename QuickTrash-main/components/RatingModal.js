import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

const { width, height } = Dimensions.get('window');

const RatingModal = ({ 
  visible, 
  onClose, 
  jobData, 
  raterRole, // 'customer' or 'contractor'
  onRatingComplete 
}) => {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [categoryRatings, setCategoryRatings] = useState({
    timeliness: 0,
    communication: 0,
    professionalism: 0,
    quality: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setRating(0);
      setReview('');
      setCategoryRatings({
        timeliness: 0,
        communication: 0,
        professionalism: 0,
        quality: 0,
      });
    }
  }, [visible]);

  const getRaterInfo = () => {
    if (raterRole === 'customer') {
      return {
        raterName: 'Customer',
        ratedName: jobData?.contractorName || 'Contractor',
        context: 'How was your trash pickup experience?'
      };
    } else {
      return {
        raterName: 'Contractor',
        ratedName: jobData?.customerName || 'Customer',
        context: 'How was your experience with this customer?'
      };
    }
  };

  const getCategoryLabels = () => {
    if (raterRole === 'customer') {
      return {
        timeliness: 'On-time arrival',
        communication: 'Communication',
        professionalism: 'Professionalism',
        quality: 'Service quality'
      };
    } else {
      return {
        timeliness: 'Ready on time',
        communication: 'Communication',
        professionalism: 'Professionalism',
        quality: 'Clear instructions'
      };
    }
  };

  const handleStarPress = (starCount) => {
    setRating(starCount);
  };

  const handleCategoryRating = (category, starCount) => {
    setCategoryRatings(prev => ({
      ...prev,
      [category]: starCount
    }));
  };

  const renderStars = (count, onPress, size = 32) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress(star)}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= count ? 'star' : 'star-outline'}
              size={size}
              color={star <= count ? '#FFB300' : '#E5E7EB'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderCategoryRating = (category, label) => {
    const currentRating = categoryRatings[category];
    
    return (
      <View style={styles.categoryRating}>
        <Text style={styles.categoryLabel}>{label}</Text>
        <View style={styles.categoryStarsContainer}>
          {renderStars(currentRating, (rating) => handleCategoryRating(category, rating), 24)}
        </View>
      </View>
    );
  };

  const handleSubmitRating = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please provide a star rating before submitting.');
      return;
    }

    // Check if all category ratings are provided
    const missingCategories = Object.entries(categoryRatings).filter(([_, value]) => value === 0);
    if (missingCategories.length > 0) {
      Alert.alert('Category Ratings Required', 'Please rate all categories before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      const raterInfo = getRaterInfo();
      const ratedUserId = raterRole === 'customer' ? jobData.contractorId : jobData.customerId;

      // Create rating document
      const ratingData = {
        jobId: jobData.id,
        raterId: auth.currentUser.uid,
        raterRole: raterRole,
        ratedUserId: ratedUserId,
        rating: rating,
        review: review.trim(),
        categories: categoryRatings,
        createdAt: serverTimestamp(),
        raterName: raterInfo.raterName,
        ratedName: raterInfo.ratedName,
      };

      await addDoc(collection(db, 'ratings'), ratingData);

      // Update job document to mark this rating as completed
      const jobRef = doc(db, 'jobs', jobData.id);
      const ratingField = raterRole === 'customer' ? 'customerRated' : 'contractorRated';
      await updateDoc(jobRef, {
        [ratingField]: true,
        [`${ratingField}At`]: serverTimestamp(),
      });

      // Calculate and update user scores
      await updateUserScores(ratedUserId, rating, categoryRatings);

      Alert.alert(
        'Rating Submitted!',
        'Thank you for your feedback. It helps us improve our service.',
        [{ text: 'OK', onPress: onRatingComplete }]
      );

    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateUserScores = async (userId, rating, categoryRatings) => {
    try {
      // Get current user document
      const userRef = doc(db, 'users', userId);
      
      // Calculate new scores based on rating and categories
      const timelinessScore = calculateScoreComponent(categoryRatings.timeliness);
      const communicationScore = calculateScoreComponent(categoryRatings.communication);
      const professionalismScore = calculateScoreComponent(categoryRatings.professionalism);
      const qualityScore = calculateScoreComponent(categoryRatings.quality);
      
      // Update user scores (this would be handled by a cloud function in production)
      // For now, we'll just log the scores
      console.log('Updating scores for user:', userId, {
        overallRating: rating,
        timelinessScore,
        communicationScore,
        professionalismScore,
        qualityScore,
      });

    } catch (error) {
      console.error('Error updating user scores:', error);
    }
  };

  const calculateScoreComponent = (categoryRating) => {
    // Convert 1-5 star rating to 0-100 score
    return (categoryRating / 5) * 100;
  };

  const raterInfo = getRaterInfo();
  const categoryLabels = getCategoryLabels();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rate Your Experience</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Job Info */}
          <View style={styles.jobInfoCard}>
            <Text style={styles.jobInfoTitle}>Pickup Details</Text>
            <Text style={styles.jobInfoText}>
              {jobData?.wasteType?.charAt(0).toUpperCase() + jobData?.wasteType?.slice(1)} • {jobData?.volume}
            </Text>
            <Text style={styles.jobInfoDate}>
              {jobData?.completedAt?.toLocaleDateString()}
            </Text>
          </View>

          {/* Overall Rating */}
          <View style={styles.ratingSection}>
            <Text style={styles.sectionTitle}>Overall Rating</Text>
            <Text style={styles.contextText}>{raterInfo.context}</Text>
            
            <View style={styles.overallRating}>
              {renderStars(rating, handleStarPress)}
              <Text style={styles.ratingText}>
                {rating === 0 ? 'Tap to rate' : `${rating} star${rating !== 1 ? 's' : ''}`}
              </Text>
            </View>
          </View>

          {/* Category Ratings */}
          <View style={styles.categorySection}>
            <Text style={styles.sectionTitle}>Rate by Category</Text>
            
            {Object.entries(categoryLabels).map(([category, label]) => (
              <View key={category} style={styles.categoryContainer}>
                {renderCategoryRating(category, label)}
              </View>
            ))}
          </View>

          {/* Written Review */}
          <View style={styles.reviewSection}>
            <Text style={styles.sectionTitle}>Written Review (Optional)</Text>
            <TextInput
              style={styles.reviewInput}
              placeholder={`Share your experience with ${raterInfo.ratedName.toLowerCase()}...`}
              value={review}
              onChangeText={setReview}
              multiline
              maxLength={800}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>{review.length}/800</Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (rating === 0 || isSubmitting) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmitRating}
            disabled={rating === 0 || isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting...' : 'Submit Rating'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  jobInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  jobInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  jobInfoText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  jobInfoDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  ratingSection: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  contextText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  overallRating: {
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  categorySection: {
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
  categoryContainer: {
    marginBottom: 16,
  },
  categoryRating: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  categoryStarsContainer: {
    flexDirection: 'row',
  },
  reviewSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 100,
    maxHeight: 150,
  },
  characterCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#34A853',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default RatingModal;
