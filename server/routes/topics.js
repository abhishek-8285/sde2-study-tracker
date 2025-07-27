const express = require("express");
const { Topic, UserProgress } = require("../models/Topic");
const { auth, checkResourceOwnership } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/topics
// @desc    Get all topics with user progress (if authenticated)
// @access  Public
router.get("/", async (req, res) => {
  try {
    const { category, difficulty, search, page = 1, limit = 20, sortBy = "createdAt", sortOrder = -1 } = req.query;

    let query = { isActive: true };

    // Build query filters
    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;

    if (search) {
      query.$or = [{ title: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }, { tags: { $in: [new RegExp(search, "i")] } }];
    }

    // Execute query
    const topics = await Topic.find(query)
      .sort({ [sortBy]: parseInt(sortOrder) })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("prerequisites", "title category difficulty")
      .populate("createdBy", "username profile.firstName profile.lastName")
      .lean();

    // Get user progress if authenticated
    if (req.userId) {
      const userProgresses = await UserProgress.find({
        userId: req.userId,
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
          isBookmarked: false,
        };
      });
    }

    // Get total count for pagination
    const totalCount = await Topic.countDocuments(query);

    res.json({
      topics,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
      },
    });
  } catch (error) {
    console.error("Get topics error:", error);
    res.status(500).json({
      message: "Server error retrieving topics",
      code: "GET_TOPICS_ERROR",
    });
  }
});

// @route   GET /api/topics/categories
// @desc    Get all topic categories with stats
// @access  Public
router.get("/categories", async (req, res) => {
  try {
    const categories = await Topic.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: "$category",
          totalTopics: { $sum: 1 },
          averageRating: { $avg: "$averageRating" },
          totalEstimatedHours: { $sum: "$estimatedHours" },
          difficulties: { $addToSet: "$difficulty" },
        },
      },
      {
        $project: {
          category: "$_id",
          totalTopics: 1,
          averageRating: { $round: ["$averageRating", 2] },
          totalEstimatedHours: 1,
          difficulties: 1,
        },
      },
      { $sort: { totalTopics: -1 } },
    ]);

    res.json({ categories });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({
      message: "Server error retrieving categories",
      code: "GET_CATEGORIES_ERROR",
    });
  }
});

// @route   GET /api/topics/:id
// @desc    Get topic by ID with user progress
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id).populate("prerequisites", "title category difficulty estimatedHours").populate("createdBy", "username profile.firstName profile.lastName").lean();

    if (!topic) {
      return res.status(404).json({
        message: "Topic not found",
        code: "TOPIC_NOT_FOUND",
      });
    }

    if (!topic.isActive) {
      return res.status(404).json({
        message: "Topic is no longer available",
        code: "TOPIC_INACTIVE",
      });
    }

    // Get user progress if authenticated
    if (req.userId) {
      const userProgress = await UserProgress.findOne({
        userId: req.userId,
        topicId: topic._id,
      }).lean();

      topic.userProgress = userProgress || {
        status: "not-started",
        progress: 0,
        timeSpent: 0,
        notes: "",
        isBookmarked: false,
      };
    }

    // Get average completion time
    topic.averageCompletionTime = await Topic.findById(topic._id).then((t) => t.getAverageCompletionTime());

    res.json({ topic });
  } catch (error) {
    console.error("Get topic error:", error);
    res.status(500).json({
      message: "Server error retrieving topic",
      code: "GET_TOPIC_ERROR",
    });
  }
});

// @route   POST /api/topics
// @desc    Create new topic (admin only for now)
// @access  Private
router.post("/", auth, async (req, res) => {
  try {
    const { title, description, category, difficulty = "Beginner", estimatedHours, prerequisites = [], tags = [], resources = [], milestones = [] } = req.body;

    // Validation
    if (!title || !description || !category || !estimatedHours) {
      return res.status(400).json({
        message: "Title, description, category, and estimated hours are required",
        code: "MISSING_REQUIRED_FIELDS",
      });
    }

    // Check for duplicate title
    const existingTopic = await Topic.findOne({ title, isActive: true });
    if (existingTopic) {
      return res.status(400).json({
        message: "Topic with this title already exists",
        code: "DUPLICATE_TOPIC",
      });
    }

    // Create topic
    const topic = new Topic({
      title,
      description,
      category,
      difficulty,
      estimatedHours,
      prerequisites,
      tags,
      resources,
      milestones,
      createdBy: req.userId,
    });

    await topic.save();

    await topic.populate("prerequisites", "title category");

    res.status(201).json({
      message: "Topic created successfully",
      topic,
    });
  } catch (error) {
    console.error("Create topic error:", error);
    res.status(500).json({
      message: "Server error creating topic",
      code: "CREATE_TOPIC_ERROR",
    });
  }
});

// @route   PUT /api/topics/:id
// @desc    Update topic
// @access  Private (creator only)
router.put("/:id", auth, checkResourceOwnership("topic"), async (req, res) => {
  try {
    const { title, description, category, difficulty, estimatedHours, prerequisites, tags, resources, milestones } = req.body;

    const topic = req.resource;

    // Update fields
    if (title) topic.title = title;
    if (description) topic.description = description;
    if (category) topic.category = category;
    if (difficulty) topic.difficulty = difficulty;
    if (estimatedHours) topic.estimatedHours = estimatedHours;
    if (prerequisites) topic.prerequisites = prerequisites;
    if (tags) topic.tags = tags;
    if (resources) topic.resources = resources;
    if (milestones) topic.milestones = milestones;

    await topic.save();
    await topic.populate("prerequisites", "title category");

    res.json({
      message: "Topic updated successfully",
      topic,
    });
  } catch (error) {
    console.error("Update topic error:", error);
    res.status(500).json({
      message: "Server error updating topic",
      code: "UPDATE_TOPIC_ERROR",
    });
  }
});

// @route   DELETE /api/topics/:id
// @desc    Delete topic (soft delete)
// @access  Private (creator only)
router.delete("/:id", auth, checkResourceOwnership("topic"), async (req, res) => {
  try {
    const topic = req.resource;

    // Soft delete
    topic.isActive = false;
    await topic.save();

    res.json({
      message: "Topic deleted successfully",
    });
  } catch (error) {
    console.error("Delete topic error:", error);
    res.status(500).json({
      message: "Server error deleting topic",
      code: "DELETE_TOPIC_ERROR",
    });
  }
});

// @route   GET /api/topics/:id/progress
// @desc    Get user's progress for a topic
// @access  Private
router.get("/:id/progress", auth, async (req, res) => {
  try {
    const progress = await UserProgress.findOne({
      userId: req.userId,
      topicId: req.params.id,
    })
      .populate("topicId", "title category estimatedHours")
      .lean();

    if (!progress) {
      return res.status(404).json({
        message: "No progress found for this topic",
        code: "PROGRESS_NOT_FOUND",
      });
    }

    res.json({ progress });
  } catch (error) {
    console.error("Get progress error:", error);
    res.status(500).json({
      message: "Server error retrieving progress",
      code: "GET_PROGRESS_ERROR",
    });
  }
});

// @route   POST /api/topics/:id/progress
// @desc    Update user's progress for a topic
// @access  Private
router.post("/:id/progress", auth, async (req, res) => {
  try {
    const { status, progress, timeSpent, notes, rating, milestoneProgress, resourceProgress } = req.body;

    // Verify topic exists
    const topic = await Topic.findById(req.params.id);
    if (!topic || !topic.isActive) {
      return res.status(404).json({
        message: "Topic not found",
        code: "TOPIC_NOT_FOUND",
      });
    }

    // Find or create user progress
    let userProgress = await UserProgress.findOne({
      userId: req.userId,
      topicId: req.params.id,
    });

    if (!userProgress) {
      userProgress = new UserProgress({
        userId: req.userId,
        topicId: req.params.id,
      });
    }

    // Update progress
    userProgress.updateProgress({
      status,
      progress,
      timeSpent,
      notes,
      rating,
    });

    if (milestoneProgress) userProgress.milestoneProgress = milestoneProgress;
    if (resourceProgress) userProgress.resourceProgress = resourceProgress;

    await userProgress.save();

    // Update topic statistics if completed
    if (status === "completed") {
      topic.updateCompletionStats(rating);
      await topic.save();

      // Update user statistics
      const user = await require("../models/User").findById(req.userId);
      user.statistics.completedTopics += 1;
      await user.save();
    }

    res.json({
      message: "Progress updated successfully",
      progress: userProgress,
    });
  } catch (error) {
    console.error("Update progress error:", error);
    res.status(500).json({
      message: "Server error updating progress",
      code: "UPDATE_PROGRESS_ERROR",
    });
  }
});

// @route   POST /api/topics/:id/bookmark
// @desc    Toggle bookmark for a topic
// @access  Private
router.post("/:id/bookmark", auth, async (req, res) => {
  try {
    // Find or create user progress
    let userProgress = await UserProgress.findOne({
      userId: req.userId,
      topicId: req.params.id,
    });

    if (!userProgress) {
      userProgress = new UserProgress({
        userId: req.userId,
        topicId: req.params.id,
      });
    }

    // Toggle bookmark
    userProgress.isBookmarked = !userProgress.isBookmarked;
    await userProgress.save();

    res.json({
      message: `Topic ${userProgress.isBookmarked ? "bookmarked" : "unbookmarked"} successfully`,
      isBookmarked: userProgress.isBookmarked,
    });
  } catch (error) {
    console.error("Bookmark toggle error:", error);
    res.status(500).json({
      message: "Server error toggling bookmark",
      code: "BOOKMARK_ERROR",
    });
  }
});

// @route   GET /api/topics/user/bookmarks
// @desc    Get user's bookmarked topics
// @access  Private
router.get("/user/bookmarks", auth, async (req, res) => {
  try {
    const bookmarks = await UserProgress.find({
      userId: req.userId,
      isBookmarked: true,
    })
      .populate("topicId", "title description category difficulty estimatedHours averageRating")
      .sort({ updatedAt: -1 })
      .lean();

    const topics = bookmarks.map((bookmark) => ({
      ...bookmark.topicId,
      userProgress: {
        status: bookmark.status,
        progress: bookmark.progress,
        timeSpent: bookmark.timeSpent,
        lastStudiedAt: bookmark.lastStudiedAt,
      },
    }));

    res.json({ topics });
  } catch (error) {
    console.error("Get bookmarks error:", error);
    res.status(500).json({
      message: "Server error retrieving bookmarks",
      code: "GET_BOOKMARKS_ERROR",
    });
  }
});

// @route   GET /api/topics/user/progress
// @desc    Get user's progress for all topics
// @access  Private
router.get("/user/progress", auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    let query = { userId: req.userId };
    if (status) query.status = status;

    const progressList = await UserProgress.find(query)
      .populate("topicId", "title description category difficulty estimatedHours")
      .sort({ lastStudiedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const totalCount = await UserProgress.countDocuments(query);

    res.json({
      progress: progressList,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
      },
    });
  } catch (error) {
    console.error("Get user progress error:", error);
    res.status(500).json({
      message: "Server error retrieving user progress",
      code: "GET_USER_PROGRESS_ERROR",
    });
  }
});

// @route   GET /api/topics/user/stats
// @desc    Get user's topic statistics
// @access  Private
router.get("/user/stats", auth, async (req, res) => {
  try {
    const stats = await UserProgress.aggregate([
      { $match: { userId: req.userId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalTimeSpent: { $sum: "$timeSpent" },
        },
      },
    ]);

    const categoryStats = await UserProgress.aggregate([
      { $match: { userId: req.userId } },
      {
        $lookup: {
          from: "topics",
          localField: "topicId",
          foreignField: "_id",
          as: "topic",
        },
      },
      { $unwind: "$topic" },
      {
        $group: {
          _id: "$topic.category",
          totalTopics: { $sum: 1 },
          completedTopics: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          totalTimeSpent: { $sum: "$timeSpent" },
          averageProgress: { $avg: "$progress" },
        },
      },
    ]);

    const totalTopics = await Topic.countDocuments({ isActive: true });

    res.json({
      statusStats: stats,
      categoryStats,
      totalAvailableTopics: totalTopics,
    });
  } catch (error) {
    console.error("Get topic stats error:", error);
    res.status(500).json({
      message: "Server error retrieving topic statistics",
      code: "GET_TOPIC_STATS_ERROR",
    });
  }
});

module.exports = router;
