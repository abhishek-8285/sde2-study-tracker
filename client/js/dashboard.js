// Dashboard module
export class Dashboard {
  constructor(api, ui, socket) {
    this.api = api;
    this.ui = ui;
    this.socket = socket;
    this.chart = null;
    this.refreshInterval = null;
  }

  async init() {
    this.setupEventListeners();
    this.setupSocketListeners();
  }

  setupEventListeners() {
    // Start session button
    const startSessionBtn = document.getElementById("start-session-btn");
    if (startSessionBtn) {
      startSessionBtn.addEventListener("click", () => this.showSessionModal());
    }

    // Add goal button
    const addGoalBtn = document.getElementById("add-goal-btn");
    if (addGoalBtn) {
      addGoalBtn.addEventListener("click", () => this.showGoalModal());
    }

    // Chart timeframe selector
    const chartTimeframe = document.getElementById("chart-timeframe");
    if (chartTimeframe) {
      chartTimeframe.addEventListener("change", () => this.updateChart());
    }
  }

  setupSocketListeners() {
    if (this.socket) {
      this.socket.on("session_started", () => this.refreshDashboard());
      this.socket.on("session_completed", () => this.refreshDashboard());
      this.socket.on("progress_updated", () => this.refreshDashboard());
    }
  }

  async load() {
    console.log("📊 Starting dashboard load...");
    try {
      await this.loadDashboardData();
      console.log("✅ Dashboard data loaded successfully");
      this.startAutoRefresh();
      console.log("✅ Dashboard auto-refresh started");
    } catch (error) {
      console.error("❌ Dashboard load error:", error);
      console.error("📊 Dashboard error details:", {
        message: error.message,
        stack: error.stack,
      });
      this.ui.showToast("error", "Failed to load dashboard data");
    }
  }

  async loadDashboardData() {
    console.log("📡 Loading dashboard data from API...");
    try {
      const data = await this.api.getDashboardAnalytics();
      console.log("✅ Dashboard API response received:", data);

      this.updateStats(data.user);
      this.updateTodayData(data.today);
      this.updateActiveSession(data.today.activeSession);
      this.updateGoals(data.goals.active);
      this.updateRecentActivity(data.recentActivity);
      this.updateChart();
      console.log("✅ Dashboard UI updated successfully");
    } catch (error) {
      // Fallback to demo data if API fails
      console.warn("⚠️ Dashboard API failed, using demo data:", error.message);
      this.loadDemoData();
    }
  }

  updateStats(userData) {
    const elements = {
      "total-hours": Math.round(userData.totalStudyHours || 0),
      "current-streak": userData.currentStreak || 0,
      "completed-topics": userData.completedTopics || 0,
      "active-goals": userData.totalSessions || 0,
    };

    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        this.animateCounter(element, value);
      }
    });
  }

  updateTodayData(todayData) {
    // Update today's study time if needed
    if (todayData.studyTime) {
      const timeElement = document.querySelector(".today-study-time");
      if (timeElement) {
        timeElement.textContent = this.ui.formatTime(todayData.studyTime);
      }
    }
  }

  updateActiveSession(activeSession) {
    const container = document.getElementById("session-container");
    if (!container) return;

    if (activeSession) {
      container.innerHTML = this.renderActiveSession(activeSession);
      this.setupSessionControls(activeSession);
    } else {
      container.innerHTML = this.renderNoSession();
    }
  }

  renderActiveSession(session) {
    const timeElapsed = session.timeElapsed || 0;
    const formattedTime = this.ui.formatTime(timeElapsed);

    return `
      <div class="session-progress">
        <div class="session-topic">${session.topicTitle || "Study Session"}</div>
        <div class="session-status">
          <div class="status-indicator ${session.status}"></div>
          <span>${session.status === "active" ? "In Progress" : "Paused"}</span>
        </div>
        <div class="timer-display">${formattedTime}</div>
        <div class="timer-controls">
          ${session.status === "active" ? '<button class="btn btn-warning pause-btn">⏸️ Pause</button>' : '<button class="btn btn-success resume-btn">▶️ Resume</button>'}
          <button class="btn btn-success complete-btn">✅ Complete</button>
          <button class="btn btn-outline cancel-btn">❌ Cancel</button>
        </div>
      </div>
    `;
  }

  renderNoSession() {
    return `
      <div class="no-session">
        <i class="fas fa-clock"></i>
        <p>No active session</p>
        <p class="text-muted">Start a focused study session to track your progress</p>
      </div>
    `;
  }

  setupSessionControls(session) {
    const container = document.getElementById("session-container");

    // Pause button
    const pauseBtn = container.querySelector(".pause-btn");
    if (pauseBtn) {
      pauseBtn.addEventListener("click", () => this.pauseSession(session._id));
    }

    // Resume button
    const resumeBtn = container.querySelector(".resume-btn");
    if (resumeBtn) {
      resumeBtn.addEventListener("click", () => this.resumeSession(session._id));
    }

    // Complete button
    const completeBtn = container.querySelector(".complete-btn");
    if (completeBtn) {
      completeBtn.addEventListener("click", () => this.completeSession(session._id));
    }

    // Cancel button
    const cancelBtn = container.querySelector(".cancel-btn");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => this.cancelSession(session._id));
    }
  }

  updateGoals(goals) {
    const container = document.getElementById("today-goals");
    if (!container) return;

    if (goals && goals.length > 0) {
      container.innerHTML = goals.map((goal) => this.renderGoalCard(goal)).join("");
    } else {
      container.innerHTML = `
        <div class="no-data">
          <i class="fas fa-target"></i>
          <p>No active goals</p>
          <p class="text-muted">Create your first goal to stay motivated</p>
        </div>
      `;
    }
  }

  renderGoalCard(goal) {
    return `
      <div class="goal-card" data-goal-id="${goal._id}">
        <div class="goal-header">
          <div class="goal-title">${goal.title}</div>
          <div class="goal-value">${goal.currentValue}/${goal.targetValue}</div>
        </div>
        <div class="goal-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${goal.progressPercentage}%"></div>
          </div>
          <small>${goal.progressPercentage}% complete</small>
        </div>
        <div class="goal-meta">
          <span>⏰ ${goal.daysRemaining} days left</span>
          <span>📊 ${goal.unit}</span>
        </div>
      </div>
    `;
  }

  updateRecentActivity(activities) {
    const container = document.getElementById("recent-activity");
    if (!container) return;

    if (activities && activities.length > 0) {
      container.innerHTML = `
        <div class="activity-feed">
          ${activities.map((activity) => this.renderActivityItem(activity)).join("")}
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="no-data">
          <i class="fas fa-history"></i>
          <p>No recent activity</p>
          <p class="text-muted">Your study progress will appear here</p>
        </div>
      `;
    }
  }

  renderActivityItem(activity) {
    const iconClass =
      {
        session: "fas fa-clock",
        topic: "fas fa-book",
        goal: "fas fa-target",
      }[activity.type] || "fas fa-info-circle";

    return `
      <div class="activity-item">
        <div class="activity-icon ${activity.type}">
          <i class="${iconClass}"></i>
        </div>
        <div class="activity-content">
          <div class="activity-title">${activity.title}</div>
          <div class="activity-meta">${this.ui.formatRelativeTime(activity.timestamp)}</div>
        </div>
      </div>
    `;
  }

  async updateChart() {
    const timeframe = document.getElementById("chart-timeframe")?.value || "30d";

    try {
      const analyticsData = await this.api.getProgressAnalytics(timeframe);
      this.renderChart(analyticsData.dailyProgress);
    } catch (error) {
      console.warn("Chart update failed, using demo data");
      this.renderDemoChart();
    }
  }

  renderChart(data) {
    const canvas = document.getElementById("progress-chart");
    if (!canvas || typeof Chart === "undefined") return;

    const ctx = canvas.getContext("2d");

    if (this.chart) {
      this.chart.destroy();
    }

    const chartData = this.processChartData(data);

    this.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: "Study Time (minutes)",
            data: chartData.data,
            borderColor: "#667eea",
            backgroundColor: "rgba(102, 126, 234, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return Math.floor(value / 60) + "h " + (value % 60) + "m";
              },
            },
          },
        },
      },
    });
  }

  processChartData(rawData) {
    if (!rawData || rawData.length === 0) {
      return { labels: [], data: [] };
    }

    return {
      labels: rawData.map((item) => `${item._id.month}/${item._id.day}`),
      data: rawData.map((item) => item.totalTime),
    };
  }

  renderDemoChart() {
    // Demo chart data for when API is not available
    const demoData = [
      { _id: { month: 1, day: 1 }, totalTime: 120 },
      { _id: { month: 1, day: 2 }, totalTime: 90 },
      { _id: { month: 1, day: 3 }, totalTime: 150 },
      { _id: { month: 1, day: 4 }, totalTime: 80 },
      { _id: { month: 1, day: 5 }, totalTime: 200 },
      { _id: { month: 1, day: 6 }, totalTime: 110 },
      { _id: { month: 1, day: 7 }, totalTime: 160 },
    ];

    this.renderChart(demoData);
  }

  loadDemoData() {
    // Demo data when API is not available
    this.updateStats({
      totalStudyHours: 127.5,
      currentStreak: 14,
      completedTopics: 23,
      totalSessions: 89,
    });

    this.updateGoals([
      {
        _id: "demo-goal",
        title: "Complete 5 Backend Topics",
        currentValue: 3,
        targetValue: 5,
        progressPercentage: 60,
        daysRemaining: 12,
        unit: "topics",
      },
    ]);

    this.updateRecentActivity([
      {
        type: "session",
        title: "Completed Spring Boot session",
        timestamp: new Date().toISOString(),
      },
      {
        type: "topic",
        title: "Marked React Hooks as completed",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
    ]);

    this.renderDemoChart();
  }

  animateCounter(element, targetValue) {
    const startValue = parseInt(element.textContent) || 0;
    const duration = 1000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentValue = Math.round(startValue + (targetValue - startValue) * progress);

      element.textContent = currentValue;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  async refreshDashboard() {
    await this.loadDashboardData();
  }

  startAutoRefresh() {
    // Refresh dashboard every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.refreshDashboard();
    }, 30000);
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  // Session management methods
  async pauseSession(sessionId) {
    try {
      await this.api.pauseSession(sessionId);
      this.ui.showToast("success", "Session paused");
      await this.refreshDashboard();
    } catch (error) {
      this.ui.showToast("error", "Failed to pause session");
    }
  }

  async resumeSession(sessionId) {
    try {
      await this.api.resumeSession(sessionId);
      this.ui.showToast("success", "Session resumed");
      await this.refreshDashboard();
    } catch (error) {
      this.ui.showToast("error", "Failed to resume session");
    }
  }

  async completeSession(sessionId) {
    try {
      await this.api.completeSession(sessionId);
      this.ui.showToast("success", "Session completed!");
      await this.refreshDashboard();
    } catch (error) {
      this.ui.showToast("error", "Failed to complete session");
    }
  }

  async cancelSession(sessionId) {
    try {
      await this.api.cancelSession(sessionId);
      this.ui.showToast("info", "Session cancelled");
      await this.refreshDashboard();
    } catch (error) {
      this.ui.showToast("error", "Failed to cancel session");
    }
  }

  showSessionModal() {
    // This would open a session creation modal
    this.ui.showToast("info", "Session creation modal would open here");
  }

  showGoalModal() {
    // This would open a goal creation modal
    this.ui.showToast("info", "Goal creation modal would open here");
  }

  destroy() {
    this.stopAutoRefresh();
    if (this.chart) {
      this.chart.destroy();
    }
  }
}
