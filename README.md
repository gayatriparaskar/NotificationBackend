# Booking Platform Backend

A comprehensive Node.js/Express backend API for a booking platform that allows users to book services, manage appointments, and handle service providers.

## Features

- **User Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (Customer, Service Provider, Admin)
  - Password hashing with bcrypt
  - Profile management

- **Service Management**
  - CRUD operations for services
  - Service categories and filtering
  - Provider-specific services
  - Availability management

- **Booking System**
  - Real-time availability checking
  - Booking creation and management
  - Status tracking (pending, confirmed, completed, cancelled)
  - Time slot management
  - Special requests and notes

- **User Management**
  - User registration and login
  - Profile updates
  - Admin user management
  - User statistics

- **Data Validation**
  - Input validation with express-validator
  - Error handling middleware
  - Data sanitization

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator
- **Email**: nodemailer
- **Date Handling**: moment.js

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd NotificationBackend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/booking-platform
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRE=7d
   NODE_ENV=development
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system

5. **Run the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/change-password` - Change password

### Services
- `GET /api/services` - Get all services (with filtering)
- `GET /api/services/:id` - Get single service
- `POST /api/services` - Create service (Provider/Admin)
- `PUT /api/services/:id` - Update service (Provider/Admin)
- `DELETE /api/services/:id` - Delete service (Provider/Admin)
- `GET /api/services/categories` - Get service categories

### Bookings
- `GET /api/bookings` - Get all bookings (with filtering)
- `GET /api/bookings/:id` - Get single booking
- `POST /api/bookings` - Create booking (Customer)
- `PUT /api/bookings/:id/status` - Update booking status (Provider/Admin)
- `POST /api/bookings/:id/cancel` - Cancel booking
- `POST /api/bookings/:id/rate` - Rate booking (Customer)
- `GET /api/bookings/availability/:serviceId` - Get available time slots

### Users
- `GET /api/users` - Get all users (Admin)
- `GET /api/users/:id` - Get single user
- `PUT /api/users/:id` - Update user (Admin)
- `DELETE /api/users/:id` - Delete user (Admin)
- `GET /api/users/stats/overview` - Get user statistics (Admin)

## Database Models

### User
- Personal information (name, email, phone)
- Authentication (password, role)
- Address and preferences
- Account status

### Service
- Service details (name, description, category)
- Pricing and duration
- Provider information
- Availability schedule
- Requirements and policies

### Booking
- Customer and service information
- Date and time details
- Status tracking
- Payment information
- Special requests and notes
- Rating system

## Authentication & Authorization

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Roles
- **Customer**: Can book services, view own bookings
- **Service Provider**: Can manage services, view provider bookings
- **Admin**: Full access to all resources

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation error message",
      "value": "invalidValue"
    }
  ]
}
```

## Validation

All input data is validated using express-validator:
- Email format validation
- Password strength requirements
- Required field validation
- Data type validation
- Custom validation rules

## Development

### Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests

### Code Structure
```
NotificationBackend/
├── models/          # Database models
├── routes/          # API routes
├── middleware/      # Custom middleware
├── server.js        # Application entry point
└── package.json     # Dependencies and scripts
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/booking-platform |
| JWT_SECRET | JWT signing secret | - |
| JWT_EXPIRE | JWT expiration time | 7d |
| NODE_ENV | Environment | development |
| EMAIL_USER | Email service username | - |
| EMAIL_PASS | Email service password | - |

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Input validation and sanitization
- CORS configuration
- Rate limiting (can be added)
- SQL injection prevention (MongoDB)
- XSS protection

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details