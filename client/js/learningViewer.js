// Learning Viewer - Integrated content reader and learning platform
export class LearningViewer {
  constructor(api, ui) {
    this.api = api;
    this.ui = ui;
    this.currentTopic = null;
    this.currentResource = null;
    this.currentContent = null;
    this.readingProgress = 0;
    this.userNotes = [];
    this.bookmarks = [];
    this.contentBookmarks = []; // Bookmarks for current content
    this.studySession = null;
    this.currentContentPath = null;
    this.isBookmarkMode = false; // For creating bookmarks
    this.selectedText = null;
  }

  async init() {
    console.log("📖 Initializing Learning Viewer...");
    this.createViewerModal();
    this.setupEventListeners();
  }

  createViewerModal() {
    // Create the learning viewer modal
    const modal = document.createElement("div");
    modal.id = "learning-viewer-modal";
    modal.className = "modal learning-viewer-modal";
    modal.innerHTML = `
      <div class="modal-content learning-viewer-content">
        <div class="viewer-header">
          <div class="viewer-title">
            <h2 id="viewer-topic-title">Loading...</h2>
            <div class="viewer-meta">
              <span id="viewer-resource-title">Select a resource</span>
              <div class="viewer-progress">
                <span id="viewer-progress-text">0% Complete</span>
                <div class="progress-bar">
                  <div class="progress-fill" id="viewer-progress-bar"></div>
                </div>
              </div>
            </div>
          </div>
          <div class="viewer-actions">
            <button class="btn btn-sm btn-outline" id="viewer-notes-btn" title="Notes">
              <i class="fas fa-sticky-note"></i>
            </button>
            <button class="btn btn-sm btn-outline" id="viewer-bookmark-btn" title="Bookmark">
              <i class="fas fa-bookmark"></i>
            </button>
            <button class="btn btn-sm btn-outline" id="viewer-practice-btn" title="Practice">
              <i class="fas fa-code"></i>
            </button>
            <button class="btn btn-sm btn-primary" id="viewer-session-btn" title="Start Study Session">
              <i class="fas fa-play"></i>
            </button>
            <button class="close-btn" id="learning-viewer-close">&times;</button>
          </div>
        </div>
        
        <div class="viewer-body">
          <!-- Sidebar with resources and navigation -->
          <div class="viewer-sidebar">
            <div class="sidebar-section">
              <h4><i class="fas fa-list"></i> Learning Path</h4>
              <div id="viewer-resources-list" class="resources-nav">
                <!-- Resources will be populated here -->
              </div>
            </div>
            
            <div class="sidebar-section">
              <h4><i class="fas fa-sticky-note"></i> Quick Notes</h4>
              <textarea id="quick-notes" placeholder="Take quick notes while reading..." rows="4"></textarea>
              <button class="btn btn-sm btn-primary" id="save-quick-note">Save Note</button>
            </div>
            
            <div class="sidebar-section">
              <h4><i class="fas fa-bookmark"></i> Bookmarks</h4>
              <div id="bookmarks-list" class="bookmarks-nav">
                <!-- Bookmarks will be populated here -->
              </div>
            </div>
          </div>
          
          <!-- Main content area -->
          <div class="viewer-content-area">
            <div class="content-toolbar">
              <div class="content-controls">
                <button class="btn btn-sm btn-outline" id="prev-resource-btn">
                  <i class="fas fa-chevron-left"></i> Previous
                </button>
                <button class="btn btn-sm btn-outline" id="next-resource-btn">
                  Next <i class="fas fa-chevron-right"></i>
                </button>
                <div class="reading-timer">
                  <i class="fas fa-clock"></i>
                  <span id="reading-time">00:00</span>
                </div>
              </div>
              <div class="content-settings">
                <button class="btn btn-sm btn-outline" id="bookmark-mode-btn" title="Bookmark Mode">
                  <i class="fas fa-bookmark"></i>
                </button>
                <select id="font-size-select">
                  <option value="14">Small</option>
                  <option value="16" selected>Medium</option>
                  <option value="18">Large</option>
                  <option value="20">Extra Large</option>
                </select>
                <button class="btn btn-sm btn-outline" id="focus-mode-btn" title="Focus Mode">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>
            
            <div class="content-viewer" id="content-viewer">
              <div class="content-placeholder">
                <i class="fas fa-book-open"></i>
                <h3>Select a resource to start learning</h3>
                <p>Choose from the learning path on the left to begin reading</p>
              </div>
            </div>
            
            <!-- Scrollbar with bookmark indicators -->
            <div class="viewer-scrollbar" id="viewer-scrollbar"></div>
            
            <!-- Reading progress tracker -->
            <div class="reading-tracker">
              <button class="btn btn-sm btn-outline" id="mark-complete-btn">
                <i class="fas fa-check"></i> Mark as Complete
              </button>
              <div class="reading-stats">
                <span>Reading Time: <strong id="session-time">00:00</strong></span>
                <span>Progress: <strong id="reading-percentage">0%</strong></span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Notes Panel (hidden by default) -->
        <div class="notes-panel" id="notes-panel" style="display: none;">
          <div class="notes-header">
            <h4><i class="fas fa-sticky-note"></i> Detailed Notes</h4>
            <button class="btn btn-sm btn-outline" id="close-notes-panel">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="notes-content">
            <div class="notes-list" id="notes-list">
              <!-- Notes will be populated here -->
            </div>
            <div class="notes-editor">
              <textarea id="note-editor" placeholder="Write your detailed notes here..." rows="6"></textarea>
              <div class="notes-actions">
                <button class="btn btn-sm btn-primary" id="save-note-btn">Save Note</button>
                <button class="btn btn-sm btn-outline" id="clear-note-btn">Clear</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  setupEventListeners() {
    // Close learning viewer
    document.addEventListener("click", (e) => {
      if (e.target.id === "learning-viewer-close") {
        this.closeLearningViewer();
      }
    });

    // Handle resource navigation clicks
    document.addEventListener("click", (e) => {
      const resourceIndex = e.target.closest("[data-resource-index]")?.dataset.resourceIndex;
      if (resourceIndex !== undefined) {
        this.loadResource(parseInt(resourceIndex));
      }
    });

    // Handle copy to clipboard
    document.addEventListener("click", (e) => {
      const copyText = e.target.closest("[data-copy-text]")?.dataset.copyText;
      if (copyText) {
        this.copyToClipboard(copyText);
      }
    });

    // Handle note deletion
    document.addEventListener("click", (e) => {
      const noteId = e.target.closest("[data-note-id]")?.dataset.noteId;
      if (noteId) {
        this.deleteNote(parseInt(noteId));
      }
    });

    // Notes panel toggle
    const notesBtn = document.getElementById("viewer-notes-btn");
    if (notesBtn) {
      notesBtn.addEventListener("click", () => {
        this.toggleNotesPanel();
      });
    }

    // Close notes panel
    const closeNotesBtn = document.getElementById("close-notes-panel");
    if (closeNotesBtn) {
      closeNotesBtn.addEventListener("click", () => {
        this.toggleNotesPanel();
      });
    }

    // Quick note saving
    document.getElementById("save-quick-note").addEventListener("click", () => {
      this.saveQuickNote();
    });

    // Detailed note saving
    document.getElementById("save-note-btn").addEventListener("click", () => {
      this.saveDetailedNote();
    });

    // Navigation
    document.getElementById("prev-resource-btn").addEventListener("click", () => {
      this.navigateResource(-1);
    });

    document.getElementById("next-resource-btn").addEventListener("click", () => {
      this.navigateResource(1);
    });

    // Font size change
    document.getElementById("font-size-select").addEventListener("change", (e) => {
      this.changeFontSize(e.target.value);
    });

    // Focus mode
    document.getElementById("focus-mode-btn").addEventListener("click", () => {
      this.toggleFocusMode();
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      // Only handle shortcuts when learning viewer is open
      if (!document.getElementById("learning-viewer-modal")?.classList.contains("show")) {
        return;
      }

      if (e.key === "Escape") {
        const modal = document.querySelector(".learning-viewer-modal");
        if (modal?.classList.contains("focus-mode")) {
          e.preventDefault();
          this.toggleFocusMode();
        }
      }

      if (e.key === "F11") {
        e.preventDefault();
        this.toggleFocusMode();
      }
    });

    // Mark complete
    document.getElementById("mark-complete-btn").addEventListener("click", () => {
      this.markResourceComplete();
    });

    // Study session
    document.getElementById("viewer-session-btn").addEventListener("click", () => {
      this.toggleStudySession();
    });

    // ========================================
    // BOOKMARK EVENT LISTENERS
    // ========================================

    // Bookmark mode toggle
    document.getElementById("bookmark-mode-btn").addEventListener("click", () => {
      this.toggleBookmarkMode();
    });

    // Main bookmark button (legacy)
    const viewerBookmarkBtn = document.getElementById("viewer-bookmark-btn");
    if (viewerBookmarkBtn) {
      viewerBookmarkBtn.addEventListener("click", () => {
        this.toggleBookmark();
      });
    }

    // Text selection for bookmarks
    document.getElementById("content-viewer").addEventListener("mouseup", () => {
      this.handleTextSelection();
    });

    // Bookmark list interactions
    document.addEventListener("click", (e) => {
      const bookmarkItem = e.target.closest(".bookmark-item");
      if (bookmarkItem) {
        const bookmarkId = bookmarkItem.dataset.bookmarkId;
        const action = e.target.closest(".bookmark-action-btn")?.dataset.action;

        if (action === "jump") {
          const bookmark = this.contentBookmarks.find((b) => b._id === bookmarkId);
          if (bookmark) {
            this.jumpToBookmark(bookmark);
          }
        } else if (action === "delete") {
          this.deleteBookmark(bookmarkId);
        } else if (!action) {
          // Click on bookmark item itself (not action button)
          const bookmark = this.contentBookmarks.find((b) => b._id === bookmarkId);
          if (bookmark) {
            this.jumpToBookmark(bookmark);
          }
        }
      }
    });

    // Scroll tracking for progress
    document.getElementById("content-viewer").addEventListener("scroll", () => {
      this.updateReadingProgress();
    });
  }

  async openTopic(topicId) {
    try {
      console.log("📖 Opening topic for reading:", topicId);

      // Get topic data from database
      const topicResponse = await this.api.get(`/topics/${topicId}`);
      this.currentTopic = topicResponse.topic;

      console.log("🏷️ Database topic title:", this.currentTopic.title);
      console.log("📊 Database topic data:", this.currentTopic);

      // Show the modal
      document.getElementById("learning-viewer-modal").classList.add("show");
      document.body.style.overflow = "hidden";

      // Update UI
      document.getElementById("viewer-topic-title").textContent = this.currentTopic.title;

      // Get the topic key from the title to match content API structure
      const topicKey = this.getTopicKeyFromTitle(this.currentTopic.title);
      console.log("🗝️ Mapped topic key:", topicKey);

      // Load resources from content API
      await this.loadResourcesFromContentAPI(topicKey);

      // Load user progress and notes
      await this.loadUserData();

      // Start reading timer
      this.startReadingTimer();
    } catch (error) {
      console.error("❌ Error opening topic:", error);
      this.ui.showToast("error", "Failed to load topic content");
    }
  }

  getTopicKeyFromTitle(title) {
    // Map topic titles to content API keys
    const titleMap = {
      "Data Structures & Algorithms": "dsa",
      "Spring Boot & Backend Development": "springBoot",
      "React & Frontend Development": "react",
      "Database Design & Management": "databases",
      "System Design & Architecture": "system-design-interviews",
      "DevOps & Infrastructure": "devops-infrastructure-sde2",
      "API Design & Testing": "api-design-testing",
      "AI/ML Integration": "ai-ml-integration",
      "Security & Authentication": "security-authentication",
      "Design Patterns & Architecture": "patterns",
      "Advanced Frontend Techniques": "frontend-advanced",
      "Go Programming": "go-learning",
      "Study Guides & Plans": "study-guides",
    };

    return titleMap[title] || title.toLowerCase().replace(/\s+/g, "-").replace(/&/g, "");
  }

  async loadResourcesFromContentAPI(topicKey) {
    try {
      console.log(`📚 Loading resources for topic: ${topicKey}`);

      // Get content from the content API
      const contentResponse = await this.api.get("/content/list");
      console.log("📡 Content API response received:", {
        totalTopics: contentResponse.totalTopics,
        totalFiles: contentResponse.totalFiles,
        hasStructure: !!contentResponse.structure,
        structureKeys: Object.keys(contentResponse.structure || {}),
      });

      const topicContent = contentResponse.structure[topicKey];
      console.log(`🔍 Looking for topic "${topicKey}" in content structure:`, {
        found: !!topicContent,
        fileCount: topicContent?.files?.length || 0,
        title: topicContent?.title || "N/A",
      });

      if (!topicContent || !topicContent.files || topicContent.files.length === 0) {
        console.warn(`❌ No content found for topic: ${topicKey}`);
        console.log("📋 Available topics:", Object.keys(contentResponse.structure || {}));
        this.showNoContentMessage(topicKey);
        return;
      }

      console.log(`✅ Found content for ${topicKey}:`, {
        title: topicContent.title,
        fileCount: topicContent.files.length,
        sampleFiles: topicContent.files.slice(0, 3).map((f) => f.title),
      });

      // Convert content files to resources format
      this.currentTopic.resources = topicContent.files.map((file, index) => {
        // The relativePath includes the topic directory (e.g., "ai-ml-integration/01-llm-api-integration.md")
        // But the API route expects it without the topic prefix (e.g., "01-llm-api-integration.md")
        // For DSA subdirectories: "dsa/01-easy/arrays.md" should become "01-easy/arrays.md"
        let filePath = file.relativePath || file.filename;

        // Remove the topic prefix if it exists
        if (filePath.startsWith(`${topicKey}/`)) {
          filePath = filePath.substring(`${topicKey}/`.length);
        }

        return {
          title: file.title,
          url: `/api/content/file/${topicKey}/${filePath}`,
          type: "markdown",
          duration: this.estimateReadingTime(file.size),
          index,
          originalPath: file.relativePath || file.filename, // Keep original for debugging
        };
      });

      console.log(`✅ Created ${this.currentTopic.resources.length} resources for ${topicKey}`);
      console.log(
        "📄 Sample resource URLs:",
        this.currentTopic.resources.slice(0, 3).map((r) => r.url)
      );

      // Load resources list in UI
      this.loadResourcesList();
    } catch (error) {
      console.error("❌ Error loading resources from content API:", error);
      this.showContentErrorMessage(error);
    }
  }

  estimateReadingTime(fileSizeBytes) {
    // Estimate reading time based on file size (average 200 words per minute, ~5 chars per word)
    const chars = fileSizeBytes;
    const words = chars / 5;
    const minutes = Math.ceil(words / 200);
    return Math.max(1, minutes);
  }

  showNoContentMessage(topicKey) {
    const container = document.getElementById("viewer-resources-list");
    container.innerHTML = `
      <div class="no-content-message">
        <i class="fas fa-folder-open"></i>
        <h4>No Content Available</h4>
        <p>No learning materials found for topic: <strong>${topicKey}</strong></p>
        <p>Content might be:</p>
        <ul>
          <li>Not yet uploaded to the learning directory</li>
          <li>In a different folder structure</li>
          <li>Named differently than expected</li>
        </ul>
        <button class="btn btn-primary" onclick="window.app.modules.contentBrowser.openContentBrowser()">
          <i class="fas fa-search"></i> Browse All Content
        </button>
      </div>
    `;

    // Also show message in content viewer
    const viewer = document.getElementById("content-viewer");
    viewer.innerHTML = `
      <div class="content-placeholder">
        <i class="fas fa-exclamation-circle"></i>
        <h3>No Content Found</h3>
        <p>No learning materials available for this topic.</p>
        <button class="btn btn-primary" onclick="window.app.modules.contentBrowser.openContentBrowser()">
          <i class="fas fa-folder-open"></i> Browse All Content
        </button>
      </div>
    `;
  }

  showContentErrorMessage(error) {
    const container = document.getElementById("viewer-resources-list");
    container.innerHTML = `
      <div class="content-error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <h4>Content Loading Error</h4>
        <p>Failed to load learning materials</p>
        <button class="btn btn-primary" onclick="location.reload()">
          <i class="fas fa-refresh"></i> Retry
        </button>
      </div>
    `;
  }

  loadResourcesList() {
    const container = document.getElementById("viewer-resources-list");
    if (!this.currentTopic.resources) {
      container.innerHTML = "<p>No resources available</p>";
      return;
    }

    container.innerHTML = this.currentTopic.resources
      .map(
        (resource, index) => `
      <div class="resource-nav-item ${index === 0 ? "active" : ""}" data-index="${index}">
        <div class="resource-nav-content" data-resource-index="${index}">
          <div class="resource-nav-number">${index + 1}</div>
          <div class="resource-nav-info">
            <h5>${resource.title}</h5>
            <div class="resource-nav-meta">
              <span class="resource-type">${resource.type}</span>
              ${resource.duration ? `<span class="resource-duration">${resource.duration}min</span>` : ""}
            </div>
          </div>
          <div class="resource-nav-status">
            <i class="fas fa-circle-check" style="display: none;"></i>
          </div>
        </div>
      </div>
    `
      )
      .join("");

    // Load first resource by default
    if (this.currentTopic.resources.length > 0) {
      this.loadResource(0);
    }
  }

  async loadResource(index) {
    try {
      const resource = this.currentTopic.resources[index];
      this.currentResource = { ...resource, index };

      // Update UI
      document.getElementById("viewer-resource-title").textContent = resource.title;

      // Update active state
      document.querySelectorAll(".resource-nav-item").forEach((item, i) => {
        item.classList.toggle("active", i === index);
      });

      // Load content
      await this.loadResourceContent(resource);

      // Update navigation buttons
      this.updateNavigationButtons();
    } catch (error) {
      console.error("Error loading resource:", error);
      this.ui.showToast("error", "Failed to load resource content");
    }
  }

  async loadResourceContent(resource) {
    const viewer = document.getElementById("content-viewer");
    viewer.innerHTML = '<div class="loading-content"><i class="fas fa-spinner fa-spin"></i> Loading content...</div>';

    try {
      console.log("📄 Loading resource content:", resource.url);

      // Extract the file path from URL more robustly
      // URL format: /api/content/file/{topic}/{filePath...}
      const match = resource.url.match(/\/api\/content\/file\/([^\/]+)\/(.+)$/);
      if (match) {
        const topic = match[1];
        const filePath = match[2];

        // Set current content path for bookmarks (use the original path structure if available)
        this.currentContentPath = resource.originalPath || `${topic}/${filePath}`;
        console.log("📁 Extracted paths - Topic:", topic, "FilePath:", filePath, "ContentPath:", this.currentContentPath);
      } else {
        console.warn("Could not parse URL structure:", resource.url);
        this.currentContentPath = resource.originalPath || "unknown";
      }

      // Make the API call directly
      const response = await fetch(resource.url, {
        headers: {
          Authorization: `Bearer ${this.api.authToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.content) {
        // Render real markdown content
        viewer.innerHTML = this.renderMarkdownContent(data.content);

        // Update metadata
        if (data.metadata) {
          const resourceTitle = document.getElementById("viewer-resource-title");
          if (resourceTitle) {
            const wordCount = data.content.split(/\s+/).length;
            const readingTime = Math.ceil(wordCount / 200); // 200 words per minute
            resourceTitle.innerHTML = `
              ${data.metadata.title}
              <small>(${wordCount} words • ${readingTime} min read)</small>
            `;
          }
        }

        console.log("✅ Content loaded successfully");
      } else {
        throw new Error("No content received from API");
      }

      // Reset scroll and progress
      viewer.scrollTop = 0;
      this.updateReadingProgress();

      // Load bookmarks for this content
      await this.loadContentBookmarks();
    } catch (error) {
      console.error("❌ Error loading content:", error);

      // Show error message with file path
      viewer.innerHTML = `
        <div class="content-error">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Content Loading Failed</h3>
          <p>Could not load the learning material:</p>
          <code>${resource.url}</code>
          <p><strong>Error:</strong> ${error.message}</p>
          <p>This could be due to:</p>
          <ul style="text-align: left; margin: 1rem 0;">
            <li>File not found in the learning directory</li>
            <li>Server connection issue</li>
            <li>Authentication problem</li>
            <li>File permissions issue</li>
          </ul>
          <div style="margin-top: 1rem;">
            <button class="btn btn-primary" data-copy-text="${resource.url}">
              <i class="fas fa-copy"></i> Copy File Path
            </button>
            <button class="btn btn-outline" onclick="location.reload()">
              <i class="fas fa-refresh"></i> Retry
            </button>
          </div>
        </div>
      `;
    }
  }

  async generateDemoContent(resource) {
    // Generate demo content based on resource
    const contentMap = {
      "Spring Framework Fundamentals": `
# Spring Framework Fundamentals

## Introduction to Spring Framework

Spring Framework is a comprehensive programming and configuration model for modern Java-based enterprise applications. It provides a lightweight framework for developing Java applications.

### Key Features

1. **Dependency Injection (DI)**
   - Inversion of Control (IoC) container
   - Reduces coupling between components
   - Makes testing easier

2. **Aspect-Oriented Programming (AOP)**
   - Cross-cutting concerns
   - Separation of business logic and system services

3. **Spring MVC**
   - Model-View-Controller pattern
   - Web application development
   - RESTful web services

### Core Concepts

#### Beans and Bean Factory

Spring beans are objects that form the backbone of your application. The Spring IoC container manages these beans.

\`\`\`java
@Component
public class UserService {
    @Autowired
    private UserRepository userRepository;
    
    public User findUserById(Long id) {
        return userRepository.findById(id);
    }
}
\`\`\`

#### Configuration

Spring can be configured using:
- XML configuration
- Java-based configuration
- Annotation-based configuration

### Best Practices

1. Use constructor injection over field injection
2. Keep beans stateless when possible
3. Use profiles for environment-specific configuration

### Next Steps

After understanding these fundamentals, you should explore:
- Spring Boot for rapid application development
- Spring Data for database operations
- Spring Security for authentication and authorization

> **Practice Exercise**: Create a simple Spring application with dependency injection.
      `,
      "Web Development Rest Apis": `
# Web Development & REST APIs

## Building RESTful Web Services with Spring

REST (Representational State Transfer) is an architectural style for building web services that are scalable, stateless, and cacheable.

### REST Principles

1. **Stateless**: Each request contains all information needed
2. **Cacheable**: Responses should be cacheable when appropriate
3. **Uniform Interface**: Consistent API design
4. **Layered System**: Architecture can be composed of layers

### HTTP Methods

- **GET**: Retrieve data
- **POST**: Create new resources
- **PUT**: Update existing resources
- **DELETE**: Remove resources
- **PATCH**: Partial updates

### Building REST APIs with Spring Boot

\`\`\`java
@RestController
@RequestMapping("/api/users")
public class UserController {
    
    @Autowired
    private UserService userService;
    
    @GetMapping
    public List<User> getAllUsers() {
        return userService.findAll();
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        User user = userService.findById(id);
        return ResponseEntity.ok(user);
    }
    
    @PostMapping
    public ResponseEntity<User> createUser(@RequestBody User user) {
        User created = userService.save(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
\`\`\`

### API Design Best Practices

1. **Use proper HTTP status codes**
2. **Version your APIs**
3. **Implement proper error handling**
4. **Add validation**
5. **Document your APIs**

### Error Handling

\`\`\`java
@ExceptionHandler(UserNotFoundException.class)
public ResponseEntity<ErrorResponse> handleUserNotFound(UserNotFoundException ex) {
    ErrorResponse error = new ErrorResponse("USER_NOT_FOUND", ex.getMessage());
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
}
\`\`\`

> **Practice**: Build a complete CRUD API for a User management system.
      `,
    };

    return (
      contentMap[resource.title] ||
      `
# ${resource.title}

## Learning Content

This section covers important concepts in ${resource.title}.

### Overview

Welcome to the ${resource.title} learning module. This comprehensive guide will take you through all the essential concepts you need to master.

### Key Topics

1. **Fundamentals**: Core concepts and principles
2. **Implementation**: Practical examples and code
3. **Best Practices**: Industry standards and recommendations
4. **Advanced Topics**: Deep dive into complex scenarios

### Getting Started

Begin by understanding the basic concepts, then move on to practical implementation.

> **Note**: This is a demo content preview. The actual learning material is located at: ${resource.url}

### Practice Exercises

Try implementing the concepts you learn in your own projects.

### Additional Resources

- Documentation links
- Community resources  
- Practice platforms
    `
    );
  }

  renderMarkdownContent(content) {
    // Enhanced markdown renderer for better content display
    let html = content
      // Headers (order matters - h4 before h3, etc.)
      .replace(/^#### (.*$)/gim, "<h4>$1</h4>")
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")

      // Code blocks (must come before inline code)
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="code-block"><code class="language-$1">$2</code></pre>')
      .replace(/```([\s\S]*?)```/g, '<pre class="code-block"><code>$1</code></pre>')

      // Inline code
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')

      // Bold and italic (order matters)
      .replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")

      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')

      // Images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;" />')

      // Lists (improved handling)
      .replace(/^(\s*)- (.+)$/gim, "$1<li>$2</li>")
      .replace(/^(\s*)\d+\. (.+)$/gim, "$1<li>$2</li>")

      // Blockquotes
      .replace(/^> (.*$)/gim, "<blockquote>$1</blockquote>")

      // Horizontal rules
      .replace(/^---$/gim, "<hr>")
      .replace(/^\*\*\*$/gim, "<hr>")

      // Strikethrough
      .replace(/~~(.*?)~~/g, "<del>$1</del>")

      // Convert line breaks to proper paragraphs
      .split("\n\n")
      .map((paragraph) => {
        if (paragraph.trim()) {
          // Don't wrap headers, code blocks, lists, or other block elements in <p>
          if (paragraph.match(/^<(h[1-6]|pre|blockquote|ul|ol|li|hr)/)) {
            return paragraph;
          }
          return `<p>${paragraph.replace(/\n/g, "<br>")}</p>`;
        }
        return "";
      })
      .filter((p) => p)
      .join("\n\n");

    // Wrap consecutive list items in proper list containers
    html = html.replace(/(<li>.*?<\/li>(?:\s*<li>.*?<\/li>)*)/gs, (match) => {
      if (match.includes("<ol>") || match.includes("<ul>")) return match;
      return `<ul>${match}</ul>`;
    });

    return html;
  }

  updateNavigationButtons() {
    const prevBtn = document.getElementById("prev-resource-btn");
    const nextBtn = document.getElementById("next-resource-btn");

    prevBtn.disabled = this.currentResource.index === 0;
    nextBtn.disabled = this.currentResource.index === this.currentTopic.resources.length - 1;
  }

  navigateResource(direction) {
    const newIndex = this.currentResource.index + direction;
    if (newIndex >= 0 && newIndex < this.currentTopic.resources.length) {
      this.loadResource(newIndex);
    }
  }

  updateReadingProgress() {
    const viewer = document.getElementById("content-viewer");
    const scrollTop = viewer.scrollTop;
    const scrollHeight = viewer.scrollHeight - viewer.clientHeight;

    if (scrollHeight > 0) {
      this.readingProgress = Math.round((scrollTop / scrollHeight) * 100);
      document.getElementById("viewer-progress-bar").style.width = `${this.readingProgress}%`;
      document.getElementById("viewer-progress-text").textContent = `${this.readingProgress}% Complete`;
      document.getElementById("reading-percentage").textContent = `${this.readingProgress}%`;
    }
  }

  toggleNotesPanel() {
    const panel = document.getElementById("notes-panel");
    const isVisible = panel.style.display !== "none";
    panel.style.display = isVisible ? "none" : "block";
  }

  saveQuickNote() {
    const noteText = document.getElementById("quick-notes").value.trim();
    if (noteText) {
      const note = {
        id: Date.now(),
        content: noteText,
        resourceTitle: this.currentResource?.title || "General",
        timestamp: new Date().toLocaleString(),
        type: "quick",
      };
      this.userNotes.push(note);
      document.getElementById("quick-notes").value = "";
      this.ui.showToast("success", "Quick note saved!");
    }
  }

  saveDetailedNote() {
    const noteText = document.getElementById("note-editor").value.trim();
    if (noteText) {
      const note = {
        id: Date.now(),
        content: noteText,
        resourceTitle: this.currentResource?.title || "General",
        timestamp: new Date().toLocaleString(),
        type: "detailed",
      };
      this.userNotes.push(note);
      this.renderNotesList();
      document.getElementById("note-editor").value = "";
      this.ui.showToast("success", "Note saved!");
    }
  }

  renderNotesList() {
    const container = document.getElementById("notes-list");
    const resourceNotes = this.userNotes.filter((note) => note.resourceTitle === this.currentResource?.title);

    if (resourceNotes.length === 0) {
      container.innerHTML = '<p class="no-notes">No notes for this resource yet.</p>';
      return;
    }

    container.innerHTML = resourceNotes
      .map(
        (note) => `
      <div class="note-item">
        <div class="note-header">
          <span class="note-timestamp">${note.timestamp}</span>
          <button class="note-delete" data-note-id="${note.id}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
        <div class="note-content">${note.content}</div>
      </div>
    `
      )
      .join("");
  }

  changeFontSize(size) {
    document.getElementById("content-viewer").style.fontSize = `${size}px`;
  }

  toggleFocusMode() {
    const modal = document.querySelector(".learning-viewer-modal");
    const focusBtn = document.getElementById("focus-mode-btn");

    if (!modal || !focusBtn) {
      console.warn("Focus mode elements not found");
      return;
    }

    const isInFocusMode = modal.classList.contains("focus-mode");

    if (isInFocusMode) {
      // Exit focus mode
      modal.classList.remove("focus-mode");
      focusBtn.innerHTML = '<i class="fas fa-eye"></i>';
      focusBtn.title = "Enter Focus Mode";
      focusBtn.classList.remove("active");
      this.ui.showToast("info", "Focus mode disabled");
      console.log("👁️ Focus mode: OFF");
    } else {
      // Enter focus mode
      modal.classList.add("focus-mode");
      focusBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
      focusBtn.title = "Exit Focus Mode";
      focusBtn.classList.add("active");
      this.ui.showToast("info", "Focus mode enabled - Press Esc to exit");
      console.log("🎯 Focus mode: ON");
    }
  }

  markResourceComplete() {
    if (this.currentResource) {
      // Mark resource as complete in UI
      const resourceItem = document.querySelector(`[data-index="${this.currentResource.index}"]`);
      resourceItem.querySelector(".fa-circle-check").style.display = "block";

      this.ui.showToast("success", `Completed: ${this.currentResource.title}`);

      // Auto-navigate to next resource
      if (this.currentResource.index < this.currentTopic.resources.length - 1) {
        setTimeout(() => {
          this.navigateResource(1);
        }, 1000);
      }
    }
  }

  startReadingTimer() {
    this.readingStartTime = Date.now();
    this.readingTimer = setInterval(() => {
      const elapsed = Date.now() - this.readingStartTime;
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      document.getElementById("reading-time").textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      document.getElementById("session-time").textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }, 1000);
  }

  async loadUserData() {
    // Load user notes and bookmarks for this topic
    // This would typically come from the API
    this.userNotes = [];
    this.bookmarks = [];
  }

  closeLearningViewer() {
    const modal = document.getElementById("learning-viewer-modal");
    if (modal) {
      modal.classList.remove("show");
      document.body.style.overflow = "";

      // Clear timer
      if (this.readingTimer) {
        clearInterval(this.readingTimer);
      }
    }
  }

  copyToClipboard(text) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        window.app.ui.showToast("success", "Path copied to clipboard!");
      })
      .catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        window.app.ui.showToast("success", "Path copied to clipboard!");
      });
  }

  deleteNote(noteId) {
    this.userNotes = this.userNotes.filter((note) => note.id !== noteId);
    this.renderNotesList();
    window.app.ui.showToast("success", "Note deleted");
  }

  toggleStudySession() {
    // Integration with study sessions
    console.log("Toggle study session for topic:", this.currentTopic.title);
  }

  // ========================================
  // BOOKMARK FUNCTIONALITY
  // ========================================

  async loadContentBookmarks() {
    if (!this.currentContentPath) return;

    try {
      const response = await this.api.get(`/bookmarks/content/${this.currentContentPath}`);
      this.contentBookmarks = response.bookmarks || [];
      this.renderBookmarkIndicators();
      this.renderBookmarksList();
    } catch (error) {
      console.error("Error loading bookmarks:", error);
      this.contentBookmarks = [];
    }
  }

  async createBookmark(location, selectedText = "") {
    if (!this.currentContentPath) {
      this.ui.showToast("error", "No content selected for bookmark");
      return;
    }

    // Get title from selected text or current section
    let title = selectedText.trim();
    if (!title) {
      const headings = document.querySelectorAll("#content-viewer h1, #content-viewer h2, #content-viewer h3");
      let nearestHeading = "";
      for (let heading of headings) {
        if (heading.offsetTop <= location.scrollPercentage) {
          nearestHeading = heading.textContent;
        }
      }
      title = nearestHeading || `Bookmark at ${Math.round(location.scrollPercentage)}%`;
    }

    // Limit title length
    if (title.length > 50) {
      title = title.substring(0, 47) + "...";
    }

    const bookmarkData = {
      contentPath: this.currentContentPath,
      title,
      description: selectedText.length > title.length ? selectedText.substring(0, 200) : "",
      location: {
        scrollPercentage: location.scrollPercentage,
        lineNumber: location.lineNumber,
        sectionHeading: location.sectionHeading,
        textSnippet: selectedText.substring(0, 100),
        characterOffset: location.characterOffset,
      },
      color: "yellow",
    };

    try {
      const response = await this.api.post("/bookmarks", bookmarkData);
      this.contentBookmarks.push(response.bookmark);
      this.renderBookmarkIndicators();
      this.renderBookmarksList();
      this.ui.showToast("success", "Bookmark created successfully");
    } catch (error) {
      console.error("Error creating bookmark:", error);
      if (error.response?.data?.code === "DUPLICATE_BOOKMARK") {
        this.ui.showToast("warning", "Bookmark already exists at this location");
      } else {
        this.ui.showToast("error", "Failed to create bookmark");
      }
    }
  }

  async deleteBookmark(bookmarkId) {
    try {
      await this.api.delete(`/bookmarks/${bookmarkId}`);
      this.contentBookmarks = this.contentBookmarks.filter((b) => b._id !== bookmarkId);
      this.renderBookmarkIndicators();
      this.renderBookmarksList();
      this.ui.showToast("success", "Bookmark deleted");
    } catch (error) {
      console.error("Error deleting bookmark:", error);
      this.ui.showToast("error", "Failed to delete bookmark");
    }
  }

  jumpToBookmark(bookmark) {
    const viewer = document.getElementById("content-viewer");
    if (!viewer) return;

    // Update last accessed time
    this.api.post(`/bookmarks/${bookmark._id}/access`).catch((err) => console.warn("Failed to update bookmark access time:", err));

    // Jump to location based on available data
    if (bookmark.location.scrollPercentage !== undefined) {
      const scrollTop = (bookmark.location.scrollPercentage / 100) * viewer.scrollHeight;
      viewer.scrollTo({ top: scrollTop, behavior: "smooth" });
    } else if (bookmark.location.sectionHeading) {
      const heading = Array.from(viewer.querySelectorAll("h1, h2, h3, h4")).find((h) => h.textContent.includes(bookmark.location.sectionHeading));
      if (heading) {
        heading.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else if (bookmark.location.lineNumber) {
      // Estimate position based on line number
      const lines = viewer.textContent.split("\n");
      const estimatedPercentage = (bookmark.location.lineNumber / lines.length) * 100;
      const scrollTop = (estimatedPercentage / 100) * viewer.scrollHeight;
      viewer.scrollTo({ top: scrollTop, behavior: "smooth" });
    }

    // Highlight the bookmark temporarily
    this.highlightBookmarkLocation(bookmark);
  }

  highlightBookmarkLocation(bookmark) {
    // Find and highlight the bookmarked content
    const viewer = document.getElementById("content-viewer");
    if (!viewer || !bookmark.location.textSnippet) return;

    const textContent = viewer.textContent;
    const snippetIndex = textContent.indexOf(bookmark.location.textSnippet);

    if (snippetIndex !== -1) {
      // Create a temporary highlight
      const range = document.createRange();
      const walker = document.createTreeWalker(viewer, NodeFilter.SHOW_TEXT, null, false);

      let charCount = 0;
      let startNode = null;
      let startOffset = 0;

      // Find the start position
      while (walker.nextNode()) {
        const nodeLength = walker.currentNode.textContent.length;
        if (charCount + nodeLength >= snippetIndex) {
          startNode = walker.currentNode;
          startOffset = snippetIndex - charCount;
          break;
        }
        charCount += nodeLength;
      }

      if (startNode) {
        const highlight = document.createElement("mark");
        highlight.className = "bookmark-highlight";
        highlight.style.backgroundColor = `var(--${bookmark.color}-highlight, #ffeb3b)`;
        highlight.style.animation = "bookmarkPulse 2s ease-in-out";

        range.setStart(startNode, startOffset);
        range.setEnd(startNode, Math.min(startOffset + bookmark.location.textSnippet.length, startNode.textContent.length));

        try {
          range.surroundContents(highlight);

          // Remove highlight after animation
          setTimeout(() => {
            if (highlight.parentNode) {
              highlight.replaceWith(...highlight.childNodes);
            }
          }, 2000);
        } catch (e) {
          console.warn("Could not highlight bookmark location:", e);
        }
      }
    }
  }

  renderBookmarkIndicators() {
    // Remove existing indicators
    document.querySelectorAll(".bookmark-indicator").forEach((el) => el.remove());

    const viewer = document.getElementById("content-viewer");
    if (!viewer || !this.contentBookmarks.length) return;

    // Add bookmark indicators in the scrollbar area
    const scrollbar = document.getElementById("viewer-scrollbar");
    if (!scrollbar) return;

    this.contentBookmarks.forEach((bookmark) => {
      if (bookmark.location.scrollPercentage !== undefined) {
        const indicator = document.createElement("div");
        indicator.className = "bookmark-indicator";
        indicator.style.position = "absolute";
        indicator.style.right = "2px";
        indicator.style.top = `${bookmark.location.scrollPercentage}%`;
        indicator.style.width = "6px";
        indicator.style.height = "12px";
        indicator.style.backgroundColor = `var(--${bookmark.color}-color, #ffeb3b)`;
        indicator.style.borderRadius = "3px";
        indicator.style.cursor = "pointer";
        indicator.style.zIndex = "1000";
        indicator.style.boxShadow = "0 1px 3px rgba(0,0,0,0.3)";
        indicator.title = bookmark.title;

        indicator.addEventListener("click", () => {
          this.jumpToBookmark(bookmark);
        });

        scrollbar.appendChild(indicator);
      }
    });
  }

  renderBookmarksList() {
    const container = document.getElementById("bookmarks-list");
    if (!container) return;

    if (this.contentBookmarks.length === 0) {
      container.innerHTML = `
        <div class="empty-bookmarks">
          <i class="fas fa-bookmark"></i>
          <p>No bookmarks yet</p>
          <small>Select text and click the bookmark button to create one</small>
        </div>
      `;
      return;
    }

    const html = this.contentBookmarks
      .map(
        (bookmark) => `
      <div class="bookmark-item" data-bookmark-id="${bookmark._id}">
        <div class="bookmark-color" style="background-color: var(--${bookmark.color}-color, #ffeb3b)"></div>
        <div class="bookmark-content">
          <div class="bookmark-title">${bookmark.title}</div>
          <div class="bookmark-meta">
            ${bookmark.location.scrollPercentage !== undefined ? `<span class="bookmark-position">${Math.round(bookmark.location.scrollPercentage)}%</span>` : ""}
            <span class="bookmark-date">${new Date(bookmark.createdAt).toLocaleDateString()}</span>
          </div>
          ${bookmark.description ? `<div class="bookmark-description">${bookmark.description}</div>` : ""}
        </div>
        <div class="bookmark-actions">
          <button class="bookmark-action-btn" data-action="jump" title="Jump to bookmark">
            <i class="fas fa-arrow-right"></i>
          </button>
          <button class="bookmark-action-btn" data-action="delete" title="Delete bookmark">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `
      )
      .join("");

    container.innerHTML = html;
  }

  toggleBookmarkMode() {
    this.isBookmarkMode = !this.isBookmarkMode;
    const viewer = document.getElementById("content-viewer");
    const button = document.getElementById("bookmark-mode-btn");

    if (this.isBookmarkMode) {
      viewer.classList.add("bookmark-mode");
      button.classList.add("active");
      button.innerHTML = '<i class="fas fa-bookmark-slash"></i>';
      this.ui.showToast("info", "Bookmark mode: Select text and click to create bookmark");
    } else {
      viewer.classList.remove("bookmark-mode");
      button.classList.remove("active");
      button.innerHTML = '<i class="fas fa-bookmark"></i>';
    }
  }

  getCurrentLocation() {
    const viewer = document.getElementById("content-viewer");
    if (!viewer) return null;

    const scrollPercentage = (viewer.scrollTop / (viewer.scrollHeight - viewer.clientHeight)) * 100;

    // Try to find current section
    const headings = Array.from(viewer.querySelectorAll("h1, h2, h3, h4"));
    let currentSection = "";
    let lineNumber = 1;

    for (let heading of headings) {
      if (heading.offsetTop <= viewer.scrollTop + 100) {
        currentSection = heading.textContent;
      }
    }

    // Estimate line number based on scroll position
    const textLines = viewer.textContent.split("\n");
    lineNumber = Math.round((scrollPercentage / 100) * textLines.length);

    return {
      scrollPercentage: Math.max(0, Math.min(100, scrollPercentage)),
      sectionHeading: currentSection,
      lineNumber: Math.max(1, lineNumber),
      characterOffset: Math.round((scrollPercentage / 100) * viewer.textContent.length),
    };
  }

  handleTextSelection() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && !selection.isCollapsed) {
      this.selectedText = selection.toString().trim();

      if (this.isBookmarkMode && this.selectedText.length > 0) {
        const location = this.getCurrentLocation();
        if (location) {
          this.createBookmark(location, this.selectedText);
          selection.removeAllRanges(); // Clear selection
          this.toggleBookmarkMode(); // Exit bookmark mode
        }
      }
    }
  }

  toggleBookmark() {
    if (this.isBookmarkMode) {
      // If in bookmark mode, create bookmark at current location
      const location = this.getCurrentLocation();
      if (location) {
        this.createBookmark(location, this.selectedText || "");
        this.toggleBookmarkMode();
      }
    } else {
      // Enter bookmark mode
      this.toggleBookmarkMode();
    }
  }
}
