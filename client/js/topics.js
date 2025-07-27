// Topics module
export class Topics {
  constructor(api, ui) {
    this.api = api;
    this.ui = ui;
  }

  async init() {
    this.setupEventListeners();
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
      categoryFilter.addEventListener("change", () => this.load());
    }

    const difficultyFilter = document.getElementById("difficulty-filter");
    if (difficultyFilter) {
      difficultyFilter.addEventListener("change", () => this.load());
    }
  }

  async load() {
    try {
      const container = document.getElementById("topics-container");
      if (!container) return;

      container.innerHTML = this.renderLoading();

      const params = this.getFilterParams();
      const data = await this.api.getTopics(params);

      this.renderTopics(data.topics);
      this.renderPagination(data.pagination);
    } catch (error) {
      console.error("Topics load error:", error);
      this.loadDemoTopics();
    }
  }

  getFilterParams() {
    return {
      search: document.getElementById("topics-search")?.value || "",
      category: document.getElementById("category-filter")?.value || "",
      difficulty: document.getElementById("difficulty-filter")?.value || "",
    };
  }

  renderTopics(topics) {
    const container = document.getElementById("topics-container");
    if (!container) return;

    if (topics && topics.length > 0) {
      container.innerHTML = topics.map((topic) => this.renderTopicCard(topic)).join("");
    } else {
      container.innerHTML = '<div class="no-data"><i class="fas fa-book"></i><p>No topics found</p></div>';
    }
  }

  renderTopicCard(topic) {
    const statusClass = this.getStatusClass(topic.userProgress?.status || "not-started");
    const progress = topic.userProgress?.progress || 0;

    return `
      <div class="topic-card" data-topic-id="${topic._id}">
        <div class="topic-header">
          <div class="topic-title">${topic.title}</div>
          <span class="badge badge-${topic.difficulty.toLowerCase()}">${topic.difficulty}</span>
        </div>
        <div class="topic-meta">
          <span class="badge badge-primary">${topic.category}</span>
          <span>⏱️ ${topic.estimatedHours}h</span>
        </div>
        <div class="topic-description">${topic.description}</div>
        <div class="topic-progress">
          <div class="topic-progress-header">
            <span>Progress</span>
            <span>${progress}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>
        </div>
        <div class="topic-actions">
          <button class="btn btn-primary" onclick="openTopicModal('${topic._id}')">
            Update Progress
          </button>
          <button class="bookmark-btn ${topic.userProgress?.isBookmarked ? "bookmarked" : ""}" 
                  onclick="toggleBookmark('${topic._id}')">
            <i class="fas fa-bookmark"></i>
          </button>
        </div>
      </div>
    `;
  }

  getStatusClass(status) {
    const statusMap = {
      "not-started": "status-not-started",
      "in-progress": "status-in-progress",
      completed: "status-completed",
    };
    return statusMap[status] || "status-not-started";
  }

  renderPagination(pagination) {
    // Simple pagination implementation
    const container = document.getElementById("topics-pagination");
    if (!container || !pagination) return;

    container.innerHTML = `
      <button ${pagination.page <= 1 ? "disabled" : ""}>Previous</button>
      <span>Page ${pagination.page} of ${pagination.totalPages}</span>
      <button ${pagination.page >= pagination.totalPages ? "disabled" : ""}>Next</button>
    `;
  }

  renderLoading() {
    return '<div class="skeleton skeleton-card"></div>'.repeat(6);
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

    this.renderTopics(demoTopics);
  }
}
