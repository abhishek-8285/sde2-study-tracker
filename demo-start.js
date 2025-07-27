// Demo server to showcase the application structure
const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "client")));

// Demo API routes (mock data for testing)
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "SDE2+ Study Tracker API is running!",
    timestamp: new Date().toISOString(),
    features: ["User Authentication", "Topic Management", "Study Sessions", "Goals & Milestones", "Real-time Analytics", "Progress Tracking"],
  });
});

// Mock authentication endpoints
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (email === "demo@example.com" && password === "demo123") {
    res.json({
      message: "Login successful",
      token: "demo-jwt-token-123",
      user: {
        _id: "demo-user-id",
        username: "demo_user",
        email: "demo@example.com",
        profile: {
          firstName: "Demo",
          lastName: "User",
          currentRole: "Software Engineer",
          targetRole: "Senior Engineer",
        },
        statistics: {
          totalStudyHours: 127.5,
          currentStreak: 14,
          completedTopics: 23,
          totalSessions: 89,
        },
      },
    });
  } else {
    res.status(401).json({
      message: "Invalid credentials. Use demo@example.com / demo123",
      code: "INVALID_CREDENTIALS",
    });
  }
});

app.post("/api/auth/register", (req, res) => {
  res.json({
    message: "Registration successful! (Demo mode)",
    token: "demo-jwt-token-456",
    user: {
      _id: "new-user-id",
      username: req.body.username,
      email: req.body.email,
      profile: {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
      },
    },
  });
});

// Mock topics endpoint
app.get("/api/topics", (req, res) => {
  res.json({
    topics: [
      {
        _id: "topic-1",
        title: "Spring Boot Fundamentals",
        description: "Learn the basics of Spring Boot framework for enterprise Java development",
        category: "Backend Development",
        difficulty: "Beginner",
        estimatedHours: 15,
        userProgress: {
          status: "in-progress",
          progress: 65,
          timeSpent: 8.5,
        },
      },
      {
        _id: "topic-2",
        title: "React Hooks & State Management",
        description: "Master React hooks and modern state management patterns",
        category: "Frontend Development",
        difficulty: "Intermediate",
        estimatedHours: 12,
        userProgress: {
          status: "completed",
          progress: 100,
          timeSpent: 14.2,
        },
      },
      {
        _id: "topic-3",
        title: "System Design Fundamentals",
        description: "Learn how to design scalable distributed systems",
        category: "System Design",
        difficulty: "Advanced",
        estimatedHours: 25,
        userProgress: {
          status: "not-started",
          progress: 0,
          timeSpent: 0,
        },
      },
    ],
    pagination: {
      page: 1,
      limit: 20,
      totalPages: 1,
      totalCount: 3,
    },
  });
});

// Mock analytics endpoint
app.get("/api/analytics/dashboard", (req, res) => {
  res.json({
    user: {
      totalStudyHours: 127.5,
      currentStreak: 14,
      completedTopics: 23,
      totalSessions: 89,
    },
    today: {
      sessionsCount: 3,
      completedSessions: 2,
      studyTime: 125,
      activeSession: null,
    },
    goals: {
      active: [
        {
          _id: "goal-1",
          title: "Complete 5 Backend Topics",
          currentValue: 3,
          targetValue: 5,
          progressPercentage: 60,
          daysRemaining: 12,
        },
      ],
    },
    recentActivity: [
      {
        type: "session",
        title: "Completed Spring Boot session",
        timestamp: new Date().toISOString(),
      },
      {
        type: "topic",
        title: "Marked React Hooks as completed",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
    ],
  });
});

// Catch all handler for SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log("\n🎉 SDE2+ Study Tracker Demo Server Started!");
  console.log(`📊 Application: http://localhost:${PORT}`);
  console.log(`🔗 API Health: http://localhost:${PORT}/api/health`);
  console.log("\n📝 Demo Credentials:");
  console.log("   Email: demo@example.com");
  console.log("   Password: demo123");
  console.log("\n✨ Features Available:");
  console.log("   - Dynamic UI with modern design");
  console.log("   - Authentication system");
  console.log("   - Topic management");
  console.log("   - Progress tracking");
  console.log("   - Analytics dashboard");
  console.log("   - Responsive design");
  console.log("\n🚀 Ready for full MongoDB integration!");
  console.log('   Run "npm run dev" after setting up MongoDB');
});

module.exports = app;
