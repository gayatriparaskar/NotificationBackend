// Load environment variables FIRST
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const notificationRoutes = require('./routes/notifications');
const userRoutes = require('./routes/users');
const pushNotificationRoutes = require('./routes/pushNotificationsSimple');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin:"*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/booking-platform';
console.log('Attempting to connect to MongoDB...');
console.log('MongoDB URI:', mongoUri.replace(/\/\/.*@/, '//***:***@')); // Hide credentials in logs

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  console.error('Please check your MONGODB_URI environment variable');
  process.exit(1);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/push', pushNotificationRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined their room`);
  });
  
  socket.on('test-connection', (data) => {
    console.log('Test connection received:', data);
    socket.emit('test-connection-response', { message: 'Hello from backend', timestamp: new Date() });
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

// Set Socket.IO instance in notification service
const { setSocketIO } = require('./services/notificationService');
setSocketIO(io);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Booking Platform API is running',
    timestamp: new Date().toISOString()
  });
});

// Test notification endpoint
app.post('/api/test-notification', async (req, res) => {
  try {
    const { userId, message } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const { NotificationService } = require('./services/notificationService');
    
    await NotificationService.createNotification({
      recipient: userId,
      type: 'test',
      title: 'Test Notification',
      message: message || 'This is a test notification from the backend!',
      data: { url: '/dashboard' }
    });

    res.json({
      success: true,
      message: 'Test notification sent successfully'
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification'
    });
  }
});

// Direct socket test endpoint
app.post('/api/test-socket', (req, res) => {
  try {
    const { userId, message } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Send direct socket event
    io.to(`user-${userId}`).emit('new-notification', {
      notification: {
        _id: 'test-' + Date.now(),
        title: 'Direct Socket Test',
        message: message || 'This is a direct socket test notification!',
        type: 'test',
        data: { url: '/dashboard' },
        createdAt: new Date()
      },
      unreadCount: 1
    });

    console.log(`Direct socket notification sent to user: ${userId}`);

    res.json({
      success: true,
      message: 'Direct socket notification sent successfully'
    });
  } catch (error) {
    console.error('Error sending direct socket notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send direct socket notification'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Socket.IO server is ready for real-time notifications`);
});