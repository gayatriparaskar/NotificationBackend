const mongoose = require('mongoose');
const Product = require('./models/Product');
const User = require('./models/User');
require('dotenv').config();

const sampleProducts = [
  {
    name: "Ball Python",
    description: "A gentle and docile snake perfect for beginners. Known for their calm temperament and beautiful patterns.",
    price: 89.99,
    offerPrice: 79.99,
    quantity: 15,
    category: "pythons",
    species: "ball-python",
    difficulty: "beginner",
    images: [
      {
        url: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop",
        alt: "Ball Python"
      }
    ]
  },
  {
    name: "Corn Snake",
    description: "One of the most popular pet snakes. Hardy, easy to care for, and comes in many beautiful color morphs.",
    price: 45.99,
    quantity: 20,
    category: "colubrids",
    species: "corn-snake",
    difficulty: "beginner",
    images: [
      {
        url: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&h=300&fit=crop",
        alt: "Corn Snake"
      }
    ]
  },
  {
    name: "Boa Constrictor",
    description: "A larger snake for experienced keepers. Impressive size and beautiful patterns.",
    price: 199.99,
    quantity: 8,
    category: "boas",
    species: "boa-constrictor",
    difficulty: "intermediate",
    images: [
      {
        url: "https://images.unsplash.com/photo-1544966503-7cc4ac81b4d4?w=400&h=300&fit=crop",
        alt: "Boa Constrictor"
      }
    ]
  },
  {
    name: "King Snake",
    description: "Beautiful and hardy snake with striking patterns. Great for intermediate keepers.",
    price: 79.99,
    quantity: 12,
    category: "colubrids",
    species: "king-snake",
    difficulty: "intermediate",
    images: [
      {
        url: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop",
        alt: "King Snake"
      }
    ]
  },
  {
    name: "Snake Terrarium Kit",
    description: "Complete starter kit for snake keeping. Includes terrarium, heating, and basic accessories.",
    price: 149.99,
    offerPrice: 129.99,
    quantity: 25,
    category: "accessories",
    species: "terrarium",
    difficulty: "beginner",
    images: [
      {
        url: "https://images.unsplash.com/photo-1544966503-7cc4ac81b4d4?w=400&h=300&fit=crop",
        alt: "Snake Terrarium Kit"
      }
    ]
  },
  {
    name: "Heating Pad",
    description: "Under-tank heating pad for maintaining proper temperature in your snake's enclosure.",
    price: 24.99,
    quantity: 30,
    category: "accessories",
    species: "heating",
    difficulty: "beginner",
    images: [
      {
        url: "https://images.unsplash.com/photo-1544966503-7cc4ac81b4d4?w=400&h=300&fit=crop",
        alt: "Heating Pad"
      }
    ]
  }
];

async function seedProducts() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/booking-platform';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find or create an admin user
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Admin User',
        email: 'admin@snacksshop.com',
        password: 'admin123',
        phone: '+1234567890',
        role: 'admin'
      });
      console.log('Created admin user');
    }

    // Clear existing products
    await Product.deleteMany({});
    console.log('Cleared existing products');

    // Add createdBy field to all products
    const productsWithCreator = sampleProducts.map(product => ({
      ...product,
      createdBy: adminUser._id
    }));

    // Create products
    const products = await Product.create(productsWithCreator);
    console.log(`Created ${products.length} products`);

    // Display categories
    const categories = await Product.distinct('category');
    console.log('Available categories:', categories);

    console.log('✅ Product seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding products:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seeder
seedProducts();
