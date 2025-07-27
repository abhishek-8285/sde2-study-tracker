const mongoose = require("mongoose");

const topicSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Topic title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Topic description is required"],
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "Backend Development",
        "Frontend Development",
        "Data Structures & Algorithms",
        "System Design",
        "Database Design",
        "Security & Authentication",
        "DevOps & Infrastructure",
        "API Design & Testing",
        "Software Architecture",
        "Design Patterns",
        "AI/ML Integration",
        "Cloud Computing",
        "Mobile Development",
        "Performance Optimization",
        "Testing & QA",
        "Version Control",
        "Soft Skills",
        "Interview Preparation",
      ],
    },
    difficulty: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner",
    },
    estimatedHours: {
      type: Number,
      required: [true, "Estimated hours is required"],
      min: [0.5, "Estimated hours must be at least 0.5"],
      max: [200, "Estimated hours cannot exceed 200"],
    },
    prerequisites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Topic",
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    resources: [
      {
        title: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ["Article", "Video", "Book", "Course", "Documentation", "Tutorial", "Practice", "Project"],
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        description: String,
        duration: Number, // in minutes
        isRequired: {
          type: Boolean,
          default: false,
        },
      },
    ],
    milestones: [
      {
        title: {
          type: String,
          required: true,
        },
        description: String,
        order: {
          type: Number,
          required: true,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
    completionCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// User Progress Schema (embedded in UserProgress model)
const userProgressSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ["not-started", "in-progress", "completed", "on-hold"],
      default: "not-started",
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    timeSpent: {
      type: Number,
      default: 0, // in minutes
    },
    notes: {
      type: String,
      maxlength: [2000, "Notes cannot exceed 2000 characters"],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    lastStudiedAt: {
      type: Date,
      default: Date.now,
    },
    milestoneProgress: [
      {
        milestoneId: mongoose.Schema.Types.ObjectId,
        completed: {
          type: Boolean,
          default: false,
        },
        completedAt: Date,
      },
    ],
    resourceProgress: [
      {
        resourceId: mongoose.Schema.Types.ObjectId,
        completed: {
          type: Boolean,
          default: false,
        },
        timeSpent: {
          type: Number,
          default: 0,
        },
        completedAt: Date,
      },
    ],
    isBookmarked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
topicSchema.index({ category: 1 });
topicSchema.index({ difficulty: 1 });
topicSchema.index({ averageRating: -1 });
topicSchema.index({ completionCount: -1 });
topicSchema.index({ createdAt: -1 });
topicSchema.index({ tags: 1 });

userProgressSchema.index({ userId: 1, topicId: 1 }, { unique: true });
userProgressSchema.index({ userId: 1, status: 1 });
userProgressSchema.index({ userId: 1, lastStudiedAt: -1 });

// Virtual for completion percentage across all users
topicSchema.virtual("completionRate").get(function () {
  if (this.totalRatings === 0) return 0;
  return Math.round((this.completionCount / this.totalRatings) * 100);
});

// Method to calculate average completion time
topicSchema.methods.getAverageCompletionTime = async function () {
  const UserProgress = mongoose.model("UserProgress");
  const completedProgresses = await UserProgress.find({
    topicId: this._id,
    status: "completed",
  });

  if (completedProgresses.length === 0) return 0;

  const totalTime = completedProgresses.reduce((sum, progress) => sum + progress.timeSpent, 0);
  return Math.round(totalTime / completedProgresses.length);
};

// Method to get topic with user's progress
topicSchema.methods.getWithUserProgress = async function (userId) {
  const UserProgress = mongoose.model("UserProgress");
  const userProgress = await UserProgress.findOne({
    userId: userId,
    topicId: this._id,
  });

  const topicData = this.toObject();
  topicData.userProgress = userProgress || {
    status: "not-started",
    progress: 0,
    timeSpent: 0,
    notes: "",
    isBookmarked: false,
  };

  return topicData;
};

// Static method to get topics by category with user progress
topicSchema.statics.getByCategory = async function (category, userId, options = {}) {
  const { page = 1, limit = 20, sortBy = "createdAt", sortOrder = -1, difficulty, search } = options;

  let query = { category, isActive: true };

  if (difficulty) {
    query.difficulty = difficulty;
  }

  if (search) {
    query.$or = [{ title: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }, { tags: { $in: [new RegExp(search, "i")] } }];
  }

  const topics = await this.find(query)
    .sort({ [sortBy]: sortOrder })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("prerequisites", "title")
    .lean();

  if (userId) {
    const UserProgress = mongoose.model("UserProgress");
    const userProgresses = await UserProgress.find({
      userId: userId,
      topicId: { $in: topics.map((t) => t._id) },
    }).lean();

    const progressMap = userProgresses.reduce((acc, progress) => {
      acc[progress.topicId.toString()] = progress;
      return acc;
    }, {});

    topics.forEach((topic) => {
      topic.userProgress = progressMap[topic._id.toString()] || {
        status: "not-started",
        progress: 0,
        timeSpent: 0,
        notes: "",
        isBookmarked: false,
      };
    });
  }

  return topics;
};

// Method to update topic statistics when user completes
topicSchema.methods.updateCompletionStats = function (userRating = null) {
  this.completionCount += 1;

  if (userRating) {
    const totalRatingPoints = this.averageRating * this.totalRatings + userRating;
    this.totalRatings += 1;
    this.averageRating = totalRatingPoints / this.totalRatings;
  }
};

// UserProgress model methods
userProgressSchema.methods.updateProgress = function (progressData) {
  const { status, progress, timeSpent, notes, rating } = progressData;

  if (status) this.status = status;
  if (typeof progress === "number") this.progress = progress;
  if (typeof timeSpent === "number") this.timeSpent += timeSpent;
  if (notes) this.notes = notes;
  if (rating) this.rating = rating;

  this.lastStudiedAt = new Date();

  if (status === "in-progress" && !this.startedAt) {
    this.startedAt = new Date();
  }

  if (status === "completed" && !this.completedAt) {
    this.completedAt = new Date();
  }
};

// UserProgress method to calculate progress percentage
userProgressSchema.methods.calculateProgress = function () {
  const topic = this.populated("topicId") || this.topicId;
  if (!topic.milestones || topic.milestones.length === 0) {
    return this.progress;
  }

  const completedMilestones = this.milestoneProgress.filter((m) => m.completed).length;
  return Math.round((completedMilestones / topic.milestones.length) * 100);
};

// Create models
const Topic = mongoose.model("Topic", topicSchema);
const UserProgress = mongoose.model("UserProgress", userProgressSchema);

module.exports = { Topic, UserProgress };
