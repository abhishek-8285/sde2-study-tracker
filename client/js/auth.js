// Authentication module
export class Auth {
  constructor(api, ui) {
    this.api = api;
    this.ui = ui;
    this.isInitialized = false;
  }

  init() {
    this.setupEventListeners();
    this.isInitialized = true;
  }

  setupEventListeners() {
    // Login form
    const loginForm = document.getElementById("login-form-element");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => this.handleLogin(e));
    }

    // Register form
    const registerForm = document.getElementById("register-form-element");
    if (registerForm) {
      registerForm.addEventListener("submit", (e) => this.handleRegister(e));
    }

    // Form switching
    const showRegisterBtn = document.getElementById("show-register");
    const showLoginBtn = document.getElementById("show-login");

    if (showRegisterBtn) {
      showRegisterBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.showRegisterForm();
      });
    }

    if (showLoginBtn) {
      showLoginBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.showLoginForm();
      });
    }

    // Close auth modal
    const closeAuthBtn = document.getElementById("close-auth");
    if (closeAuthBtn) {
      closeAuthBtn.addEventListener("click", () => {
        this.hide();
      });
    }
  }

  async handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
      this.ui.showToast("error", "Please fill in all fields");
      return;
    }

    try {
      this.ui.setLoading(true);
      const response = await this.api.login({ email, password });

      if (response.token && response.user) {
        // Store token
        localStorage.setItem("authToken", response.token);
        this.api.setAuthToken(response.token);

        // Notify main app
        if (window.app && window.app.onAuthSuccess) {
          await window.app.onAuthSuccess(response.user, response.token);
        }

        this.hide();
      }
    } catch (error) {
      console.error("Login error:", error);
      this.ui.showToast("error", error.message || "Login failed");
    } finally {
      this.ui.setLoading(false);
    }
  }

  async handleRegister(e) {
    e.preventDefault();

    const username = document.getElementById("register-username").value;
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;
    const firstName = document.getElementById("register-firstname").value;
    const lastName = document.getElementById("register-lastname").value;

    if (!username || !email || !password) {
      this.ui.showToast("error", "Please fill in all required fields");
      return;
    }

    if (password.length < 6) {
      this.ui.showToast("error", "Password must be at least 6 characters");
      return;
    }

    try {
      this.ui.setLoading(true);
      const response = await this.api.register({
        username,
        email,
        password,
        firstName,
        lastName,
      });

      if (response.token && response.user) {
        // Store token
        localStorage.setItem("authToken", response.token);
        this.api.setAuthToken(response.token);

        // Notify main app
        if (window.app && window.app.onAuthSuccess) {
          await window.app.onAuthSuccess(response.user, response.token);
        }

        this.hide();
      }
    } catch (error) {
      console.error("Registration error:", error);
      this.ui.showToast("error", error.message || "Registration failed");
    } finally {
      this.ui.setLoading(false);
    }
  }

  showLoginForm() {
    document.getElementById("login-form").classList.add("active");
    document.getElementById("register-form").classList.remove("active");
  }

  showRegisterForm() {
    document.getElementById("login-form").classList.remove("active");
    document.getElementById("register-form").classList.add("active");
  }

  show() {
    const authModal = document.getElementById("auth-modal");
    if (authModal) {
      authModal.classList.add("show");
      this.showLoginForm(); // Default to login form
    }
  }

  hide() {
    const authModal = document.getElementById("auth-modal");
    if (authModal) {
      authModal.classList.remove("show");
    }
  }
}
