const Notification = require('../models/Notification');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');

class NotificationService {
  // Create a notification
  static async createNotification(notificationData) {
    try {
      const notification = new Notification(notificationData);
      await notification.save();
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Send order placed notification to admin and customer
  static async notifyOrderPlaced(orderId) {
    try {
      const order = await Order.findById(orderId)
        .populate('customer', 'name email')
        .populate('items.product', 'name');

      if (!order) {
        throw new Error('Order not found');
      }

      // Get admin users
      const admins = await User.find({ role: 'admin', isActive: true });

      // Notify customer
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

      // Notify all admins
      for (const admin of admins) {
        await this.createNotification({
          recipient: admin._id,
          type: 'order_placed',
          title: 'New Order Received!',
          message: `New order #${order.orderNumber} from ${order.customer.name} for $${order.totalAmount}`,
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            amount: order.totalAmount,
            url: `/admin/orders/${order._id}`
          },
          priority: 'urgent',
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
          message: `${product.name} is running low on stock (${product.stock} remaining)`,
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

module.exports = NotificationService;