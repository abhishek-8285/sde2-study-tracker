// Goals module
export class Goals {
  constructor(api, ui) {
    this.api = api;
    this.ui = ui;
  }

  async init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    const newGoalBtn = document.getElementById("new-goal-btn");
    if (newGoalBtn) {
      newGoalBtn.addEventListener("click", () => this.showCreateModal());
    }
  }

  async load() {
    try {
      const container = document.getElementById("goals-container");
      if (!container) return;

      container.innerHTML = this.renderLoading();
      const data = await this.api.getGoals();
      this.renderGoals(data.goals || []);
    } catch (error) {
      this.loadDemoGoals();
    }
  }

  renderGoals(goals) {
    const container = document.getElementById("goals-container");
    if (!container) return;

    if (goals.length > 0) {
      container.innerHTML = goals.map((goal) => this.renderGoalCard(goal)).join("");
    } else {
      container.innerHTML = '<div class="no-data"><i class="fas fa-target"></i><p>No goals found</p></div>';
    }
  }

  renderGoalCard(goal) {
    const progressPercent = Math.round((goal.currentValue / goal.targetValue) * 100);

    return `
      <div class="goal-card">
        <div class="goal-header">
          <h4>${goal.title}</h4>
          <span class="badge badge-${goal.priority}">${goal.priority}</span>
        </div>
        <p>${goal.description || ""}</p>
        <div class="goal-progress">
          <div class="goal-progress-header">
            <span>Progress</span>
            <span>${goal.currentValue}/${goal.targetValue} ${goal.unit}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progressPercent}%"></div>
          </div>
          <small>${progressPercent}% complete</small>
        </div>
        <div class="goal-actions">
          <button class="btn btn-primary" onclick="updateGoalProgress('${goal._id}')">Update</button>
        </div>
      </div>
    `;
  }

  renderLoading() {
    return '<div class="skeleton skeleton-card"></div>'.repeat(3);
  }

  showCreateModal() {
    this.ui.showToast("info", "Goal creation feature coming soon");
  }

  loadDemoGoals() {
    const demoGoals = [
      {
        _id: "goal-1",
        title: "Complete 5 Backend Topics",
        description: "Focus on Spring Boot and Java",
        currentValue: 3,
        targetValue: 5,
        unit: "topics",
        priority: "high",
      },
    ];
    this.renderGoals(demoGoals);
  }
}
