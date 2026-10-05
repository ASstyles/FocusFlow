/**
 * FocusFlow - Offline Local Storage Manager
 * 100% Client-Side LocalStorage with zero external APIs or Firebase.
 */

const STORAGE_KEYS = {
  TASKS: 'focusflow_tasks',
  SESSIONS: 'focusflow_focus_sessions',
  SETTINGS: 'focusflow_settings',
  STREAK: 'focusflow_streak'
};

/**
 * Robust Local ISO String Formatter (YYYY-MM-DDTHH:mm)
 * Preserves local device timezone instead of shifting to UTC!
 */
function toLocalISOString(date) {
  const d = (date instanceof Date) ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const HH = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${YYYY}-${MM}-${DD}T${HH}:${mm}`;
}
window.toLocalISOString = toLocalISOString;

class StorageManager {
  constructor() {
    this.init();
  }

  init() {
    // If first launch ever, seed with realistic student productivity tasks
    if (!localStorage.getItem(STORAGE_KEYS.TASKS)) {
      this.seedInitialData();
    }
    this.updateStreak();
  }

  /**
   * Seed realistic sample student tasks with deadlines relative to current local time
   */
  seedInitialData() {
    const now = new Date();

    const addHours = (h) => {
      const dt = new Date(now.getTime() + h * 60 * 60 * 1000);
      return toLocalISOString(dt);
    };

    const addDays = (d, h = 18) => {
      const dt = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
      dt.setHours(h, 0, 0, 0);
      return toLocalISOString(dt);
    };

    const initialTasks = [
      {
        id: 'task_' + (Date.now() - 5000),
        title: 'Organic Chemistry Lab Report: Ester Synthesis',
        subject: 'Chemistry',
        deadline: addHours(8), // Due in 8 hours!
        priority: 'urgent',
        difficulty: 'challenging',
        estimatedTime: 60,
        progress: 40,
        timeSpent: 25,
        subtasks: [
          { id: 'st_1', title: 'Calculate theoretical yield', completed: true },
          { id: 'st_2', title: 'Plot IR spectrum analysis graph', completed: true },
          { id: 'st_3', title: 'Write error discussion section', completed: false },
          { id: 'st_4', title: 'Final proofread and PDF export', completed: false }
        ],
        notes: 'Prof. Miller requires standard ACS formatting and NMR error bounds.',
        createdAt: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
        completed: false
      },
      {
        id: 'task_' + (Date.now() - 4000),
        title: 'Data Structures Problem Set: Dijkstra & Graph Traversal',
        subject: 'Computer Science',
        deadline: addDays(1, 14), // Due tomorrow at 2 PM local
        priority: 'high',
        difficulty: 'deep_work',
        estimatedTime: 90,
        progress: 25,
        timeSpent: 30,
        subtasks: [
          { id: 'st_21', title: 'Implement priority queue comparator', completed: true },
          { id: 'st_22', title: 'Handle disconnected graph edge cases', completed: false },
          { id: 'st_23', title: 'Pass benchmark unit tests', completed: false }
        ],
        notes: 'Review adjacency list vs matrix time complexity.',
        createdAt: new Date(now.getTime() - 48 * 3600 * 1000).toISOString(),
        completed: false
      },
      {
        id: 'task_' + (Date.now() - 3000),
        title: 'Review Calculus III Lecture Notes: Double Integrals',
        subject: 'Mathematics',
        deadline: addDays(2, 10),
        priority: 'medium',
        difficulty: 'moderate',
        estimatedTime: 45,
        progress: 0,
        timeSpent: 0,
        subtasks: [
          { id: 'st_31', title: 'Review polar coordinate transformation formulas', completed: false },
          { id: 'st_32', title: 'Complete textbook exercises 14.3 (#1-10)', completed: false }
        ],
        notes: 'Polar transformations: r*dr*dtheta.',
        createdAt: new Date(now.getTime() - 12 * 3600 * 1000).toISOString(),
        completed: false
      },
      {
        id: 'task_' + (Date.now() - 2000),
        title: 'Read Modern History Chapter 7: Cold War Détente',
        subject: 'History',
        deadline: addDays(3, 17),
        priority: 'medium',
        difficulty: 'quick_win',
        estimatedTime: 30,
        progress: 60,
        timeSpent: 20,
        subtasks: [
          { id: 'st_41', title: 'Read pages 142-168', completed: true },
          { id: 'st_42', title: 'Write 3 bullet points for seminar discussion', completed: false }
        ],
        notes: 'Focus on SALT I treaties and Helsinki Accords.',
        createdAt: new Date(now.getTime() - 72 * 3600 * 1000).toISOString(),
        completed: false
      },
      {
        id: 'task_' + (Date.now() - 1000),
        title: 'Submit Online Weekly Quiz on Cellular Respiration',
        subject: 'Biology',
        deadline: addHours(14),
        priority: 'high',
        difficulty: 'quick_win',
        estimatedTime: 20,
        progress: 0,
        timeSpent: 0,
        subtasks: [
          { id: 'st_51', title: 'Review Krebs cycle ATP yield', completed: false },
          { id: 'st_52', title: 'Complete 15-question quiz on portal', completed: false }
        ],
        notes: 'Only 1 attempt allowed. Timer starts immediately upon launch.',
        createdAt: new Date(now.getTime() - 6 * 3600 * 1000).toISOString(),
        completed: false
      },
      {
        id: 'task_' + Date.now(),
        title: 'Physics Lab 4: Pendulum Periodicity Analysis',
        subject: 'Physics',
        deadline: addDays(-1, 16), // Finished yesterday
        priority: 'medium',
        difficulty: 'moderate',
        estimatedTime: 45,
        progress: 100,
        timeSpent: 45,
        subtasks: [],
        notes: 'Graded: A',
        createdAt: new Date(now.getTime() - 96 * 3600 * 1000).toISOString(),
        completed: true,
        completedAt: new Date(now.getTime() - 20 * 3600 * 1000).toISOString()
      }
    ];

    this.saveTasks(initialTasks);

    // Initial mock focus sessions for analytics
    const pastSessions = [
      { date: new Date(now.getTime() - 4 * 86400000).toISOString().slice(0, 10), minutes: 90, subject: 'Computer Science' },
      { date: new Date(now.getTime() - 3 * 86400000).toISOString().slice(0, 10), minutes: 125, subject: 'Chemistry' },
      { date: new Date(now.getTime() - 2 * 86400000).toISOString().slice(0, 10), minutes: 60, subject: 'Physics' },
      { date: new Date(now.getTime() - 1 * 86400000).toISOString().slice(0, 10), minutes: 140, subject: 'Chemistry' },
      { date: now.toISOString().slice(0, 10), minutes: 55, subject: 'Computer Science' }
    ];
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(pastSessions));
  }

  // Task Methods
  getTasks() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TASKS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading tasks from storage', e);
      return [];
    }
  }

  saveTasks(tasks) {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }

  getTaskById(id) {
    const tasks = this.getTasks();
    return tasks.find(t => t.id === id);
  }

  addTask(taskData) {
    const tasks = this.getTasks();
    const progressVal = parseInt(taskData.progress, 10) || 0;
    const isCompleted = progressVal >= 100;

    const newTask = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title: taskData.title ? taskData.title.trim() : 'Untitled Task',
      subject: taskData.subject ? taskData.subject.trim() : 'General',
      deadline: taskData.deadline || toLocalISOString(new Date(Date.now() + 24 * 3600 * 1000)),
      priority: taskData.priority || 'medium',
      difficulty: taskData.difficulty || 'moderate',
      estimatedTime: parseInt(taskData.estimatedTime, 10) || 45,
      progress: progressVal,
      timeSpent: 0,
      subtasks: Array.isArray(taskData.subtasks) ? taskData.subtasks : [],
      notes: taskData.notes ? taskData.notes.trim() : '',
      createdAt: new Date().toISOString(),
      completed: isCompleted,
      completedAt: isCompleted ? new Date().toISOString() : null
    };

    tasks.unshift(newTask);
    this.saveTasks(tasks);
    return newTask;
  }

  updateTask(id, updatedFields) {
    const tasks = this.getTasks();
    const index = tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...updatedFields };

      // Synchronize completion status and progress cleanly
      if (typeof updatedFields.completed !== 'undefined') {
        const comp = Boolean(updatedFields.completed);
        tasks[index].completed = comp;
        if (comp) {
          tasks[index].progress = 100;
          if (!tasks[index].completedAt) tasks[index].completedAt = new Date().toISOString();
          if (tasks[index].subtasks) {
            tasks[index].subtasks.forEach(st => st.completed = true);
          }
        } else {
          if (tasks[index].progress >= 100) tasks[index].progress = 0;
          tasks[index].completedAt = null;
        }
      } else if (typeof updatedFields.progress !== 'undefined') {
        const p = Math.max(0, Math.min(100, parseInt(updatedFields.progress, 10) || 0));
        tasks[index].progress = p;
        if (p >= 100) {
          tasks[index].completed = true;
          if (!tasks[index].completedAt) tasks[index].completedAt = new Date().toISOString();
        } else {
          tasks[index].completed = false;
          tasks[index].completedAt = null;
        }
      }

      this.saveTasks(tasks);
      return tasks[index];
    }
    return null;
  }

  deleteTask(id) {
    let tasks = this.getTasks();
    tasks = tasks.filter(t => t.id !== id);
    this.saveTasks(tasks);
  }

  toggleTaskComplete(id) {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      if (task.completed) {
        task.progress = 100;
        task.completedAt = new Date().toISOString();
        if (task.subtasks) {
          task.subtasks.forEach(st => st.completed = true);
        }
      } else {
        task.progress = 0;
        task.completedAt = null;
      }
      this.saveTasks(tasks);
      return task;
    }
    return null;
  }

  // Focus Session History
  getFocusSessions() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  recordFocusSession(minutes, taskId = null, subject = 'General') {
    const sessions = this.getFocusSessions();
    const today = new Date().toISOString().slice(0, 10);
    sessions.push({
      date: today,
      timestamp: new Date().toISOString(),
      minutes: Math.max(1, parseInt(minutes, 10) || 25),
      taskId: taskId,
      subject: subject || 'General'
    });
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));

    // Also add to task's timeSpent if associated
    if (taskId) {
      const task = this.getTaskById(taskId);
      if (task) {
        this.updateTask(taskId, {
          timeSpent: (task.timeSpent || 0) + minutes
        });
      }
    }

    this.updateStreak();
  }

  // Streak Tracker
  updateStreak() {
    const sessions = this.getFocusSessions();
    if (!sessions.length) {
      localStorage.setItem(STORAGE_KEYS.STREAK, '0');
      return 0;
    }

    const dates = [...new Set(sessions.map(s => s.date))].sort().reverse();
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    let streak = 0;
    let expectedDate = dates.includes(today) ? new Date() : (dates.includes(yesterday) ? new Date(Date.now() - 86400000) : null);

    if (!expectedDate) {
      localStorage.setItem(STORAGE_KEYS.STREAK, '0');
      return 0;
    }

    for (const d of dates) {
      const curr = expectedDate.toISOString().slice(0, 10);
      if (d === curr) {
        streak++;
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else if (d < curr) {
        break;
      }
    }

    const finalStreak = Math.max(streak, 1);
    localStorage.setItem(STORAGE_KEYS.STREAK, finalStreak.toString());
    return finalStreak;
  }

  getStreak() {
    return parseInt(localStorage.getItem(STORAGE_KEYS.STREAK) || '1', 10);
  }

  // Settings & Theme
  getSettings() {
    try {
      const s = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return s ? JSON.parse(s) : { theme: 'dark' };
    } catch (e) {
      return { theme: 'dark' };
    }
  }

  saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  // Import / Export
  exportAllData() {
    const backup = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      tasks: this.getTasks(),
      sessions: this.getFocusSessions(),
      settings: this.getSettings(),
      streak: this.getStreak()
    };
    return JSON.stringify(backup, null, 2);
  }

  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data && Array.isArray(data.tasks)) {
        this.saveTasks(data.tasks);
        if (Array.isArray(data.sessions)) {
          localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(data.sessions));
        }
        if (data.settings) {
          this.saveSettings(data.settings);
        }
        this.updateStreak();
        return { success: true, count: data.tasks.length };
      }
      return { success: false, error: 'Invalid file format: tasks array missing.' };
    } catch (err) {
      return { success: false, error: 'Failed to parse JSON file: ' + err.message };
    }
  }

  resetToSampleData() {
    localStorage.removeItem(STORAGE_KEYS.TASKS);
    localStorage.removeItem(STORAGE_KEYS.SESSIONS);
    this.seedInitialData();
  }

  clearAllData() {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.STREAK, '0');
  }
}

// Global instance
window.storage = new StorageManager();
