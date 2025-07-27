const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header("Authorization");

    if (!authHeader) {
      return res.status(401).json({
        message: "Access denied. No token provided.",
        code: "NO_TOKEN",
      });
    }

    // Check if the header starts with 'Bearer '
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Access denied. Invalid token format.",
        code: "INVALID_TOKEN_FORMAT",
      });
    }

    // Extract token (remove 'Bearer ' prefix)
    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret");

    // Get user from database
    const user = await User.findById(decoded.userId).select("-password -refreshToken");

    if (!user) {
      return res.status(401).json({
        message: "Access denied. User not found.",
        code: "USER_NOT_FOUND",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        message: "Access denied. Account is deactivated.",
        code: "ACCOUNT_DEACTIVATED",
      });
    }

    // Add user to request object
    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Access denied. Invalid token.",
        code: "INVALID_TOKEN",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Access denied. Token expired.",
        code: "TOKEN_EXPIRED",
      });
    }

    console.error("Auth middleware error:", error);
    res.status(500).json({
      message: "Server error during authentication.",
      code: "AUTH_SERVER_ERROR",
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.user = null;
      req.userId = null;
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret");

    const user = await User.findById(decoded.userId).select("-password -refreshToken");

    if (user && user.isActive) {
      req.user = user;
      req.userId = user._id;
    } else {
      req.user = null;
      req.userId = null;
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    req.user = null;
    req.userId = null;
    next();
  }
};

// Admin role middleware
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Access denied. Authentication required.",
      code: "NO_AUTH",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Access denied. Admin privileges required.",
      code: "INSUFFICIENT_PRIVILEGES",
    });
  }

  next();
};

// Rate limiting by user
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    if (!req.userId) {
      return next();
    }

    const userId = req.userId.toString();
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get user's request history
    let userRequests = requests.get(userId) || [];

    // Remove old requests outside the window
    userRequests = userRequests.filter((timestamp) => timestamp > windowStart);

    // Check if limit exceeded
    if (userRequests.length >= maxRequests) {
      return res.status(429).json({
        message: "Too many requests. Please try again later.",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    // Add current request
    userRequests.push(now);
    requests.set(userId, userRequests);

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      // 1% chance to cleanup
      for (const [key, timestamps] of requests.entries()) {
        const validTimestamps = timestamps.filter((ts) => ts > windowStart);
        if (validTimestamps.length === 0) {
          requests.delete(key);
        } else {
          requests.set(key, validTimestamps);
        }
      }
    }

    next();
  };
};

// Middleware to update user's last activity
const updateLastActivity = async (req, res, next) => {
  if (req.user) {
    try {
      await User.findByIdAndUpdate(req.userId, {
        lastLogin: new Date(),
      });
    } catch (error) {
      console.error("Error updating last activity:", error);
    }
  }
  next();
};

// Middleware to validate request data
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);

    if (error) {
      const errorMessage = error.details[0].message;
      return res.status(400).json({
        message: "Validation error",
        details: errorMessage,
        code: "VALIDATION_ERROR",
      });
    }

    next();
  };
};

// Middleware to check if user owns the resource
const checkResourceOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      let resource;

      switch (resourceType) {
        case "topic":
          const { Topic } = require("../models/Topic");
          resource = await Topic.findById(resourceId);
          break;
        case "session":
          const StudySession = require("../models/StudySession");
          resource = await StudySession.findById(resourceId);
          break;
        case "goal":
          const Goal = require("../models/Goal");
          resource = await Goal.findById(resourceId);
          break;
        case "userProgress":
          const { UserProgress } = require("../models/Topic");
          resource = await UserProgress.findById(resourceId);
          break;
        default:
          return res.status(400).json({
            message: "Invalid resource type",
            code: "INVALID_RESOURCE_TYPE",
          });
      }

      if (!resource) {
        return res.status(404).json({
          message: `${resourceType} not found`,
          code: "RESOURCE_NOT_FOUND",
        });
      }

      // Check ownership
      const ownerId = resource.userId || resource.createdBy;
      if (!ownerId || ownerId.toString() !== req.userId.toString()) {
        return res.status(403).json({
          message: "Access denied. You can only access your own resources.",
          code: "ACCESS_DENIED",
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error("Error checking resource ownership:", error);
      res.status(500).json({
        message: "Server error checking permissions",
        code: "PERMISSION_CHECK_ERROR",
      });
    }
  };
};

module.exports = {
  auth,
  optionalAuth,
  requireAdmin,
  userRateLimit,
  updateLastActivity,
  validateRequest,
  checkResourceOwnership,
};
