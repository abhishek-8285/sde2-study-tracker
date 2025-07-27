const mongoose = require("mongoose");

const bookmarkSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    contentPath: {
      type: String,
      required: true,
      index: true, // e.g., "springBoot/01-introduction.md"
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    location: {
      // Multiple ways to identify location in content
      lineNumber: {
        type: Number,
        min: 1,
      },
      sectionHeading: {
        type: String,
        trim: true,
      },
      textSnippet: {
        type: String,
        trim: true,
        maxlength: 300, // Context around the bookmark
      },
      scrollPercentage: {
        type: Number,
        min: 0,
        max: 100,
      },
      characterOffset: {
        type: Number,
        min: 0,
      },
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: 50,
      },
    ],
    color: {
      type: String,
      enum: ["yellow", "blue", "green", "red", "purple", "orange"],
      default: "yellow",
    },
    isPrivate: {
      type: Boolean,
      default: true,
    },
    lastAccessed: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
bookmarkSchema.index({ user: 1, contentPath: 1 });
bookmarkSchema.index({ user: 1, createdAt: -1 });
bookmarkSchema.index({ user: 1, lastAccessed: -1 });

// Instance methods
bookmarkSchema.methods.updateLastAccessed = function () {
  this.lastAccessed = new Date();
  return this.save();
};

// Static methods
bookmarkSchema.statics.findByUserAndContent = function (userId, contentPath) {
  return this.find({
    user: userId,
    contentPath: contentPath,
  }).sort({ createdAt: 1 });
};

bookmarkSchema.statics.findRecentByUser = function (userId, limit = 20) {
  return this.find({ user: userId }).sort({ lastAccessed: -1 }).limit(limit).populate("user", "username firstName lastName");
};

bookmarkSchema.statics.getBookmarkStats = function (userId) {
  return this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalBookmarks: { $sum: 1 },
        uniqueContent: { $addToSet: "$contentPath" },
        colors: { $addToSet: "$color" },
        avgPerContent: { $avg: 1 },
      },
    },
    {
      $project: {
        totalBookmarks: 1,
        uniqueContentCount: { $size: "$uniqueContent" },
        colorsUsed: { $size: "$colors" },
      },
    },
  ]);
};

const Bookmark = mongoose.model("Bookmark", bookmarkSchema);

module.exports = Bookmark;
