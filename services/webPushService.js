const webpush = require('web-push');
const User = require('../models/User');

class WebPushService {
  constructor() {
    // Initialize web-push with VAPID keys
    this.initializeVapidKeys();
  }

  initializeVapidKeys() {
    const vapidKeys = {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
      subject: process.env.VAPID_SUBJECT || 'mailto:admin@snacksshop.com'
    };

    if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
      console.warn('⚠️ VAPID keys not found. Web push notifications will not work.');
      console.warn('Please set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in your environment variables.');
      return;
    }

    webpush.setVapidDetails(
      vapidKeys.subject,
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );

    this.vapidKeys = vapidKeys;
    console.log('✅ Web push service initialized with VAPID keys');
  }

  // Send push notification to a specific user
  async sendPushNotification(userId, notification) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.pushSubscription) {
        console.log(`No push subscription found for user ${userId}`);
        return { success: false, message: 'No push subscription found' };
      }

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.message,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        data: {
          url: notification.data?.url || '/',
          notificationId: notification._id,
          type: notification.type
        },
        actions: [
          {
            action: 'view',
            title: 'View',
            icon: '/icons/icon-72x72.png'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ],
        requireInteraction: notification.priority === 'urgent',
        tag: `notification-${notification._id}`,
        timestamp: Date.now()
      });

      const result = await webpush.sendNotification(
        user.pushSubscription,
        payload
      );

      console.log(`Push notification sent to user ${userId}:`, notification.title);
      return { success: true, result };
    } catch (error) {
      console.error('Error sending push notification:', error);
      
      // If subscription is invalid, remove it
      if (error.statusCode === 410) {
        await this.removePushSubscription(userId);
        return { success: false, message: 'Invalid subscription, removed' };
      }
      
      return { success: false, error: error.message };
    }
  }

  // Send push notification to multiple users
  async sendPushNotificationToUsers(userIds, notification) {
    const results = [];
    
    for (const userId of userIds) {
      const result = await this.sendPushNotification(userId, notification);
      results.push({ userId, ...result });
    }
    
    return results;
  }

  // Save push subscription for a user
  async savePushSubscription(userId, subscription) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.pushSubscription = subscription;
      user.pushSubscriptionUpdatedAt = new Date();
      await user.save();

      console.log(`Push subscription saved for user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('Error saving push subscription:', error);
      throw error;
    }
  }

  // Remove push subscription for a user
  async removePushSubscription(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      user.pushSubscription = null;
      user.pushSubscriptionUpdatedAt = new Date();
      await user.save();

      console.log(`Push subscription removed for user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('Error removing push subscription:', error);
      throw error;
    }
  }

  // Get VAPID public key for frontend
  getVapidPublicKey() {
    if (!this.vapidKeys) {
      throw new Error('VAPID keys not initialized');
    }
    return this.vapidKeys.publicKey;
  }

  // Test push notification
  async testPushNotification(userId) {
    const testNotification = {
      _id: 'test',
      title: 'Test Notification',
      message: 'This is a test push notification from SnacksShop!',
      type: 'test',
      priority: 'medium',
      data: { url: '/' }
    };

    return await this.sendPushNotification(userId, testNotification);
  }

  // Send bulk push notifications
  async sendBulkPushNotifications(notifications) {
    const results = [];
    
    for (const notification of notifications) {
      const result = await this.sendPushNotification(notification.recipient, notification);
      results.push({ notificationId: notification._id, ...result });
    }
    
    return results;
  }
}

module.exports = new WebPushService();
