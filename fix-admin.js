const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

async function fixAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/snakeshop');
    console.log('Connected to MongoDB');

    // Delete existing admin user
    await User.deleteOne({ email: 'admin@snakeshop.com' });
    console.log('Deleted existing admin user');

    // Create new admin user with fresh password hash
    const hashedPassword = await bcrypt.hash('admin123', 12);
    console.log('Generated password hash:', hashedPassword.substring(0, 20) + '...');

    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@snakeshop.com',
      password: hashedPassword,
      phone: '+1234567890',
      role: 'admin',
      address: {
        street: '123 Admin St',
        city: 'Admin City',
        state: 'AC',
        zipCode: '12345',
        country: 'USA'
      }
    });

    await adminUser.save();
    console.log('Created new admin user');

    // Test the password
    const testUser = await User.findOne({ email: 'admin@snakeshop.com' }).select('+password');
    const isPasswordValid = await testUser.comparePassword('admin123');
    console.log('Password test result:', isPasswordValid);

    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error:', error);
  }
}

fixAdmin();