const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: ['ball_python', 'corn_snake', 'king_snake', 'milk_snake', 'boa_constrictor', 'python', 'other']
  },
  species: {
    type: String,
    required: [true, 'Snake species is required'],
    trim: true
  },
  morph: {
    type: String,
    required: [true, 'Snake morph is required'],
    trim: true
  },
  age: {
    type: String,
    required: [true, 'Snake age is required'],
    enum: ['hatchling', 'juvenile', 'sub_adult', 'adult']
  },
  size: {
    length: {
      type: Number,
      required: [true, 'Length is required'],
      min: [1, 'Length must be positive']
    },
    unit: {
      type: String,
      enum: ['inches', 'cm'],
      default: 'inches'
    }
  },
  weight: {
    type: Number,
    required: [true, 'Weight is required'],
    min: [0.1, 'Weight must be positive']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  images: [{
    url: String,
    alt: String,
    isPrimary: { type: Boolean, default: false }
  }],
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  features: [{
    type: String,
    trim: true
  }],
  careInstructions: {
    temperature: {
      hot: String,
      cool: String
    },
    humidity: String,
    feeding: String,
    housing: String
  },
  healthGuarantee: {
    type: String,
    default: '30 days health guarantee'
  },
  shipping: {
    available: { type: Boolean, default: true },
    cost: { type: Number, default: 0 },
    estimatedDays: { type: Number, default: 3 }
  },
  tags: [{
    type: String,
    trim: true
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for better query performance
productSchema.index({ category: 1, isActive: 1, isAvailable: 1 });
productSchema.index({ species: 1, morph: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdBy: 1 });

// Virtual for formatted price
productSchema.virtual('formattedPrice').get(function() {
  return `$${this.price.toFixed(2)}`;
});

// Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
  if (this.stock === 0) return 'out_of_stock';
  if (this.stock <= 5) return 'low_stock';
  return 'in_stock';
});

module.exports = mongoose.model('Product', productSchema);