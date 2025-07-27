// Main application entry point
import { API } from "./api.js";
import { Auth } from "./auth.js";
import { Dashboard } from "./dashboard.js";
import { Topics } from "./topics.js";
import { Sessions } from "./sessions.js";
import { Goals } from "./goals.js";
import { Analytics } from "./analytics.js";
import { UI } from "./ui.js";
import { Socket } from "./socket.js";

class StudyTrackerApp {
  constructor() {
    this.currentUser = null;
    this.currentTab = "dashboard";
    this.modules = {};

    this.init();
  }

  async init() {
    try {
      // Initialize UI utilities first
      this.ui = new UI();

      // Initialize API client
      this.api = new API();

      // Initialize Socket.IO connection
      this.socket = new Socket();

      // Initialize authentication
      this.auth = new Auth(this.api, this.ui);

      // Check if user is already logged in
      const token = localStorage.getItem("authToken");
      if (token) {
        try {
          this.api.setAuthToken(token);
          const userData = await this.api.get("/auth/me");
          this.currentUser = userData.user;
          this.showApp();
        } catch (error) {
          console.log("Token invalid, showing login");
          localStorage.removeItem("authToken");
          this.showAuth();
        }
      } else {
        this.showAuth();
      }

      // Set up event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error("App initialization error:", error);
      this.ui.showToast("error", "Failed to initialize application");
    }
  }

  setupEventListeners() {
    // Navigation
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab(tab);
      });
    });

    // User menu
    const userMenuBtn = document.getElementById("user-menu-btn");
    const userDropdown = document.getElementById("user-dropdown");

    if (userMenuBtn && userDropdown) {
      userMenuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle("show");
      });

      document.addEventListener("click", () => {
        userDropdown.classList.remove("show");
      });
    }

    // Logout
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.logout();
      });
    }

    // Modal close on background click
    document.querySelectorAll(".modal").forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          this.ui.closeModal(modal.id);
        }
      });
    });

    // Global keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      // Escape to close modals
      if (e.key === "Escape") {
        const openModal = document.querySelector(".modal.show");
        if (openModal) {
          this.ui.closeModal(openModal.id);
        }
      }

      // Ctrl/Cmd + shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "1":
            e.preventDefault();
            this.switchTab("dashboard");
            break;
          case "2":
            e.preventDefault();
            this.switchTab("topics");
            break;
          case "3":
            e.preventDefault();
            this.switchTab("sessions");
            break;
          case "4":
            e.preventDefault();
            this.switchTab("goals");
            break;
          case "5":
            e.preventDefault();
            this.switchTab("analytics");
            break;
        }
      }
    });
  }

  showAuth() {
    document.getElementById("loading-screen").classList.add("hidden");
    document.getElementById("app").classList.add("hidden");

    if (!this.auth.isInitialized) {
      this.auth.init();
    }

    this.auth.show();
  }

  async showApp() {
    try {
      document.getElementById("loading-screen").classList.add("hidden");
      document.getElementById("auth-modal").classList.remove("show");
      document.getElementById("app").classList.remove("hidden");

      // Initialize modules if not already done
      await this.initializeModules();

      // Update user info in header
      this.updateUserInfo();

      // Connect socket with auth token
      this.socket.connect(localStorage.getItem("authToken"));

      // Load initial data for current tab
      await this.switchTab(this.currentTab);
    } catch (error) {
      console.error("Error showing app:", error);
      this.ui.showToast("error", "Failed to load application");
    }
  }

  async initializeModules() {
    if (Object.keys(this.modules).length > 0) return;

    try {
      // Initialize all modules
      this.modules.dashboard = new Dashboard(this.api, this.ui, this.socket);
      this.modules.topics = new Topics(this.api, this.ui);
      this.modules.sessions = new Sessions(this.api, this.ui, this.socket);
      this.modules.goals = new Goals(this.api, this.ui);
      this.modules.analytics = new Analytics(this.api, this.ui);

      // Initialize each module
      await Promise.all([this.modules.dashboard.init(), this.modules.topics.init(), this.modules.sessions.init(), this.modules.goals.init(), this.modules.analytics.init()]);
    } catch (error) {
      console.error("Module initialization error:", error);
      throw error;
    }
  }

  updateUserInfo() {
    if (!this.currentUser) return;

    const userNameEl = document.getElementById("user-name");
    const userAvatarEl = document.getElementById("user-avatar-img");

    if (userNameEl) {
      const displayName = this.currentUser.profile.firstName || this.currentUser.username;
      userNameEl.textContent = displayName;
    }

    if (userAvatarEl && this.currentUser.profile.avatar) {
      userAvatarEl.src = this.currentUser.profile.avatar;
    }
  }

  async switchTab(tabName) {
    try {
      // Update navigation
      document.querySelectorAll(".nav-btn").forEach((btn) => {
        btn.classList.remove("active");
      });
      document.querySelector(`[data-tab="${tabName}"]`)?.classList.add("active");

      // Update tab content
      document.querySelectorAll(".tab-content").forEach((content) => {
        content.classList.remove("active");
      });
      document.getElementById(`${tabName}-tab`)?.classList.add("active");

      this.currentTab = tabName;

      // Load module data
      if (this.modules[tabName]) {
        await this.modules[tabName].load();
      }
    } catch (error) {
      console.error(`Error switching to ${tabName} tab:`, error);
      this.ui.showToast("error", `Failed to load ${tabName} tab`);
    }
  }

  async logout() {
    try {
      await this.api.post("/auth/logout");
    } catch (error) {
      console.log("Logout error (ignored):", error);
    } finally {
      // Clear local data
      localStorage.removeItem("authToken");
      this.api.setAuthToken(null);
      this.currentUser = null;
      this.modules = {};

      // Disconnect socket
      this.socket.disconnect();

      // Show auth screen
      this.showAuth();

      this.ui.showToast("success", "Logged out successfully");
    }
  }

  // Public methods for modules to access
  getCurrentUser() {
    return this.currentUser;
  }

  getModule(name) {
    return this.modules[name];
  }

  // Method to handle authentication success
  async onAuthSuccess(user, token) {
    this.currentUser = user;
    localStorage.setItem("authToken", token);
    this.api.setAuthToken(token);

    await this.showApp();
    this.ui.showToast("success", `Welcome back, ${user.profile.firstName || user.username}!`);
  }
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Hide loading screen after a minimum time to prevent flashing
  setTimeout(() => {
    window.app = new StudyTrackerApp();
  }, 500);
});

// Global error handler
window.addEventListener("error", (event) => {
  console.error("Global error:", event.error);

  if (window.app && window.app.ui) {
    window.app.ui.showToast("error", "An unexpected error occurred");
  }
});

// Global unhandled promise rejection handler
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);

  if (window.app && window.app.ui) {
    window.app.ui.showToast("error", "An unexpected error occurred");
  }
});

// Service Worker registration for PWA capabilities
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered: ", registration);
      })
      .catch((registrationError) => {
        console.log("SW registration failed: ", registrationError);
      });
  });
}

export { StudyTrackerApp };
