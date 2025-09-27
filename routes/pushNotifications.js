const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const webPushService = require('../services/webPushService');
const { body, validationResult } = require('express-validator');

// Get VAPID public key
router.get('/vapid-key', (req, res) => {
  try {
    const publicKey = webPushService.getVapidPublicKey();
    res.json({
      success: true,
      publicKey
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
router.post('/subscribe', auth, async (req, res) => {
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
router.delete('/unsubscribe', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    await webPushService.removePushSubscription(userId);

    res.json({
      success: true,
      message: 'Push subscription removed successfully'
    });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove push subscription'
    });
  }
});

// Test push notification
router.post('/test', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await webPushService.testPushNotification(userId);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Test push notification sent successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Failed to send test notification'
      });
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
router.get('/status', auth, async (req, res) => {
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
router.put('/preferences', auth, async (req, res) => {
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
