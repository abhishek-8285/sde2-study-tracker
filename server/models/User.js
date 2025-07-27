const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const validator = require("validator");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters long"],
      maxlength: [30, "Username cannot exceed 30 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },
    profile: {
      firstName: {
        type: String,
        trim: true,
        maxlength: [50, "First name cannot exceed 50 characters"],
      },
      lastName: {
        type: String,
        trim: true,
        maxlength: [50, "Last name cannot exceed 50 characters"],
      },
      avatar: {
        type: String,
        default: null,
      },
      bio: {
        type: String,
        maxlength: [500, "Bio cannot exceed 500 characters"],
      },
      currentRole: {
        type: String,
        enum: ["Student", "Junior Developer", "Software Engineer", "Senior Engineer", "Other"],
        default: "Student",
      },
      targetRole: {
        type: String,
        enum: ["Software Engineer", "Senior Engineer", "Principal Engineer", "Tech Lead", "Engineering Manager"],
        default: "Software Engineer",
      },
      experienceLevel: {
        type: String,
        enum: ["Beginner", "Intermediate", "Advanced"],
        default: "Beginner",
      },
      timezone: {
        type: String,
        default: "UTC",
      },
    },
    settings: {
      studyReminders: {
        type: Boolean,
        default: true,
      },
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      defaultSessionLength: {
        type: Number,
        default: 25,
        min: 15,
        max: 120,
      },
      weeklyGoalHours: {
        type: Number,
        default: 20,
        min: 1,
        max: 100,
      },
      preferredStudyTimes: [
        {
          day: {
            type: String,
            enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          },
          startTime: String,
          endTime: String,
        },
      ],
    },
    statistics: {
      totalStudyHours: {
        type: Number,
        default: 0,
      },
      currentStreak: {
        type: Number,
        default: 0,
      },
      longestStreak: {
        type: Number,
        default: 0,
      },
      lastStudyDate: {
        type: Date,
        default: null,
      },
      totalSessions: {
        type: Number,
        default: 0,
      },
      completedTopics: {
        type: Number,
        default: 0,
      },
      averageSessionLength: {
        type: Number,
        default: 0,
      },
    },
    achievements: [
      {
        name: String,
        description: String,
        icon: String,
        unlockedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    refreshToken: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ "statistics.totalStudyHours": -1 });
userSchema.index({ createdAt: -1 });

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate user stats summary
userSchema.methods.getStatsSummary = function () {
  return {
    totalHours: this.statistics.totalStudyHours,
    currentStreak: this.statistics.currentStreak,
    longestStreak: this.statistics.longestStreak,
    totalSessions: this.statistics.totalSessions,
    completedTopics: this.statistics.completedTopics,
    averageSessionLength: this.statistics.averageSessionLength,
    achievementCount: this.achievements.length,
  };
};

// Get user's public profile
userSchema.methods.getPublicProfile = function () {
  return {
    username: this.username,
    profile: {
      firstName: this.profile.firstName,
      lastName: this.profile.lastName,
      avatar: this.profile.avatar,
      bio: this.profile.bio,
      currentRole: this.profile.currentRole,
      experienceLevel: this.profile.experienceLevel,
    },
    statistics: this.getStatsSummary(),
    achievements: this.achievements,
  };
};

// Update study statistics
userSchema.methods.updateStudyStats = function (sessionData) {
  this.statistics.totalStudyHours += sessionData.duration / 60; // Convert minutes to hours
  this.statistics.totalSessions += 1;
  this.statistics.lastStudyDate = new Date();

  // Update average session length
  this.statistics.averageSessionLength = (this.statistics.totalStudyHours * 60) / this.statistics.totalSessions;

  // Update streak logic (simplified)
  const today = new Date();
  const lastStudy = new Date(this.statistics.lastStudyDate);
  const daysDiff = Math.floor((today - lastStudy) / (1000 * 60 * 60 * 24));

  if (daysDiff <= 1) {
    this.statistics.currentStreak += 1;
  } else {
    this.statistics.currentStreak = 1;
  }

  if (this.statistics.currentStreak > this.statistics.longestStreak) {
    this.statistics.longestStreak = this.statistics.currentStreak;
  }
};

// Add achievement
userSchema.methods.addAchievement = function (achievement) {
  const exists = this.achievements.some((a) => a.name === achievement.name);
  if (!exists) {
    this.achievements.push(achievement);
  }
};

// Remove sensitive information when converting to JSON
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.refreshToken;
  return user;
};

module.exports = mongoose.model("User", userSchema);
