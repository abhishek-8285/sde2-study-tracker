const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { auth, userRateLimit } = require("../middleware/auth");

const router = express.Router();

// Rate limiting for auth routes
const authRateLimit = userRateLimit(5, 15 * 60 * 1000); // 5 requests per 15 minutes

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post("/register", authRateLimit, async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email, and password are required",
        code: "MISSING_REQUIRED_FIELDS",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
        code: "PASSWORD_TOO_SHORT",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email ? "Email already registered" : "Username already taken",
        code: "USER_EXISTS",
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      profile: {
        firstName: firstName || "",
        lastName: lastName || "",
      },
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || "fallback-secret", { expiresIn: "7d" });

    // Remove password from response
    const userResponse = user.toJSON();

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      message: "Server error during registration",
      code: "REGISTRATION_ERROR",
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post("/login", authRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
        code: "MISSING_CREDENTIALS",
      });
    }

    // Find user by email or username
    const user = await User.findOne({
      $or: [{ email }, { username: email }],
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        message: "Account is deactivated",
        code: "ACCOUNT_DEACTIVATED",
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || "fallback-secret", { expiresIn: "7d" });

    // Remove password from response
    const userResponse = user.toJSON();

    res.json({
      message: "Login successful",
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Server error during login",
      code: "LOGIN_ERROR",
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password -refreshToken").lean();

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    res.json({
      user,
      stats: user.statistics || {},
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      message: "Server error retrieving user",
      code: "GET_USER_ERROR",
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put("/profile", auth, async (req, res) => {
  try {
    const { firstName, lastName, bio, currentRole, targetRole, experienceLevel, timezone } = req.body;

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    // Update profile fields
    if (firstName !== undefined) user.profile.firstName = firstName;
    if (lastName !== undefined) user.profile.lastName = lastName;
    if (bio !== undefined) user.profile.bio = bio;
    if (currentRole !== undefined) user.profile.currentRole = currentRole;
    if (targetRole !== undefined) user.profile.targetRole = targetRole;
    if (experienceLevel !== undefined) user.profile.experienceLevel = experienceLevel;
    if (timezone !== undefined) user.profile.timezone = timezone;

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: user.toJSON(),
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({
      message: "Server error updating profile",
      code: "PROFILE_UPDATE_ERROR",
    });
  }
});

// @route   PUT /api/auth/settings
// @desc    Update user settings
// @access  Private
router.put("/settings", auth, async (req, res) => {
  try {
    const { studyReminders, emailNotifications, defaultSessionLength, weeklyGoalHours, preferredStudyTimes } = req.body;

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    // Update settings
    if (studyReminders !== undefined) user.settings.studyReminders = studyReminders;
    if (emailNotifications !== undefined) user.settings.emailNotifications = emailNotifications;
    if (defaultSessionLength !== undefined) user.settings.defaultSessionLength = defaultSessionLength;
    if (weeklyGoalHours !== undefined) user.settings.weeklyGoalHours = weeklyGoalHours;
    if (preferredStudyTimes !== undefined) user.settings.preferredStudyTimes = preferredStudyTimes;

    await user.save();

    res.json({
      message: "Settings updated successfully",
      settings: user.settings,
    });
  } catch (error) {
    console.error("Settings update error:", error);
    res.status(500).json({
      message: "Server error updating settings",
      code: "SETTINGS_UPDATE_ERROR",
    });
  }
});

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post("/change-password", auth, authRateLimit, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
        code: "MISSING_PASSWORDS",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters long",
        code: "PASSWORD_TOO_SHORT",
      });
    }

    const user = await User.findById(req.userId);

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        message: "Current password is incorrect",
        code: "INCORRECT_PASSWORD",
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Password change error:", error);
    res.status(500).json({
      message: "Server error changing password",
      code: "PASSWORD_CHANGE_ERROR",
    });
  }
});

// @route   POST /api/auth/refresh-token
// @desc    Refresh JWT token
// @access  Private
router.post("/refresh-token", auth, async (req, res) => {
  try {
    // Generate new token
    const token = jwt.sign({ userId: req.userId }, process.env.JWT_SECRET || "fallback-secret", { expiresIn: "7d" });

    res.json({
      message: "Token refreshed successfully",
      token,
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({
      message: "Server error refreshing token",
      code: "TOKEN_REFRESH_ERROR",
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (invalidate token)
// @access  Private
router.post("/logout", auth, async (req, res) => {
  try {
    // In a production app, you might want to maintain a blacklist of tokens
    // For now, we'll just send a success response
    // The client should remove the token from storage

    res.json({
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      message: "Server error during logout",
      code: "LOGOUT_ERROR",
    });
  }
});

// @route   DELETE /api/auth/account
// @desc    Deactivate user account
// @access  Private
router.delete("/account", auth, authRateLimit, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        message: "Password is required to deactivate account",
        code: "MISSING_PASSWORD",
      });
    }

    const user = await User.findById(req.userId);

    // Verify password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Incorrect password",
        code: "INCORRECT_PASSWORD",
      });
    }

    // Deactivate account instead of deleting
    user.isActive = false;
    await user.save();

    res.json({
      message: "Account deactivated successfully",
    });
  } catch (error) {
    console.error("Account deactivation error:", error);
    res.status(500).json({
      message: "Server error deactivating account",
      code: "ACCOUNT_DEACTIVATION_ERROR",
    });
  }
});

// @route   GET /api/auth/stats
// @desc    Get user statistics summary
// @access  Private
router.get("/stats", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).lean();

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    // Get additional statistics from other models
    const StudySession = require("../models/StudySession");
    const Goal = require("../models/Goal");
    const { UserProgress } = require("../models/Topic");

    const [sessionStats, goalStats, progressStats] = await Promise.all([StudySession.getUserStats(req.userId), Goal.getGoalStats(req.userId), UserProgress.countDocuments({ userId: req.userId, status: "completed" })]);

    res.json({
      user: user.statistics,
      sessions: sessionStats,
      goals: goalStats,
      completedTopics: progressStats,
      joinedAt: user.createdAt,
      lastActive: user.lastLogin,
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({
      message: "Server error retrieving statistics",
      code: "STATS_ERROR",
    });
  }
});

module.exports = router;
