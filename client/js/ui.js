// UI utilities module
export class UI {
  constructor() {
    this.toastContainer = null;
    this.loadingStates = new Set();
    this.init();
  }

  init() {
    this.createToastContainer();
  }

  createToastContainer() {
    if (!this.toastContainer) {
      this.toastContainer = document.getElementById("toast-container");
      if (!this.toastContainer) {
        this.toastContainer = document.createElement("div");
        this.toastContainer.id = "toast-container";
        this.toastContainer.className = "toast-container";
        document.body.appendChild(this.toastContainer);
      }
    }
  }

  showToast(type, message, title = null, duration = 5000) {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const icons = {
      success: "fas fa-check-circle",
      error: "fas fa-exclamation-circle",
      warning: "fas fa-exclamation-triangle",
      info: "fas fa-info-circle",
    };

    toast.innerHTML = `
      <div class="toast-icon">
        <i class="${icons[type] || icons.info}"></i>
      </div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ""}
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close">
        <i class="fas fa-times"></i>
      </button>
    `;

    // Add close functionality
    const closeBtn = toast.querySelector(".toast-close");
    closeBtn.addEventListener("click", () => {
      this.removeToast(toast);
    });

    // Add to container
    this.toastContainer.appendChild(toast);

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.removeToast(toast);
      }, duration);
    }

    return toast;
  }

  removeToast(toast) {
    if (toast && toast.parentNode) {
      toast.classList.add("removing");
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }
  }

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("show");
      document.body.style.overflow = "hidden";
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("show");
      document.body.style.overflow = "";
    }
  }

  setLoading(isLoading, elementId = null) {
    if (elementId) {
      const element = document.getElementById(elementId);
      if (element) {
        if (isLoading) {
          element.classList.add("loading");
          this.loadingStates.add(elementId);
        } else {
          element.classList.remove("loading");
          this.loadingStates.delete(elementId);
        }
      }
    } else {
      // Global loading state
      const loadingScreen = document.getElementById("loading-screen");
      if (loadingScreen) {
        if (isLoading) {
          loadingScreen.classList.remove("hidden");
        } else {
          loadingScreen.classList.add("hidden");
        }
      }
    }
  }

  createSkeleton(count = 3) {
    const container = document.createElement("div");
    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement("div");
      skeleton.className = "skeleton skeleton-card";
      container.appendChild(skeleton);
    }
    return container;
  }

  formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  formatDate(date, options = {}) {
    const defaultOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };

    return new Date(date).toLocaleDateString("en-US", { ...defaultOptions, ...options });
  }

  formatRelativeTime(date) {
    const now = new Date();
    const diffTime = Math.abs(now - new Date(date));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }

  createProgressBar(progress, className = "") {
    const progressBar = document.createElement("div");
    progressBar.className = `progress-bar ${className}`;

    const progressFill = document.createElement("div");
    progressFill.className = "progress-fill";
    progressFill.style.width = `${Math.min(100, Math.max(0, progress))}%`;

    progressBar.appendChild(progressFill);
    return progressBar;
  }

  createBadge(text, type = "primary") {
    const badge = document.createElement("span");
    badge.className = `badge badge-${type}`;
    badge.textContent = text;
    return badge;
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  throttle(func, limit) {
    let inThrottle;
    return function () {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  animate(element, animation, duration = 300) {
    return new Promise((resolve) => {
      element.style.animation = `${animation} ${duration}ms ease-in-out`;

      const handleAnimationEnd = () => {
        element.style.animation = "";
        element.removeEventListener("animationend", handleAnimationEnd);
        resolve();
      };

      element.addEventListener("animationend", handleAnimationEnd);
    });
  }

  scrollToTop(smooth = true) {
    window.scrollTo({
      top: 0,
      behavior: smooth ? "smooth" : "auto",
    });
  }

  copyToClipboard(text) {
    if (navigator.clipboard) {
      return navigator.clipboard.writeText(text).then(() => {
        this.showToast("success", "Copied to clipboard");
      });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      this.showToast("success", "Copied to clipboard");
    }
  }

  // Validation utilities
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePassword(password) {
    return password.length >= 6;
  }

  // Storage utilities
  getFromStorage(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error("Error getting from storage:", error);
      return defaultValue;
    }
  }

  setToStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Error setting to storage:", error);
    }
  }

  removeFromStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error("Error removing from storage:", error);
    }
  }
}
