const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');
const Notification = require('./models/Notification');
require('dotenv').config();

const demoUsers = [
  {
    name: 'Admin User',
    email: 'admin@snakeshop.com',
    password: 'admin123',
    phone: '+1234567890',
    role: 'admin',
    address: {
      street: '123 Admin St',
      city: 'Admin City',
      state: 'AC',
      zipCode: '12345',
      country: 'USA'
    }
  },
  {
    name: 'John Customer',
    email: 'customer@snakeshop.com',
    password: 'customer123',
    phone: '+1234567891',
    role: 'customer',
    address: {
      street: '456 Customer Ave',
      city: 'Customer City',
      state: 'CC',
      zipCode: '54321',
      country: 'USA'
    }
  },
  {
    name: 'Dr. Sarah Provider',
    email: 'provider@example.com',
    password: 'provider123',
    phone: '+1234567892',
    role: 'service_provider',
    address: {
      street: '789 Provider Blvd',
      city: 'Provider City',
      state: 'PC',
      zipCode: '67890',
      country: 'USA'
    }
  }
];

const demoProducts = [
  {
    name: 'Ball Python - Pastel Morph',
    description: 'Beautiful pastel ball python with excellent temperament. Perfect for beginners. Comes with health guarantee and care instructions.',
    price: 150,
    offerPrice: 120,
    quantity: 5
  },
  {
    name: 'Corn Snake - Amelanistic',
    description: 'Stunning amelanistic corn snake with vibrant orange and red colors. Very docile and easy to handle.',
    price: 120,
    quantity: 3
  },
  {
    name: 'King Snake - California',
    description: 'Beautiful California king snake with classic black and white banding. Hardy and easy to care for.',
    price: 180,
    offerPrice: 150,
    quantity: 2
  },
  {
    name: 'Milk Snake - Pueblan',
    description: 'Striking Pueblan milk snake with bright red, black, and white bands. Great for beginners.',
    price: 100,
    quantity: 4
  },
  {
    name: 'Boa Constrictor - Red Tail',
    description: 'Beautiful red tail boa with excellent temperament. Perfect for experienced keepers.',
    price: 300,
    offerPrice: 250,
    quantity: 1
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/booking-platform');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await Notification.deleteMany({});
    console.log('Cleared existing data');

    // Create users
    const createdUsers = [];
    for (const userData of demoUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const user = new User({
        ...userData,
        password: hashedPassword
      });
      await user.save();
      createdUsers.push(user);
      console.log(`Created user: ${user.email}`);
    }

    // Create products (assign to admin user)
    const adminUser = createdUsers.find(user => user.role === 'admin');
    for (const productData of demoProducts) {
      const product = new Product({
        ...productData,
        createdBy: adminUser._id
      });
      await product.save();
      console.log(`Created product: ${product.name}`);
    }

    // Create some demo orders
    const customerUser = createdUsers.find(user => user.role === 'customer');
    const products = await Product.find();
    
        if (products.length > 0) {
          const demoOrder = new Order({
            customer: customerUser._id,
            items: [
              {
                product: products[0]._id,
                quantity: 1,
                price: products[0].price
              }
            ],
            shippingAddress: {
              street: '123 Customer St',
              city: 'Customer City',
              state: 'CC',
              zipCode: '12345',
              country: 'USA',
              phone: '+1234567891'
            },
            billingAddress: {
              street: '123 Customer St',
              city: 'Customer City',
              state: 'CC',
              zipCode: '12345',
              country: 'USA'
            },
            subtotal: products[0].price,
            shippingCost: 25,
            tax: products[0].price * 0.08,
            totalAmount: products[0].price + 25 + (products[0].price * 0.08),
            status: 'confirmed',
            paymentStatus: 'paid',
            notes: {
              customer: 'Please handle with care - first time snake owner'
            }
          });
          
          // Save the order first to generate orderNumber
          await demoOrder.save();
          console.log('Created demo order');
        }

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Demo Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👑 ADMIN ACCOUNT:');
    console.log('   Email: admin@snakeshop.com');
    console.log('   Password: admin123');
    console.log('');
    console.log('👤 CUSTOMER ACCOUNT:');
    console.log('   Email: customer@snakeshop.com');
    console.log('   Password: customer123');
    console.log('');
    console.log('🏢 SERVICE PROVIDER ACCOUNT:');
    console.log('   Email: provider@example.com');
    console.log('   Password: provider123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🚀 You can now login to the application!');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the seed function
seedDatabase();