# SDE2+ Study Tracker - Dynamic Full-Stack Application Setup

This guide will help you set up and run the complete dynamic full-stack SDE2+ Study Tracker application.

## 🏗️ Architecture Overview

The application has been transformed into a modern full-stack architecture:

- **Backend**: Node.js/Express with MongoDB
- **Frontend**: Modern ES6 modules with dynamic API integration
- **Real-time**: Socket.IO for live updates
- **Authentication**: JWT-based user authentication
- **Database**: MongoDB with Mongoose ODM
- **Security**: Helmet, CORS, rate limiting, bcrypt

## 📋 Prerequisites

Before setting up the application, ensure you have the following installed:

- **Node.js** (v16 or higher)
- **MongoDB** (v5 or higher)
- **npm** or **yarn**
- **Git**

## 🚀 Quick Start

### 1. Clone and Setup

```bash
# Navigate to your project directory
cd sde2-study-tracker

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### 2. Configure Environment Variables

Edit the `.env` file with your settings:

```bash
# Essential settings
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/sde2-study-tracker
JWT_SECRET=your-super-secret-jwt-key-change-this
CLIENT_URL=http://localhost:5000
```

### 3. Start MongoDB

Make sure MongoDB is running on your system:

```bash
# On macOS (with Homebrew)
brew services start mongodb-community

# On Ubuntu/Debian
sudo systemctl start mongod

# On Windows
net start MongoDB
```

### 4. Initialize the Application

```bash
# Seed the database with sample data (optional)
npm run setup

# Start the development server
npm run dev
```

### 5. Access the Application

Open your browser and navigate to: `http://localhost:5000`

## 📁 Project Structure

```
sde2-study-tracker/
├── server/                 # Backend application
│   ├── server.js          # Main server file
│   ├── models/            # Database models
│   │   ├── User.js
│   │   ├── Topic.js
│   │   ├── StudySession.js
│   │   └── Goal.js
│   ├── routes/            # API routes
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── topics.js
│   │   ├── sessions.js
│   │   ├── goals.js
│   │   └── analytics.js
│   ├── middleware/        # Custom middleware
│   │   └── auth.js
│   └── scripts/           # Utility scripts
├── client/                # Frontend application
│   ├── index.html         # Main HTML file
│   ├── css/              # Stylesheets
│   │   ├── main.css
│   │   ├── components.css
│   │   └── responsive.css
│   └── js/               # JavaScript modules
│       ├── main.js       # Application entry point
│       ├── api.js        # API client
│       ├── auth.js       # Authentication
│       ├── ui.js         # UI utilities
│       ├── socket.js     # Real-time connection
│       ├── dashboard.js  # Dashboard module
│       ├── topics.js     # Topics module
│       ├── sessions.js   # Sessions module
│       ├── goals.js      # Goals module
│       └── analytics.js  # Analytics module
├── package.json          # Dependencies and scripts
└── README.md            # Original documentation
```

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start development server with nodemon
npm run dev:frontend # Start webpack dev server (if using webpack)

# Production
npm start           # Start production server
npm run build       # Build frontend assets

# Database
npm run setup       # Create admin user and seed data
npm run seed-data   # Seed database with sample topics

# Utilities
npm run create-admin # Create an admin user
```

## 🔑 Authentication

### Creating Your First User

1. **Via Registration**: Use the registration form in the application
2. **Via Script**: Run the admin creation script:

```bash
npm run create-admin
```

### Default Admin User (if using setup script):

- **Username**: admin
- **Email**: admin@example.com
- **Password**: admin123 (change this immediately!)

## 📊 Features

### ✅ Completed Dynamic Features

1. **User Authentication**

   - JWT-based authentication
   - User registration and login
   - Password hashing with bcrypt
   - Profile management

2. **Topic Management**

   - Dynamic topic loading from database
   - Progress tracking with real-time updates
   - Bookmark functionality
   - Category filtering and search

3. **Study Sessions**

   - Real-time session timer
   - Session state management (start, pause, resume, complete)
   - Session analytics and history
   - Productivity tracking

4. **Goals & Milestones**

   - Dynamic goal creation and management
   - Progress tracking with visual indicators
   - Milestone completion
   - Recurring goals support

5. **Analytics Dashboard**

   - Real-time progress charts
   - Study time analytics
   - Goal completion rates
   - Category-wise progress breakdown

6. **Real-time Features**

   - Live session updates
   - Real-time progress synchronization
   - Instant notifications
   - Multi-device synchronization

7. **Modern UI/UX**
   - Responsive design
   - Dark/light theme support
   - Toast notifications
   - Loading states and animations

## 🔧 Configuration

### MongoDB Configuration

Update your MongoDB connection in `.env`:

```bash
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/sde2-study-tracker

# MongoDB Atlas (Cloud)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sde2-study-tracker

# MongoDB with authentication
MONGODB_URI=mongodb://username:password@localhost:27017/sde2-study-tracker
```

### Security Settings

```bash
# Generate a secure JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Set secure bcrypt rounds (higher = more secure, slower)
BCRYPT_ROUNDS=12

# Configure CORS for your domain
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

## 🚀 Deployment

### Development Deployment

```bash
# Install dependencies
npm install

# Set environment variables
export NODE_ENV=development
export MONGODB_URI=your-mongodb-uri
export JWT_SECRET=your-jwt-secret

# Start the server
npm run dev
```

### Production Deployment

```bash
# Install only production dependencies
npm ci --only=production

# Set production environment
export NODE_ENV=production
export PORT=80
export MONGODB_URI=your-production-mongodb-uri
export JWT_SECRET=your-production-jwt-secret

# Start the server
npm start
```

### Docker Deployment (Optional)

```dockerfile
# Create Dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t sde2-study-tracker .
docker run -p 5000:5000 -e MONGODB_URI=your-uri sde2-study-tracker
```

## 📱 API Documentation

### Authentication Endpoints

```
POST /api/auth/register     # Register new user
POST /api/auth/login        # Login user
GET  /api/auth/me          # Get current user
PUT  /api/auth/profile     # Update profile
POST /api/auth/logout      # Logout user
```

### Topics Endpoints

```
GET    /api/topics              # Get all topics
GET    /api/topics/:id          # Get specific topic
POST   /api/topics/:id/progress # Update topic progress
POST   /api/topics/:id/bookmark # Toggle bookmark
GET    /api/topics/user/progress # Get user progress
```

### Sessions Endpoints

```
GET  /api/sessions           # Get user sessions
POST /api/sessions           # Create new session
PUT  /api/sessions/:id/start # Start session
PUT  /api/sessions/:id/pause # Pause session
PUT  /api/sessions/:id/complete # Complete session
```

### Goals Endpoints

```
GET  /api/goals              # Get user goals
POST /api/goals              # Create new goal
PUT  /api/goals/:id/progress # Update goal progress
PUT  /api/goals/:id/status   # Update goal status
```

## 🔍 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**

   ```bash
   # Check if MongoDB is running
   brew services list | grep mongodb  # macOS
   sudo systemctl status mongod       # Linux

   # Check connection string
   echo $MONGODB_URI
   ```

2. **Port Already in Use**

   ```bash
   # Find process using port 5000
   lsof -i :5000

   # Kill the process
   kill -9 PID

   # Or use a different port
   export PORT=3001
   ```

3. **JWT Token Issues**

   ```bash
   # Generate new JWT secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Permission Issues**
   ```bash
   # Fix node_modules permissions
   sudo chown -R $(whoami) node_modules
   ```

### Debug Mode

Enable debug logging:

```bash
export LOG_LEVEL=debug
export NODE_ENV=development
npm run dev
```

## 🎯 Next Steps

Now that your dynamic application is running:

1. **Create your first user account**
2. **Set up your learning topics**
3. **Start your first study session**
4. **Create daily/weekly goals**
5. **Explore the analytics dashboard**

## 📞 Support

If you encounter any issues:

1. Check the console for error messages
2. Verify all environment variables are set
3. Ensure MongoDB is running and accessible
4. Check the application logs
5. Review the troubleshooting section above

## 🎉 Congratulations!

You now have a fully dynamic, real-time study tracking application with:

- ✅ User authentication and profiles
- ✅ Dynamic data loading from database
- ✅ Real-time session tracking
- ✅ Progress analytics and insights
- ✅ Goal management system
- ✅ Modern responsive UI
- ✅ RESTful API architecture
- ✅ Socket.IO real-time features

The static HTML file has been transformed into a sophisticated full-stack application ready for production use!
