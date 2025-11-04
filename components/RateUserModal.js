import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Star = ({ filled, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.starButton}>
    <Ionicons name={filled ? 'star' : 'star-outline'} size={28} color={filled ? '#F59E0B' : '#9CA3AF'} />
  </TouchableOpacity>
);

const RateUserModal = ({ visible, onClose, onSubmit, title = 'Rate User', initialRating = 0 }) => {
  const [rating, setRating] = useState(initialRating || 0);
  const [review, setReview] = useState('');

  useEffect(() => {
    if (visible) {
      setRating(initialRating || 0);
      setReview('');
    }
  }, [visible, initialRating]);

  const handleSubmit = () => {
    if (rating < 1) {
      // Require at least 1 star
      return;
    }
    onSubmit({ rating, review: review.trim() });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>How was your experience?</Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} filled={i <= rating} onPress={() => setRating(i)} />
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Add an optional note"
            placeholderTextColor="#9CA3AF"
            value={review}
            onChangeText={setReview}
            multiline
            maxLength={400}
          />

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.button, styles.cancel]} onPress={onClose}>
              <Text style={styles.cancelText}>Not now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submit, rating < 1 && styles.disabled]}
              onPress={handleSubmit}
              disabled={rating < 1}
            >
              <Text style={styles.submitText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  starButton: {
    marginRight: 8,
  },
  input: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    textAlignVertical: 'top',
    color: '#111827',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancel: {
    backgroundColor: '#F3F4F6',
  },
  cancelText: {
    color: '#374151',
    fontWeight: '600',
  },
  submit: {
    backgroundColor: '#34A853',
  },
  disabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default RateUserModal;
