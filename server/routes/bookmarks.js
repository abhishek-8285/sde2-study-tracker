const express = require("express");
const { auth } = require("../middleware/auth");
const Bookmark = require("../models/Bookmark");

const router = express.Router();

// @route   GET /api/bookmarks
// @desc    Get all bookmarks for authenticated user
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const { contentPath, limit = 50, sort = "-createdAt" } = req.query;

    let query = { user: req.user.id };
    if (contentPath) {
      query.contentPath = contentPath;
    }

    const bookmarks = await Bookmark.find(query).sort(sort).limit(parseInt(limit)).exec();

    res.json({
      bookmarks,
      total: bookmarks.length,
    });
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    res.status(500).json({
      message: "Error fetching bookmarks",
      code: "BOOKMARKS_FETCH_ERROR",
    });
  }
});

// @route   GET /api/bookmarks/content/:contentPath
// @desc    Get bookmarks for specific content
// @access  Private
router.get("/content/*", auth, async (req, res) => {
  try {
    // Extract content path from URL (everything after /content/)
    const contentPath = req.params[0];

    if (!contentPath) {
      return res.status(400).json({
        message: "Content path is required",
        code: "MISSING_CONTENT_PATH",
      });
    }

    const bookmarks = await Bookmark.findByUserAndContent(req.user.id, contentPath);

    res.json({
      contentPath,
      bookmarks,
      total: bookmarks.length,
    });
  } catch (error) {
    console.error("Error fetching content bookmarks:", error);
    res.status(500).json({
      message: "Error fetching content bookmarks",
      code: "CONTENT_BOOKMARKS_FETCH_ERROR",
    });
  }
});

// @route   POST /api/bookmarks
// @desc    Create new bookmark
// @access  Private
router.post("/", auth, async (req, res) => {
  try {
    const { contentPath, title, description, location, tags, color = "yellow" } = req.body;

    // Validation
    if (!contentPath || !title) {
      return res.status(400).json({
        message: "Content path and title are required",
        code: "MISSING_REQUIRED_FIELDS",
      });
    }

    if (!location || (!location.lineNumber && !location.sectionHeading && !location.scrollPercentage)) {
      return res.status(400).json({
        message: "At least one location identifier is required (lineNumber, sectionHeading, or scrollPercentage)",
        code: "MISSING_LOCATION",
      });
    }

    // Check for duplicate bookmarks at same location
    const existingBookmark = await Bookmark.findOne({
      user: req.user.id,
      contentPath,
      $or: [{ "location.lineNumber": location.lineNumber }, { "location.sectionHeading": location.sectionHeading }, { "location.scrollPercentage": location.scrollPercentage }],
    });

    if (existingBookmark) {
      return res.status(400).json({
        message: "Bookmark already exists at this location",
        code: "DUPLICATE_BOOKMARK",
        existing: existingBookmark,
      });
    }

    const bookmark = new Bookmark({
      user: req.user.id,
      contentPath,
      title: title.trim(),
      description: description?.trim(),
      location,
      tags: tags?.map((tag) => tag.trim().toLowerCase()) || [],
      color,
    });

    await bookmark.save();

    res.status(201).json({
      message: "Bookmark created successfully",
      bookmark,
    });
  } catch (error) {
    console.error("Error creating bookmark:", error);
    res.status(500).json({
      message: "Error creating bookmark",
      code: "BOOKMARK_CREATE_ERROR",
    });
  }
});

// @route   PUT /api/bookmarks/:id
// @desc    Update bookmark
// @access  Private
router.put("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, location, tags, color } = req.body;

    const bookmark = await Bookmark.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!bookmark) {
      return res.status(404).json({
        message: "Bookmark not found",
        code: "BOOKMARK_NOT_FOUND",
      });
    }

    // Update fields
    if (title) bookmark.title = title.trim();
    if (description !== undefined) bookmark.description = description?.trim();
    if (location) bookmark.location = { ...bookmark.location, ...location };
    if (tags) bookmark.tags = tags.map((tag) => tag.trim().toLowerCase());
    if (color) bookmark.color = color;

    await bookmark.save();

    res.json({
      message: "Bookmark updated successfully",
      bookmark,
    });
  } catch (error) {
    console.error("Error updating bookmark:", error);
    res.status(500).json({
      message: "Error updating bookmark",
      code: "BOOKMARK_UPDATE_ERROR",
    });
  }
});

// @route   DELETE /api/bookmarks/:id
// @desc    Delete bookmark
// @access  Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const bookmark = await Bookmark.findOneAndDelete({
      _id: id,
      user: req.user.id,
    });

    if (!bookmark) {
      return res.status(404).json({
        message: "Bookmark not found",
        code: "BOOKMARK_NOT_FOUND",
      });
    }

    res.json({
      message: "Bookmark deleted successfully",
      deletedBookmark: bookmark,
    });
  } catch (error) {
    console.error("Error deleting bookmark:", error);
    res.status(500).json({
      message: "Error deleting bookmark",
      code: "BOOKMARK_DELETE_ERROR",
    });
  }
});

// @route   GET /api/bookmarks/recent
// @desc    Get recent bookmarks for user
// @access  Private
router.get("/recent", auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const bookmarks = await Bookmark.findRecentByUser(req.user.id, parseInt(limit));

    res.json({
      bookmarks,
      total: bookmarks.length,
    });
  } catch (error) {
    console.error("Error fetching recent bookmarks:", error);
    res.status(500).json({
      message: "Error fetching recent bookmarks",
      code: "RECENT_BOOKMARKS_ERROR",
    });
  }
});

// @route   GET /api/bookmarks/stats
// @desc    Get bookmark statistics for user
// @access  Private
router.get("/stats", auth, async (req, res) => {
  try {
    const stats = await Bookmark.getBookmarkStats(req.user.id);

    res.json({
      stats: stats[0] || {
        totalBookmarks: 0,
        uniqueContentCount: 0,
        colorsUsed: 0,
      },
    });
  } catch (error) {
    console.error("Error fetching bookmark stats:", error);
    res.status(500).json({
      message: "Error fetching bookmark statistics",
      code: "BOOKMARK_STATS_ERROR",
    });
  }
});

// @route   POST /api/bookmarks/:id/access
// @desc    Update last accessed time for bookmark
// @access  Private
router.post("/:id/access", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const bookmark = await Bookmark.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!bookmark) {
      return res.status(404).json({
        message: "Bookmark not found",
        code: "BOOKMARK_NOT_FOUND",
      });
    }

    await bookmark.updateLastAccessed();

    res.json({
      message: "Last accessed time updated",
      bookmark,
    });
  } catch (error) {
    console.error("Error updating bookmark access:", error);
    res.status(500).json({
      message: "Error updating bookmark access time",
      code: "BOOKMARK_ACCESS_ERROR",
    });
  }
});

module.exports = router;
