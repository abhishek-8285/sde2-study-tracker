const fs = require("fs");
const path = require("path");
const express = require("express");
const { auth } = require("../middleware/auth");

const router = express.Router();

// Learning content base path - works in both local and production
const LEARNING_BASE_PATH = path.resolve(__dirname, "../../learning");

// Recursive function to find all markdown files in a directory
function findMarkdownFilesRecursively(dirPath, relativePath = "") {
  const files = [];

  try {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const itemRelativePath = relativePath ? `${relativePath}/${item}` : item;

      if (fs.statSync(fullPath).isDirectory()) {
        // Recursively scan subdirectories
        const subFiles = findMarkdownFilesRecursively(fullPath, itemRelativePath);
        files.push(...subFiles);
      } else if (item.endsWith(".md")) {
        // Add markdown file
        files.push({
          filename: item,
          title: item.replace(".md", "").replace(/^\d+-/, "").replace(/-/g, " "),
          path: itemRelativePath,
          fullPath: fullPath,
          relativePath: itemRelativePath,
          size: fs.statSync(fullPath).size,
          directory: relativePath || "root",
        });
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error);
  }

  return files;
}

// Topic title mapping (comprehensive mapping for all learning folders)
const TOPIC_TITLE_MAP = {
  springBoot: "Spring Boot & Backend Development",
  react: "React & Frontend Development",
  databases: "Database Design & Management",
  dsa: "Data Structures & Algorithms",
  "system-design-interviews": "System Design & Architecture",
  "security-authentication": "Security & Authentication",
  "api-design-testing": "API Design & Testing",
  "devops-infrastructure-sde2": "DevOps & Infrastructure",
  "ai-ml-integration": "AI/ML Integration",
  patterns: "Design Patterns & Architecture",
  "frontend-advanced": "Advanced Frontend Development",
  "go-learning": "Go Programming",
  "diagrams-study": "Software Design Diagrams",
  "linkedin-posts": "Professional Development",
  "study-guides": "Study Guides & Resources",

  // Additional learning content discovered
  FOCUSED_ACTION_PLAN: "Focused Action Plans",
  GOLANG_PARALLEL_LEARNING_PLAN: "Golang Parallel Learning",
  MASTER_LEARNING_GUIDE: "Master Learning Guide",
  QUICK_START_STUDY_PLANS: "Quick Start Study Plans",
  SINGLE_OPTIMIZED_STUDY_PLAN: "Single Optimized Study Plan",
  SOFTWARE_DESIGN_DIAGRAMS_COMPLETE: "Complete Software Design Diagrams",
  STUDY_GUIDE_MASTER: "Master Study Guide",
  STUDY_PLAN: "Comprehensive Study Plan",
  WORKING_PROFESSIONAL_STUDY_PLAN: "Working Professional Study Plan",
  README: "Learning Overview",
};

// Enhanced title generation function
function generateTitle(dirName) {
  // Check if we have a specific mapping
  if (TOPIC_TITLE_MAP[dirName]) {
    return TOPIC_TITLE_MAP[dirName];
  }

  // Handle special cases for markdown files in root
  if (dirName.endsWith(".md")) {
    return (
      TOPIC_TITLE_MAP[dirName.replace(".md", "")] ||
      dirName
        .replace(".md", "")
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase())
    );
  }

  // Dynamic generation for unmapped directories
  return dirName
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .replace(/\bSde2\b/g, "SDE2")
    .replace(/\bApi\b/g, "API")
    .replace(/\bMl\b/g, "ML")
    .replace(/\bAi\b/g, "AI")
    .replace(/\bDb\b/g, "Database")
    .replace(/\bJs\b/g, "JavaScript")
    .replace(/\bTs\b/g, "TypeScript");
}

// @route   GET /api/content/list
// @desc    List all learning content
// @access  Private
router.get("/list", auth, async (req, res) => {
  try {
    console.log("📂 Content API: Checking learning directory at:", LEARNING_BASE_PATH);

    if (!fs.existsSync(LEARNING_BASE_PATH)) {
      console.error("❌ Learning directory not found at:", LEARNING_BASE_PATH);
      return res.status(404).json({
        message: "Learning content directory not found",
        code: "CONTENT_NOT_FOUND",
      });
    }

    const contentStructure = {};

    // Get all items in learning directory
    const allItems = fs.readdirSync(LEARNING_BASE_PATH, { withFileTypes: true });
    console.log("📁 Found items in learning directory:", allItems.length);

    // Process directories that contain markdown files
    const topicDirs = allItems.filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name);

    console.log("📁 Found directories:", topicDirs);

    for (const topicDir of topicDirs) {
      const topicPath = path.join(LEARNING_BASE_PATH, topicDir);

      // Use recursive function to find all markdown files in the topic directory
      const files = findMarkdownFilesRecursively(topicPath, topicDir);

      console.log(`📖 Topic ${topicDir}: Found ${files.length} markdown files (including subdirectories)`);

      // Only include directories that have markdown files
      if (files.length > 0) {
        contentStructure[topicDir] = {
          title: generateTitle(topicDir),
          files: files,
        };
        console.log(`✅ Added topic ${topicDir} with ${files.length} files`);
      }
    }

    // Process standalone markdown files in root directory
    const rootMarkdownFiles = allItems.filter((dirent) => dirent.isFile() && dirent.name.endsWith(".md")).map((dirent) => dirent.name);

    console.log("📄 Found root markdown files:", rootMarkdownFiles.length);

    if (rootMarkdownFiles.length > 0) {
      contentStructure["root-guides"] = {
        title: "Study Guides & Plans",
        files: rootMarkdownFiles.map((file) => ({
          filename: file,
          title: file
            .replace(".md", "")
            .replace(/[-_]/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase()),
          path: file, // Root files don't need subdirectory path
          size: fs.statSync(path.join(LEARNING_BASE_PATH, file)).size,
        })),
      };
      console.log(`✅ Added root-guides with ${rootMarkdownFiles.length} files`);
    }

    console.log(`📊 Final content structure: ${Object.keys(contentStructure).length} topics`);

    const response = {
      structure: contentStructure,
      totalTopics: Object.keys(contentStructure).length,
      totalFiles: Object.values(contentStructure).reduce((sum, topic) => sum + topic.files.length, 0),
    };

    console.log("📤 Sending response:", {
      totalTopics: response.totalTopics,
      totalFiles: response.totalFiles,
      topics: Object.keys(contentStructure),
    });

    res.json(response);
  } catch (error) {
    console.error("❌ Error listing content:", error);
    res.status(500).json({
      message: "Error retrieving content list",
      code: "CONTENT_LIST_ERROR",
    });
  }
});

// @route   GET /api/content/file/:topic/*
// @desc    Get specific learning content file (handles subdirectories)
// @access  Private
router.get("/file/:topic/*", auth, async (req, res) => {
  try {
    const { topic } = req.params;
    const relativePath = req.params[0]; // This gets everything after /file/:topic/

    // Security: Validate path to prevent directory traversal
    if (topic.includes("..") || relativePath.includes("..")) {
      return res.status(400).json({
        message: "Invalid file path",
        code: "INVALID_PATH",
      });
    }

    let filePath;

    // Handle root files (when topic is 'root-guides')
    if (topic === "root-guides") {
      filePath = path.join(LEARNING_BASE_PATH, relativePath);
    } else {
      // Handle files in topic directories (including subdirectories)
      // The relativePath already includes the full path from the topic directory
      // e.g., relativePath could be "01-easy/arrays.md" for dsa/01-easy/arrays.md
      filePath = path.join(LEARNING_BASE_PATH, topic, relativePath);
    }

    // Ensure the file exists and is within the learning directory
    if (!filePath.startsWith(LEARNING_BASE_PATH) || !fs.existsSync(filePath)) {
      return res.status(404).json({
        message: "Content file not found",
        code: "FILE_NOT_FOUND",
        path: topic === "root-guides" ? relativePath : `${topic}/${relativePath}`,
      });
    }

    // Read file content
    const content = fs.readFileSync(filePath, "utf8");
    const stats = fs.statSync(filePath);

    res.json({
      content,
      metadata: {
        topic,
        filename: relativePath, // Use relativePath for filename in metadata
        title: relativePath.replace(".md", "").replace(/^\d+-/, "").replace(/-/g, " "),
        size: stats.size,
        lastModified: stats.mtime,
        wordCount: content.split(/\s+/).length,
        estimatedReadingTime: Math.ceil(content.split(/\s+/).length / 200), // Assuming 200 WPM
      },
    });
  } catch (error) {
    console.error("Error reading content file:", error);
    res.status(500).json({
      message: "Error reading content file",
      code: "FILE_READ_ERROR",
    });
  }
});

// @route   GET /api/content/topic/:topic
// @desc    Get all files for a specific topic
// @access  Private
router.get("/topic/:topic", auth, async (req, res) => {
  try {
    const { topic } = req.params;

    // Security: Validate path
    if (topic.includes("..")) {
      return res.status(400).json({
        message: "Invalid topic path",
        code: "INVALID_PATH",
      });
    }

    const topicPath = path.join(LEARNING_BASE_PATH, topic);

    if (!fs.existsSync(topicPath)) {
      return res.status(404).json({
        message: "Topic not found",
        code: "TOPIC_NOT_FOUND",
        topic,
      });
    }

    const files = fs
      .readdirSync(topicPath)
      .filter((file) => file.endsWith(".md"))
      .sort();

    const topicContent = {
      topic,
      title: generateTitle(topic),
      files: files.map((file) => {
        const filePath = path.join(topicPath, file);
        const stats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, "utf8");

        return {
          filename: file,
          title: file.replace(".md", "").replace(/^\d+-/, "").replace(/-/g, " "),
          path: `${topic}/${file}`,
          size: stats.size,
          lastModified: stats.mtime,
          wordCount: content.split(/\s+/).length,
          estimatedReadingTime: Math.ceil(content.split(/\s+/).length / 200),
          preview: content.substring(0, 200) + (content.length > 200 ? "..." : ""),
        };
      }),
    };

    res.json(topicContent);
  } catch (error) {
    console.error("Error reading topic content:", error);
    res.status(500).json({
      message: "Error reading topic content",
      code: "TOPIC_READ_ERROR",
    });
  }
});

// @route   POST /api/content/search
// @desc    Search through learning content
// @access  Private
router.post("/search", auth, async (req, res) => {
  try {
    const { query, topics = [] } = req.body;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        message: "Search query must be at least 2 characters",
        code: "INVALID_QUERY",
      });
    }

    const searchResults = [];
    const searchTerm = query.toLowerCase();

    // Get topics to search (all if none specified)
    const topicsToSearch =
      topics.length > 0
        ? topics
        : fs
            .readdirSync(LEARNING_BASE_PATH, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name);

    for (const topic of topicsToSearch) {
      const topicPath = path.join(LEARNING_BASE_PATH, topic);

      if (!fs.existsSync(topicPath)) continue;

      const files = fs.readdirSync(topicPath).filter((file) => file.endsWith(".md"));

      for (const file of files) {
        const filePath = path.join(topicPath, file);
        const content = fs.readFileSync(filePath, "utf8");
        const lowerContent = content.toLowerCase();

        // Search in title and content
        const title = file.replace(".md", "").replace(/^\d+-/, "").replace(/-/g, " ");
        const titleMatch = title.toLowerCase().includes(searchTerm);
        const contentMatches = [];

        if (titleMatch || lowerContent.includes(searchTerm)) {
          // Find content matches with context
          const lines = content.split("\n");
          lines.forEach((line, index) => {
            if (line.toLowerCase().includes(searchTerm)) {
              const start = Math.max(0, index - 1);
              const end = Math.min(lines.length - 1, index + 1);
              const context = lines.slice(start, end + 1).join("\n");

              contentMatches.push({
                lineNumber: index + 1,
                line: line.trim(),
                context: context.trim(),
              });
            }
          });

          searchResults.push({
            topic,
            filename: file,
            title,
            path: `${topic}/${file}`,
            titleMatch,
            contentMatches: contentMatches.slice(0, 3), // Limit to 3 matches per file
            totalMatches: contentMatches.length,
          });
        }
      }
    }

    res.json({
      query,
      results: searchResults,
      totalResults: searchResults.length,
      totalMatches: searchResults.reduce((sum, result) => sum + result.totalMatches, 0),
    });
  } catch (error) {
    console.error("Error searching content:", error);
    res.status(500).json({
      message: "Error searching content",
      code: "SEARCH_ERROR",
    });
  }
});

module.exports = router;
