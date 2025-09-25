const bcrypt = require('bcryptjs');

async function testBcrypt() {
  try {
    const password = 'admin123';
    console.log('Original password:', password);
    
    // Hash the password
    const hash = await bcrypt.hash(password, 12);
    console.log('Generated hash:', hash);
    
    // Test comparison
    const isValid = await bcrypt.compare(password, hash);
    console.log('Password comparison result:', isValid);
    
    // Test with a simple hash
    const simpleHash = await bcrypt.hash('test', 10);
    const simpleTest = await bcrypt.compare('test', simpleHash);
    console.log('Simple test result:', simpleTest);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testBcrypt();
