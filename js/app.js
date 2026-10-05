/**
 * FocusFlow - Main Application Orchestrator
 * Integrates Storage, Ranking Engine, Scheduler, Audio Synthesizer, Timer, and UI.
 */

class App {
  constructor() {
    this.timer = {
      mode: 'pomodoro', // 'pomodoro' | 'deepWork' | 'shortBreak' | 'longBreak' | 'stopwatch'
      durations: {
        pomodoro: 25 * 60,
        deepWork: 50 * 60,
        shortBreak: 5 * 60,
        longBreak: 15 * 60,
        stopwatch: 0
      },
      totalSeconds: 25 * 60,
      remainingSeconds: 25 * 60,
      elapsedSeconds: 0,
      isRunning: false,
      intervalId: null
    };
  }

  init() {
    // 1. Initialize UI
    window.ui.init();

    // 2. Setup Timer Controls
    this.setupTimer();

    // 3. Setup Ambient Sound Synthesizer Controls
    this.setupAmbientAudio();

    // 4. Setup Event Listeners (Engine, Scheduler, Search, Theme)
    this.setupEventListeners();

    // 5. Setup Keyboard Shortcuts
    this.setupKeyboardShortcuts();

    // 6. Restore Theme Preference
    this.initTheme();

    console.log('FocusFlow 100% Offline Student Productivity App Initialized.');
  }

  // ==========================================
  // POMODORO & STUDY TIMER
  // ==========================================
  setupTimer() {
    const toggleBtn = document.getElementById('timerToggleBtn');
    const resetBtn = document.getElementById('timerResetBtn');
    const completeTaskBtn = document.getElementById('timerCompleteTaskBtn');
    const modeBtns = document.querySelectorAll('.timer-mode-btn');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleTimer());
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetTimer());
    }
    if (completeTaskBtn) {
      completeTaskBtn.addEventListener('click', () => this.completeCurrentFocusedTask());
    }

    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        this.setTimerMode(mode);
      });
    });

    this.updateTimerDisplay();
  }

  setTimerMode(mode) {
    if (this.timer.isRunning) {
      this.pauseTimer();
    }
    this.timer.mode = mode;
    this.timer.totalSeconds = this.timer.durations[mode] || 25 * 60;
    this.timer.remainingSeconds = this.timer.totalSeconds;
    this.timer.elapsedSeconds = 0;

    // Update active mode pill button
    document.querySelectorAll('.timer-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Update phase label
    const phaseLabel = document.getElementById('timerPhaseLabel');
    if (phaseLabel) {
      const labels = {
        pomodoro: 'Pomodoro Focus (25m)',
        deepWork: 'Deep Work Session (50m)',
        shortBreak: 'Short Recovery Break (5m)',
        longBreak: 'Extended Rest Break (15m)',
        stopwatch: 'Open Study Stopwatch'
      };
      phaseLabel.textContent = labels[mode] || 'Focus Session';
    }

    this.updateTimerDisplay();
  }

  toggleTimer() {
    if (this.timer.isRunning) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  }

  startTimer() {
    if (this.timer.isRunning) return;
    this.timer.isRunning = true;

    // Audio context unlock
    if (window.audioSynth) {
      window.audioSynth.ensureContext();
      window.audioSynth.playClick();
    }

    // Update UI buttons
    this.updateTimerPlayButtonState(true);

    // Update Topbar and Sidebar indicators
    const miniPill = document.getElementById('miniTimerPill');
    const sideDot = document.getElementById('timerSidebarDot');
    if (miniPill) miniPill.classList.remove('hidden');
    if (sideDot) sideDot.classList.add('running');

    this.timer.intervalId = setInterval(() => {
      if (this.timer.mode === 'stopwatch') {
        this.timer.elapsedSeconds++;
        this.updateTimerDisplay();
      } else {
        if (this.timer.remainingSeconds > 0) {
          this.timer.remainingSeconds--;
          this.timer.elapsedSeconds++;
          this.updateTimerDisplay();
        } else {
          this.timerFinished();
        }
      }
    }, 1000);
  }

  pauseTimer() {
    this.timer.isRunning = false;
    clearInterval(this.timer.intervalId);
    this.timer.intervalId = null;

    this.updateTimerPlayButtonState(false);

    const miniPill = document.getElementById('miniTimerPill');
    const sideDot = document.getElementById('timerSidebarDot');
    if (miniPill) miniPill.classList.add('hidden');
    if (sideDot) sideDot.classList.remove('running');
  }

  resetTimer() {
    this.pauseTimer();
    this.setTimerMode(this.timer.mode);
  }

  timerFinished() {
    const finishedMode = this.timer.mode;
    this.pauseTimer();

    // Play chime sound
    if (window.audioSynth) {
      window.audioSynth.playSessionChime();
    }

    // Record session if it was a study session
    const isWorkSession = finishedMode === 'pomodoro' || finishedMode === 'deepWork';
    if (isWorkSession) {
      const minutesSpent = Math.max(1, Math.round(this.timer.elapsedSeconds / 60));
      const activeTaskId = window.ui.activeFocusTaskId;
      let subject = 'General Study';

      if (activeTaskId) {
        const task = window.storage.getTaskById(activeTaskId);
        if (task) subject = task.subject;
      }

      window.storage.recordFocusSession(minutesSpent, activeTaskId, subject);
      window.ui.showToast(`🎉 Focus block complete! ${minutesSpent} minutes logged. Great effort!`, 'success');
      window.ui.refreshAll();
    } else {
      window.ui.showToast('🔔 Break finished! Ready for your next focus session?', 'info');
    }

    // Auto transition to appropriate next phase
    if (finishedMode === 'pomodoro') {
      this.setTimerMode('shortBreak');
    } else if (finishedMode === 'deepWork') {
      this.setTimerMode('longBreak');
    } else if (finishedMode === 'shortBreak' || finishedMode === 'longBreak') {
      this.setTimerMode('pomodoro');
    }
  }

  updateTimerDisplay() {
    const isStopwatch = this.timer.mode === 'stopwatch';
    const totalSec = isStopwatch ? this.timer.elapsedSeconds : this.timer.remainingSeconds;

    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const formatted = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    const timerDisplay = document.getElementById('timerDisplay');
    const miniDisplay = document.getElementById('miniTimerDisplay');
    if (timerDisplay) timerDisplay.textContent = formatted;
    if (miniDisplay) miniDisplay.textContent = formatted;

    // Update Circle Progress
    const circle = document.getElementById('timerCircleProgress');
    if (circle) {
      const circumference = 722.56; // 2 * PI * 115
      let fraction = 1;

      if (isStopwatch) {
        fraction = (this.timer.elapsedSeconds % 3600) / 3600;
      } else {
        fraction = this.timer.totalSeconds > 0
          ? (this.timer.remainingSeconds / this.timer.totalSeconds)
          : 0;
      }

      const offset = circumference * (1 - fraction);
      circle.style.strokeDashoffset = offset;
    }
  }

  updateTimerPlayButtonState(running) {
    const playIcon = document.getElementById('timerPlayIcon');
    const pauseIcon = document.getElementById('timerPauseIcon');
    const btnText = document.getElementById('timerToggleText');

    if (running) {
      if (playIcon) playIcon.classList.add('hidden');
      if (pauseIcon) pauseIcon.classList.remove('hidden');
      if (btnText) btnText.textContent = 'Pause';
    } else {
      if (playIcon) playIcon.classList.remove('hidden');
      if (pauseIcon) pauseIcon.classList.add('hidden');
      if (btnText) btnText.textContent = 'Start Focus';
    }
  }

  completeCurrentFocusedTask() {
    const taskId = window.ui.activeFocusTaskId;
    if (taskId) {
      window.ui.toggleTaskComplete(taskId);
      const task = window.storage.getTaskById(taskId);
      if (task && task.completed) {
        document.getElementById('focusCurrentTaskTitle').textContent = 'Task Finished! Select your next focus block.';
        const badge = document.getElementById('focusSubjectBadge');
        if (badge) {
          badge.textContent = 'Completed';
          badge.style.backgroundColor = 'var(--color-success)';
        }
      }
    } else {
      window.ui.showToast('Select a task first before completing.', 'info');
    }
  }

  // ==========================================
  // PROCEDURAL OFFLINE AUDIO SYNTHESIZER
  // ==========================================
  setupAmbientAudio() {
    const ambientBtns = document.querySelectorAll('.ambient-btn');
    const volSlider = document.getElementById('ambientVolumeSlider');

    ambientBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const soundType = btn.dataset.sound;
        ambientBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (window.audioSynth) {
          window.audioSynth.playAmbient(soundType);
        }
      });
    });

    if (volSlider) {
      volSlider.addEventListener('input', () => {
        const val = parseFloat(volSlider.value);
        if (window.audioSynth) {
          window.audioSynth.setVolume(val);
        }
      });
    }
  }

  // ==========================================
  // EVENT LISTENERS
  // ==========================================
  setupEventListeners() {
    // 1. Engine Context Adjustment Bar
    const timeFilter = document.getElementById('filterAvailableTime');
    const energyFilter = document.getElementById('filterEnergy');
    const strategyFilter = document.getElementById('filterStrategy');
    const recalcBtn = document.getElementById('recalculateBtn');

    const updateRankings = () => {
      const tasks = window.storage.getTasks();
      window.ui.renderWhatToDoNow(tasks);
    };

    if (timeFilter) timeFilter.addEventListener('change', updateRankings);
    if (energyFilter) energyFilter.addEventListener('change', updateRankings);
    if (strategyFilter) strategyFilter.addEventListener('change', updateRankings);
    if (recalcBtn) recalcBtn.addEventListener('click', () => {
      if (window.audioSynth) window.audioSynth.playClick();
      updateRankings();
      window.ui.showToast('Priority weights refreshed.', 'info');
    });

    // 2. Scheduler Controls
    const generateBtn = document.getElementById('generateScheduleBtn');
    const copySchedBtn = document.getElementById('copyScheduleBtn');
    const startSchedBtn = document.getElementById('startCurrentBlockBtn');
    const totalMinutesSelect = document.getElementById('schedTotalMinutes');
    const customMinutesGroup = document.getElementById('customMinutesGroup');

    if (totalMinutesSelect) {
      totalMinutesSelect.addEventListener('change', () => {
        if (totalMinutesSelect.value === 'custom') {
          customMinutesGroup?.classList.remove('hidden');
        } else {
          customMinutesGroup?.classList.add('hidden');
        }
      });
    }

    if (generateBtn) {
      generateBtn.addEventListener('click', () => {
        if (window.audioSynth) window.audioSynth.playClick();
        window.ui.triggerScheduleGeneration();
        window.ui.showToast('Optimal schedule timeline generated!', 'success');
      });
    }

    if (copySchedBtn) {
      copySchedBtn.addEventListener('click', () => {
        if (!window.ui.lastSchedule) {
          window.ui.triggerScheduleGeneration();
        }
        if (window.ui.lastSchedule) {
          const text = window.SmartScheduler.formatScheduleAsText(window.ui.lastSchedule);
          navigator.clipboard.writeText(text).then(() => {
            window.ui.showToast('Study schedule copied to clipboard!', 'success');
          }).catch(() => {
            window.ui.showToast('Failed to copy to clipboard.', 'danger');
          });
        }
      });
    }

    if (startSchedBtn) {
      startSchedBtn.addEventListener('click', () => {
        if (!window.ui.lastSchedule) {
          window.ui.triggerScheduleGeneration();
        }
        if (window.ui.lastSchedule && window.ui.lastSchedule.timeline.length > 0) {
          const firstWork = window.ui.lastSchedule.timeline.find(b => b.type === 'work');
          if (firstWork) {
            window.ui.startFocusOnTask(firstWork.taskId);
            this.startTimer();
          }
        } else {
          window.ui.switchView('focusRoom');
        }
      });
    }

    // 3. Search & Filters for All Tasks
    const searchInput = document.getElementById('taskSearchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const taskSubj = document.getElementById('taskFilterSubject');
    const taskPri = document.getElementById('taskFilterPriority');
    const taskStat = document.getElementById('taskFilterStatus');
    const taskSort = document.getElementById('taskSortBy');

    const handleSearchFilter = () => {
      const tasks = window.storage.getTasks();
      window.ui.renderAllTasks(tasks);
      if (clearSearchBtn) {
        clearSearchBtn.classList.toggle('hidden', !searchInput.value);
      }
    };

    if (searchInput) searchInput.addEventListener('input', handleSearchFilter);
    if (clearSearchBtn) clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      handleSearchFilter();
    });
    if (taskSubj) taskSubj.addEventListener('change', handleSearchFilter);
    if (taskPri) taskPri.addEventListener('change', handleSearchFilter);
    if (taskStat) taskStat.addEventListener('change', handleSearchFilter);
    if (taskSort) taskSort.addEventListener('change', handleSearchFilter);

    // 4. Focus Room Micro Checklist Add
    const addSubtaskBtn = document.getElementById('addFocusSubtaskBtn');
    const subtaskInput = document.getElementById('newFocusSubtaskInput');
    if (addSubtaskBtn) addSubtaskBtn.addEventListener('click', () => window.ui.addFocusSubtask());
    if (subtaskInput) {
      subtaskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          window.ui.addFocusSubtask();
        }
      });
    }

    // 5. Select Task button inside focus room
    const focusSelectTaskBtn = document.getElementById('focusSelectTaskBtn');
    if (focusSelectTaskBtn) {
      focusSelectTaskBtn.addEventListener('click', () => window.ui.switchView('whatToDoNow'));
    }

    // 6. Fullscreen button in Focus Room
    const fullscreenBtn = document.getElementById('focusFullscreenBtn');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    // 7. Dashboard Jump To Rank Button
    const dashJump = document.getElementById('dashJumpToRankBtn');
    if (dashJump) {
      dashJump.addEventListener('click', () => window.ui.switchView('whatToDoNow'));
    }
  }

  // ==========================================
  // THEME MANAGEMENT
  // ==========================================
  initTheme() {
    const settings = window.storage.getSettings();
    const isLight = settings.theme === 'light';
    this.applyTheme(isLight);

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const currentIsLight = document.body.classList.contains('theme-light');
        const nextIsLight = !currentIsLight;
        this.applyTheme(nextIsLight);
        window.storage.saveSettings({ ...settings, theme: nextIsLight ? 'light' : 'dark' });
      });
    }
  }

  applyTheme(isLight) {
    document.body.classList.toggle('theme-light', isLight);
    document.body.classList.toggle('theme-dark', !isLight);

    const sun = document.getElementById('themeIconSun');
    const moon = document.getElementById('themeIconMoon');
    const label = document.getElementById('themeToggleLabel');

    if (sun && moon) {
      sun.classList.toggle('hidden', isLight);
      moon.classList.toggle('hidden', !isLight);
    }
    if (label) {
      label.textContent = isLight ? 'Light' : 'Dark';
    }
  }

  // ==========================================
  // KEYBOARD SHORTCUTS
  // ==========================================
  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';

      // Escape closes modals
      if (e.key === 'Escape') {
        window.ui.closeTaskModal();
        document.getElementById('dataModal')?.classList.add('hidden');
        return;
      }

      // Ignore shortcuts if user is typing in an input
      if (isInput) return;

      // 'N' for New Task
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        window.ui.openTaskModal();
      }

      // 'Space' to toggle timer
      if (e.code === 'Space') {
        e.preventDefault();
        this.toggleTimer();
      }

      // 'F' to jump to Focus Room
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        window.ui.switchView('focusRoom');
      }

      // '/' to focus search
      if (e.key === '/') {
        e.preventDefault();
        window.ui.switchView('tasks');
        const searchInput = document.getElementById('taskSearchInput');
        if (searchInput) searchInput.focus();
      }
    });
  }
}

// Boot application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  window.app.init();
});
