const express = require("express");
const StudySession = require("../models/StudySession");
const { Topic } = require("../models/Topic");
const { auth, checkResourceOwnership } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/sessions
// @desc    Get user's study sessions
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, topicId, startDate, endDate, type } = req.query;

    let query = { userId: req.userId };

    // Build query filters
    if (status) query.status = status;
    if (topicId) query.topicId = topicId;
    if (type) query.type = type;

    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }

    const sessions = await StudySession.find(query)
      .populate("topicId", "title category difficulty")
      .sort({ startTime: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const totalCount = await StudySession.countDocuments(query);

    res.json({
      sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
      },
    });
  } catch (error) {
    console.error("Get sessions error:", error);
    res.status(500).json({
      message: "Server error retrieving sessions",
      code: "GET_SESSIONS_ERROR",
    });
  }
});

// @route   GET /api/sessions/today
// @desc    Get today's study sessions
// @access  Private
router.get("/today", auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sessions = await StudySession.find({
      userId: req.userId,
      startTime: {
        $gte: today,
        $lt: tomorrow,
      },
    })
      .populate("topicId", "title category")
      .sort({ startTime: -1 })
      .lean();

    // Calculate today's stats
    const stats = {
      totalSessions: sessions.length,
      completedSessions: sessions.filter((s) => s.isCompleted).length,
      totalTime: sessions.reduce((sum, s) => sum + (s.actualDuration || 0), 0),
      averageProductivity: sessions.length > 0 ? sessions.reduce((sum, s) => sum + (s.productivity?.rating || 0), 0) / sessions.length : 0,
    };

    res.json({
      sessions,
      stats,
    });
  } catch (error) {
    console.error("Get today sessions error:", error);
    res.status(500).json({
      message: "Server error retrieving today's sessions",
      code: "GET_TODAY_SESSIONS_ERROR",
    });
  }
});

// @route   GET /api/sessions/active
// @desc    Get user's currently active session
// @access  Private
router.get("/active", auth, async (req, res) => {
  try {
    const activeSession = await StudySession.findOne({
      userId: req.userId,
      status: { $in: ["active", "paused"] },
    })
      .populate("topicId", "title category difficulty")
      .lean();

    res.json({
      session: activeSession,
    });
  } catch (error) {
    console.error("Get active session error:", error);
    res.status(500).json({
      message: "Server error retrieving active session",
      code: "GET_ACTIVE_SESSION_ERROR",
    });
  }
});

// @route   POST /api/sessions
// @desc    Create a new study session
// @access  Private
router.post("/", auth, async (req, res) => {
  try {
    const { topicId, type = "focused", plannedDuration, notes, environment } = req.body;

    // Validation
    if (!topicId || !plannedDuration) {
      return res.status(400).json({
        message: "Topic and planned duration are required",
        code: "MISSING_REQUIRED_FIELDS",
      });
    }

    // Verify topic exists
    const topic = await Topic.findById(topicId);
    if (!topic || !topic.isActive) {
      return res.status(404).json({
        message: "Topic not found",
        code: "TOPIC_NOT_FOUND",
      });
    }

    // Check if user has an active session
    const activeSession = await StudySession.findOne({
      userId: req.userId,
      status: { $in: ["active", "paused"] },
    });

    if (activeSession) {
      return res.status(400).json({
        message: "You already have an active session. Please complete or cancel it first.",
        code: "ACTIVE_SESSION_EXISTS",
      });
    }

    // Create new session
    const session = new StudySession({
      userId: req.userId,
      topicId,
      type,
      plannedDuration,
      startTime: new Date(),
      status: "planned",
      notes,
      environment,
    });

    await session.save();
    await session.populate("topicId", "title category difficulty");

    res.status(201).json({
      message: "Study session created successfully",
      session,
    });
  } catch (error) {
    console.error("Create session error:", error);
    res.status(500).json({
      message: "Server error creating session",
      code: "CREATE_SESSION_ERROR",
    });
  }
});

// @route   PUT /api/sessions/:id/start
// @desc    Start a study session
// @access  Private
router.put("/:id/start", auth, checkResourceOwnership("session"), async (req, res) => {
  try {
    const session = req.resource;

    if (session.status !== "planned") {
      return res.status(400).json({
        message: "Can only start planned sessions",
        code: "INVALID_SESSION_STATUS",
      });
    }

    await session.startSession();
    await session.populate("topicId", "title category difficulty");

    res.json({
      message: "Session started successfully",
      session,
    });
  } catch (error) {
    console.error("Start session error:", error);
    res.status(500).json({
      message: "Server error starting session",
      code: "START_SESSION_ERROR",
    });
  }
});

// @route   PUT /api/sessions/:id/pause
// @desc    Pause a study session
// @access  Private
router.put("/:id/pause", auth, checkResourceOwnership("session"), async (req, res) => {
  try {
    const session = req.resource;

    await session.pauseSession();
    await session.populate("topicId", "title category difficulty");

    res.json({
      message: "Session paused successfully",
      session,
    });
  } catch (error) {
    console.error("Pause session error:", error);
    res.status(500).json({
      message: "Server error pausing session",
      code: "PAUSE_SESSION_ERROR",
    });
  }
});

// @route   PUT /api/sessions/:id/resume
// @desc    Resume a paused study session
// @access  Private
router.put("/:id/resume", auth, checkResourceOwnership("session"), async (req, res) => {
  try {
    const { pauseDuration = 0 } = req.body;
    const session = req.resource;

    await session.resumeSession(pauseDuration);
    await session.populate("topicId", "title category difficulty");

    res.json({
      message: "Session resumed successfully",
      session,
    });
  } catch (error) {
    console.error("Resume session error:", error);
    res.status(500).json({
      message: "Server error resuming session",
      code: "RESUME_SESSION_ERROR",
    });
  }
});

// @route   PUT /api/sessions/:id/complete
// @desc    Complete a study session
// @access  Private
router.put("/:id/complete", auth, checkResourceOwnership("session"), async (req, res) => {
  try {
    const { notes, productivity, focusMetrics, tags } = req.body;

    const session = req.resource;

    if (!["active", "paused"].includes(session.status)) {
      return res.status(400).json({
        message: "Can only complete active or paused sessions",
        code: "INVALID_SESSION_STATUS",
      });
    }

    await session.completeSession({
      notes,
      productivity,
      focusMetrics,
      tags,
    });

    await session.populate("topicId", "title category difficulty");

    res.json({
      message: "Session completed successfully",
      session,
    });
  } catch (error) {
    console.error("Complete session error:", error);
    res.status(500).json({
      message: "Server error completing session",
      code: "COMPLETE_SESSION_ERROR",
    });
  }
});

// @route   PUT /api/sessions/:id/cancel
// @desc    Cancel a study session
// @access  Private
router.put("/:id/cancel", auth, checkResourceOwnership("session"), async (req, res) => {
  try {
    const { reason } = req.body;
    const session = req.resource;

    await session.cancelSession(reason);
    await session.populate("topicId", "title category difficulty");

    res.json({
      message: "Session cancelled successfully",
      session,
    });
  } catch (error) {
    console.error("Cancel session error:", error);
    res.status(500).json({
      message: "Server error cancelling session",
      code: "CANCEL_SESSION_ERROR",
    });
  }
});

// @route   POST /api/sessions/:id/break
// @desc    Add a break to a study session
// @access  Private
router.post("/:id/break", auth, checkResourceOwnership("session"), async (req, res) => {
  try {
    const { startTime, endTime, type = "short" } = req.body;

    const session = req.resource;

    await session.addBreak({
      startTime: startTime ? new Date(startTime) : new Date(),
      endTime: endTime ? new Date(endTime) : null,
      type,
    });

    res.json({
      message: "Break added successfully",
      session,
    });
  } catch (error) {
    console.error("Add break error:", error);
    res.status(500).json({
      message: "Server error adding break",
      code: "ADD_BREAK_ERROR",
    });
  }
});

// @route   GET /api/sessions/stats
// @desc    Get user's session statistics
// @access  Private
router.get("/stats", auth, async (req, res) => {
  try {
    const { startDate, endDate, days = 30 } = req.query;

    // Get basic stats
    const stats = await StudySession.getUserStats(req.userId, {
      startDate,
      endDate,
    });

    // Get daily stats for chart
    const dailyStats = await StudySession.getDailyStats(req.userId, parseInt(days));

    // Get streak information
    const streaks = await StudySession.getStudyStreaks(req.userId);

    // Get session type breakdown
    const typeBreakdown = await StudySession.aggregate([
      {
        $match: {
          userId: req.userId,
          isCompleted: true,
          ...(startDate && { startTime: { $gte: new Date(startDate) } }),
          ...(endDate && { startTime: { $lte: new Date(endDate) } }),
        },
      },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          totalTime: { $sum: "$actualDuration" },
          averageProductivity: { $avg: "$productivity.rating" },
        },
      },
    ]);

    // Get topic-wise session stats
    const topicStats = await StudySession.aggregate([
      {
        $match: {
          userId: req.userId,
          isCompleted: true,
          ...(startDate && { startTime: { $gte: new Date(startDate) } }),
          ...(endDate && { startTime: { $lte: new Date(endDate) } }),
        },
      },
      {
        $group: {
          _id: "$topicId",
          sessions: { $sum: 1 },
          totalTime: { $sum: "$actualDuration" },
          averageProductivity: { $avg: "$productivity.rating" },
        },
      },
      {
        $lookup: {
          from: "topics",
          localField: "_id",
          foreignField: "_id",
          as: "topic",
        },
      },
      {
        $unwind: "$topic",
      },
      {
        $project: {
          topicTitle: "$topic.title",
          topicCategory: "$topic.category",
          sessions: 1,
          totalTime: 1,
          averageProductivity: { $round: ["$averageProductivity", 2] },
        },
      },
      {
        $sort: { totalTime: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    res.json({
      overview: stats,
      streaks,
      dailyStats,
      typeBreakdown,
      topTopics: topicStats,
    });
  } catch (error) {
    console.error("Get session stats error:", error);
    res.status(500).json({
      message: "Server error retrieving session statistics",
      code: "GET_SESSION_STATS_ERROR",
    });
  }
});

// @route   GET /api/sessions/:id
// @desc    Get session by ID
// @access  Private
router.get("/:id", auth, checkResourceOwnership("session"), async (req, res) => {
  try {
    const session = req.resource;
    await session.populate("topicId", "title description category difficulty");

    res.json({ session });
  } catch (error) {
    console.error("Get session error:", error);
    res.status(500).json({
      message: "Server error retrieving session",
      code: "GET_SESSION_ERROR",
    });
  }
});

// @route   PUT /api/sessions/:id
// @desc    Update session details
// @access  Private
router.put("/:id", auth, checkResourceOwnership("session"), async (req, res) => {
  try {
    const { notes, productivity, environment, tags, focusMetrics } = req.body;

    const session = req.resource;

    // Update allowed fields
    if (notes !== undefined) session.notes = notes;
    if (productivity !== undefined) session.productivity = productivity;
    if (environment !== undefined) session.environment = environment;
    if (tags !== undefined) session.tags = tags;
    if (focusMetrics !== undefined) {
      session.focusMetrics = { ...session.focusMetrics, ...focusMetrics };
    }

    await session.save();
    await session.populate("topicId", "title category difficulty");

    res.json({
      message: "Session updated successfully",
      session,
    });
  } catch (error) {
    console.error("Update session error:", error);
    res.status(500).json({
      message: "Server error updating session",
      code: "UPDATE_SESSION_ERROR",
    });
  }
});

// @route   DELETE /api/sessions/:id
// @desc    Delete a session
// @access  Private
router.delete("/:id", auth, checkResourceOwnership("session"), async (req, res) => {
  try {
    const session = req.resource;

    // Only allow deletion of planned or cancelled sessions
    if (!["planned", "cancelled"].includes(session.status)) {
      return res.status(400).json({
        message: "Can only delete planned or cancelled sessions",
        code: "INVALID_SESSION_STATUS",
      });
    }

    await StudySession.findByIdAndDelete(session._id);

    res.json({
      message: "Session deleted successfully",
    });
  } catch (error) {
    console.error("Delete session error:", error);
    res.status(500).json({
      message: "Server error deleting session",
      code: "DELETE_SESSION_ERROR",
    });
  }
});

module.exports = router;
