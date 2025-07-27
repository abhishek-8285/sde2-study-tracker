const express = require("express");
const { auth } = require("../middleware/auth");
const StudySession = require("../models/StudySession");
const { Topic, UserProgress } = require("../models/Topic");
const Goal = require("../models/Goal");

const router = express.Router();

// @route   GET /api/analytics/overview
// @desc    Get user's analytics overview
// @access  Private
router.get("/overview", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const { timeRange = "30d" } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get study sessions stats
    const sessionsStats = await StudySession.aggregate([
      {
        $match: {
          userId: userId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalStudyTime: { $sum: "$duration" },
          averageSessionLength: { $avg: "$duration" },
        },
      },
    ]);

    // Get topics progress
    const topicsProgress = await UserProgress.countDocuments({
      userId: userId,
      status: "completed",
    });

    // Get active goals
    const activeGoals = await Goal.countDocuments({
      userId: userId,
      status: "active",
    });

    res.json({
      overview: {
        totalSessions: sessionsStats[0]?.totalSessions || 0,
        totalStudyTime: sessionsStats[0]?.totalStudyTime || 0,
        averageSessionLength: sessionsStats[0]?.averageSessionLength || 0,
        topicsCompleted: topicsProgress,
        activeGoals: activeGoals,
      },
      timeRange,
    });
  } catch (error) {
    console.error("Analytics overview error:", error);
    res.status(500).json({
      message: "Server error retrieving analytics",
      code: "ANALYTICS_ERROR",
    });
  }
});

// @route   GET /api/analytics/study-time
// @desc    Get study time analytics
// @access  Private
router.get("/study-time", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const { timeRange = "30d" } = req.query;

    // This would contain more detailed study time analytics
    res.json({
      message: "Study time analytics endpoint",
      timeRange,
    });
  } catch (error) {
    console.error("Study time analytics error:", error);
    res.status(500).json({
      message: "Server error retrieving study time analytics",
      code: "STUDY_TIME_ANALYTICS_ERROR",
    });
  }
});

// @route   GET /api/analytics/progress
// @desc    Get progress analytics
// @access  Private
router.get("/progress", auth, async (req, res) => {
  try {
    const userId = req.userId;

    // This would contain progress analytics
    res.json({
      message: "Progress analytics endpoint",
    });
  } catch (error) {
    console.error("Progress analytics error:", error);
    res.status(500).json({
      message: "Server error retrieving progress analytics",
      code: "PROGRESS_ANALYTICS_ERROR",
    });
  }
});

module.exports = router;
