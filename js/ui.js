/**
 * FocusFlow - UI Rendering and View Controller
 */

class UIController {
  constructor() {
    this.currentView = 'whatToDoNow';
    this.activeFocusTaskId = null;
    this.currentModalSubtasks = [];
    this.lastSchedule = null;
  }

  init() {
    this.setupViewNavigation();
    this.setupModalListeners();
    this.refreshAll();
  }

  refreshAll() {
    const tasks = window.storage.getTasks();
    const sessions = window.storage.getFocusSessions();

    this.renderSidebarBadges(tasks);
    this.renderWhatToDoNow(tasks);
    this.renderDashboard(tasks, sessions);
    this.renderAllTasks(tasks);
    this.renderAnalytics(tasks, sessions);
    this.populateFilterDropdowns(tasks);
  }

  // ==========================================
  // VIEW NAVIGATION
  // ==========================================
  setupViewNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const view = item.dataset.view;
        this.switchView(view);

        // Close mobile sidebar if open
        const sidebar = document.getElementById('appSidebar');
        if (sidebar) sidebar.classList.remove('open');
      });
    });

    // Mobile sidebar hamburger
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebar = document.getElementById('appSidebar');

    if (mobileMenuBtn && sidebar) {
      mobileMenuBtn.addEventListener('click', () => sidebar.classList.add('open'));
    }
    if (sidebarToggleBtn && sidebar) {
      sidebarToggleBtn.addEventListener('click', () => sidebar.classList.remove('open'));
    }

    // Mini timer pill quick jump
    const miniTimerJumpBtn = document.getElementById('miniTimerJumpBtn');
    if (miniTimerJumpBtn) {
      miniTimerJumpBtn.addEventListener('click', () => this.switchView('focusRoom'));
    }
  }

  switchView(viewName) {
    this.currentView = viewName;

    // Update active nav link
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Toggle view sections
    document.querySelectorAll('.app-view').forEach(view => {
      view.classList.remove('active');
    });

    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) {
      targetView.classList.add('active');
    }

    // Update Topbar Title
    const titles = {
      whatToDoNow: { title: 'What Should I Do Now?', subtitle: 'Intelligent algorithmic priority engine based on deadlines, effort, and energy.' },
      scheduler: { title: 'Smart Study Scheduler', subtitle: 'Pack your highest impact tasks into available time blocks.' },
      dashboard: { title: 'Academic Command Center', subtitle: 'Live overview of study velocity, workloads, and approaching deadlines.' },
      tasks: { title: 'All Tasks & Assignments', subtitle: 'Manage, search, and track all course deliverables in one place.' },
      focusRoom: { title: 'Deep Work Focus Room', subtitle: 'Distraction-free execution with Pomodoro intervals and offline ambient audio.' },
      analytics: { title: 'Productivity & Workload Analytics', subtitle: '7-day study consistency, subject balance, and cognitive effort distribution.' }
    };

    const header = titles[viewName] || titles.whatToDoNow;
    document.getElementById('pageTitle').textContent = header.title;
    document.getElementById('pageSubtitle').textContent = header.subtitle;

    // Trigger view-specific refreshes
    const tasks = window.storage.getTasks();
    const sessions = window.storage.getFocusSessions();

    if (viewName === 'scheduler') {
      this.triggerScheduleGeneration();
    } else if (viewName === 'analytics') {
      window.AnalyticsEngine.render7DayBarChart(sessions, 'analyticsBarChartContainer');
      window.AnalyticsEngine.renderMatrix(tasks);
    } else if (viewName === 'dashboard') {
      this.renderDashboard(tasks, sessions);
    } else if (viewName === 'focusRoom') {
      // If no task selected yet, automatically select the top ranked candidate
      if (!this.activeFocusTaskId) {
        const ranked = window.RankingEngine.rankTasks(tasks);
        if (ranked.length > 0) {
          this.startFocusOnTask(ranked[0].id, false);
        }
      }
    }
  }

  renderSidebarBadges(tasks) {
    const incomplete = tasks.filter(t => !t.completed).length;
    const taskCountEl = document.getElementById('navTaskCount');
    if (taskCountEl) taskCountEl.textContent = incomplete;

    const streak = window.storage.getStreak();
    const streakEl = document.getElementById('sidebarStreakDays');
    if (streakEl) streakEl.textContent = `${streak} Days`;
  }

  // ==========================================
  // VIEW 1: WHAT SHOULD I DO NOW?
  // ==========================================
  renderWhatToDoNow(tasks) {
    const availableTime = document.getElementById('filterAvailableTime')?.value || 'all';
    const energy = document.getElementById('filterEnergy')?.value || 'moderate';
    const strategy = document.getElementById('filterStrategy')?.value || 'smart';

    const ranked = window.RankingEngine.rankTasks(tasks, { availableTime, energy, strategy });

    const heroContainer = document.getElementById('topRecommendationContainer');
    const queueContainer = document.getElementById('rankedTasksList');
    const metaStats = document.getElementById('queueMetaStats');

    if (!heroContainer || !queueContainer) return;

    if (ranked.length === 0) {
      heroContainer.innerHTML = `
        <div class="glass-panel" style="padding: 2.5rem; text-align: center;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎉</div>
          <h2 style="font-size: 1.4rem; font-weight: 700; margin-bottom: 0.5rem;">Zero Backlog! You're completely caught up.</h2>
          <p class="text-muted" style="margin-bottom: 1.5rem;">All tasks and assignments are completed. Take a well-earned break or plan ahead.</p>
          <button class="btn btn-primary" onclick="window.ui.openTaskModal()">Add New Assignment</button>
        </div>
      `;
      queueContainer.innerHTML = '';
      if (metaStats) metaStats.innerHTML = '';
      return;
    }

    // Top Ranked Task (Hero)
    const top = ranked[0];
    const topSubjectColor = window.AnalyticsEngine.getSubjectColor(top.subject);

    const deadlineDate = new Date(top.deadline);
    let deadlineFormatted = 'No Deadline';
    if (!isNaN(deadlineDate.getTime())) {
      deadlineFormatted = deadlineDate.toLocaleDateString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    }

    const rationaleHTML = top.rationale.map(r => `
      <div class="rationale-text"><strong>•</strong> ${this.escapeHtml(r)}</div>
    `).join('');

    heroContainer.innerHTML = `
      <div class="hero-recommendation-card">
        <div class="hero-card-header">
          <div class="hero-tag-group">
            <span class="hero-badge-fire">🔥 Next Best Action</span>
            <span class="subject-tag">
              <span class="subject-dot" style="background: ${topSubjectColor};"></span>
              ${this.escapeHtml(top.subject)}
            </span>
            <span class="badge-mini badge-priority-${top.priority}">${this.capitalize(top.priority)}</span>
            <span class="badge-mini badge-diff-${top.difficulty}">${this.formatDifficulty(top.difficulty)}</span>
          </div>
          <div class="hero-score-badge">
            <span>Focus Score:</span>
            <strong>${top.focusScore} / 100</strong>
          </div>
        </div>

        <h2 class="hero-task-title">${this.escapeHtml(top.title)}</h2>

        <div class="hero-meta-row">
          <div class="hero-meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>Deadline: <strong>${deadlineFormatted}</strong> (${top.urgencyLabel})</span>
          </div>

          <div class="hero-meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>Estimated: <strong>${top.estimatedTime} mins</strong></span>
          </div>

          <div class="hero-meta-item">
            <span>Progress: <strong>${top.progress}%</strong></span>
          </div>
        </div>

        <div class="hero-rationale-box">
          <div class="rationale-icon">💡</div>
          <div>
            <div style="font-weight: 700; font-size: 0.82rem; margin-bottom: 0.2rem; color: var(--accent-primary);">WHY FOCUSFLOW SELECTED THIS NOW:</div>
            ${rationaleHTML}
          </div>
        </div>

        <div class="hero-actions">
          <button class="btn btn-primary btn-lg" onclick="window.ui.startFocusOnTask('${top.id}')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polygon points="10 8 16 12 10 16 10 8"></polygon>
            </svg>
            <span>Start 25m Focus Block</span>
          </button>

          <button class="btn btn-secondary" onclick="window.ui.openTaskModal('${top.id}')">
            <span>Edit Details</span>
          </button>

          <button class="btn btn-secondary" onclick="window.ui.toggleTaskComplete('${top.id}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Mark Complete</span>
          </button>
        </div>
      </div>
    `;

    // Remaining Ranked Queue
    const rest = ranked.slice(1);
    const totalRemainingMinutes = ranked.reduce((acc, t) => acc + (t.estimatedTime || 30), 0);
    const totalRemainingHours = (totalRemainingMinutes / 60).toFixed(1);

    if (metaStats) {
      metaStats.innerHTML = `<span class="text-muted text-xs">Total queue: ${ranked.length} tasks • ~${totalRemainingHours} hours of work</span>`;
    }

    if (rest.length === 0) {
      queueContainer.innerHTML = `<div class="text-muted text-sm" style="padding: 1rem; text-align: center;">No more tasks in queue. Complete the top recommendation above!</div>`;
      return;
    }

    queueContainer.innerHTML = rest.map((task, idx) => {
      const rankNum = idx + 2;
      const subjColor = window.AnalyticsEngine.getSubjectColor(task.subject);

      return `
        <div class="ranked-task-card">
          <div class="rank-position-pill ${rankNum <= 3 ? 'top-3' : ''}">#${rankNum}</div>
          <div class="ranked-task-main">
            <div class="ranked-title-row">
              <span class="subject-tag">
                <span class="subject-dot" style="background: ${subjColor};"></span>
                ${this.escapeHtml(task.subject)}
              </span>
              <span class="ranked-task-name">${this.escapeHtml(task.title)}</span>
              <span class="badge-mini badge-priority-${task.priority}">${this.capitalize(task.priority)}</span>
            </div>

            <div class="ranked-meta-row">
              <span>⏰ ${task.urgencyLabel}</span>
              <span>⏱️ ${task.estimatedTime}m</span>
              <span>⚡ ${this.formatDifficulty(task.difficulty)}</span>
              <span>📈 ${task.progress}% done</span>
            </div>
          </div>

          <div class="ranked-score-pill">
            <span class="score-num">${task.focusScore}</span>
            <span class="score-label">Score</span>
          </div>

          <div class="ranked-actions">
            <button class="btn btn-secondary btn-sm" onclick="window.ui.startFocusOnTask('${task.id}')" title="Start Focus Room with this task">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              <span>Focus</span>
            </button>
            <button class="btn btn-icon btn-sm" onclick="window.ui.toggleTaskComplete('${task.id}')" title="Mark Done">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // ==========================================
  // VIEW 2: SMART SCHEDULER
  // ==========================================
  triggerScheduleGeneration() {
    const tasks = window.storage.getTasks();
    const startTimeInput = document.getElementById('schedStartTime');
    if (startTimeInput && !startTimeInput.value) {
      startTimeInput.value = window.SmartScheduler.getCurrentTimeString();
    }

    const totalMinutesSelect = document.getElementById('schedTotalMinutes');
    let totalMinutes = totalMinutesSelect ? totalMinutesSelect.value : '120';
    if (totalMinutes === 'custom') {
      totalMinutes = document.getElementById('schedCustomMinutes')?.value || '150';
    }

    const breakStyle = document.getElementById('schedBreakStyle')?.value || 'ultra50';
    const taskScope = document.getElementById('schedTaskScope')?.value || 'allIncomplete';

    const schedule = window.SmartScheduler.generateSchedule(tasks, {
      startTime: startTimeInput?.value || window.SmartScheduler.getCurrentTimeString(),
      totalMinutes,
      breakStyle,
      taskScope
    });

    this.renderScheduleTimeline(schedule);
  }

  renderScheduleTimeline(schedule) {
    const container = document.getElementById('timelineScheduleContainer');
    const alertBox = document.getElementById('scheduleFeasibilityAlert');
    const subtitle = document.getElementById('timelineSubtitle');

    if (!container) return;

    // Feasibility Banner
    if (alertBox) {
      alertBox.className = `schedule-alert status-${schedule.summary.feasibility.level}`;
      alertBox.innerHTML = `<strong>Session Feasibility:</strong> ${this.escapeHtml(schedule.summary.feasibility.message)}`;
    }

    if (subtitle) {
      subtitle.textContent = `Schedule: ${schedule.summary.startTime} - ${schedule.summary.endTime} (${schedule.summary.allocatedWorkMinutes}m study + ${schedule.summary.allocatedBreakMinutes}m breaks)`;
    }

    if (schedule.timeline.length === 0) {
      container.innerHTML = `
        <div class="text-muted text-sm" style="text-align: center; padding: 2rem;">
          No tasks fit within the specified window. Try adjusting start time or total hours.
        </div>
      `;
      return;
    }

    container.innerHTML = schedule.timeline.map(block => {
      if (block.type === 'work') {
        const subjColor = window.AnalyticsEngine.getSubjectColor(block.subject);
        return `
          <div class="timeline-block">
            <div class="timeline-time-badge"></div>
            <div class="timeline-content-card">
              <div class="timeline-card-left">
                <span class="timeline-timestamps">${block.startTime} - ${block.endTime} (${block.duration}m)</span>
                <span class="timeline-task-title">${this.escapeHtml(block.taskTitle)}</span>
                <div style="display:flex; align-items:center; gap: 0.5rem; margin-top: 0.2rem;">
                  <span class="subject-tag">
                    <span class="subject-dot" style="background: ${subjColor};"></span>
                    ${this.escapeHtml(block.subject)}
                  </span>
                  <span class="badge-mini badge-priority-${block.priority}">${this.capitalize(block.priority)}</span>
                  <span class="text-muted text-xs">${block.partLabel}</span>
                </div>
              </div>

              <div class="timeline-card-right">
                <button class="btn btn-secondary btn-sm" onclick="window.ui.startFocusOnTask('${block.taskId}')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  <span>Focus Block</span>
                </button>
              </div>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="timeline-block">
            <div class="timeline-time-badge break-dot"></div>
            <div class="timeline-content-card break-card">
              <div class="timeline-card-left">
                <span class="timeline-timestamps break-time">${block.startTime} - ${block.endTime} (${block.duration}m)</span>
                <span class="timeline-task-title" style="color: var(--color-warning);">${block.title}</span>
              </div>
              <span class="badge-mini" style="background: rgba(245, 158, 11, 0.2); color: var(--color-warning);">Recovery Interval</span>
            </div>
          </div>
        `;
      }
    }).join('');

    // Cache schedule for copy / start actions
    this.lastSchedule = schedule;
  }

  // ==========================================
  // VIEW 3: DASHBOARD
  // ==========================================
  renderDashboard(tasks, sessions) {
    const allTasks = tasks || [];
    const totalCount = allTasks.length;
    const completedTasks = allTasks.filter(t => t.completed);
    const incompleteTasks = allTasks.filter(t => !t.completed);

    // 1. Tasks Completed Stat
    const compEl = document.getElementById('dashCompletedTasks');
    const totEl = document.getElementById('dashTotalTasks');
    const barEl = document.getElementById('dashTaskProgressBar');
    if (compEl && totEl && barEl) {
      compEl.textContent = completedTasks.length;
      totEl.textContent = `/ ${totalCount} total`;
      const pct = totalCount ? Math.round((completedTasks.length / totalCount) * 100) : 0;
      barEl.style.width = `${pct}%`;
    }

    // 2. Pending Study Time
    const pendingMinutes = incompleteTasks.reduce((acc, t) => acc + (t.estimatedTime || 30), 0);
    const pendingH = Math.floor(pendingMinutes / 60);
    const pendingM = pendingMinutes % 60;
    const pendingHEl = document.getElementById('dashPendingHours');
    const pendingMEl = document.getElementById('dashPendingMinutes');
    if (pendingHEl && pendingMEl) {
      pendingHEl.textContent = `${pendingH}h`;
      pendingMEl.textContent = `${pendingM}m remaining`;
    }

    // 3. Urgent Deadlines (<24h or overdue)
    const now = new Date();
    const urgentTasks = incompleteTasks.filter(t => {
      const d = new Date(t.deadline);
      const ms = !isNaN(d.getTime()) ? d.getTime() - now.getTime() : 999999999;
      return ms <= 24 * 3600 * 1000 || t.priority === 'urgent';
    });
    const overdueCount = incompleteTasks.filter(t => {
      const d = new Date(t.deadline);
      return !isNaN(d.getTime()) && d.getTime() < now.getTime();
    }).length;

    const urgentCountEl = document.getElementById('dashUrgentCount');
    const urgentAdviceEl = document.getElementById('dashUrgentAdvice');
    if (urgentCountEl && urgentAdviceEl) {
      urgentCountEl.textContent = urgentTasks.length;
      urgentAdviceEl.textContent = overdueCount > 0 ? `⚠️ ${overdueCount} overdue tasks require action` : 'All deadlines currently on track';
    }

    // 4. Focus Time Logged
    const totalFocusMinutes = (sessions || []).reduce((acc, s) => acc + (s.minutes || 0), 0);
    const focusHEl = document.getElementById('dashFocusHours');
    const focusSessionsEl = document.getElementById('dashFocusSessionsCount');
    if (focusHEl && focusSessionsEl) {
      const fH = Math.floor(totalFocusMinutes / 60);
      const fM = totalFocusMinutes % 60;
      focusHEl.textContent = `${fH}h ${fM}m`;
      focusSessionsEl.textContent = `${(sessions || []).length} sessions recorded`;
    }

    // Immediate Focus Priority Card in Dashboard
    const immediateContainer = document.getElementById('dashImmediateTaskCard');
    if (immediateContainer) {
      if (incompleteTasks.length === 0) {
        immediateContainer.innerHTML = `<span class="text-muted text-sm">No pending tasks. Great job!</span>`;
      } else {
        const ranked = window.RankingEngine.rankTasks(allTasks, { strategy: 'smart' });
        if (ranked.length > 0) {
          const top = ranked[0];
          const color = window.AnalyticsEngine.getSubjectColor(top.subject);
          immediateContainer.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:0.5rem;">
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <span class="subject-tag"><span class="subject-dot" style="background:${color};"></span>${this.escapeHtml(top.subject)}</span>
                <span class="badge-mini badge-priority-${top.priority}">${this.capitalize(top.priority)}</span>
                <span class="badge-mini">Score: ${top.focusScore}</span>
              </div>
              <h4 style="font-size: 1.05rem; font-weight:700;">${this.escapeHtml(top.title)}</h4>
              <span class="text-muted text-xs">Estimated: ${top.estimatedTime}m • ${top.urgencyLabel}</span>
              <div style="margin-top:0.4rem;">
                <button class="btn btn-primary btn-sm" onclick="window.ui.startFocusOnTask('${top.id}')">Start Focus Block</button>
              </div>
            </div>
          `;
        }
      }
    }

    // Donut Chart
    window.AnalyticsEngine.renderSubjectDonut(allTasks, 'dashSubjectDonutContainer', 'dashSubjectLegend');

    // Upcoming Deadlines Radar
    this.renderDeadlinesRadar(incompleteTasks);
  }

  renderDeadlinesRadar(incompleteTasks) {
    const container = document.getElementById('dashDeadlinesRadar');
    if (!container) return;

    const sortedByDeadline = [...incompleteTasks].sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 5);

    if (sortedByDeadline.length === 0) {
      container.innerHTML = `<div class="text-muted text-sm">No impending deadlines found.</div>`;
      return;
    }

    const now = new Date();
    container.innerHTML = sortedByDeadline.map(t => {
      const d = new Date(t.deadline);
      const isPast = d.getTime() < now.getTime();
      const diffHours = (d.getTime() - now.getTime()) / (3600 * 1000);
      let badgeClass = 'badge-priority-low';
      let timeText = '';

      if (isPast) {
        badgeClass = 'badge-priority-urgent';
        timeText = 'Overdue';
      } else if (diffHours <= 12) {
        badgeClass = 'badge-priority-urgent';
        timeText = `${Math.max(1, Math.ceil(diffHours))}h left`;
      } else if (diffHours <= 24) {
        badgeClass = 'badge-priority-high';
        timeText = 'Due tomorrow';
      } else {
        badgeClass = 'badge-priority-medium';
        timeText = `${Math.ceil(diffHours / 24)}d left`;
      }

      const formatted = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

      return `
        <div class="deadline-radar-item">
          <div>
            <div style="font-weight: 600; font-size: 0.9rem;">${this.escapeHtml(t.title)}</div>
            <span class="text-muted text-xs">${this.escapeHtml(t.subject)} • ${formatted}</span>
          </div>
          <span class="badge-mini ${badgeClass}">${timeText}</span>
        </div>
      `;
    }).join('');
  }

  // ==========================================
  // VIEW 4: ALL TASKS (CRUD & MANAGEMENT)
  // ==========================================
  renderAllTasks(tasks) {
    const container = document.getElementById('allTasksContainer');
    if (!container) return;

    const searchVal = (document.getElementById('taskSearchInput')?.value || '').toLowerCase().trim();
    const filterSubj = document.getElementById('taskFilterSubject')?.value || 'all';
    const filterPri = document.getElementById('taskFilterPriority')?.value || 'all';
    const filterStatus = document.getElementById('taskFilterStatus')?.value || 'all';
    const sortBy = document.getElementById('taskSortBy')?.value || 'smartRank';

    // Filter
    let filtered = (tasks || []).filter(t => {
      if (filterStatus === 'all' && t.completed) return false;
      if (filterStatus === 'completed' && !t.completed) return false;

      if (filterSubj !== 'all' && t.subject !== filterSubj) return false;
      if (filterPri !== 'all' && t.priority !== filterPri) return false;

      if (searchVal) {
        const titleMatch = (t.title || '').toLowerCase().includes(searchVal);
        const subjMatch = (t.subject || '').toLowerCase().includes(searchVal);
        const notesMatch = (t.notes || '').toLowerCase().includes(searchVal);
        if (!titleMatch && !subjMatch && !notesMatch) return false;
      }
      return true;
    });

    // Sort
    if (sortBy === 'smartRank') {
      const rankedMap = new Map();
      const ranked = window.RankingEngine.rankTasks(filtered);
      ranked.forEach((r, idx) => rankedMap.set(r.id, idx));
      filtered.sort((a, b) => {
        const rA = rankedMap.has(a.id) ? rankedMap.get(a.id) : 999;
        const rB = rankedMap.has(b.id) ? rankedMap.get(b.id) : 999;
        return rA - rB;
      });
    } else if (sortBy === 'deadlineAsc') {
      filtered.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    } else if (sortBy === 'priorityDesc') {
      const priOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      filtered.sort((a, b) => (priOrder[b.priority] || 0) - (priOrder[a.priority] || 0));
    } else if (sortBy === 'difficultyDesc') {
      const diffOrder = { deep_work: 4, challenging: 3, moderate: 2, quick_win: 1 };
      filtered.sort((a, b) => (diffOrder[b.difficulty] || 0) - (diffOrder[a.difficulty] || 0));
    } else if (sortBy === 'timeAsc') {
      filtered.sort((a, b) => (a.estimatedTime || 0) - (b.estimatedTime || 0));
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="padding: 3rem; text-align: center;" class="text-muted">
          <p>No tasks match the selected filters or search terms.</p>
          <button class="btn btn-secondary btn-sm" style="margin-top: 0.75rem;" onclick="window.ui.clearFilters()">Clear Filters</button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(task => {
      const isDone = task.completed;
      const subjColor = window.AnalyticsEngine.getSubjectColor(task.subject);
      const deadlineDate = new Date(task.deadline);
      const deadlineFormatted = !isNaN(deadlineDate.getTime()) ? deadlineDate.toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      }) : 'No Deadline';

      return `
        <div class="task-row" data-task-id="${task.id}">
          <div class="task-checkbox-custom ${isDone ? 'completed' : ''}" onclick="window.ui.toggleTaskComplete('${task.id}')" title="${isDone ? 'Mark Incomplete' : 'Mark Completed'}">
            ${isDone ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>` : ''}
          </div>

          <div class="task-content-col">
            <div class="task-title-line">
              <span class="subject-tag">
                <span class="subject-dot" style="background: ${subjColor};"></span>
                ${this.escapeHtml(task.subject)}
              </span>
              <span class="task-name-text ${isDone ? 'task-done' : ''}">${this.escapeHtml(task.title)}</span>
            </div>

            <div class="task-badges-row">
              <span class="badge-mini badge-priority-${task.priority}">${this.capitalize(task.priority)}</span>
              <span class="badge-mini badge-diff-${task.difficulty}">${this.formatDifficulty(task.difficulty)}</span>
              <span class="text-muted text-xs">⏰ ${deadlineFormatted}</span>
              <span class="text-muted text-xs">⏱️ ${task.estimatedTime}m</span>

              <div class="task-progress-mini-bar" title="Progress: ${task.progress || 0}%">
                <div class="task-progress-mini-fill" style="width: ${task.progress || 0}%;"></div>
              </div>
              <span class="text-muted text-xs">${task.progress || 0}%</span>
            </div>
          </div>

          <div class="task-row-actions">
            ${!isDone ? `
              <button class="btn btn-secondary btn-xs" onclick="window.ui.startFocusOnTask('${task.id}')" title="Start Focus Session">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>Focus</span>
              </button>
            ` : ''}

            <button class="btn btn-icon btn-sm" onclick="window.ui.openTaskModal('${task.id}')" title="Edit Task">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>

            <button class="btn btn-icon btn-sm" onclick="window.ui.confirmDeleteTask('${task.id}')" title="Delete Task">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  populateFilterDropdowns(tasks) {
    const subjectSelect = document.getElementById('taskFilterSubject');
    if (!subjectSelect) return;

    const subjects = [...new Set((tasks || []).map(t => t.subject).filter(Boolean))].sort();
    const currentVal = subjectSelect.value;

    subjectSelect.innerHTML = `<option value="all">All Subjects (${tasks.length})</option>` +
      subjects.map(s => `<option value="${this.escapeHtml(s)}">${this.escapeHtml(s)}</option>`).join('');

    subjectSelect.value = currentVal || 'all';
  }

  clearFilters() {
    const searchInput = document.getElementById('taskSearchInput');
    const subjSelect = document.getElementById('taskFilterSubject');
    const priSelect = document.getElementById('taskFilterPriority');
    const statSelect = document.getElementById('taskFilterStatus');

    if (searchInput) searchInput.value = '';
    if (subjSelect) subjSelect.value = 'all';
    if (priSelect) priSelect.value = 'all';
    if (statSelect) statSelect.value = 'all';

    this.renderAllTasks(window.storage.getTasks());
  }

  // ==========================================
  // VIEW 5: FOCUS ROOM INTEGRATION
  // ==========================================
  startFocusOnTask(taskId, showNotification = true) {
    this.activeFocusTaskId = taskId;
    const task = window.storage.getTaskById(taskId);
    if (!task) return;

    const titleEl = document.getElementById('focusCurrentTaskTitle');
    const badgeEl = document.getElementById('focusSubjectBadge');
    if (titleEl) titleEl.textContent = task.title;
    if (badgeEl) {
      badgeEl.classList.remove('hidden');
      badgeEl.textContent = task.subject;
      badgeEl.style.backgroundColor = window.AnalyticsEngine.getSubjectColor(task.subject);
      badgeEl.style.color = '#fff';
    }

    this.renderFocusSubtasks(task);
    this.switchView('focusRoom');

    if (showNotification) {
      this.showToast(`Loaded for focus: ${task.title}`, 'info');
    }
  }

  renderFocusSubtasks(task) {
    const container = document.getElementById('focusSubtasksList');
    if (!container) return;

    if (!task.subtasks || task.subtasks.length === 0) {
      container.innerHTML = `<span class="text-muted text-xs">No micro-steps added yet. Add key steps below!</span>`;
      return;
    }

    container.innerHTML = task.subtasks.map((st) => `
      <div class="focus-subtask-item ${st.completed ? 'checked' : ''}" onclick="window.ui.toggleSubtask('${task.id}', '${st.id}')" style="cursor: pointer;">
        <input type="checkbox" ${st.completed ? 'checked' : ''} style="cursor: pointer;">
        <span style="font-size: 0.85rem;">${this.escapeHtml(st.title)}</span>
      </div>
    `).join('');
  }

  toggleSubtask(taskId, subtaskId) {
    const task = window.storage.getTaskById(taskId);
    if (!task || !task.subtasks) return;

    const st = task.subtasks.find(s => s.id === subtaskId);
    if (st) {
      st.completed = !st.completed;
      const completedCount = task.subtasks.filter(s => s.completed).length;
      task.progress = Math.round((completedCount / task.subtasks.length) * 100);
      window.storage.updateTask(taskId, { subtasks: task.subtasks, progress: task.progress });
      this.renderFocusSubtasks(task);
      this.refreshAll();
    }
  }

  addFocusSubtask() {
    const input = document.getElementById('newFocusSubtaskInput');
    if (!input || !input.value.trim() || !this.activeFocusTaskId) return;

    const task = window.storage.getTaskById(this.activeFocusTaskId);
    if (!task) return;

    if (!task.subtasks) task.subtasks = [];
    task.subtasks.push({
      id: 'st_' + Date.now(),
      title: input.value.trim(),
      completed: false
    });

    window.storage.updateTask(task.id, { subtasks: task.subtasks });
    input.value = '';
    this.renderFocusSubtasks(task);
    this.refreshAll();
  }

  // ==========================================
  // VIEW 6: ANALYTICS
  // ==========================================
  renderAnalytics(tasks, sessions) {
    window.AnalyticsEngine.render7DayBarChart(sessions, 'analyticsBarChartContainer');
    window.AnalyticsEngine.renderMatrix(tasks);
  }

  // ==========================================
  // MODALS & SUBTASKS BUILDER
  // ==========================================
  setupModalListeners() {
    // Task modal openers
    document.getElementById('quickAddTaskBtn')?.addEventListener('click', () => this.openTaskModal());
    document.getElementById('topbarAddTaskBtn')?.addEventListener('click', () => this.openTaskModal());
    document.getElementById('addNewTaskViewBtn')?.addEventListener('click', () => this.openTaskModal());

    // Task modal closers
    document.getElementById('taskModalCloseBtn')?.addEventListener('click', () => this.closeTaskModal());
    document.getElementById('taskModalCancelBtn')?.addEventListener('click', () => this.closeTaskModal());

    // Task save
    document.getElementById('taskForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveTaskFromModal();
    });

    // Slider display listener
    const progressSlider = document.getElementById('taskProgressInput');
    const progressDisplay = document.getElementById('taskProgressValDisplay');
    if (progressSlider && progressDisplay) {
      progressSlider.addEventListener('input', () => {
        progressDisplay.textContent = `${progressSlider.value}%`;
      });
    }

    // Modal Subtasks add button
    const modalAddSubtaskBtn = document.getElementById('modalAddSubtaskBtn');
    const modalSubtaskInput = document.getElementById('modalNewSubtaskInput');
    const addSubtaskToModalList = () => {
      const val = modalSubtaskInput ? modalSubtaskInput.value.trim() : '';
      if (!val) return;
      this.currentModalSubtasks.push({
        id: 'st_' + Date.now() + '_' + Math.random().toString(36).substr(2, 3),
        title: val,
        completed: false
      });
      modalSubtaskInput.value = '';
      this.renderModalSubtasks();
    };

    if (modalAddSubtaskBtn) modalAddSubtaskBtn.addEventListener('click', addSubtaskToModalList);
    if (modalSubtaskInput) {
      modalSubtaskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addSubtaskToModalList();
        }
      });
    }

    // Data modal
    document.getElementById('dataSettingsBtn')?.addEventListener('click', () => {
      document.getElementById('dataModal')?.classList.remove('hidden');
    });
    document.getElementById('dataModalCloseBtn')?.addEventListener('click', () => {
      document.getElementById('dataModal')?.classList.add('hidden');
    });

    // Export JSON
    document.getElementById('exportDataBtn')?.addEventListener('click', () => {
      const dataStr = window.storage.exportAllData();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `focusflow_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('Backup JSON exported successfully!', 'success');
    });

    // Import JSON
    document.getElementById('importFileInput')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = window.storage.importData(event.target.result);
        if (result.success) {
          this.refreshAll();
          document.getElementById('dataModal')?.classList.add('hidden');
          this.showToast(`Imported ${result.count} tasks successfully!`, 'success');
        } else {
          alert(result.error);
        }
      };
      reader.readAsText(file);
    });

    // Reset to Sample
    document.getElementById('resetSampleDataBtn')?.addEventListener('click', () => {
      if (confirm('Load demo student assignments? This will populate realistic course tasks.')) {
        window.storage.resetToSampleData();
        this.refreshAll();
        document.getElementById('dataModal')?.classList.add('hidden');
        this.showToast('Demo tasks loaded!', 'info');
      }
    });

    // Clear All
    document.getElementById('clearAllDataBtn')?.addEventListener('click', () => {
      if (confirm('Wipe all local student data? This cannot be undone.')) {
        window.storage.clearAllData();
        this.refreshAll();
        document.getElementById('dataModal')?.classList.add('hidden');
        this.showToast('All local data cleared.', 'danger');
      }
    });
  }

  renderModalSubtasks() {
    const container = document.getElementById('modalSubtasksList');
    if (!container) return;

    if (this.currentModalSubtasks.length === 0) {
      container.innerHTML = `<span class="text-muted text-xs">No steps added yet.</span>`;
      return;
    }

    container.innerHTML = this.currentModalSubtasks.map((st, idx) => `
      <div style="display:flex; align-items:center; justify-content:space-between; padding: 0.3rem 0.5rem; background: var(--bg-tertiary); border-radius: var(--radius-sm); font-size: 0.82rem;">
        <span>${idx + 1}. ${this.escapeHtml(st.title)}</span>
        <button type="button" class="btn-subtle" onclick="window.ui.removeModalSubtask('${st.id}')" style="color: var(--color-danger); padding: 0 4px;">&times;</button>
      </div>
    `).join('');
  }

  removeModalSubtask(id) {
    this.currentModalSubtasks = this.currentModalSubtasks.filter(st => st.id !== id);
    this.renderModalSubtasks();
  }

  openTaskModal(taskId = null) {
    const modal = document.getElementById('taskModal');
    const titleEl = document.getElementById('taskModalTitle');
    const formId = document.getElementById('taskFormId');
    const titleInput = document.getElementById('taskTitleInput');
    const subjectInput = document.getElementById('taskSubjectInput');
    const deadlineInput = document.getElementById('taskDeadlineInput');
    const priorityInput = document.getElementById('taskPriorityInput');
    const difficultyInput = document.getElementById('taskDifficultyInput');
    const estimateInput = document.getElementById('taskEstimateInput');
    const progressInput = document.getElementById('taskProgressInput');
    const progressDisplay = document.getElementById('taskProgressValDisplay');
    const notesInput = document.getElementById('taskNotesInput');

    if (!modal) return;

    if (taskId) {
      const task = window.storage.getTaskById(taskId);
      if (!task) return;
      titleEl.textContent = 'Edit Assignment';
      formId.value = task.id;
      titleInput.value = task.title;
      subjectInput.value = task.subject;
      deadlineInput.value = task.deadline || '';
      priorityInput.value = task.priority;
      difficultyInput.value = task.difficulty;
      estimateInput.value = task.estimatedTime;
      progressInput.value = task.progress || 0;
      progressDisplay.textContent = `${task.progress || 0}%`;
      notesInput.value = task.notes || '';
      this.currentModalSubtasks = Array.isArray(task.subtasks) ? [...task.subtasks] : [];
    } else {
      titleEl.textContent = 'Create New Task';
      formId.value = '';
      titleInput.value = '';
      subjectInput.value = 'Computer Science';

      // Default deadline to tomorrow 18:00 LOCAL time
      const d = new Date(Date.now() + 24 * 3600 * 1000);
      d.setHours(18, 0, 0, 0);
      deadlineInput.value = window.toLocalISOString ? window.toLocalISOString(d) : d.toISOString().slice(0, 16);

      priorityInput.value = 'high';
      difficultyInput.value = 'moderate';
      estimateInput.value = '45';
      progressInput.value = '0';
      progressDisplay.textContent = '0%';
      notesInput.value = '';
      this.currentModalSubtasks = [];
    }

    this.renderModalSubtasks();
    modal.classList.remove('hidden');
    titleInput.focus();
  }

  closeTaskModal() {
    document.getElementById('taskModal')?.classList.add('hidden');
  }

  saveTaskFromModal() {
    const id = document.getElementById('taskFormId').value;
    const title = document.getElementById('taskTitleInput').value.trim();
    const subject = document.getElementById('taskSubjectInput').value.trim();
    const deadline = document.getElementById('taskDeadlineInput').value;
    const priority = document.getElementById('taskPriorityInput').value;
    const difficulty = document.getElementById('taskDifficultyInput').value;
    const estimatedTime = parseInt(document.getElementById('taskEstimateInput').value, 10) || 45;
    const progress = parseInt(document.getElementById('taskProgressInput').value, 10) || 0;
    const notes = document.getElementById('taskNotesInput').value.trim();
    const subtasks = [...this.currentModalSubtasks];

    if (!title) {
      alert('Please enter a task title.');
      return;
    }

    if (id) {
      window.storage.updateTask(id, {
        title, subject, deadline, priority, difficulty, estimatedTime, progress, notes, subtasks
      });
      this.showToast('Task updated successfully!', 'success');
    } else {
      window.storage.addTask({
        title, subject, deadline, priority, difficulty, estimatedTime, progress, notes, subtasks
      });
      this.showToast('New task added to queue!', 'success');
    }

    this.closeTaskModal();
    this.refreshAll();
  }

  toggleTaskComplete(id) {
    const updated = window.storage.toggleTaskComplete(id);
    if (updated) {
      if (updated.completed) {
        if (window.audioSynth) window.audioSynth.playTaskDoneSound();
        this.showToast(`Completed: ${updated.title}`, 'success');

        // If this was the active task in focus room
        if (this.activeFocusTaskId === id) {
          const titleEl = document.getElementById('focusCurrentTaskTitle');
          const badgeEl = document.getElementById('focusSubjectBadge');
          if (titleEl) titleEl.textContent = 'Task Finished! Select your next focus block.';
          if (badgeEl) {
            badgeEl.textContent = 'Completed';
            badgeEl.style.backgroundColor = 'var(--color-success)';
          }
        }
      } else {
        this.showToast(`Marked active: ${updated.title}`, 'info');
      }
      this.refreshAll();
    }
  }

  confirmDeleteTask(id) {
    if (confirm('Delete this task?')) {
      window.storage.deleteTask(id);
      if (this.activeFocusTaskId === id) {
        this.activeFocusTaskId = null;
        document.getElementById('focusCurrentTaskTitle').textContent = 'Select a task to focus';
        document.getElementById('focusSubjectBadge')?.classList.add('hidden');
      }
      this.showToast('Task removed.', 'info');
      this.refreshAll();
    }
  }

  // ==========================================
  // TOAST NOTIFICATIONS
  // ==========================================
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'danger') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span><span>${this.escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-hide');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // Utilities
  capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  }

  formatDifficulty(diff) {
    const map = {
      quick_win: '⚡ Quick Win',
      moderate: '💡 Moderate',
      challenging: '🧠 Challenging',
      deep_work: '🌋 Deep Work'
    };
    return map[diff] || diff;
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Global instance
window.ui = new UIController();
