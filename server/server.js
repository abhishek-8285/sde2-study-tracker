const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
require("dotenv").config();

// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const topicRoutes = require("./routes/topics");
const sessionRoutes = require("./routes/sessions");
const analyticsRoutes = require("./routes/analytics");
const goalRoutes = require("./routes/goals");
const contentRoutes = require("./routes/content");
const bookmarkRoutes = require("./routes/bookmarks");

// Import middleware
const { auth } = require("./middleware/auth");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/sde2-study-tracker";

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use("/api/", limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, "../client")));

// MongoDB connection
mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ Connected to MongoDB");
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  });

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", auth, userRoutes);
app.use("/api/topics", auth, topicRoutes);
app.use("/api/sessions", auth, sessionRoutes);
app.use("/api/analytics", auth, analyticsRoutes);
app.use("/api/goals", auth, goalRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/bookmarks", bookmarkRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Socket.IO for real-time features
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (token) {
    try {
      const jwt = require("jsonwebtoken");
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret");
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  } else {
    next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  console.log(`✅ User ${socket.userId} connected`);

  // Join user to their personal room
  socket.join(`user_${socket.userId}`);

  // Handle study session events
  socket.on("session_start", (data) => {
    socket.to(`user_${socket.userId}`).emit("session_started", data);
  });

  socket.on("session_complete", (data) => {
    socket.to(`user_${socket.userId}`).emit("session_completed", data);
  });

  socket.on("progress_update", (data) => {
    socket.to(`user_${socket.userId}`).emit("progress_updated", data);
  });

  socket.on("disconnect", () => {
    console.log(`❌ User ${socket.userId} disconnected`);
  });
});

// Serve the main application for all non-API routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Dashboard available at http://localhost:${PORT}`);
  console.log(`🔗 API endpoints available at http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Process terminated");
    mongoose.connection.close(false, () => {
      process.exit(0);
    });
  });
});

module.exports = app;
