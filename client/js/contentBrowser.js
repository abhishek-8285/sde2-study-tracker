class ContentBrowser {
  constructor(api, ui) {
    this.api = api;
    this.ui = ui;
    this.allContent = {};
    this.searchResults = [];
    this.currentFilter = "all";
    this.collapsedTopics = new Set(); // Track collapsed topic sections
  }

  async init() {
    console.log("📚 Initializing Content Browser module...");
    this.setupEventListeners();
    // Don't load content during init - load it when browser is opened
    // await this.loadAllContent();
  }

  setupEventListeners() {
    console.log("🔧 Setting up Content Browser event listeners...");

    // Content browser button
    const contentBrowserBtn = document.getElementById("content-browser-btn");
    if (contentBrowserBtn) {
      console.log("✅ Found content browser button, attaching listener");
      contentBrowserBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        console.log("🖱️ Content Browser button clicked!");
        try {
          await this.openContentBrowser();
          console.log("✅ Content Browser opened successfully");
        } catch (error) {
          console.error("❌ Error opening content browser:", error);
        }
      });
    } else {
      console.error("❌ Content browser button not found!");
    }

    // Search functionality
    document.addEventListener("input", (e) => {
      if (e.target.id === "content-search-input") {
        this.handleSearch(e.target.value);
      }
    });

    // Filter buttons
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("content-filter-btn")) {
        this.setFilter(e.target.dataset.filter);
      }
    });

    // Topic toggle functionality
    document.addEventListener("click", (e) => {
      if (e.target.closest(".topic-toggle-btn")) {
        const topicHeader = e.target.closest(".topic-header");
        if (topicHeader) {
          const topicKey = topicHeader.dataset.topic;
          this.toggleTopic(topicKey);
        }
      }
    });

    // Content item clicks
    document.addEventListener("click", (e) => {
      const contentItem = e.target.closest(".content-item");
      if (contentItem) {
        const topic = contentItem.dataset.topic;
        const filename = contentItem.dataset.filename;
        this.openContent(topic, filename);
      }
    });

    // Close modal
    document.addEventListener("click", (e) => {
      if (e.target.id === "close-content-browser") {
        this.closeContentBrowser();
      }
    });

    // Expand/Collapse all topics
    document.addEventListener("click", (e) => {
      if (e.target.id === "expand-all-topics" || e.target.closest("#expand-all-topics")) {
        this.expandAllTopics();
      } else if (e.target.id === "collapse-all-topics" || e.target.closest("#collapse-all-topics")) {
        this.collapseAllTopics();
      }
    });

    // ESC key to close
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && document.getElementById("content-browser-modal").classList.contains("show")) {
        this.closeContentBrowser();
      }
    });
  }

  async loadAllContent() {
    try {
      console.log("🔍 Loading content from API...");
      const response = await this.api.get("/content/list");

      console.log("📊 Raw API Response:", response);
      console.log("📊 Response structure keys:", Object.keys(response));

      this.allContent = response.structure || {};

      console.log("📚 Content structure received:", this.allContent);
      console.log("📚 Topic keys in allContent:", Object.keys(this.allContent));
      console.log(`📚 Loaded ${Object.keys(this.allContent).length} topics with ${response.totalFiles || 0} total files`);

      // Check which topics are missing
      const expectedTopics = [
        "ai-ml-integration",
        "api-design-testing",
        "databases",
        "devops-infrastructure-sde2",
        "diagrams-study",
        "dsa",
        "frontend-advanced",
        "go-learning",
        "linkedin-posts",
        "patterns",
        "react",
        "security-authentication",
        "springBoot",
        "study-guides",
        "system-design-interviews",
        "root-guides",
      ];

      const receivedTopics = Object.keys(this.allContent);
      const missingTopics = expectedTopics.filter((topic) => !receivedTopics.includes(topic));

      if (missingTopics.length > 0) {
        console.warn("⚠️ Missing topics:", missingTopics);
      }

      if (Object.keys(this.allContent).length === 0) {
        console.warn("⚠️ No content topics found in API response");
      }
    } catch (error) {
      console.error("❌ Error loading content:", error);
      console.error("❌ Error details:", error.response || error.message);
      this.ui.showToast("error", "Failed to load learning content");
    }
  }

  async openContentBrowser() {
    console.log("🚀 Opening Content Browser...");

    try {
      console.log("📋 Creating browser modal...");
      this.createBrowserModal();
      console.log("✅ Modal created");

      console.log("📂 Loading collapsed state...");
      this.loadCollapsedState(); // Load saved collapsed state
      console.log("✅ Collapsed state loaded");

      console.log("🔍 Current filter state:", this.currentFilter);
      console.log("📁 Collapsed topics:", Array.from(this.collapsedTopics));

      const modal = document.getElementById("content-browser-modal");
      if (!modal) {
        console.error("❌ Modal element not found after creation!");
        return;
      }

      console.log("👁️ Showing modal...");
      modal.classList.add("show");
      document.body.style.overflow = "hidden";
      console.log("✅ Modal visible");

      // Show loading state
      const contentList = document.getElementById("content-browser-list");
      if (!contentList) {
        console.error("❌ Content list element not found!");
        return;
      }

      console.log("⏳ Showing loading state...");
      contentList.innerHTML = `
        <div class="loading-content">
          <i class="fas fa-spinner fa-spin"></i>
          <h3>Loading Learning Content...</h3>
          <p>Scanning your learning materials...</p>
        </div>
      `;
      console.log("✅ Loading state displayed");

      // Load content if not already loaded
      if (Object.keys(this.allContent).length === 0) {
        console.log("📚 Loading content from API...");
        await this.loadAllContent();
        console.log("✅ Content loaded from API");
      } else {
        console.log("♻️ Using cached content");
      }

      console.log("🎨 Rendering content...");
      this.renderContent();
      console.log("✅ Content Browser fully opened");
    } catch (error) {
      console.error("❌ Error in openContentBrowser:", error);
      throw error;
    }
  }

  closeContentBrowser() {
    const modal = document.getElementById("content-browser-modal");
    if (modal) {
      modal.classList.remove("show");
      document.body.style.overflow = "";
    }
  }

  createBrowserModal() {
    // Remove existing modal if any
    const existingModal = document.getElementById("content-browser-modal");
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement("div");
    modal.id = "content-browser-modal";
    modal.className = "modal";

    modal.innerHTML = `
      <div class="modal-content content-browser-modal">
        <div class="content-browser-header">
          <h2>📚 Learning Content Browser</h2>
          <button id="close-content-browser" class="close-btn">&times;</button>
        </div>
        
        <div class="content-browser-toolbar">
          <div class="search-section">
            <div class="search-input-container">
              <i class="fas fa-search"></i>
              <input type="text" id="content-search-input" placeholder="Search through all learning materials..." />
            </div>
          </div>
          
          <div class="filter-section">
            <button class="content-filter-btn active" data-filter="all">All Topics</button>
            <button class="content-filter-btn" data-filter="frontend">Frontend</button>
            <button class="content-filter-btn" data-filter="backend">Backend</button>
            <button class="content-filter-btn" data-filter="data-structures">Data Structures</button>
            <button class="content-filter-btn" data-filter="algorithms">Algorithms</button>
          </div>
          
          <div class="topic-controls">
            <button class="btn btn-sm btn-outline" id="expand-all-topics" title="Expand All Topics">
              <i class="fas fa-expand-alt"></i> Expand All
            </button>
            <button class="btn btn-sm btn-outline" id="collapse-all-topics" title="Collapse All Topics">
              <i class="fas fa-compress-alt"></i> Collapse All
            </button>
          </div>
        </div>
        
        <div class="content-browser-stats">
          <div class="stat-item">
            <span class="stat-number" id="total-topics">0</span>
            <span class="stat-label">Topics</span>
          </div>
          <div class="stat-item">
            <span class="stat-number" id="total-files">0</span>
            <span class="stat-label">Files</span>
          </div>
          <div class="stat-item">
            <span class="stat-number" id="total-results">0</span>
            <span class="stat-label">Showing</span>
          </div>
        </div>
        
        <div class="content-browser-body">
          <div id="content-browser-list" class="content-list">
            <!-- Content will be rendered here -->
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  renderContent() {
    console.log("🎨 Rendering content browser...");
    const contentList = document.getElementById("content-browser-list");
    const topics = Object.keys(this.allContent);

    console.log(`📋 Found ${topics.length} topics to render`);
    console.log("📚 All topic keys:", topics);

    if (topics.length === 0) {
      console.log("❌ No topics found, showing empty state");
      contentList.innerHTML = `
        <div class="empty-content">
          <i class="fas fa-book-open"></i>
          <h3>No Learning Content Found</h3>
          <p>Make sure the learning directory contains markdown files.</p>
        </div>
      `;
      return;
    }

    let html = "";
    let totalFiles = 0;
    let visibleFiles = 0;

    topics.forEach((topicKey) => {
      const topic = this.allContent[topicKey];
      console.log(`🔍 Processing topic: ${topicKey}`, {
        title: topic.title,
        fileCount: topic.files?.length || 0,
        currentFilter: this.currentFilter,
      });

      const shouldShow = this.currentFilter === "all" || topicKey.toLowerCase().includes(this.currentFilter.toLowerCase()) || topic.title.toLowerCase().includes(this.currentFilter.toLowerCase());

      console.log(`👁️ Should show ${topicKey}:`, shouldShow);

      if (!shouldShow) {
        console.log(`⏭️ Skipping ${topicKey} due to filter`);
        return;
      }

      totalFiles += topic.files.length;
      visibleFiles += topic.files.length;

      const isCollapsed = this.collapsedTopics.has(topicKey);
      const toggleIcon = isCollapsed ? "fa-chevron-right" : "fa-chevron-down";
      const contentStyle = isCollapsed ? 'style="display: none;"' : "";

      console.log(`📁 Rendering topic ${topicKey}: collapsed=${isCollapsed}, files=${topic.files.length}`);

      html += `
        <div class="topic-section ${isCollapsed ? "collapsed" : ""}">
          <div class="topic-header">
            <div class="topic-header-main">
              <button class="topic-toggle-btn" data-topic="${topicKey}" data-action="toggle-topic">
                <i class="fas ${toggleIcon}"></i>
              </button>
              <h4>${topic.title}</h4>
              <span class="topic-file-count">${topic.files.length} files</span>
            </div>
          </div>
          <div class="topic-content" ${contentStyle}>
            ${topic.files.map((file) => this.renderFileItem(topicKey, file)).join("")}
          </div>
        </div>
      `;
    });

    console.log(`📊 Rendering summary: ${topics.length} total topics, ${visibleFiles} visible files, HTML length: ${html.length}`);

    contentList.innerHTML = html;
    this.updateStats(topics.length, totalFiles, visibleFiles);

    console.log(`✅ Successfully rendered ${visibleFiles} files across ${topics.length} topics`);

    // Apply collapsed state after rendering
    setTimeout(() => {
      this.applyCollapsedState();
    }, 10);
  }

  renderFileItem(topicKey, file) {
    const sizeKB = Math.round(file.size / 1024);

    return `
      <div class="content-item" data-topic="${topicKey}" data-filename="${file.relativePath || file.filename}">
        <div class="content-item-icon">
          <i class="fas fa-file-alt"></i>
        </div>
        <div class="content-item-info">
          <div class="content-item-title">${file.title}</div>
          <div class="content-item-meta">
            <span class="file-size">${sizeKB} KB</span>
            <span class="file-path">${file.path}</span>
          </div>
        </div>
        <div class="content-item-actions">
          <button class="btn btn-sm btn-primary" title="Open in Learning Viewer">
            <i class="fas fa-external-link-alt"></i>
          </button>
        </div>
      </div>
    `;
  }

  async handleSearch(query) {
    if (query.trim().length < 2) {
      this.renderContent();
      return;
    }

    try {
      const response = await this.api.post("/content/search", {
        query: query.trim(),
      });

      this.renderSearchResults(response.results, query);
      this.updateStats(0, 0, response.totalResults, `Search: "${query}"`);
    } catch (error) {
      console.error("Search error:", error);
      this.ui.showToast("error", "Search failed");
    }
  }

  renderSearchResults(results, query) {
    const contentList = document.getElementById("content-browser-list");

    if (results.length === 0) {
      contentList.innerHTML = `
        <div class="empty-content">
          <i class="fas fa-search"></i>
          <h3>No Results Found</h3>
          <p>No content matches "${query}"</p>
        </div>
      `;
      return;
    }

    const html = results
      .map(
        (result) => `
      <div class="content-item search-result" data-topic="${result.topic}" data-filename="${result.filename}">
        <div class="content-item-icon">
          <i class="fas fa-search"></i>
        </div>
        <div class="content-item-info">
          <div class="content-item-title">
            ${result.title}
            ${result.titleMatch ? '<span class="match-badge">Title Match</span>' : ""}
          </div>
          <div class="content-item-meta">
            <span class="topic-name">${result.topic}</span>
            <span class="match-count">${result.totalMatches} matches</span>
          </div>
          ${
            result.contentMatches.length > 0
              ? `
            <div class="search-preview">
              ${result.contentMatches
                .slice(0, 2)
                .map(
                  (match) => `
                <div class="match-line">
                  <span class="line-number">Line ${match.lineNumber}:</span>
                  <span class="match-text">${this.highlightSearchTerm(match.line, query)}</span>
                </div>
              `
                )
                .join("")}
            </div>
          `
              : ""
          }
        </div>
        <div class="content-item-actions">
          <button class="btn btn-sm btn-primary" title="Open in Learning Viewer">
            <i class="fas fa-external-link-alt"></i>
          </button>
        </div>
      </div>
    `
      )
      .join("");

    contentList.innerHTML = html;
  }

  highlightSearchTerm(text, query) {
    const regex = new RegExp(`(${query})`, "gi");
    return text.replace(regex, "<mark>$1</mark>");
  }

  setFilter(filter) {
    this.currentFilter = filter;

    // Update active filter button
    document.querySelectorAll(".content-filter-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.filter === filter);
    });

    // Clear search and re-render
    const searchInput = document.getElementById("content-search-input");
    if (searchInput) {
      searchInput.value = "";
    }

    this.renderContent();
  }

  updateStats(topics, totalFiles, showing, context = "") {
    const totalTopicsEl = document.getElementById("total-topics");
    const totalFilesEl = document.getElementById("total-files");
    const totalResultsEl = document.getElementById("total-results");

    if (totalTopicsEl) totalTopicsEl.textContent = topics;
    if (totalFilesEl) totalFilesEl.textContent = totalFiles;
    if (totalResultsEl) totalResultsEl.textContent = showing;

    // Update labels based on context
    const statsContainer = document.querySelector(".content-browser-stats");
    if (context.startsWith("Search:")) {
      statsContainer.querySelector(".stat-label:last-child").textContent = "Results";
    } else {
      statsContainer.querySelector(".stat-label:last-child").textContent = "Showing";
    }
  }

  async openContent(topic, filename) {
    this.closeContentBrowser();

    // Use the learning viewer to open the content
    if (window.app && window.app.modules.learningViewer) {
      // Find the topic ID from the database (if available)
      // For now, we'll construct a resource object

      // Extract just the filename for the title
      const actualFilename = filename.split("/").pop();
      const resource = {
        title: actualFilename.replace(".md", "").replace(/^\d+-/, "").replace(/-/g, " "),
        url: `/api/content/file/${topic}/${filename}`, // Use API endpoint for file serving
        type: "markdown",
      };

      window.app.modules.learningViewer.currentResources = [resource];
      window.app.modules.learningViewer.currentResourceIndex = 0;
      window.app.modules.learningViewer.openLearningViewer();
      await window.app.modules.learningViewer.loadResourceContent(resource);
    }
  }

  toggleTopic(topicKey) {
    const topicFilesElement = document.querySelector(`[data-topic-files="${topicKey}"]`);
    const toggleButton = document.querySelector(`[data-topic="${topicKey}"] .topic-toggle-btn i`);

    if (!topicFilesElement || !toggleButton) return;

    const isCollapsed = this.collapsedTopics.has(topicKey);

    if (isCollapsed) {
      // Expand the topic
      this.collapsedTopics.delete(topicKey);
      topicFilesElement.style.display = "flex";
      topicFilesElement.style.flexDirection = "column";
      toggleButton.className = "fas fa-chevron-down";

      // Animate expansion
      topicFilesElement.style.animation = "expandTopic 0.3s ease-out";
    } else {
      // Collapse the topic
      this.collapsedTopics.add(topicKey);
      topicFilesElement.style.display = "none";
      toggleButton.className = "fas fa-chevron-right";
    }

    // Store collapsed state in localStorage
    this.saveCollapsedState();
  }

  saveCollapsedState() {
    try {
      localStorage.setItem("contentBrowser_collapsedTopics", JSON.stringify([...this.collapsedTopics]));
    } catch (error) {
      console.warn("Could not save collapsed topics state:", error);
    }
  }

  loadCollapsedState() {
    try {
      const saved = localStorage.getItem("contentBrowser_collapsedTopics");
      if (saved) {
        this.collapsedTopics = new Set(JSON.parse(saved));
      }
    } catch (error) {
      console.warn("Could not load collapsed topics state:", error);
      this.collapsedTopics = new Set();
    }
  }

  applyCollapsedState() {
    // Apply collapsed state to rendered topics
    this.collapsedTopics.forEach((topicKey) => {
      const topicFilesElement = document.querySelector(`[data-topic-files="${topicKey}"]`);
      const toggleButton = document.querySelector(`[data-topic="${topicKey}"] .topic-toggle-btn i`);

      if (topicFilesElement && toggleButton) {
        topicFilesElement.style.display = "none";
        toggleButton.className = "fas fa-chevron-right";
      }
    });
  }

  collapseAllTopics() {
    const topics = Object.keys(this.allContent);
    topics.forEach((topicKey) => {
      if (!this.collapsedTopics.has(topicKey)) {
        this.collapsedTopics.add(topicKey);
      }
    });
    this.saveCollapsedState();
    this.applyCollapsedState();
  }

  expandAllTopics() {
    this.collapsedTopics.clear();

    document.querySelectorAll("[data-topic-files]").forEach((element) => {
      element.style.display = "flex";
      element.style.flexDirection = "column";
    });

    document.querySelectorAll(".topic-toggle-btn i").forEach((icon) => {
      icon.className = "fas fa-chevron-down";
    });

    this.saveCollapsedState();
  }
}

export { ContentBrowser };
