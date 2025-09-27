const Notification = require('../models/Notification');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const webPushService = require('./webPushService');

// Socket.IO instance (will be set by server)
let io = null;

// Set the Socket.IO instance
const setSocketIO = (socketIO) => {
  io = socketIO;
};

class NotificationService {
  // Create a notification
  static async createNotification(notificationData) {
    try {
      console.log('NotificationService: Creating notification for recipient:', notificationData.recipient);
      console.log('NotificationService: Notification type:', notificationData.type);
      console.log('NotificationService: Notification title:', notificationData.title);
      
      const notification = new Notification(notificationData);
      await notification.save();
      
      console.log('NotificationService: Notification created successfully with ID:', notification._id);
      
      // Emit real-time notification
      if (io) {
        io.to(`user-${notificationData.recipient}`).emit('new-notification', {
          notification: notification,
          unreadCount: await this.getUnreadCount(notificationData.recipient)
        });
        console.log('NotificationService: Real-time notification sent to user:', notificationData.recipient);
      }

      // Send web push notification if enabled
      try {
        const user = await User.findById(notificationData.recipient);
        if (user && user.pushSubscription && user.preferences?.notifications?.push !== false) {
          const pushResult = await webPushService.sendPushNotification(notificationData.recipient, notification);
          if (pushResult.success) {
            console.log('NotificationService: Web push notification sent to user:', notificationData.recipient);
          } else {
            console.log('NotificationService: Web push notification failed:', pushResult.message);
          }
        }
      } catch (pushError) {
        console.error('NotificationService: Error sending web push notification:', pushError);
        // Don't throw error for push notification failures
      }
      
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Send order placed notification to admin and customer
  static async notifyOrderPlaced(orderId) {
    try {
      console.log('NotificationService: Starting notifyOrderPlaced for order:', orderId);
      
      const order = await Order.findById(orderId)
        .populate('customer', 'name email')
        .populate('items.product', 'name');

      if (!order) {
        throw new Error('Order not found');
      }

      console.log('NotificationService: Order found:', order.orderNumber);
      console.log('NotificationService: Customer:', order.customer.name);

      // Get admin users
      const admins = await User.find({ role: 'admin', isActive: true });
      console.log('NotificationService: Found', admins.length, 'admin users');

      // Check if customer is also an admin to avoid duplicate notifications
      const customerIsAdmin = admins.some(admin => admin._id.toString() === order.customer._id.toString());
      console.log('NotificationService: Customer is admin:', customerIsAdmin);
      console.log('NotificationService: Customer ID:', order.customer._id.toString());
      console.log('NotificationService: Admin IDs:', admins.map(admin => admin._id.toString()));
      
      // Notify customer (only if they're not an admin, or if they are admin, give them customer notification)
      if (!customerIsAdmin) {
        await this.createNotification({
          recipient: order.customer._id,
          type: 'order_placed',
          title: 'Order Placed Successfully!',
          message: `Your order #${order.orderNumber} has been placed successfully. We'll process it soon.`,
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            amount: order.totalAmount,
            url: `/my-orders/${order._id}`
          },
          priority: 'high',
          channels: ['in_app', 'email']
        });
      }

      // Notify all admins (including the customer if they're an admin)
      for (const admin of admins) {
        await this.createNotification({
          recipient: admin._id,
          type: 'order_placed',
          title: customerIsAdmin && admin._id.toString() === order.customer._id.toString() 
            ? 'Your Order Placed Successfully!' 
            : 'New Order Received!',
          message: customerIsAdmin && admin._id.toString() === order.customer._id.toString()
            ? `Your order #${order.orderNumber} has been placed successfully. We'll process it soon.`
            : `New order #${order.orderNumber} from ${order.customer.name} for $${order.totalAmount}`,
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            amount: order.totalAmount,
            url: customerIsAdmin && admin._id.toString() === order.customer._id.toString()
              ? `/my-orders/${order._id}`
              : `/admin/orders/${order._id}`
          },
          priority: customerIsAdmin && admin._id.toString() === order.customer._id.toString() ? 'high' : 'urgent',
          channels: ['in_app', 'email']
        });
      }

      console.log(`Order placed notifications sent for order ${order.orderNumber}`);
    } catch (error) {
      console.error('Error sending order placed notifications:', error);
      throw error;
    }
  }

  // Send order status update notification
  static async notifyOrderStatusUpdate(orderId, newStatus) {
    try {
      const order = await Order.findById(orderId)
        .populate('customer', 'name email');

      if (!order) {
        throw new Error('Order not found');
      }

      const statusMessages = {
        confirmed: {
          title: 'Order Confirmed!',
          message: `Your order #${order.orderNumber} has been confirmed and is being prepared.`,
          priority: 'high'
        },
        processing: {
          title: 'Order Processing!',
          message: `Your order #${order.orderNumber} is being processed and will ship soon.`,
          priority: 'medium'
        },
        shipped: {
          title: 'Order Shipped!',
          message: `Your order #${order.orderNumber} has been shipped. Tracking: ${order.trackingNumber || 'N/A'}`,
          priority: 'high'
        },
        delivered: {
          title: 'Order Delivered!',
          message: `Your order #${order.orderNumber} has been delivered successfully.`,
          priority: 'high'
        },
        cancelled: {
          title: 'Order Cancelled',
          message: `Your order #${order.orderNumber} has been cancelled.`,
          priority: 'high'
        }
      };

      const statusInfo = statusMessages[newStatus];
      if (statusInfo) {
        console.log(`NotificationService: Creating ${newStatus} notification for customer:`, order.customer._id);
        console.log(`NotificationService: Order:`, order.orderNumber);
        console.log(`NotificationService: Customer:`, order.customer.name);
        
        await this.createNotification({
          recipient: order.customer._id,
          type: `order_${newStatus}`,
          title: statusInfo.title,
          message: statusInfo.message,
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            url: `/my-orders/${order._id}`
          },
          priority: statusInfo.priority,
          channels: ['in_app', 'email']
        });

        // Update order notifications
        order.notifications.push({
          type: `order_${newStatus}`,
          message: statusInfo.message,
          sentTo: 'customer'
        });
        await order.save();
      }

      console.log(`Order status update notification sent for order ${order.orderNumber}`);
    } catch (error) {
      console.error('Error sending order status update notification:', error);
      throw error;
    }
  }

  // Send low stock notification to admin
  static async notifyLowStock(productId) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      const admins = await User.find({ role: 'admin', isActive: true });

      for (const admin of admins) {
        await this.createNotification({
          recipient: admin._id,
          type: 'stock_low',
          title: 'Low Stock Alert!',
          message: `${product.name} is running low on stock (${product.quantity} remaining)`,
          data: {
            productId: product._id,
            productName: product.name,
            url: `/admin/products/${product._id}`
          },
          priority: 'high',
          channels: ['in_app', 'email']
        });
      }

      console.log(`Low stock notifications sent for product ${product.name}`);
    } catch (error) {
      console.error('Error sending low stock notifications:', error);
      throw error;
    }
  }

  // Send out of stock notification to admin
  static async notifyOutOfStock(productId) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      const admins = await User.find({ role: 'admin', isActive: true });

      for (const admin of admins) {
        await this.createNotification({
          recipient: admin._id,
          type: 'stock_out',
          title: 'Out of Stock Alert!',
          message: `${product.name} is now out of stock`,
          data: {
            productId: product._id,
            productName: product.name,
            url: `/admin/products/${product._id}`
          },
          priority: 'urgent',
          channels: ['in_app', 'email']
        });
      }

      console.log(`Out of stock notifications sent for product ${product.name}`);
    } catch (error) {
      console.error('Error sending out of stock notifications:', error);
      throw error;
    }
  }

  // Get notifications for a user
  static async getUserNotifications(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        unreadOnly = false,
        type = null
      } = options;

      const query = { recipient: userId };
      if (unreadOnly) query.isRead = false;
      if (type) query.type = type;

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('recipient', 'name email');

      const total = await Notification.countDocuments(query);

      return {
        notifications,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      };
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { isRead: true, readAt: new Date() },
        { new: true }
      );

      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId) {
    try {
      await Notification.updateMany(
        { recipient: userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );

      return { success: true };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Get unread notification count
  static async getUnreadCount(userId) {
    try {
      const count = await Notification.countDocuments({
        recipient: userId,
        isRead: false
      });

      return count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }
}

module.exports = { NotificationService, setSocketIO };