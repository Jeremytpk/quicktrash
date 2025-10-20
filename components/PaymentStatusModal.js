import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const PaymentStatusModal = ({ 
  visible, 
  status, // 'success', 'failed', 'processing'
  onClose, 
  amount, 
  paymentId,
  errorMessage,
  title, // Custom title override
  message // Custom message override
}) => {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();

      // Start pulsing animation for processing
      if (status === 'processing') {
        const pulse = () => {
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 0.8,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
          ]).start(() => {
            if (status === 'processing') pulse();
          });
        };
        pulse();
      }
    } else {
      scaleAnim.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [visible, status]);

  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return {
          icon: 'checkmark-circle',
          iconColor: '#10B981',
          backgroundColor: '#ECFDF5',
          borderColor: '#10B981',
          title: 'Payment Successful! 🎉',
          message: `Your payment of $${amount?.toFixed(2)} has been processed successfully.`,
          buttonText: 'Continue',
          buttonColor: '#10B981',
        };
      case 'failed':
        return {
          icon: 'close-circle',
          iconColor: '#EF4444',
          backgroundColor: '#FEF2F2',
          borderColor: '#EF4444',
          title: 'Payment Failed',
          message: errorMessage || 'Your payment could not be processed. Please try again.',
          buttonText: 'Try Again',
          buttonColor: '#EF4444',
        };
      case 'processing':
        return {
          icon: 'time',
          iconColor: '#F59E0B',
          backgroundColor: '#FFFBEB',
          borderColor: '#F59E0B',
          title: 'Processing Payment...',
          message: 'Please wait while we process your payment.',
          buttonText: null,
          buttonColor: '#F59E0B',
        };
      default:
        return {
          icon: 'information-circle',
          iconColor: '#6B7280',
          backgroundColor: '#F9FAFB',
          borderColor: '#6B7280',
          title: 'Payment Status',
          message: 'Processing your request...',
          buttonText: 'OK',
          buttonColor: '#6B7280',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={status !== 'processing' ? onClose : undefined}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.container,
            { 
              backgroundColor: config.backgroundColor,
              borderColor: config.borderColor,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          {/* Status Icon */}
          <Animated.View 
            style={[
              styles.iconContainer, 
              { 
                backgroundColor: config.iconColor + '20',
                transform: [{ scale: status === 'processing' ? pulseAnim : 1 }]
              }
            ]}
          >
            <Ionicons 
              name={config.icon} 
              size={64} 
              color={config.iconColor} 
            />
          </Animated.View>

          {/* Title */}
          <Text style={[styles.title, { color: config.iconColor }]}>
            {title || config.title}
          </Text>

          {/* Message */}
          <Text style={styles.message}>
            {message || config.message}
          </Text>

          {/* Payment Details for Success */}
          {status === 'success' && paymentId && (
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount:</Text>
                <Text style={styles.detailValue}>${amount?.toFixed(2)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment ID:</Text>
                <Text style={styles.detailValueSmall}>{paymentId}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <Text style={[styles.detailValue, { color: config.iconColor }]}>
                  Completed
                </Text>
              </View>
            </View>
          )}

          {/* Processing Animation */}
          {status === 'processing' && (
            <View style={styles.processingContainer}>
              <View style={styles.loadingDots}>
                <View style={[styles.dot, styles.dot1]} />
                <View style={[styles.dot, styles.dot2]} />
                <View style={[styles.dot, styles.dot3]} />
              </View>
            </View>
          )}

          {/* Action Button */}
          {config.buttonText && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: config.buttonColor }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {config.buttonText}
              </Text>
              {status === 'success' && (
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              )}
            </TouchableOpacity>
          )}

          {/* Close button for failed payments */}
          {status === 'failed' && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: width - 40,
    maxWidth: 400,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  detailValueSmall: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  processingContainer: {
    marginBottom: 20,
  },
  loadingDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
    marginHorizontal: 4,
  },
  dot1: {
    opacity: 1,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 0.4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 140,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 8,
  },
});

export default PaymentStatusModal;
