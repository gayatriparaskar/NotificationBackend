const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
    maxlength: [100, 'Service name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Service description is required'],
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Service category is required'],
    enum: ['healthcare', 'beauty', 'fitness', 'education', 'consultation', 'maintenance', 'other']
  },
  price: {
    type: Number,
    required: [true, 'Service price is required'],
    min: [0, 'Price cannot be negative']
  },
  duration: {
    type: Number,
    required: [true, 'Service duration is required'],
    min: [15, 'Duration must be at least 15 minutes']
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Service provider is required']
  },
  images: [{
    url: String,
    alt: String
  }],
  availability: {
    monday: [{ start: String, end: String }],
    tuesday: [{ start: String, end: String }],
    wednesday: [{ start: String, end: String }],
    thursday: [{ start: String, end: String }],
    friday: [{ start: String, end: String }],
    saturday: [{ start: String, end: String }],
    sunday: [{ start: String, end: String }]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  maxBookingsPerSlot: {
    type: Number,
    default: 1,
    min: 1
  },
  requirements: [{
    type: String,
    trim: true
  }],
  cancellationPolicy: {
    freeCancellationHours: {
      type: Number,
      default: 24
    },
    cancellationFee: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Index for better query performance
serviceSchema.index({ category: 1, isActive: 1 });
serviceSchema.index({ provider: 1, isActive: 1 });

module.exports = mongoose.model('Service', serviceSchema);