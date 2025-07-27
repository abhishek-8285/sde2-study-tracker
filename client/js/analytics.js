// Analytics module
export class Analytics {
  constructor(api, ui) {
    this.api = api;
    this.ui = ui;
    this.charts = {};
  }

  async init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    const timeframeSelect = document.getElementById("analytics-timeframe");
    if (timeframeSelect) {
      timeframeSelect.addEventListener("change", () => this.load());
    }
  }

  async load() {
    try {
      const container = document.getElementById("analytics-container");
      if (!container) return;

      container.innerHTML = this.renderLoading();

      const timeframe = document.getElementById("analytics-timeframe")?.value || "30d";
      const data = await this.api.getAnalyticsSummary();

      this.renderAnalytics(data);
    } catch (error) {
      this.loadDemoAnalytics();
    }
  }

  renderAnalytics(data) {
    const container = document.getElementById("analytics-container");
    if (!container) return;

    container.innerHTML = `
      <div class="analytics-grid">
        <div class="card">
          <div class="card-header">
            <h3><i class="fas fa-chart-line"></i> Study Overview</h3>
          </div>
          <div class="card-content">
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-value">${data.summary?.sessions?.totalSessions || 0}</span>
                <span class="stat-label">Total Sessions</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">${this.ui.formatTime(data.summary?.sessions?.totalTime || 0)}</span>
                <span class="stat-label">Total Time</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">${data.summary?.topics?.completed || 0}</span>
                <span class="stat-label">Completed Topics</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">${data.summary?.goals?.completed || 0}</span>
                <span class="stat-label">Completed Goals</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="card">
          <div class="card-header">
            <h3><i class="fas fa-chart-pie"></i> Category Breakdown</h3>
          </div>
          <div class="card-content">
            <canvas id="category-chart" width="400" height="300"></canvas>
          </div>
        </div>
        
        <div class="card">
          <div class="card-header">
            <h3><i class="fas fa-calendar-alt"></i> Weekly Progress</h3>
          </div>
          <div class="card-content">
            <canvas id="weekly-chart" width="400" height="300"></canvas>
          </div>
        </div>
      </div>
    `;

    // Render charts if Chart.js is available
    if (typeof Chart !== "undefined") {
      this.renderCharts(data);
    }
  }

  renderCharts(data) {
    // Category chart
    this.renderCategoryChart();

    // Weekly progress chart
    this.renderWeeklyChart();
  }

  renderCategoryChart() {
    const canvas = document.getElementById("category-chart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (this.charts.category) {
      this.charts.category.destroy();
    }

    this.charts.category = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Backend", "Frontend", "Data Structures & Algorithms", "System Design"],
        datasets: [
          {
            data: [35, 25, 25, 15],
            backgroundColor: ["#667eea", "#764ba2", "#f093fb", "#f5576c"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    });
  }

  renderWeeklyChart() {
    const canvas = document.getElementById("weekly-chart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (this.charts.weekly) {
      this.charts.weekly.destroy();
    }

    this.charts.weekly = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [
          {
            label: "Study Hours",
            data: [2, 3, 2.5, 4, 3.5, 1.5, 2],
            backgroundColor: "#667eea",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }

  renderLoading() {
    return '<div class="skeleton skeleton-card"></div>'.repeat(3);
  }

  loadDemoAnalytics() {
    const demoData = {
      summary: {
        sessions: { totalSessions: 89, totalTime: 2400 },
        topics: { completed: 23 },
        goals: { completed: 5 },
      },
    };

    this.renderAnalytics(demoData);
  }

  destroy() {
    Object.values(this.charts).forEach((chart) => {
      if (chart) chart.destroy();
    });
    this.charts = {};
  }
}
