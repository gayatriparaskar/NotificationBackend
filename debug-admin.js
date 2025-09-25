const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

async function debugAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/snakeshop');
    console.log('Connected to MongoDB');

    // Delete existing admin user
    await User.deleteOne({ email: 'admin@snakeshop.com' });
    console.log('Deleted existing admin user');

    // Create admin user directly without pre-save hook
    const hashedPassword = await bcrypt.hash('admin123', 12);
    console.log('Direct hash:', hashedPassword);

    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@snakeshop.com',
      password: hashedPassword, // Use pre-hashed password
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

    // Save without triggering pre-save hook
    await adminUser.save({ validateBeforeSave: false });
    console.log('Created admin user');

    // Test the password
    const testUser = await User.findOne({ email: 'admin@snakeshop.com' }).select('+password');
    console.log('Stored password hash:', testUser.password);
    console.log('Original hash:', hashedPassword);
    console.log('Hashes match:', testUser.password === hashedPassword);
    
    const isPasswordValid = await testUser.comparePassword('admin123');
    console.log('Password test result:', isPasswordValid);

    // Test direct bcrypt comparison
    const directTest = await bcrypt.compare('admin123', testUser.password);
    console.log('Direct bcrypt test:', directTest);

    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error:', error);
  }
}

debugAdmin();
