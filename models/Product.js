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
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  offerPrice: {
    type: Number,
    min: [0, 'Offer price cannot be negative'],
    validate: {
      validator: function(value) {
        return !value || value < this.price;
      },
      message: 'Offer price must be less than regular price'
    }
  },
  quantity: {
    type: Number,
    required: [true, 'Product quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for better query performance
productSchema.index({ isActive: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdBy: 1 });

// Virtual for formatted price
productSchema.virtual('formattedPrice').get(function() {
  return `$${this.price.toFixed(2)}`;
});

// Virtual for formatted offer price
productSchema.virtual('formattedOfferPrice').get(function() {
  return this.offerPrice ? `$${this.offerPrice.toFixed(2)}` : null;
});

// Virtual for quantity status
productSchema.virtual('quantityStatus').get(function() {
  if (this.quantity === 0) return 'out_of_stock';
  if (this.quantity <= 5) return 'low_stock';
  return 'in_stock';
});

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (!this.offerPrice || this.offerPrice >= this.price) return 0;
  return Math.round(((this.price - this.offerPrice) / this.price) * 100);
});

module.exports = mongoose.model('Product', productSchema);