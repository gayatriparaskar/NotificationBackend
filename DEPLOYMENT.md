# Deployment Guide for NotificationBackend

## Environment Variables Required for Render

Set these environment variables in your Render dashboard:

### Required Variables:
1. **MONGODB_URI**: Your MongoDB Atlas connection string
   - Format: `mongodb+srv://username:password@cluster.mongodb.net/database-name?retryWrites=true&w=majority`
   - Get this from MongoDB Atlas dashboard

2. **JWT_SECRET**: A secure random string for JWT token signing
   - Example: `your-super-secret-jwt-key-here-make-it-long-and-random`

3. **FRONTEND_URL**: Your frontend URL (for CORS)
   - For Vercel: `https://your-app-name.vercel.app`
   - For local development: `http://localhost:3000`

### Optional Variables:
- **NODE_ENV**: Set to `production` for production deployment
- **PORT**: Render will set this automatically

## MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster
4. Create a database user with username and password
5. Whitelist all IP addresses (0.0.0.0/0) for Render
6. Get your connection string and use it as MONGODB_URI

## Render Deployment Steps

1. Connect your GitHub repository to Render
2. Set the environment variables above
3. Deploy the service
4. Your backend will be available at the provided URL

## Testing the Deployment

After deployment, test these endpoints:
- `GET /api/health` - Health check
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
