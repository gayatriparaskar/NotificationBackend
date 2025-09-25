const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');
const { NotificationService } = require('../services/notificationService');

const router = express.Router();

// @route   GET /api/orders
// @desc    Get all orders with filtering and pagination
// @access  Private
router.get('/', protect, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter object based on user role
    const filter = {};
    
    if (req.user.role === 'customer') {
      filter.customer = req.user.id;
    }
    // Admin can see all orders
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }
    
    if (req.query.orderNumber) {
      filter.orderNumber = { $regex: req.query.orderNumber, $options: 'i' };
    }

    const orders = await Order.find(filter)
      .populate('customer', 'name email phone')
      .populate('items.product', 'name images species morph')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message
    });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private
router.get('/:id', protect, validateObjectId, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone address')
      .populate('items.product', 'name images species morph price');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user has access to this order
    const hasAccess = 
      order.customer._id.toString() === req.user.id ||
      req.user.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }

    res.json({
      success: true,
      data: { order }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order',
      error: error.message
    });
  }
});

// @route   POST /api/orders
// @desc    Create new order
// @access  Private (Customer)
router.post('/', protect, authorize('customer'), async (req, res) => {
  try {
    const { items, shippingAddress, billingAddress, paymentMethod, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item'
      });
    }

    // Validate products and calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product with ID ${item.productId} not found`
        });
      }

      if (!product.isActive || product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.quantity}`
        });
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price
      });
    }

    // Calculate shipping and tax (simplified)
    const shippingCost = subtotal > 100 ? 0 : 15; // Free shipping over $100
    const tax = subtotal * 0.08; // 8% tax
    const totalAmount = subtotal + shippingCost + tax;

    // Create order
    const order = await Order.create({
      customer: req.user.id,
      items: orderItems,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      paymentMethod,
      subtotal,
      shippingCost,
      tax,
      totalAmount,
      notes: { customer: notes }
    });

    // Update product stock
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { quantity: -item.quantity } }
      );
    }

    // Populate the order with related data
    await order.populate([
      { path: 'customer', select: 'name email phone' },
      { path: 'items.product', select: 'name images species morph' }
    ]);

    // Send notifications
    console.log('Sending order placed notifications for order:', order._id);
    await NotificationService.notifyOrderPlaced(order._id);
    console.log('Order placed notifications sent successfully');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: error.message
    });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private (Admin)
router.put('/:id/status', protect, authorize('admin'), validateObjectId, async (req, res) => {
  try {
    const { status, trackingNumber, notes } = req.body;
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update order status
    order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (notes) order.notes.admin = notes;

    // Set delivery date for shipped status
    if (status === 'shipped') {
      order.estimatedDelivery = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
    }

    // Set actual delivery date
    if (status === 'delivered') {
      order.actualDelivery = new Date();
    }

    await order.save();

    // Send notification
    await NotificationService.notifyOrderStatusUpdate(order._id, status);

    // Populate the order with related data
    await order.populate([
      { path: 'customer', select: 'name email phone' },
      { path: 'items.product', select: 'name images species morph' }
    ]);

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order status',
      error: error.message
    });
  }
});

// @route   POST /api/orders/:id/confirm
// @desc    Confirm order (Admin only)
// @access  Private (Admin)
router.post('/:id/confirm', protect, authorize('admin'), validateObjectId, async (req, res) => {
  try {
    const { notes } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending orders can be confirmed'
      });
    }

    // Update order status to confirmed
    order.status = 'confirmed';
    if (notes) order.notes.admin = notes;

    await order.save();

    // Send notification
    console.log('Sending order confirmation notification for order:', order._id);
    await NotificationService.notifyOrderStatusUpdate(order._id, 'confirmed');
    console.log('Order confirmation notification sent successfully');

    // Populate the order with related data
    await order.populate([
      { path: 'customer', select: 'name email phone' },
      { path: 'items.product', select: 'name images species morph' }
    ]);

    res.json({
      success: true,
      message: 'Order confirmed successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Confirm order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error confirming order',
      error: error.message
    });
  }
});

// @route   POST /api/orders/:id/reject
// @desc    Reject order (Admin only)
// @access  Private (Admin)
router.post('/:id/reject', protect, authorize('admin'), validateObjectId, async (req, res) => {
  try {
    const { reason, notes } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending orders can be rejected'
      });
    }

    // Update order status to cancelled and add rejection reason
    order.status = 'cancelled';
    order.cancellationReason = reason;
    order.cancelledAt = new Date();
    if (notes) order.notes.admin = notes;

    // Restore product stock since order is rejected
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { quantity: item.quantity } }
      );
    }

    await order.save();

    // Send notification
    await NotificationService.notifyOrderStatusUpdate(order._id, 'cancelled');

    // Populate the order with related data
    await order.populate([
      { path: 'customer', select: 'name email phone' },
      { path: 'items.product', select: 'name images species morph' }
    ]);

    res.json({
      success: true,
      message: 'Order rejected successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Reject order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting order',
      error: error.message
    });
  }
});

// @route   POST /api/orders/:id/cancel
// @desc    Cancel order
// @access  Private
router.post('/:id/cancel', protect, validateObjectId, async (req, res) => {
  try {
    const { reason } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user has access to this order
    const hasAccess = 
      order.customer.toString() === req.user.id ||
      req.user.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order'
      });
    }

    // Check if order can be cancelled
    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Order is already cancelled'
      });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel delivered order'
      });
    }

    // Update order status
    order.status = 'cancelled';
    order.cancellationReason = reason;
    order.cancelledAt = new Date();

    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { quantity: item.quantity } }
      );
    }

    await order.save();

    // Send notification
    await NotificationService.notifyOrderStatusUpdate(order._id, 'cancelled');

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling order',
      error: error.message
    });
  }
});

// @route   GET /api/orders/stats/overview
// @desc    Get order statistics
// @access  Private (Admin)
router.get('/stats/overview', protect, authorize('admin'), async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const confirmedOrders = await Order.countDocuments({ status: 'confirmed' });
    const shippedOrders = await Order.countDocuments({ status: 'shipped' });
    const deliveredOrders = await Order.countDocuments({ status: 'delivered' });
    const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });

    // Calculate total revenue
    const revenueResult = await Order.aggregate([
      { $match: { status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    // Get recent orders count (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentOrders = await Order.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    res.json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        confirmedOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue,
        recentOrders
      }
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order statistics',
      error: error.message
    });
  }
});

module.exports = router;