const express = require("express");
const User = require("../models/User");
const { auth } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/users/profile/:username
// @desc    Get user's public profile
// @access  Public
router.get("/profile/:username", async (req, res) => {
  try {
    const user = await User.findOne({
      username: req.params.username,
      isActive: true,
    }).lean();

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    // Return only public information
    const publicProfile = {
      username: user.username,
      profile: {
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        avatar: user.profile.avatar,
        bio: user.profile.bio,
        currentRole: user.profile.currentRole,
        experienceLevel: user.profile.experienceLevel,
      },
      statistics: user.statistics,
      achievements: user.achievements,
      joinedAt: user.createdAt,
    };

    res.json({ user: publicProfile });
  } catch (error) {
    console.error("Get public profile error:", error);
    res.status(500).json({
      message: "Server error retrieving profile",
      code: "GET_PROFILE_ERROR",
    });
  }
});

// @route   GET /api/users/leaderboard
// @desc    Get user leaderboard
// @access  Public
router.get("/leaderboard", async (req, res) => {
  try {
    const { type = "hours", limit = 10 } = req.query;

    let sortField;
    switch (type) {
      case "hours":
        sortField = "statistics.totalStudyHours";
        break;
      case "streak":
        sortField = "statistics.currentStreak";
        break;
      case "topics":
        sortField = "statistics.completedTopics";
        break;
      default:
        sortField = "statistics.totalStudyHours";
    }

    const users = await User.find({ isActive: true })
      .select("username profile.firstName profile.lastName profile.avatar statistics achievements")
      .sort({ [sortField]: -1 })
      .limit(parseInt(limit))
      .lean();

    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      username: user.username,
      name: `${user.profile.firstName} ${user.profile.lastName}`.trim(),
      avatar: user.profile.avatar,
      value: user.statistics[type === "hours" ? "totalStudyHours" : type === "streak" ? "currentStreak" : "completedTopics"],
      achievementCount: user.achievements.length,
    }));

    res.json({ leaderboard, type });
  } catch (error) {
    console.error("Get leaderboard error:", error);
    res.status(500).json({
      message: "Server error retrieving leaderboard",
      code: "GET_LEADERBOARD_ERROR",
    });
  }
});

// @route   GET /api/users/search
// @desc    Search users
// @access  Private
router.get("/search", auth, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        message: "Search query must be at least 2 characters",
        code: "INVALID_SEARCH_QUERY",
      });
    }

    const users = await User.find({
      isActive: true,
      $or: [{ username: { $regex: q, $options: "i" } }, { "profile.firstName": { $regex: q, $options: "i" } }, { "profile.lastName": { $regex: q, $options: "i" } }],
    })
      .select("username profile.firstName profile.lastName profile.avatar profile.currentRole")
      .limit(parseInt(limit))
      .lean();

    res.json({ users });
  } catch (error) {
    console.error("Search users error:", error);
    res.status(500).json({
      message: "Server error searching users",
      code: "SEARCH_USERS_ERROR",
    });
  }
});

module.exports = router;
