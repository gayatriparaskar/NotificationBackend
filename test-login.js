const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

async function testLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/snakeshop');
    console.log('Connected to MongoDB');

    // Check if admin user exists
    const adminUser = await User.findOne({ email: 'admin@snakeshop.com' }).select('+password');
    console.log('Admin user found:', !!adminUser);
    
    if (adminUser) {
      console.log('Admin user details:');
      console.log('- Email:', adminUser.email);
      console.log('- Role:', adminUser.role);
      console.log('- Is Active:', adminUser.isActive);
      console.log('- Password hash exists:', !!adminUser.password);
      
      // Test password comparison
      const isPasswordValid = await adminUser.comparePassword('admin123');
      console.log('Password valid:', isPasswordValid);
    } else {
      console.log('Admin user not found!');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

testLogin();