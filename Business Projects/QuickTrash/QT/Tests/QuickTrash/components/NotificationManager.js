import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationManager {
  constructor() {
    this.expoPushToken = null;
  }

  async registerForPushNotifications() {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'quicktrash-1cdff', // Your Expo project ID
      });
      
      this.expoPushToken = token.data;
      console.log('Expo Push Token:', token.data);
      
      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  async updateUserPushToken(userId, token) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        pushToken: token,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating push token:', error);
    }
  }

  async sendLocalNotification(title, message, data = {}) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: message,
        data,
        sound: 'default',
      },
      trigger: null, // Send immediately
    });
  }

  // Notification types for different scenarios
  notificationTypes = {
    JOB_ASSIGNED: 'job_assigned',
    JOB_STARTED: 'job_started',
    JOB_COMPLETED: 'job_completed',
    JOB_CANCELLED: 'job_cancelled',
    MESSAGE_RECEIVED: 'message_received',
    PAYMENT_RECEIVED: 'payment_received',
    RATING_RECEIVED: 'rating_received',
    CONTRACTOR_NEARBY: 'contractor_nearby',
    DISPUTE_CREATED: 'dispute_created',
    VERIFICATION_APPROVED: 'verification_approved',
  };

  // Predefined notification templates
  getNotificationTemplate(type, data = {}) {
    const templates = {
      [this.notificationTypes.JOB_ASSIGNED]: {
        title: 'New Job Assigned! 🚛',
        message: `You have a new ${data.wasteType} pickup job. Tap to view details.`,
        data: { jobId: data.jobId, type: this.notificationTypes.JOB_ASSIGNED },
      },
      [this.notificationTypes.JOB_STARTED]: {
        title: 'Pickup Started 🏃‍♂️',
        message: `${data.contractorName} is on the way to collect your ${data.wasteType}.`,
        data: { jobId: data.jobId, type: this.notificationTypes.JOB_STARTED },
      },
      [this.notificationTypes.JOB_COMPLETED]: {
        title: 'Pickup Completed ✅',
        message: `Your ${data.wasteType} has been successfully picked up and disposed of.`,
        data: { jobId: data.jobId, type: this.notificationTypes.JOB_COMPLETED },
      },
      [this.notificationTypes.JOB_CANCELLED]: {
        title: 'Job Cancelled ❌',
        message: `Your pickup job has been cancelled. ${data.reason || 'We apologize for any inconvenience.'}`,
        data: { jobId: data.jobId, type: this.notificationTypes.JOB_CANCELLED },
      },
      [this.notificationTypes.MESSAGE_RECEIVED]: {
        title: `Message from ${data.senderName} 💬`,
        message: data.message || 'You have a new message',
        data: { jobId: data.jobId, senderId: data.senderId, type: this.notificationTypes.MESSAGE_RECEIVED },
      },
      [this.notificationTypes.PAYMENT_RECEIVED]: {
        title: 'Payment Received 💰',
        message: `You've earned $${data.amount} for your recent pickup job.`,
        data: { jobId: data.jobId, amount: data.amount, type: this.notificationTypes.PAYMENT_RECEIVED },
      },
      [this.notificationTypes.RATING_RECEIVED]: {
        title: 'New Rating ⭐',
        message: `You received a ${data.rating}-star rating${data.review ? ' with a review' : ''}.`,
        data: { ratingId: data.ratingId, rating: data.rating, type: this.notificationTypes.RATING_RECEIVED },
      },
      [this.notificationTypes.CONTRACTOR_NEARBY]: {
        title: 'Contractor Nearby 📍',
        message: `${data.contractorName} is approaching your location. ETA: ${data.eta} minutes.`,
        data: { jobId: data.jobId, contractorId: data.contractorId, type: this.notificationTypes.CONTRACTOR_NEARBY },
      },
      [this.notificationTypes.DISPUTE_CREATED]: {
        title: 'Dispute Reported ⚠️',
        message: `A dispute has been reported for job #${data.jobId?.slice(-6)}. Support will investigate.`,
        data: { disputeId: data.disputeId, jobId: data.jobId, type: this.notificationTypes.DISPUTE_CREATED },
      },
      [this.notificationTypes.VERIFICATION_APPROVED]: {
        title: 'Verification Approved! 🎉',
        message: 'Your account has been verified. You can now start accepting pickup jobs.',
        data: { type: this.notificationTypes.VERIFICATION_APPROVED },
      },
    };

    return templates[type] || {
      title: 'QuickTrash Update',
      message: 'You have a new update',
      data: { type: 'general' },
    };
  }

  async sendNotification(type, data = {}) {
    const template = this.getNotificationTemplate(type, data);
    return this.sendLocalNotification(template.title, template.message, template.data);
  }

  // Setup notification listeners
  setupNotificationListeners(navigation) {
    // Handle notification when app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
      // You can show an in-app notification here
    });

    // Handle notification when user taps on it
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      
      const { data } = response.notification.request.content;
      
      // Navigate based on notification type
      switch (data?.type) {
        case this.notificationTypes.JOB_ASSIGNED:
        case this.notificationTypes.JOB_STARTED:
        case this.notificationTypes.JOB_COMPLETED:
          if (data.jobId) {
            navigation.navigate('JobDetails', { jobId: data.jobId });
          }
          break;
        
        case this.notificationTypes.MESSAGE_RECEIVED:
          if (data.jobId) {
            navigation.navigate('Chat', { jobId: data.jobId });
          }
          break;
        
        case this.notificationTypes.DISPUTE_CREATED:
          if (data.disputeId) {
            navigation.navigate('DisputeDetails', { disputeId: data.disputeId });
          }
          break;
        
        default:
          // Navigate to appropriate dashboard based on user role
          // This would need to be determined from user context
          break;
      }
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }

  // Schedule notifications for specific times
  async scheduleNotification(title, message, triggerDate, data = {}) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: message,
        data,
        sound: 'default',
      },
      trigger: {
        date: triggerDate,
      },
    });
  }

  // Cancel all scheduled notifications
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Cancel specific notification
  async cancelNotification(notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  // Badge management
  async setBadgeCount(count) {
    await Notifications.setBadgeCountAsync(count);
  }

  async clearBadge() {
    await Notifications.setBadgeCountAsync(0);
  }
}

export default new NotificationManager();
