const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer is required']
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'Service is required']
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Service provider is required']
  },
  bookingDate: {
    type: Date,
    required: [true, 'Booking date is required']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'],
    default: 'pending'
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'online', 'wallet'],
    default: 'online'
  },
  notes: {
    customer: String,
    provider: String
  },
  specialRequests: [{
    type: String,
    trim: true
  }],
  cancellationReason: String,
  cancelledAt: Date,
  completedAt: Date,
  reminderSent: {
    type: Boolean,
    default: false
  },
  rating: {
    value: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: Date
  }
}, {
  timestamps: true
});

// Index for better query performance
bookingSchema.index({ customer: 1, bookingDate: 1 });
bookingSchema.index({ provider: 1, bookingDate: 1 });
bookingSchema.index({ status: 1, bookingDate: 1 });
bookingSchema.index({ bookingDate: 1, startTime: 1 });

// Virtual for formatted booking date
bookingSchema.virtual('formattedDate').get(function() {
  return this.bookingDate.toLocaleDateString();
});

// Virtual for duration in minutes
bookingSchema.virtual('duration').get(function() {
  const start = new Date(`2000-01-01T${this.startTime}`);
  const end = new Date(`2000-01-01T${this.endTime}`);
  return (end - start) / (1000 * 60);
});

module.exports = mongoose.model('Booking', bookingSchema);