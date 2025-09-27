const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const webPushService = require('../services/webPushService');

// Get VAPID public key
router.get('/vapid-key', (req, res) => {
  try {
    const publicKey = webPushService.getVapidPublicKey();
    res.json({
      success: true,
      data: { publicKey }
    });
  } catch (error) {
    console.error('Error getting VAPID key:', error);
    res.status(500).json({
      success: false,
      message: 'VAPID keys not configured'
    });
  }
});

// Subscribe to push notifications
router.post('/subscribe', protect, async (req, res) => {
  try {
    const { subscription } = req.body;
    const userId = req.user.id;

    // Basic validation
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription data'
      });
    }

    await webPushService.savePushSubscription(userId, subscription);

    res.json({
      success: true,
      message: 'Push subscription saved successfully'
    });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save push subscription'
    });
  }
});

// Unsubscribe from push notifications
router.delete('/unsubscribe', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    await webPushService.deletePushSubscription(userId);
    res.json({ success: true, message: 'Push subscription deleted successfully' });
  } catch (error) {
    console.error('Error deleting push subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete push subscription'
    });
  }
});

// Send a test push notification
router.post('/test', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const testNotification = {
      title: 'Test Notification',
      message: 'This is a test push notification from SnacksShop!',
      data: { url: '/dashboard' }
    };
    const result = await webPushService.sendPushNotification(userId, testNotification);
    if (result.success) {
      res.json({ success: true, message: 'Test push notification sent' });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Error sending test push notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification'
    });
  }
});

// Get push notification status
router.get('/status', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await require('../models/User').findById(userId);
    
    res.json({
      success: true,
      hasSubscription: !!user.pushSubscription,
      subscriptionUpdatedAt: user.pushSubscriptionUpdatedAt,
      pushEnabled: user.preferences?.notifications?.push !== false
    });
  } catch (error) {
    console.error('Error getting push status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get push status'
    });
  }
});

// Update push notification preferences
router.put('/preferences', protect, async (req, res) => {
  try {
    const { pushEnabled } = req.body;
    const userId = req.user.id;
    
    // Basic validation
    if (typeof pushEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Push enabled must be boolean'
      });
    }
    
    const user = await require('../models/User').findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.preferences) {
      user.preferences = {};
    }
    if (!user.preferences.notifications) {
      user.preferences.notifications = {};
    }
    
    user.preferences.notifications.push = pushEnabled;
    await user.save();

    res.json({
      success: true,
      message: 'Push preferences updated successfully'
    });
  } catch (error) {
    console.error('Error updating push preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update push preferences'
    });
  }
});

module.exports = router;
