// Topics module for managing learning topics
export class Topics {
  constructor(api, ui) {
    this.api = api;
    this.ui = ui;
    this.topics = [];
    this.userProgress = [];
    this.currentFilter = "all";
    this.currentSort = "title";
  }

  async init() {
    console.log("📚 Initializing Topics module...");
    this.setupEventListeners();
    this.setupTopicInteractions();
  }

  setupEventListeners() {
    // Setup search and filter functionality
    const searchInput = document.getElementById("topics-search");
    if (searchInput) {
      searchInput.addEventListener(
        "input",
        this.ui.debounce(() => this.load(), 300)
      );
    }

    const categoryFilter = document.getElementById("category-filter");
    if (categoryFilter) {
      categoryFilter.addEventListener("change", (e) => {
        this.currentFilter = e.target.value;
        this.renderTopics();
      });
    }

    const difficultyFilter = document.getElementById("difficulty-filter");
    if (difficultyFilter) {
      difficultyFilter.addEventListener("change", () => this.load());
    }

    // Sort change
    const sortSelect = document.getElementById("topic-sort");
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        this.currentSort = e.target.value;
        this.renderTopics();
      });
    }
  }

  setupTopicInteractions() {
    console.log("🔧 Setting up topic interactions...");

    // Handle all topic-related clicks using event delegation
    document.addEventListener("click", (e) => {
      const action = e.target.closest("[data-action]")?.dataset.action;
      const topicId = e.target.closest("[data-topic-id]")?.dataset.topicId;

      // Debug all clicks on elements with data-action
      if (e.target.closest("[data-action]")) {
        console.log("🖱️ Topic interaction clicked:", {
          action,
          topicId,
          target: e.target,
          hasAction: !!action,
          hasTopicId: !!topicId,
        });
      }

      if (!action) return;

      console.log(`🎯 Executing action: ${action} for topic: ${topicId}`);

      switch (action) {
        case "details":
          if (topicId) {
            console.log("📋 Opening topic details for:", topicId);
            this.openTopicDetails(topicId);
          }
          break;
        case "learning-materials":
          e.stopPropagation();
          if (topicId) {
            console.log("📚 Opening learning materials for:", topicId);
            this.openLearningMaterials(topicId);
          } else {
            console.error("❌ No topicId provided for learning materials");
          }
          break;
        case "start-session":
          e.stopPropagation();
          if (topicId) {
            console.log("🎬 Starting session for:", topicId);
            this.startStudySession(topicId);
          }
          break;
        case "open-resource":
          e.stopPropagation();
          const resourceUrl = e.target.closest("[data-resource-url]")?.dataset.resourceUrl;
          const resourceTitle = e.target.closest("[data-resource-title]")?.dataset.resourceTitle;
          if (resourceUrl && resourceTitle) {
            console.log("📖 Opening resource:", resourceTitle);
            this.openResource(resourceUrl, resourceTitle);
          }
          break;
      }
    });
  }

  openTopicDetails(topicId) {
    console.log("Opening topic details for:", topicId);
    // Implementation for opening topic details modal
  }

  openLearningMaterials(topicId) {
    console.log("🚀 openLearningMaterials called with topicId:", topicId);
    console.log("🔍 Checking window.app:", !!window.app);
    console.log("🔍 Checking window.app.modules:", !!window.app?.modules);
    console.log("🔍 Checking learningViewer:", !!window.app?.modules?.learningViewer);

    if (window.app && window.app.modules.learningViewer) {
      console.log("✅ Calling learningViewer.openTopic with:", topicId);
      try {
        window.app.modules.learningViewer.openTopic(topicId);
        console.log("✅ learningViewer.openTopic called successfully");
      } catch (error) {
        console.error("❌ Error calling learningViewer.openTopic:", error);
      }
    } else {
      console.error("❌ Learning viewer not available:", {
        hasApp: !!window.app,
        hasModules: !!window.app?.modules,
        hasLearningViewer: !!window.app?.modules?.learningViewer,
      });
    }
  }

  startStudySession(topicId) {
    console.log("Starting study session for topic:", topicId);
    if (window.app && window.app.modules.sessions) {
      // Navigate to sessions tab and create new session for this topic
      window.app.switchTab("sessions");
      // Implementation would create a new session with the selected topic
    }
  }

  openResource(url, title) {
    // Open learning material
    console.log(`Opening resource: ${title} at ${url}`);

    // For local markdown files, show helpful message
    if (url.startsWith("../learning/")) {
      window.app.ui.showToast("info", `📚 Opening: ${title}<br/>Location: ${url.replace("../learning/", "learning/")}`);
      // Future: Could implement markdown viewer or file browser integration
    } else {
      // For external URLs, open in new tab
      window.open(url, "_blank");
    }
  }

  async load() {
    try {
      console.log("🔄 Loading topics...");
      this.ui.setLoading(true, "topics-container");

      const data = await this.api.get("/topics");
      this.topics = data.topics || [];

      console.log(`📚 Loaded ${this.topics.length} topics`);
      this.renderTopics();
      this.renderStats();
    } catch (error) {
      console.error("Topics load error:", error);
      this.ui.showToast("error", "Failed to load topics");
      this.loadDemoTopics();
    } finally {
      this.ui.setLoading(false, "topics-container");
    }
  }

  renderTopics() {
    const container = document.getElementById("topics-container");
    if (!container) return;

    // Filter topics
    let filteredTopics = this.topics;
    if (this.currentFilter !== "all") {
      filteredTopics = this.topics.filter((topic) => topic.category === this.currentFilter);
    }

    // Sort topics
    filteredTopics.sort((a, b) => {
      switch (this.currentSort) {
        case "title":
          return a.title.localeCompare(b.title);
        case "category":
          return a.category.localeCompare(b.category);
        case "difficulty":
          const difficultyOrder = { Beginner: 1, Intermediate: 2, Advanced: 3 };
          return (difficultyOrder[a.difficulty] || 2) - (difficultyOrder[b.difficulty] || 2);
        case "hours":
          return (b.estimatedHours || 0) - (a.estimatedHours || 0);
        default:
          return a.title.localeCompare(b.title);
      }
    });

    if (filteredTopics.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-book-open"></i>
          <h3>No topics found</h3>
          <p>No topics match your current filter. Try adjusting your selection.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filteredTopics.map((topic) => this.renderTopicCard(topic)).join("");
  }

  renderTopicCard(topic) {
    const progress = topic.userProgress?.progress || 0;
    const status = topic.userProgress?.status || "not-started";

    return `
      <div class="topic-card ${status}" data-topic-id="${topic._id}" data-action="details">
        <div class="topic-header">
          <div class="topic-info">
            <h3 class="topic-title">${topic.title}</h3>
            <div class="topic-meta">
              <span class="topic-category">${topic.category}</span>
              <span class="topic-difficulty difficulty-${topic.difficulty?.toLowerCase()}">${topic.difficulty}</span>
              <span class="topic-hours">${topic.estimatedHours}h</span>
            </div>
          </div>
          <div class="topic-actions">
            <button class="btn btn-sm btn-outline" data-topic-id="${topic._id}" data-action="learning-materials" title="Open Learning Materials">
              <i class="fas fa-external-link-alt"></i>
            </button>
            <button class="btn btn-sm btn-primary" data-topic-id="${topic._id}" data-action="start-session" title="Start Session">
              <i class="fas fa-play"></i>
            </button>
          </div>
        </div>
        
        <p class="topic-description">${topic.description}</p>
        
        ${
          topic.resources && topic.resources.length > 0
            ? `
          <div class="topic-resources">
            <h4><i class="fas fa-file-alt"></i> Learning Materials (${topic.resources.length})</h4>
            <div class="resources-preview">
              ${topic.resources
                .slice(0, 3)
                .map(
                  (resource) => `
                <div class="resource-item" data-resource-url="${resource.url}" data-resource-title="${resource.title}" data-action="open-resource">
                  <i class="fas fa-file-text"></i>
                  <span>${resource.title}</span>
                </div>
              `
                )
                .join("")}
              ${
                topic.resources.length > 3
                  ? `
                <div class="resource-item more-resources">
                  <i class="fas fa-ellipsis-h"></i>
                  <span>+${topic.resources.length - 3} more</span>
                </div>
              `
                  : ""
              }
            </div>
          </div>
        `
            : ""
        }
        
        <div class="topic-progress">
          <div class="progress-header">
            <span class="progress-label">Progress</span>
            <span class="progress-percentage">${Math.round(progress)}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>
          <div class="progress-status status-${status}">
            ${this.getStatusLabel(status)}
          </div>
        </div>
        
        ${
          topic.tags && topic.tags.length > 0
            ? `
          <div class="topic-tags">
            ${topic.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  renderStats() {
    const statsContainer = document.getElementById("topics-stats");
    if (!statsContainer) return;

    const totalTopics = this.topics.length;
    const completedTopics = this.topics.filter((t) => t.userProgress?.status === "completed").length;
    const inProgressTopics = this.topics.filter((t) => t.userProgress?.status === "in-progress").length;
    const totalHours = this.topics.reduce((sum, topic) => sum + (topic.estimatedHours || 0), 0);

    statsContainer.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="fas fa-book"></i>
          </div>
          <div class="stat-content">
            <div class="stat-number">${totalTopics}</div>
            <div class="stat-label">Total Topics</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon completed">
            <i class="fas fa-check-circle"></i>
          </div>
          <div class="stat-content">
            <div class="stat-number">${completedTopics}</div>
            <div class="stat-label">Completed</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon in-progress">
            <i class="fas fa-clock"></i>
          </div>
          <div class="stat-content">
            <div class="stat-number">${inProgressTopics}</div>
            <div class="stat-label">In Progress</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">
            <i class="fas fa-clock"></i>
          </div>
          <div class="stat-content">
            <div class="stat-number">${totalHours}h</div>
            <div class="stat-label">Total Hours</div>
          </div>
        </div>
      </div>
    `;
  }

  getStatusLabel(status) {
    const labels = {
      "not-started": "Not Started",
      "in-progress": "In Progress",
      completed: "Completed",
      "on-hold": "On Hold",
    };
    return labels[status] || "Unknown";
  }

  loadDemoTopics() {
    const demoTopics = [
      {
        _id: "topic-1",
        title: "Spring Boot Fundamentals",
        description: "Learn the basics of Spring Boot framework",
        category: "Backend Development",
        difficulty: "Beginner",
        estimatedHours: 15,
        userProgress: { status: "in-progress", progress: 65 },
      },
      {
        _id: "topic-2",
        title: "React Hooks",
        description: "Master React hooks and state management",
        category: "Frontend Development",
        difficulty: "Intermediate",
        estimatedHours: 12,
        userProgress: { status: "completed", progress: 100 },
      },
    ];

    this.topics = demoTopics;
    this.renderTopics();
  }

  async updateProgress(topicId, progress, status) {
    try {
      await this.api.put(`/topics/${topicId}/progress`, {
        progress,
        status,
      });

      this.ui.showToast("success", "Progress updated successfully");
      await this.load(); // Reload to show updated progress
    } catch (error) {
      console.error("Error updating progress:", error);
      this.ui.showToast("error", "Failed to update progress");
    }
  }
}

// Global functions are now handled within the Topics class using event delegation
