const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const { Topic, UserProgress } = require("../models/Topic");
require("dotenv").config();

// Learning content structure mapping
const LEARNING_CONTENT_MAP = {
  springBoot: {
    title: "Spring Boot & Backend Development",
    category: "Backend Development",
    description: "Complete Spring Boot learning path from fundamentals to advanced topics",
    difficulty: "Intermediate",
    estimatedHours: 120,
    files: ["01-spring-framework-fundamentals.md", "02-web-development-rest-apis.md", "03-data-access-persistence.md", "04-security.md", "05-microservices-distributed-systems.md", "06-testing-code-quality.md", "07-devops-cloud-observability.md", "08-system-design-architectural-patterns.md"],
  },
  react: {
    title: "React & Frontend Development",
    category: "Frontend Development",
    description: "Modern React development with hooks, performance, and best practices",
    difficulty: "Intermediate",
    estimatedHours: 100,
    files: ["01-core-react-hooks.md", "02-state-management.md", "03-component-architecture.md", "04-performance-optimization.md", "05-testing-strategies.md", "06-react18-modern-features.md", "07-typescript-advanced-patterns.md", "08-security-production-readiness.md"],
  },
  databases: {
    title: "Database Design & Management",
    category: "Database Design",
    description: "SQL, NoSQL, database design, and performance optimization",
    difficulty: "Intermediate",
    estimatedHours: 80,
    files: [], // Will be populated dynamically
  },
  dsa: {
    title: "Data Structures & Algorithms",
    category: "Data Structures & Algorithms",
    description: "Essential DSA concepts for technical interviews and problem solving",
    difficulty: "Advanced",
    estimatedHours: 150,
    files: [],
  },
  "system-design-interviews": {
    title: "System Design & Architecture",
    category: "System Design",
    description: "System design patterns, scalability, and interview preparation",
    difficulty: "Advanced",
    estimatedHours: 100,
    files: [],
  },
  "security-authentication": {
    title: "Security & Authentication",
    category: "Security & Authentication",
    description: "Application security, authentication, and authorization patterns",
    difficulty: "Intermediate",
    estimatedHours: 60,
    files: [],
  },
  "api-design-testing": {
    title: "API Design & Testing",
    category: "API Design & Testing",
    description: "RESTful API design, testing strategies, and documentation",
    difficulty: "Intermediate",
    estimatedHours: 70,
    files: [],
  },
  "devops-infrastructure-sde2": {
    title: "DevOps & Infrastructure",
    category: "DevOps & Infrastructure",
    description: "CI/CD, containerization, cloud platforms, and monitoring",
    difficulty: "Advanced",
    estimatedHours: 90,
    files: [],
  },
  "ai-ml-integration": {
    title: "AI/ML Integration",
    category: "AI/ML Integration",
    description: "Integrating AI/ML capabilities into software applications",
    difficulty: "Advanced",
    estimatedHours: 80,
    files: [],
  },
  patterns: {
    title: "Design Patterns & Architecture",
    category: "Design Patterns",
    description: "Software design patterns and architectural principles",
    difficulty: "Intermediate",
    estimatedHours: 50,
    files: [],
  },
  "diagrams-study": {
    title: "Diagrams & Visual Learning",
    category: "Soft Skills",
    description: "Visual diagrams and charts for better understanding",
    difficulty: "Beginner",
    estimatedHours: 20,
    files: [],
  },
  "frontend-advanced": {
    title: "Advanced Frontend Techniques",
    category: "Frontend Development",
    description: "Advanced frontend patterns and performance optimization",
    difficulty: "Advanced",
    estimatedHours: 60,
    files: [],
  },
  "go-learning": {
    title: "Go Programming",
    category: "Backend Development",
    description: "Go language fundamentals and backend development",
    difficulty: "Intermediate",
    estimatedHours: 40,
    files: [],
  },
  "linkedin-posts": {
    title: "LinkedIn Learning Posts",
    category: "Soft Skills",
    description: "Professional development and networking content",
    difficulty: "Beginner",
    estimatedHours: 10,
    files: [],
  },
  "study-guides": {
    title: "Study Guides & Plans",
    category: "Interview Preparation",
    description: "Structured study plans and learning guides",
    difficulty: "Beginner",
    estimatedHours: 15,
    files: [],
  },
  "root-guides": {
    title: "General Learning Materials",
    category: "Interview Preparation",
    description: "General learning materials and documentation",
    difficulty: "Beginner",
    estimatedHours: 10,
    files: [],
  },
};

async function scanLearningDirectory(dirPath) {
  const learningPath = path.resolve(__dirname, "../../../learning");

  if (!fs.existsSync(learningPath)) {
    console.log("❌ Learning directory not found at:", learningPath);
    return [];
  }

  console.log("📁 Scanning learning directory:", learningPath);

  const topics = [];

  for (const [folderName, config] of Object.entries(LEARNING_CONTENT_MAP)) {
    const topicPath = path.join(learningPath, folderName);

    // Special handling for root-guides - scan root markdown files
    if (folderName === "root-guides") {
      console.log(`📚 Processing ${config.title}...`);

      try {
        const rootFiles = fs
          .readdirSync(learningPath)
          .filter((file) => file.endsWith(".md") && !fs.statSync(path.join(learningPath, file)).isDirectory())
          .sort();
        config.files = rootFiles;

        if (rootFiles.length > 0) {
          // Create resources for each root learning file
          const resources = rootFiles.map((file) => ({
            title: file.replace(".md", "").replace(/^\d+-/, "").replace(/-/g, " "),
            url: `../learning/${file}`,
            type: "Documentation",
          }));

          // Create study session template
          const studySession = {
            title: `Complete: ${config.title}`,
            description: `Study session covering all materials in ${config.title}`,
            estimatedTime: config.estimatedHours * 60,
            resources,
          };

          topics.push({
            ...config,
            folderName,
            resources,
            studySession,
          });
        }
      } catch (error) {
        console.log(`⚠️  Could not read root directory ${learningPath}:`, error.message);
      }
      continue; // Skip the normal directory processing for root-guides
    }

    if (fs.existsSync(topicPath)) {
      console.log(`📚 Processing ${config.title}...`);

      // Scan for markdown files if not predefined
      if (config.files.length === 0) {
        try {
          const files = fs
            .readdirSync(topicPath)
            .filter((file) => file.endsWith(".md") && file !== "README.md")
            .sort();
          config.files = files;
        } catch (error) {
          console.log(`⚠️  Could not read directory ${topicPath}:`, error.message);
        }
      }

      // Create resources for each learning file
      const resources = config.files.map((file, index) => {
        const title = file.replace(".md", "").replace(/^\d+-/, "").replace(/-/g, " ");
        return {
          title: title.charAt(0).toUpperCase() + title.slice(1),
          type: "Tutorial",
          url: `../learning/${folderName}/${file}`,
          description: `Learning material: ${title}`,
          duration: Math.round((config.estimatedHours / config.files.length) * 60), // Convert to minutes
          isRequired: true,
        };
      });

      // Create milestones for each section
      const milestones = config.files.map((file, index) => {
        const title = file.replace(".md", "").replace(/^\d+-/, "").replace(/-/g, " ");
        return {
          title: `Complete: ${title.charAt(0).toUpperCase() + title.slice(1)}`,
          description: `Finish studying ${title} section`,
          order: index + 1,
        };
      });

      topics.push({
        title: config.title,
        description: config.description,
        category: config.category,
        difficulty: config.difficulty,
        estimatedHours: config.estimatedHours,
        tags: [folderName, config.category.toLowerCase(), config.difficulty.toLowerCase()],
        resources: resources,
        milestones: milestones,
        learningPath: folderName,
        isActive: true,
      });
    } else {
      console.log(`⚠️  Directory not found: ${topicPath}`);
    }
  }

  return topics;
}

async function importLearningContent() {
  try {
    console.log("🚀 Starting learning content import...");

    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/sde2-study-tracker";
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Get admin user (first user in database)
    const User = require("../models/User");
    const adminUser = await User.findOne().sort({ createdAt: 1 });

    if (!adminUser) {
      console.log("❌ No admin user found. Please create a user first.");
      process.exit(1);
    }

    console.log(`👤 Using admin user: ${adminUser.email}`);

    // Scan learning content
    const topicsData = await scanLearningDirectory();

    if (topicsData.length === 0) {
      console.log("❌ No learning content found to import");
      process.exit(1);
    }

    console.log(`📚 Found ${topicsData.length} topics to import`);

    // Clear existing topics (optional - remove this in production)
    // await Topic.deleteMany({});
    // console.log("🗑️  Cleared existing topics");

    // Import topics
    const importedTopics = [];

    for (const topicData of topicsData) {
      // Check if topic already exists
      const existingTopic = await Topic.findOne({
        title: topicData.title,
        createdBy: adminUser._id,
      });

      if (existingTopic) {
        console.log(`⏭️  Topic already exists: ${topicData.title}`);
        importedTopics.push(existingTopic);
        continue;
      }

      // Create new topic
      const topic = new Topic({
        ...topicData,
        createdBy: adminUser._id,
      });

      await topic.save();
      importedTopics.push(topic);
      console.log(`✅ Imported: ${topic.title}`);
    }

    console.log(`\n🎉 Successfully imported ${importedTopics.length} topics!`);

    // Create learning path suggestions
    console.log("\n📋 Learning Path Suggestions:");
    console.log("1. 🌱 Beginner: Start with Databases → API Design → Security");
    console.log("2. 🚀 Backend Focus: Spring Boot → Databases → API Design → Security → DevOps");
    console.log("3. 🎨 Frontend Focus: React → API Design → Security");
    console.log("4. 🏗️  Architecture Track: Design Patterns → System Design → DevOps");
    console.log("5. 🎯 Interview Prep: DSA → System Design → Spring Boot → React");

    console.log("\n🔗 Access your learning materials through the study tracker!");
    console.log("📊 Track your progress and set goals for each topic.");

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error importing learning content:", error);
    process.exit(1);
  }
}

// Add helper function to generate topic stats
async function generateTopicStats() {
  const stats = await Topic.aggregate([
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 },
        totalHours: { $sum: "$estimatedHours" },
        avgDifficulty: {
          $avg: {
            $switch: {
              branches: [
                { case: { $eq: ["$difficulty", "Beginner"] }, then: 1 },
                { case: { $eq: ["$difficulty", "Intermediate"] }, then: 2 },
                { case: { $eq: ["$difficulty", "Advanced"] }, then: 3 },
              ],
              default: 2,
            },
          },
        },
      },
    },
    { $sort: { totalHours: -1 } },
  ]);

  console.log("\n📊 Topic Statistics by Category:");
  stats.forEach((stat) => {
    const difficultyLabel = stat.avgDifficulty <= 1.5 ? "Beginner" : stat.avgDifficulty <= 2.5 ? "Intermediate" : "Advanced";
    console.log(`   ${stat._id}: ${stat.count} topics, ${stat.totalHours}h total, ${difficultyLabel} avg`);
  });
}

// Run import if called directly
if (require.main === module) {
  importLearningContent()
    .then(() => generateTopicStats())
    .then(() => {
      console.log("\n🎓 Ready to start your learning journey!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Import failed:", error);
      process.exit(1);
    });
}

module.exports = { importLearningContent, LEARNING_CONTENT_MAP };
