const express = require("express");
const Goal = require("../models/Goal");
const { auth, checkResourceOwnership } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/goals
// @desc    Get user's goals
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const { type, status, category, page = 1, limit = 20, sortBy = "endDate", sortOrder = 1 } = req.query;

    let query = { userId: req.userId };

    // Build query filters
    if (type) query.type = type;
    if (status) query.status = status;
    if (category) query.category = category;

    const goals = await Goal.find(query)
      .populate("relatedTopics", "title category")
      .sort({ [sortBy]: parseInt(sortOrder) })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    // Add virtual fields
    goals.forEach((goal) => {
      goal.progressPercentage = goal.targetValue === 0 ? 0 : Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));

      const today = new Date();
      const endDate = new Date(goal.endDate);
      const timeDiff = endDate.getTime() - today.getTime();
      goal.daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
      goal.isOverdue = today > endDate && goal.status === "active";
    });

    const totalCount = await Goal.countDocuments(query);

    res.json({
      goals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
      },
    });
  } catch (error) {
    console.error("Get goals error:", error);
    res.status(500).json({
      message: "Server error retrieving goals",
      code: "GET_GOALS_ERROR",
    });
  }
});

// @route   GET /api/goals/active
// @desc    Get user's active goals
// @access  Private
router.get("/active", auth, async (req, res) => {
  try {
    const { type } = req.query;

    const goals = await Goal.getActiveGoals(req.userId, type);

    // Add virtual fields and check for overdue
    goals.forEach((goal) => {
      goal.progressPercentage = goal.targetValue === 0 ? 0 : Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));

      const today = new Date();
      const endDate = new Date(goal.endDate);
      const timeDiff = endDate.getTime() - today.getTime();
      goal.daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
      goal.isOverdue = today > endDate;
    });

    res.json({ goals });
  } catch (error) {
    console.error("Get active goals error:", error);
    res.status(500).json({
      message: "Server error retrieving active goals",
      code: "GET_ACTIVE_GOALS_ERROR",
    });
  }
});

// @route   GET /api/goals/stats
// @desc    Get user's goal statistics
// @access  Private
router.get("/stats", auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Get overall stats
    const stats = await Goal.getGoalStats(req.userId, { startDate, endDate });

    // Get category breakdown
    const categoryStats = await Goal.getGoalsByCategory(req.userId);

    // Get goal completion trend (last 12 weeks)
    const weeklyTrend = await Goal.aggregate([
      {
        $match: {
          userId: req.userId,
          status: "completed",
          completedAt: {
            $gte: new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$completedAt" },
            week: { $week: "$completedAt" },
          },
          completed: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.week": 1 },
      },
    ]);

    // Get upcoming deadlines
    const upcomingDeadlines = await Goal.find({
      userId: req.userId,
      status: "active",
      endDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
      },
    })
      .select("title endDate currentValue targetValue")
      .sort({ endDate: 1 })
      .limit(5)
      .lean();

    res.json({
      overview: stats,
      categoryStats,
      weeklyTrend,
      upcomingDeadlines,
    });
  } catch (error) {
    console.error("Get goal stats error:", error);
    res.status(500).json({
      message: "Server error retrieving goal statistics",
      code: "GET_GOAL_STATS_ERROR",
    });
  }
});

// @route   POST /api/goals
// @desc    Create a new goal
// @access  Private
router.post("/", auth, async (req, res) => {
  try {
    const { title, description, type, category, targetValue, unit, priority = "medium", endDate, relatedTopics = [], milestones = [], reminders = [], rewards = [], difficulty = "moderate", tags = [], isRecurring = false, recurrencePattern } = req.body;

    // Validation
    if (!title || !type || !category || !targetValue || !unit || !endDate) {
      return res.status(400).json({
        message: "Title, type, category, target value, unit, and end date are required",
        code: "MISSING_REQUIRED_FIELDS",
      });
    }

    const goal = new Goal({
      userId: req.userId,
      title,
      description,
      type,
      category,
      targetValue,
      unit,
      priority,
      endDate: new Date(endDate),
      relatedTopics,
      milestones,
      reminders,
      rewards,
      difficulty,
      tags,
      isRecurring,
      recurrencePattern,
    });

    await goal.save();
    await goal.populate("relatedTopics", "title category");

    res.status(201).json({
      message: "Goal created successfully",
      goal,
    });
  } catch (error) {
    console.error("Create goal error:", error);
    res.status(500).json({
      message: "Server error creating goal",
      code: "CREATE_GOAL_ERROR",
    });
  }
});

// @route   GET /api/goals/:id
// @desc    Get goal by ID
// @access  Private
router.get("/:id", auth, checkResourceOwnership("goal"), async (req, res) => {
  try {
    const goal = req.resource;
    await goal.populate("relatedTopics", "title category difficulty estimatedHours");

    // Add virtual fields
    goal.progressPercentage = goal.targetValue === 0 ? 0 : Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));

    const today = new Date();
    const endDate = new Date(goal.endDate);
    const timeDiff = endDate.getTime() - today.getTime();
    goal.daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
    goal.isOverdue = today > endDate && goal.status === "active";

    res.json({ goal });
  } catch (error) {
    console.error("Get goal error:", error);
    res.status(500).json({
      message: "Server error retrieving goal",
      code: "GET_GOAL_ERROR",
    });
  }
});

// @route   PUT /api/goals/:id
// @desc    Update goal
// @access  Private
router.put("/:id", auth, checkResourceOwnership("goal"), async (req, res) => {
  try {
    const { title, description, priority, endDate, relatedTopics, milestones, reminders, rewards, tags, notes } = req.body;

    const goal = req.resource;

    // Update allowed fields
    if (title) goal.title = title;
    if (description !== undefined) goal.description = description;
    if (priority) goal.priority = priority;
    if (endDate) goal.endDate = new Date(endDate);
    if (relatedTopics) goal.relatedTopics = relatedTopics;
    if (milestones) goal.milestones = milestones;
    if (reminders) goal.reminders = reminders;
    if (rewards) goal.rewards = rewards;
    if (tags) goal.tags = tags;
    if (notes !== undefined) goal.notes = notes;

    await goal.save();
    await goal.populate("relatedTopics", "title category");

    res.json({
      message: "Goal updated successfully",
      goal,
    });
  } catch (error) {
    console.error("Update goal error:", error);
    res.status(500).json({
      message: "Server error updating goal",
      code: "UPDATE_GOAL_ERROR",
    });
  }
});

// @route   PUT /api/goals/:id/progress
// @desc    Update goal progress
// @access  Private
router.put("/:id/progress", auth, checkResourceOwnership("goal"), async (req, res) => {
  try {
    const { value, operation = "add" } = req.body;

    if (typeof value !== "number") {
      return res.status(400).json({
        message: "Progress value must be a number",
        code: "INVALID_PROGRESS_VALUE",
      });
    }

    const goal = req.resource;

    await goal.updateProgress(value, operation);

    res.json({
      message: "Goal progress updated successfully",
      goal: {
        ...goal.toObject(),
        progressPercentage: goal.targetValue === 0 ? 0 : Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100)),
      },
    });
  } catch (error) {
    console.error("Update goal progress error:", error);
    res.status(500).json({
      message: "Server error updating goal progress",
      code: "UPDATE_GOAL_PROGRESS_ERROR",
    });
  }
});

// @route   PUT /api/goals/:id/status
// @desc    Update goal status
// @access  Private
router.put("/:id/status", auth, checkResourceOwnership("goal"), async (req, res) => {
  try {
    const { status } = req.body;

    if (!["active", "completed", "paused", "cancelled"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status value",
        code: "INVALID_STATUS",
      });
    }

    const goal = req.resource;

    goal.status = status;

    if (status === "completed" && !goal.completedAt) {
      goal.completedAt = new Date();
      goal.currentValue = goal.targetValue; // Mark as fully completed
    }

    await goal.save();

    res.json({
      message: "Goal status updated successfully",
      goal,
    });
  } catch (error) {
    console.error("Update goal status error:", error);
    res.status(500).json({
      message: "Server error updating goal status",
      code: "UPDATE_GOAL_STATUS_ERROR",
    });
  }
});

// @route   POST /api/goals/:id/milestones
// @desc    Add milestone to goal
// @access  Private
router.post("/:id/milestones", auth, checkResourceOwnership("goal"), async (req, res) => {
  try {
    const { title, targetValue, order } = req.body;

    if (!title || typeof targetValue !== "number") {
      return res.status(400).json({
        message: "Milestone title and target value are required",
        code: "MISSING_MILESTONE_DATA",
      });
    }

    const goal = req.resource;

    await goal.addMilestone({ title, targetValue, order });

    res.json({
      message: "Milestone added successfully",
      goal,
    });
  } catch (error) {
    console.error("Add milestone error:", error);
    res.status(500).json({
      message: "Server error adding milestone",
      code: "ADD_MILESTONE_ERROR",
    });
  }
});

// @route   PUT /api/goals/:id/milestones/:milestoneId
// @desc    Update milestone completion
// @access  Private
router.put("/:id/milestones/:milestoneId", auth, checkResourceOwnership("goal"), async (req, res) => {
  try {
    const { completed } = req.body;
    const goal = req.resource;

    const milestone = goal.milestones.id(req.params.milestoneId);
    if (!milestone) {
      return res.status(404).json({
        message: "Milestone not found",
        code: "MILESTONE_NOT_FOUND",
      });
    }

    milestone.isCompleted = completed;
    if (completed && !milestone.completedAt) {
      milestone.completedAt = new Date();
    } else if (!completed) {
      milestone.completedAt = null;
    }

    await goal.save();

    res.json({
      message: "Milestone updated successfully",
      goal,
    });
  } catch (error) {
    console.error("Update milestone error:", error);
    res.status(500).json({
      message: "Server error updating milestone",
      code: "UPDATE_MILESTONE_ERROR",
    });
  }
});

// @route   DELETE /api/goals/:id
// @desc    Delete goal
// @access  Private
router.delete("/:id", auth, checkResourceOwnership("goal"), async (req, res) => {
  try {
    const goal = req.resource;

    await Goal.findByIdAndDelete(goal._id);

    res.json({
      message: "Goal deleted successfully",
    });
  } catch (error) {
    console.error("Delete goal error:", error);
    res.status(500).json({
      message: "Server error deleting goal",
      code: "DELETE_GOAL_ERROR",
    });
  }
});

// @route   POST /api/goals/:id/reset
// @desc    Reset goal (for recurring goals)
// @access  Private
router.post("/:id/reset", auth, checkResourceOwnership("goal"), async (req, res) => {
  try {
    const goal = req.resource;

    if (!goal.isRecurring) {
      return res.status(400).json({
        message: "Can only reset recurring goals",
        code: "NOT_RECURRING_GOAL",
      });
    }

    await goal.resetGoal();

    res.json({
      message: "Goal reset successfully",
      goal,
    });
  } catch (error) {
    console.error("Reset goal error:", error);
    res.status(500).json({
      message: "Server error resetting goal",
      code: "RESET_GOAL_ERROR",
    });
  }
});

// @route   GET /api/goals/templates
// @desc    Get goal templates
// @access  Private
router.get("/templates", auth, async (req, res) => {
  try {
    const templates = [
      {
        title: "Daily Study Time",
        description: "Complete 2 hours of focused study time",
        type: "daily",
        category: "study-time",
        targetValue: 120,
        unit: "minutes",
        difficulty: "moderate",
      },
      {
        title: "Weekly Topic Completion",
        description: "Complete 3 topics this week",
        type: "weekly",
        category: "topics-completed",
        targetValue: 3,
        unit: "topics",
        difficulty: "challenging",
      },
      {
        title: "Monthly Skill Development",
        description: "Master a new technology or framework",
        type: "monthly",
        category: "skill-development",
        targetValue: 1,
        unit: "projects",
        difficulty: "challenging",
      },
      {
        title: "Maintain Study Streak",
        description: "Study consistently for 30 days",
        type: "monthly",
        category: "streak-maintenance",
        targetValue: 30,
        unit: "days",
        difficulty: "extreme",
      },
      {
        title: "Algorithm Practice",
        description: "Solve 50 algorithm problems",
        type: "monthly",
        category: "practice",
        targetValue: 50,
        unit: "problems",
        difficulty: "challenging",
      },
    ];

    res.json({ templates });
  } catch (error) {
    console.error("Get templates error:", error);
    res.status(500).json({
      message: "Server error retrieving templates",
      code: "GET_TEMPLATES_ERROR",
    });
  }
});

module.exports = router;
