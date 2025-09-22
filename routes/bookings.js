const express = require('express');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const { protect, authorize } = require('../middleware/auth');
const { validateBooking, validateObjectId, validatePagination } = require('../middleware/validation');
const moment = require('moment');

const router = express.Router();

// @route   GET /api/bookings
// @desc    Get all bookings with filtering and pagination
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
    } else if (req.user.role === 'service_provider') {
      filter.provider = req.user.id;
    }
    // Admin can see all bookings
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.serviceId) {
      filter.service = req.query.serviceId;
    }
    
    if (req.query.date) {
      const startOfDay = moment(req.query.date).startOf('day').toDate();
      const endOfDay = moment(req.query.date).endOf('day').toDate();
      filter.bookingDate = { $gte: startOfDay, $lte: endOfDay };
    }

    const bookings = await Booking.find(filter)
      .populate('customer', 'name email phone')
      .populate('service', 'name price duration category')
      .populate('provider', 'name email phone')
      .sort({ bookingDate: -1, startTime: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Booking.countDocuments(filter);

    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
      error: error.message
    });
  }
});

// @route   GET /api/bookings/:id
// @desc    Get single booking
// @access  Private
router.get('/:id', protect, validateObjectId, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('service', 'name price duration category')
      .populate('provider', 'name email phone');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user has access to this booking
    const hasAccess = 
      booking.customer._id.toString() === req.user.id ||
      booking.provider._id.toString() === req.user.id ||
      req.user.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking'
      });
    }

    res.json({
      success: true,
      data: { booking }
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking',
      error: error.message
    });
  }
});

// @route   POST /api/bookings
// @desc    Create new booking
// @access  Private (Customer)
router.post('/', protect, authorize('customer'), validateBooking, async (req, res) => {
  try {
    const { serviceId, bookingDate, startTime, endTime, specialRequests = [], notes } = req.body;

    // Get service details
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    if (!service.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Service is not available'
      });
    }

    // Check if booking date is in the future
    const bookingDateTime = moment(`${bookingDate} ${startTime}`);
    if (bookingDateTime.isBefore(moment())) {
      return res.status(400).json({
        success: false,
        message: 'Cannot book in the past'
      });
    }

    // Check for conflicting bookings
    const conflictingBooking = await Booking.findOne({
      service: serviceId,
      bookingDate: new Date(bookingDate),
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
      status: { $in: ['pending', 'confirmed'] }
    });

    if (conflictingBooking) {
      return res.status(400).json({
        success: false,
        message: 'Time slot is already booked'
      });
    }

    // Create booking
    const booking = await Booking.create({
      customer: req.user.id,
      service: serviceId,
      provider: service.provider,
      bookingDate: new Date(bookingDate),
      startTime,
      endTime,
      totalAmount: service.price,
      specialRequests,
      notes: { customer: notes }
    });

    // Populate the booking with related data
    await booking.populate([
      { path: 'customer', select: 'name email phone' },
      { path: 'service', select: 'name price duration category' },
      { path: 'provider', select: 'name email phone' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: { booking }
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating booking',
      error: error.message
    });
  }
});

// @route   PUT /api/bookings/:id/status
// @desc    Update booking status
// @access  Private (Provider/Admin)
router.put('/:id/status', protect, authorize('service_provider', 'admin'), validateObjectId, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user has access to this booking
    if (booking.provider.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this booking'
      });
    }

    // Update booking status
    booking.status = status;
    if (notes) {
      booking.notes.provider = notes;
    }

    // Set completion or cancellation timestamp
    if (status === 'completed') {
      booking.completedAt = new Date();
    } else if (status === 'cancelled') {
      booking.cancelledAt = new Date();
    }

    await booking.save();

    // Populate the booking with related data
    await booking.populate([
      { path: 'customer', select: 'name email phone' },
      { path: 'service', select: 'name price duration category' },
      { path: 'provider', select: 'name email phone' }
    ]);

    res.json({
      success: true,
      message: 'Booking status updated successfully',
      data: { booking }
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating booking status',
      error: error.message
    });
  }
});

// @route   POST /api/bookings/:id/cancel
// @desc    Cancel booking
// @access  Private
router.post('/:id/cancel', protect, validateObjectId, async (req, res) => {
  try {
    const { reason } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user has access to this booking
    const hasAccess = 
      booking.customer.toString() === req.user.id ||
      booking.provider.toString() === req.user.id ||
      req.user.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking'
      });
    }

    // Check if booking can be cancelled
    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed booking'
      });
    }

    // Update booking status
    booking.status = 'cancelled';
    booking.cancellationReason = reason;
    booking.cancelledAt = new Date();

    await booking.save();

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: { booking }
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling booking',
      error: error.message
    });
  }
});

// @route   POST /api/bookings/:id/rate
// @desc    Rate booking
// @access  Private (Customer)
router.post('/:id/rate', protect, authorize('customer'), validateObjectId, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user owns this booking
    if (booking.customer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to rate this booking'
      });
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only rate completed bookings'
      });
    }

    // Check if already rated
    if (booking.rating && booking.rating.value) {
      return res.status(400).json({
        success: false,
        message: 'Booking already rated'
      });
    }

    // Add rating
    booking.rating = {
      value: rating,
      comment: comment || '',
      createdAt: new Date()
    };

    await booking.save();

    res.json({
      success: true,
      message: 'Rating submitted successfully',
      data: { booking }
    });
  } catch (error) {
    console.error('Rate booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rating booking',
      error: error.message
    });
  }
});

// @route   GET /api/bookings/availability/:serviceId
// @desc    Get available time slots for a service
// @access  Public
router.get('/availability/:serviceId', validateObjectId, async (req, res) => {
  try {
    const { date } = req.query;
    const serviceId = req.params.serviceId;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    const service = await Service.findById(serviceId);
    if (!service || !service.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    const requestedDate = moment(date);
    const dayOfWeek = requestedDate.format('dddd').toLowerCase();
    
    // Get service availability for the requested day
    const dayAvailability = service.availability[dayOfWeek];
    if (!dayAvailability || dayAvailability.length === 0) {
      return res.json({
        success: true,
        data: { availableSlots: [] }
      });
    }

    // Get existing bookings for the date
    const startOfDay = requestedDate.startOf('day').toDate();
    const endOfDay = requestedDate.endOf('day').toDate();
    
    const existingBookings = await Booking.find({
      service: serviceId,
      bookingDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['pending', 'confirmed'] }
    });

    // Generate available time slots
    const availableSlots = [];
    const slotDuration = service.duration;

    dayAvailability.forEach(timeSlot => {
      const startTime = moment(`${date} ${timeSlot.start}`);
      const endTime = moment(`${date} ${timeSlot.end}`);

      while (startTime.clone().add(slotDuration, 'minutes').isSameOrBefore(endTime)) {
        const slotStart = startTime.format('HH:mm');
        const slotEnd = startTime.clone().add(slotDuration, 'minutes').format('HH:mm');

        // Check if this slot is available
        const isBooked = existingBookings.some(booking => {
          const bookingStart = moment(`${date} ${booking.startTime}`);
          const bookingEnd = moment(`${date} ${booking.endTime}`);
          return startTime.isBefore(bookingEnd) && startTime.clone().add(slotDuration, 'minutes').isAfter(bookingStart);
        });

        if (!isBooked) {
          availableSlots.push({
            startTime: slotStart,
            endTime: slotEnd,
            available: true
          });
        }

        startTime.add(slotDuration, 'minutes');
      }
    });

    res.json({
      success: true,
      data: { availableSlots }
    });
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching availability',
      error: error.message
    });
  }
});

module.exports = router;