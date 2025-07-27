// Sessions module
export class Sessions {
  constructor(api, ui, socket) {
    this.api = api;
    this.ui = ui;
    this.socket = socket;
  }

  async init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    const newSessionBtn = document.getElementById("new-session-btn");
    if (newSessionBtn) {
      newSessionBtn.addEventListener("click", () => this.showCreateModal());
    }
  }

  async load() {
    try {
      const container = document.getElementById("sessions-container");
      if (!container) return;

      container.innerHTML = this.renderLoading();
      const data = await this.api.getSessions();
      this.renderSessions(data.sessions || []);
    } catch (error) {
      this.loadDemoSessions();
    }
  }

  renderSessions(sessions) {
    const container = document.getElementById("sessions-container");
    if (!container) return;

    if (sessions.length > 0) {
      container.innerHTML = sessions.map((session) => this.renderSessionCard(session)).join("");
    } else {
      container.innerHTML = '<div class="no-data"><i class="fas fa-clock"></i><p>No sessions found</p></div>';
    }
  }

  renderSessionCard(session) {
    return `
      <div class="session-card">
        <h4>${session.topicId?.title || "Study Session"}</h4>
        <p>Duration: ${this.ui.formatTime(session.actualDuration || session.plannedDuration)}</p>
        <p>Status: ${session.status}</p>
        <small>${this.ui.formatDate(session.startTime)}</small>
      </div>
    `;
  }

  renderLoading() {
    return '<div class="skeleton skeleton-card"></div>'.repeat(3);
  }

  showCreateModal() {
    this.ui.showToast("info", "Session creation feature coming soon");
  }

  loadDemoSessions() {
    const demoSessions = [
      {
        topicId: { title: "Spring Boot" },
        actualDuration: 45,
        status: "completed",
        startTime: new Date().toISOString(),
      },
    ];
    this.renderSessions(demoSessions);
  }
}
