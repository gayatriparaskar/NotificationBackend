# Web Push Notifications Setup

This guide will help you set up web push notifications for the SnacksShop backend.

## Prerequisites

- Node.js 16+ 
- MongoDB database
- HTTPS domain (required for web push notifications)

## Installation

1. Install the new dependency:
```bash
npm install web-push
```

## VAPID Keys Setup

1. Generate VAPID keys:
```bash
node scripts/generateVapidKeys.js
```

2. Add the generated keys to your `.env` file:
```env
VAPID_PUBLIC_KEY=your-vapid-public-key-here
VAPID_PRIVATE_KEY=your-vapid-private-key-here
VAPID_SUBJECT=mailto:admin@snacksshop.com
```

## API Endpoints

### Get VAPID Public Key
```
GET /api/push/vapid-key
```
Returns the public key needed for frontend subscription.

### Subscribe to Push Notifications
```
POST /api/push/subscribe
Authorization: Bearer <token>
Content-Type: application/json

{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  }
}
```

### Unsubscribe from Push Notifications
```
DELETE /api/push/unsubscribe
Authorization: Bearer <token>
```

### Test Push Notification
```
POST /api/push/test
Authorization: Bearer <token>
```

### Get Push Status
```
GET /api/push/status
Authorization: Bearer <token>
```

### Update Push Preferences
```
PUT /api/push/preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "pushEnabled": true
}
```

## Frontend Integration

1. **Get VAPID Public Key**:
```javascript
const response = await fetch('/api/push/vapid-key');
const { publicKey } = await response.json();
```

2. **Subscribe to Push Notifications**:
```javascript
const registration = await navigator.serviceWorker.ready;
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(publicKey)
});

await fetch('/api/push/subscribe', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ subscription })
});
```

3. **Handle Push Events** in your service worker:
```javascript
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: data.data,
    actions: data.actions
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
```

## Features

- ✅ Real-time push notifications
- ✅ User subscription management
- ✅ Push notification preferences
- ✅ Test notification functionality
- ✅ Automatic subscription cleanup
- ✅ Integration with existing notification system
- ✅ Support for notification actions
- ✅ Priority-based notifications

## Security Notes

- Keep VAPID private key secure
- Use HTTPS in production
- Validate subscription data
- Implement rate limiting for test notifications

## Troubleshooting

1. **VAPID keys not working**: Ensure keys are properly set in environment variables
2. **Subscriptions failing**: Check that HTTPS is enabled and service worker is registered
3. **Notifications not received**: Verify subscription is saved and user preferences allow push notifications

## Testing

1. Start the server: `npm run dev`
2. Test VAPID key endpoint: `GET /api/push/vapid-key`
3. Subscribe to notifications from frontend
4. Send test notification: `POST /api/push/test`
5. Check browser developer tools for any errors
