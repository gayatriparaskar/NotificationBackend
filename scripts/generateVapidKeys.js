const webpush = require('web-push');

console.log('🔑 Generating VAPID keys for web push notifications...\n');

// Generate VAPID keys
const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ VAPID keys generated successfully!\n');
console.log('Add these to your .env file:\n');
console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
console.log('VAPID_SUBJECT=mailto:admin@snacksshop.com\n');

console.log('📋 Instructions:');
console.log('1. Copy the keys above to your .env file');
console.log('2. Make sure to keep the private key secure');
console.log('3. The public key will be sent to the frontend for subscription');
console.log('4. The subject should be a mailto: URL for your application\n');

console.log('🔧 Frontend Integration:');
console.log('Use the VAPID_PUBLIC_KEY in your frontend to subscribe to push notifications.');
console.log('The frontend should call /api/push/vapid-key to get the public key.');
