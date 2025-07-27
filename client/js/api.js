// API Client for backend communication
export class API {
  constructor() {
    this.baseURL = this.getBaseURL();
    this.authToken = null;
    this.defaultHeaders = {
      "Content-Type": "application/json",
    };
  }

  getBaseURL() {
    // In production, this would be your API domain
    // For development, use the same domain as the frontend
    return window.location.origin;
  }

  setAuthToken(token) {
    this.authToken = token;
  }

  getHeaders(customHeaders = {}) {
    const headers = { ...this.defaultHeaders, ...customHeaders };

    if (this.authToken) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}/api${endpoint}`;
    const config = {
      headers: this.getHeaders(options.headers),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new APIError(data.message || "Request failed", response.status, data.code);
      }

      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }

      // Network or other errors
      throw new APIError("Network error or server unavailable", 0, "NETWORK_ERROR");
    }
  }

  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;

    return this.request(url, {
      method: "GET",
    });
  }

  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, {
      method: "DELETE",
    });
  }

  async patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // File upload with FormData
  async uploadFile(endpoint, formData) {
    return this.request(endpoint, {
      method: "POST",
      body: formData,
      headers: {}, // Don't set Content-Type for FormData
    });
  }

  // Authentication methods
  async login(credentials) {
    const response = await this.post("/auth/login", credentials);
    if (response.token) {
      this.setAuthToken(response.token);
    }
    return response;
  }

  async register(userData) {
    const response = await this.post("/auth/register", userData);
    if (response.token) {
      this.setAuthToken(response.token);
    }
    return response;
  }

  async logout() {
    try {
      await this.post("/auth/logout");
    } finally {
      this.setAuthToken(null);
    }
  }

  async refreshToken() {
    const response = await this.post("/auth/refresh-token");
    if (response.token) {
      this.setAuthToken(response.token);
    }
    return response;
  }

  // User methods
  async getCurrentUser() {
    return this.get("/auth/me");
  }

  async updateProfile(profileData) {
    return this.put("/auth/profile", profileData);
  }

  async updateSettings(settingsData) {
    return this.put("/auth/settings", settingsData);
  }

  async changePassword(passwordData) {
    return this.post("/auth/change-password", passwordData);
  }

  // Topics methods
  async getTopics(params = {}) {
    return this.get("/topics", params);
  }

  async getTopic(id) {
    return this.get(`/topics/${id}`);
  }

  async createTopic(topicData) {
    return this.post("/topics", topicData);
  }

  async updateTopic(id, topicData) {
    return this.put(`/topics/${id}`, topicData);
  }

  async deleteTopic(id) {
    return this.delete(`/topics/${id}`);
  }

  async updateTopicProgress(id, progressData) {
    return this.post(`/topics/${id}/progress`, progressData);
  }

  async toggleBookmark(id) {
    return this.post(`/topics/${id}/bookmark`);
  }

  async getUserTopicProgress(params = {}) {
    return this.get("/topics/user/progress", params);
  }

  async getBookmarkedTopics() {
    return this.get("/topics/user/bookmarks");
  }

  async getTopicStats() {
    return this.get("/topics/user/stats");
  }

  async getTopicCategories() {
    return this.get("/topics/categories");
  }

  // Sessions methods
  async getSessions(params = {}) {
    return this.get("/sessions", params);
  }

  async getTodaySessions() {
    return this.get("/sessions/today");
  }

  async getActiveSession() {
    return this.get("/sessions/active");
  }

  async createSession(sessionData) {
    return this.post("/sessions", sessionData);
  }

  async getSession(id) {
    return this.get(`/sessions/${id}`);
  }

  async updateSession(id, sessionData) {
    return this.put(`/sessions/${id}`, sessionData);
  }

  async deleteSession(id) {
    return this.delete(`/sessions/${id}`);
  }

  async startSession(id) {
    return this.put(`/sessions/${id}/start`);
  }

  async pauseSession(id) {
    return this.put(`/sessions/${id}/pause`);
  }

  async resumeSession(id, pauseDuration = 0) {
    return this.put(`/sessions/${id}/resume`, { pauseDuration });
  }

  async completeSession(id, sessionData = {}) {
    return this.put(`/sessions/${id}/complete`, sessionData);
  }

  async cancelSession(id, reason = "") {
    return this.put(`/sessions/${id}/cancel`, { reason });
  }

  async addBreak(id, breakData) {
    return this.post(`/sessions/${id}/break`, breakData);
  }

  async getSessionStats(params = {}) {
    return this.get("/sessions/stats", params);
  }

  // Goals methods
  async getGoals(params = {}) {
    return this.get("/goals", params);
  }

  async getActiveGoals(type = null) {
    const params = type ? { type } : {};
    return this.get("/goals/active", params);
  }

  async createGoal(goalData) {
    return this.post("/goals", goalData);
  }

  async getGoal(id) {
    return this.get(`/goals/${id}`);
  }

  async updateGoal(id, goalData) {
    return this.put(`/goals/${id}`, goalData);
  }

  async deleteGoal(id) {
    return this.delete(`/goals/${id}`);
  }

  async updateGoalProgress(id, value, operation = "add") {
    return this.put(`/goals/${id}/progress`, { value, operation });
  }

  async updateGoalStatus(id, status) {
    return this.put(`/goals/${id}/status`, { status });
  }

  async addMilestone(id, milestoneData) {
    return this.post(`/goals/${id}/milestones`, milestoneData);
  }

  async updateMilestone(goalId, milestoneId, completed) {
    return this.put(`/goals/${goalId}/milestones/${milestoneId}`, { completed });
  }

  async resetGoal(id) {
    return this.post(`/goals/${id}/reset`);
  }

  async getGoalStats(params = {}) {
    return this.get("/goals/stats", params);
  }

  async getGoalTemplates() {
    return this.get("/goals/templates");
  }

  // Analytics methods
  async getDashboardAnalytics() {
    return this.get("/analytics/dashboard");
  }

  async getProgressAnalytics(timeframe = "30d") {
    return this.get("/analytics/progress", { timeframe });
  }

  async getTimeAnalytics(days = 30) {
    return this.get("/analytics/time", { days });
  }

  async getGoalAnalytics() {
    return this.get("/analytics/goals");
  }

  async getAnalyticsSummary(period = "month") {
    return this.get("/analytics/summary", { period });
  }

  // Users methods
  async getUserProfile(username) {
    return this.get(`/users/profile/${username}`);
  }

  async getLeaderboard(type = "hours", limit = 10) {
    return this.get("/users/leaderboard", { type, limit });
  }

  async searchUsers(query, limit = 10) {
    return this.get("/users/search", { q: query, limit });
  }

  // Health check
  async healthCheck() {
    return this.get("/health");
  }
}

// Custom API Error class
export class APIError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.code = code;
  }

  isNetworkError() {
    return this.status === 0;
  }

  isClientError() {
    return this.status >= 400 && this.status < 500;
  }

  isServerError() {
    return this.status >= 500;
  }

  isAuthError() {
    return this.status === 401 || this.code === "TOKEN_EXPIRED";
  }
}
