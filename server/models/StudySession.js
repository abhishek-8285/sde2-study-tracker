const mongoose = require("mongoose");

const studySessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Topic",
      required: true,
    },
    type: {
      type: String,
      enum: ["pomodoro", "focused", "break", "review"],
      default: "focused",
    },
    plannedDuration: {
      type: Number,
      required: [true, "Planned duration is required"],
      min: [1, "Session must be at least 1 minute"],
      max: [480, "Session cannot exceed 8 hours"], // in minutes
    },
    actualDuration: {
      type: Number,
      min: 0, // in minutes
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["planned", "active", "paused", "completed", "cancelled"],
      default: "planned",
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    pausedTime: {
      type: Number,
      default: 0, // total paused time in minutes
    },
    notes: {
      type: String,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
    productivity: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: String,
    },
    environment: {
      location: {
        type: String,
        enum: ["home", "office", "library", "cafe", "other"],
        default: "home",
      },
      distractions: [
        {
          type: String,
          enum: ["phone", "social-media", "noise", "fatigue", "hunger", "other"],
        },
      ],
      tools: [
        {
          type: String,
          enum: ["computer", "books", "videos", "online-course", "documentation", "practice-platform"],
        },
      ],
    },
    achievements: [
      {
        type: {
          type: String,
          enum: ["milestone-completed", "streak-extended", "goal-achieved", "time-record"],
        },
        description: String,
        points: {
          type: Number,
          default: 0,
        },
      },
    ],
    breaks: [
      {
        startTime: Date,
        endTime: Date,
        duration: Number, // in minutes
        type: {
          type: String,
          enum: ["short", "long", "meal"],
          default: "short",
        },
      },
    ],
    focusMetrics: {
      interruptionCount: {
        type: Number,
        default: 0,
      },
      deepFocusTime: {
        type: Number,
        default: 0, // time spent in deep focus (minutes)
      },
      averageFocusLevel: {
        type: Number,
        min: 1,
        max: 10,
      },
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
studySessionSchema.index({ userId: 1, startTime: -1 });
studySessionSchema.index({ userId: 1, topicId: 1 });
studySessionSchema.index({ userId: 1, status: 1 });
studySessionSchema.index({ startTime: 1 });
studySessionSchema.index({ isCompleted: 1, userId: 1 });

// Virtual for session efficiency (actual vs planned duration)
studySessionSchema.virtual("efficiency").get(function () {
  if (!this.actualDuration || !this.plannedDuration) return 0;
  return Math.round((this.actualDuration / this.plannedDuration) * 100);
});

// Virtual for focus score
studySessionSchema.virtual("focusScore").get(function () {
  if (!this.focusMetrics.averageFocusLevel) return 0;
  const baseScore = this.focusMetrics.averageFocusLevel * 10;
  const interruptionPenalty = this.focusMetrics.interruptionCount * 5;
  return Math.max(0, Math.min(100, baseScore - interruptionPenalty));
});

// Method to start session
studySessionSchema.methods.startSession = function () {
  this.status = "active";
  this.startTime = new Date();
  return this.save();
};

// Method to pause session
studySessionSchema.methods.pauseSession = function () {
  if (this.status !== "active") {
    throw new Error("Can only pause active sessions");
  }
  this.status = "paused";
  return this.save();
};

// Method to resume session
studySessionSchema.methods.resumeSession = function (pauseDuration = 0) {
  if (this.status !== "paused") {
    throw new Error("Can only resume paused sessions");
  }
  this.status = "active";
  this.pausedTime += pauseDuration;
  return this.save();
};

// Method to complete session
studySessionSchema.methods.completeSession = function (sessionData = {}) {
  this.status = "completed";
  this.isCompleted = true;
  this.endTime = new Date();

  // Calculate actual duration
  const totalMinutes = Math.round((this.endTime - this.startTime) / (1000 * 60));
  this.actualDuration = Math.max(0, totalMinutes - this.pausedTime);

  // Update session data if provided
  if (sessionData.notes) this.notes = sessionData.notes;
  if (sessionData.productivity) this.productivity = sessionData.productivity;
  if (sessionData.focusMetrics) {
    this.focusMetrics = { ...this.focusMetrics, ...sessionData.focusMetrics };
  }
  if (sessionData.tags) this.tags = sessionData.tags;

  return this.save();
};

// Method to cancel session
studySessionSchema.methods.cancelSession = function (reason = "") {
  this.status = "cancelled";
  this.endTime = new Date();
  if (reason) {
    this.notes = this.notes ? `${this.notes}\nCancellation reason: ${reason}` : `Cancelled: ${reason}`;
  }
  return this.save();
};

// Method to add break
studySessionSchema.methods.addBreak = function (breakData) {
  const breakRecord = {
    startTime: breakData.startTime || new Date(),
    endTime: breakData.endTime,
    type: breakData.type || "short",
  };

  if (breakRecord.endTime) {
    breakRecord.duration = Math.round((breakRecord.endTime - breakRecord.startTime) / (1000 * 60));
  }

  this.breaks.push(breakRecord);
  return this.save();
};

// Static method to get user's session statistics
studySessionSchema.statics.getUserStats = async function (userId, dateRange = {}) {
  const { startDate, endDate } = dateRange;
  let matchQuery = { userId, isCompleted: true };

  if (startDate || endDate) {
    matchQuery.startTime = {};
    if (startDate) matchQuery.startTime.$gte = new Date(startDate);
    if (endDate) matchQuery.startTime.$lte = new Date(endDate);
  }

  const stats = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        totalTime: { $sum: "$actualDuration" },
        averageSessionTime: { $avg: "$actualDuration" },
        averageProductivity: { $avg: "$productivity.rating" },
        averageFocusScore: { $avg: "$focusMetrics.averageFocusLevel" },
        totalBreaks: { $sum: { $size: "$breaks" } },
      },
    },
  ]);

  return (
    stats[0] || {
      totalSessions: 0,
      totalTime: 0,
      averageSessionTime: 0,
      averageProductivity: 0,
      averageFocusScore: 0,
      totalBreaks: 0,
    }
  );
};

// Static method to get daily session data for charts
studySessionSchema.statics.getDailyStats = async function (userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const dailyStats = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        isCompleted: true,
        startTime: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$startTime" },
          month: { $month: "$startTime" },
          day: { $dayOfMonth: "$startTime" },
        },
        sessions: { $sum: 1 },
        totalTime: { $sum: "$actualDuration" },
        averageProductivity: { $avg: "$productivity.rating" },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
    },
  ]);

  return dailyStats;
};

// Static method to get session streaks
studySessionSchema.statics.getStudyStreaks = async function (userId) {
  const sessions = await this.find({
    userId,
    isCompleted: true,
  })
    .sort({ startTime: 1 })
    .select("startTime")
    .lean();

  if (sessions.length === 0) return { current: 0, longest: 0 };

  let currentStreak = 0;
  let longestStreak = 0;
  let consecutiveDays = 1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < sessions.length; i++) {
    const sessionDate = new Date(sessions[i].startTime);
    sessionDate.setHours(0, 0, 0, 0);

    if (i > 0) {
      const prevDate = new Date(sessions[i - 1].startTime);
      prevDate.setHours(0, 0, 0, 0);

      const daysDiff = (sessionDate - prevDate) / (1000 * 60 * 60 * 24);

      if (daysDiff === 1) {
        consecutiveDays++;
      } else {
        longestStreak = Math.max(longestStreak, consecutiveDays);
        consecutiveDays = 1;
      }
    }
  }

  longestStreak = Math.max(longestStreak, consecutiveDays);

  // Calculate current streak
  const lastSessionDate = new Date(sessions[sessions.length - 1].startTime);
  lastSessionDate.setHours(0, 0, 0, 0);
  const daysSinceLastSession = (today - lastSessionDate) / (1000 * 60 * 60 * 24);

  if (daysSinceLastSession <= 1) {
    currentStreak = consecutiveDays;
  }

  return { current: currentStreak, longest: longestStreak };
};

// Pre-save middleware to update user statistics
studySessionSchema.pre("save", async function (next) {
  if (this.isModified("isCompleted") && this.isCompleted) {
    try {
      const User = mongoose.model("User");
      const user = await User.findById(this.userId);

      if (user) {
        user.updateStudyStats({
          duration: this.actualDuration,
          productivity: this.productivity?.rating,
        });
        await user.save();
      }
    } catch (error) {
      console.error("Error updating user stats:", error);
    }
  }
  next();
});

module.exports = mongoose.model("StudySession", studySessionSchema);
