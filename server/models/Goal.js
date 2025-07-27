const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Goal title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    type: {
      type: String,
      enum: ["daily", "weekly", "monthly", "custom"],
      required: true,
    },
    category: {
      type: String,
      enum: ["study-time", "topics-completed", "sessions-completed", "streak-maintenance", "skill-development", "project-completion", "reading", "practice", "other"],
      required: true,
    },
    targetValue: {
      type: Number,
      required: [true, "Target value is required"],
      min: [0, "Target value must be positive"],
    },
    currentValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      enum: ["hours", "minutes", "topics", "sessions", "days", "projects", "pages", "problems", "commits"],
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["active", "completed", "paused", "cancelled", "overdue"],
      default: "active",
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    completedAt: {
      type: Date,
    },
    relatedTopics: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Topic",
      },
    ],
    milestones: [
      {
        title: String,
        targetValue: Number,
        currentValue: {
          type: Number,
          default: 0,
        },
        isCompleted: {
          type: Boolean,
          default: false,
        },
        completedAt: Date,
        order: Number,
      },
    ],
    reminders: [
      {
        type: {
          type: String,
          enum: ["daily", "weekly", "custom"],
          default: "daily",
        },
        time: String, // Time in HH:MM format
        isEnabled: {
          type: Boolean,
          default: true,
        },
        message: String,
      },
    ],
    rewards: [
      {
        title: String,
        description: String,
        condition: {
          type: String,
          enum: ["completion", "milestone", "streak"],
          default: "completion",
        },
        isEarned: {
          type: Boolean,
          default: false,
        },
        earnedAt: Date,
      },
    ],
    difficulty: {
      type: String,
      enum: ["easy", "moderate", "challenging", "extreme"],
      default: "moderate",
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    notes: {
      type: String,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurrencePattern: {
      frequency: {
        type: String,
        enum: ["daily", "weekly", "monthly"],
        default: "weekly",
      },
      interval: {
        type: Number,
        default: 1,
      },
      endAfterOccurrences: Number,
      endDate: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
goalSchema.index({ userId: 1, status: 1 });
goalSchema.index({ userId: 1, type: 1 });
goalSchema.index({ userId: 1, endDate: 1 });
goalSchema.index({ endDate: 1, status: 1 });
goalSchema.index({ startDate: 1 });

// Virtual for progress percentage
goalSchema.virtual("progressPercentage").get(function () {
  if (this.targetValue === 0) return 0;
  return Math.min(100, Math.round((this.currentValue / this.targetValue) * 100));
});

// Virtual for days remaining
goalSchema.virtual("daysRemaining").get(function () {
  const today = new Date();
  const endDate = new Date(this.endDate);
  const timeDiff = endDate.getTime() - today.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  return Math.max(0, daysDiff);
});

// Virtual for is overdue
goalSchema.virtual("isOverdue").get(function () {
  return new Date() > this.endDate && this.status === "active";
});

// Method to update progress
goalSchema.methods.updateProgress = function (value, operation = "add") {
  if (operation === "add") {
    this.currentValue += value;
  } else if (operation === "set") {
    this.currentValue = value;
  }

  // Ensure current value doesn't exceed target
  this.currentValue = Math.min(this.currentValue, this.targetValue);

  // Check if goal is completed
  if (this.currentValue >= this.targetValue && this.status === "active") {
    this.status = "completed";
    this.completedAt = new Date();

    // Mark milestone rewards as earned
    this.rewards.forEach((reward) => {
      if (reward.condition === "completion" && !reward.isEarned) {
        reward.isEarned = true;
        reward.earnedAt = new Date();
      }
    });
  }

  // Update milestone progress
  this.milestones.forEach((milestone) => {
    if (!milestone.isCompleted && this.currentValue >= milestone.targetValue) {
      milestone.isCompleted = true;
      milestone.completedAt = new Date();

      // Mark milestone rewards as earned
      this.rewards.forEach((reward) => {
        if (reward.condition === "milestone" && !reward.isEarned) {
          reward.isEarned = true;
          reward.earnedAt = new Date();
        }
      });
    }
  });

  return this.save();
};

// Method to reset goal (for recurring goals)
goalSchema.methods.resetGoal = function () {
  this.currentValue = 0;
  this.status = "active";
  this.completedAt = null;

  // Reset milestones
  this.milestones.forEach((milestone) => {
    milestone.currentValue = 0;
    milestone.isCompleted = false;
    milestone.completedAt = null;
  });

  // Reset rewards
  this.rewards.forEach((reward) => {
    reward.isEarned = false;
    reward.earnedAt = null;
  });

  // Update dates for next period
  const now = new Date();
  const duration = this.endDate.getTime() - this.startDate.getTime();

  this.startDate = now;
  this.endDate = new Date(now.getTime() + duration);

  return this.save();
};

// Method to add milestone
goalSchema.methods.addMilestone = function (milestoneData) {
  const milestone = {
    title: milestoneData.title,
    targetValue: milestoneData.targetValue,
    order: milestoneData.order || this.milestones.length + 1,
  };

  this.milestones.push(milestone);
  this.milestones.sort((a, b) => a.order - b.order);

  return this.save();
};

// Static method to get user's active goals
goalSchema.statics.getActiveGoals = async function (userId, type = null) {
  let query = { userId, status: "active" };

  if (type) {
    query.type = type;
  }

  return await this.find(query).populate("relatedTopics", "title category").sort({ priority: -1, endDate: 1 });
};

// Static method to get goal statistics
goalSchema.statics.getGoalStats = async function (userId, dateRange = {}) {
  const { startDate, endDate } = dateRange;
  let matchQuery = { userId };

  if (startDate || endDate) {
    matchQuery.createdAt = {};
    if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
    if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
  }

  const stats = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalGoals: { $sum: 1 },
        completedGoals: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        activeGoals: {
          $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
        },
        overdueGoals: {
          $sum: { $cond: [{ $eq: ["$status", "overdue"] }, 1, 0] },
        },
        averageProgress: { $avg: "$progressPercentage" },
      },
    },
  ]);

  const result = stats[0] || {
    totalGoals: 0,
    completedGoals: 0,
    activeGoals: 0,
    overdueGoals: 0,
    averageProgress: 0,
  };

  result.completionRate = result.totalGoals > 0 ? Math.round((result.completedGoals / result.totalGoals) * 100) : 0;

  return result;
};

// Static method to get goals by category
goalSchema.statics.getGoalsByCategory = async function (userId) {
  return await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: "$category",
        totalGoals: { $sum: 1 },
        completedGoals: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        averageProgress: { $avg: "$progressPercentage" },
      },
    },
    {
      $project: {
        category: "$_id",
        totalGoals: 1,
        completedGoals: 1,
        averageProgress: { $round: ["$averageProgress", 2] },
        completionRate: {
          $round: [{ $multiply: [{ $divide: ["$completedGoals", "$totalGoals"] }, 100] }, 2],
        },
      },
    },
  ]);
};

// Static method to check for overdue goals and update status
goalSchema.statics.updateOverdueGoals = async function () {
  const overdueGoals = await this.updateMany(
    {
      status: "active",
      endDate: { $lt: new Date() },
    },
    {
      $set: { status: "overdue" },
    }
  );

  return overdueGoals.modifiedCount;
};

// Static method to create recurring goals
goalSchema.statics.createRecurringGoals = async function () {
  const completedRecurringGoals = await this.find({
    status: "completed",
    isRecurring: true,
    "recurrencePattern.frequency": { $exists: true },
  });

  const newGoals = [];

  for (const goal of completedRecurringGoals) {
    const { frequency, interval, endAfterOccurrences, endDate } = goal.recurrencePattern;

    // Check if we should create a new occurrence
    const now = new Date();
    let nextStartDate = new Date(goal.endDate);

    if (frequency === "daily") {
      nextStartDate.setDate(nextStartDate.getDate() + interval);
    } else if (frequency === "weekly") {
      nextStartDate.setDate(nextStartDate.getDate() + 7 * interval);
    } else if (frequency === "monthly") {
      nextStartDate.setMonth(nextStartDate.getMonth() + interval);
    }

    // Check if we've reached the end conditions
    if (endDate && nextStartDate > endDate) continue;
    if (endAfterOccurrences && goal.completionCount >= endAfterOccurrences) continue;

    // Create new goal instance
    const newGoal = new this({
      ...goal.toObject(),
      _id: undefined,
      currentValue: 0,
      status: "active",
      startDate: nextStartDate,
      endDate: new Date(nextStartDate.getTime() + (goal.endDate.getTime() - goal.startDate.getTime())),
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    // Reset milestones and rewards
    newGoal.milestones.forEach((milestone) => {
      milestone.currentValue = 0;
      milestone.isCompleted = false;
      milestone.completedAt = null;
    });

    newGoal.rewards.forEach((reward) => {
      reward.isEarned = false;
      reward.earnedAt = null;
    });

    newGoals.push(newGoal);
  }

  if (newGoals.length > 0) {
    await this.insertMany(newGoals);
  }

  return newGoals.length;
};

// Pre-save middleware to calculate progress percentage
goalSchema.pre("save", function (next) {
  // Update milestone current values based on goal progress
  this.milestones.forEach((milestone) => {
    if (!milestone.isCompleted) {
      milestone.currentValue = Math.min(this.currentValue, milestone.targetValue);
    }
  });

  next();
});

module.exports = mongoose.model("Goal", goalSchema);
