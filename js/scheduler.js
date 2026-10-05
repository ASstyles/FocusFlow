/**
 * FocusFlow - Smart Deadline Resource & Time Resource Allocator
 * Builds optimal timeline schedules packed into student's available time.
 */

class SmartScheduler {
  /**
   * Generate an optimal timeline schedule
   * @param {Array} tasks - all tasks from storage
   * @param {Object} options - { startTime, totalMinutes, breakStyle, taskScope }
   */
  static generateSchedule(tasks, options = {}) {
    const {
      startTime = this.getCurrentTimeString(),
      totalMinutes = 120,
      breakStyle = 'ultra50',
      taskScope = 'allIncomplete'
    } = options;

    const totalBudget = parseInt(totalMinutes, 10) || 120;

    // Filter tasks based on scope
    const now = new Date();
    let candidates = (tasks || []).filter(t => !t.completed && (t.progress || 0) < 100);

    if (taskScope === 'dueToday') {
      const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
      candidates = candidates.filter(t => {
        const d = new Date(t.deadline);
        return !isNaN(d.getTime()) && d <= tomorrow;
      });
    } else if (taskScope === 'highPriority') {
      candidates = candidates.filter(t => t.priority === 'urgent' || t.priority === 'high');
    }

    // Rank candidate tasks by urgency & focus score
    const rankedTasks = window.RankingEngine
      ? window.RankingEngine.rankTasks(candidates, { availableTime: totalBudget.toString(), energy: 'auto', strategy: 'smart' })
      : candidates;

    // Define Work/Break block sizes
    let workBlockLimit = 45;
    let breakDuration = 10;

    if (breakStyle === 'pomo25') {
      workBlockLimit = 25;
      breakDuration = 5;
    } else if (breakStyle === 'ultra50') {
      workBlockLimit = 50;
      breakDuration = 10;
    } else if (breakStyle === 'flow75') {
      workBlockLimit = 75;
      breakDuration = 15;
    } else if (breakStyle === 'none') {
      workBlockLimit = 90;
      breakDuration = 3;
    }

    // Safe parse start time into minutes from midnight
    const safeStartTime = startTime && startTime.includes(':') ? startTime : this.getCurrentTimeString();
    const [rawH, rawM] = safeStartTime.split(':').map(Number);
    let currentMinute = (isNaN(rawH) ? 9 : rawH) * 60 + (isNaN(rawM) ? 0 : rawM);
    const endLimitMinute = currentMinute + totalBudget;

    const timeline = [];
    let allocatedWorkMinutes = 0;
    let allocatedBreakMinutes = 0;
    const tasksCovered = new Set();

    // Map remaining work per task so large tasks can be split across multiple focus blocks!
    const taskWorkQueue = rankedTasks.map(t => {
      const est = t.estimatedTime || 45;
      const prog = t.progress || 0;
      const needed = Math.max(15, Math.round(est * (1 - prog / 100)));
      return {
        task: t,
        neededMinutes: needed,
        scheduledMinutes: 0,
        blocksCount: 0
      };
    });

    let queueIndex = 0;

    while (currentMinute < endLimitMinute && queueIndex < taskWorkQueue.length) {
      const remainingTotalWindow = endLimitMinute - currentMinute;

      if (remainingTotalWindow < 10) {
        break; // Less than 10 mins remaining in budget
      }

      const item = taskWorkQueue[queueIndex];
      const remainingForThisTask = item.neededMinutes - item.scheduledMinutes;

      if (remainingForThisTask <= 0) {
        queueIndex++;
        continue;
      }

      // Calculate chunk size
      let chunkSize = Math.min(remainingForThisTask, workBlockLimit);
      chunkSize = Math.min(chunkSize, remainingTotalWindow);

      if (chunkSize <= 0) break;

      const blockStart = this.minutesToTimeString(currentMinute);
      currentMinute += chunkSize;
      const blockEnd = this.minutesToTimeString(currentMinute);

      allocatedWorkMinutes += chunkSize;
      item.scheduledMinutes += chunkSize;
      item.blocksCount++;
      tasksCovered.add(item.task.id);

      // Part label
      let partLabel = '';
      if (item.neededMinutes > workBlockLimit) {
        partLabel = `Part ${item.blocksCount} (${chunkSize}m)`;
      } else {
        partLabel = `Full Target (${chunkSize}m)`;
      }

      timeline.push({
        id: 'block_' + Math.random().toString(36).substr(2, 6),
        type: 'work',
        taskId: item.task.id,
        taskTitle: item.task.title,
        subject: item.task.subject,
        priority: item.task.priority,
        difficulty: item.task.difficulty,
        deadline: item.task.deadline,
        startTime: blockStart,
        endTime: blockEnd,
        duration: chunkSize,
        partLabel: partLabel
      });

      // If this task still has significant work left (>15m) and we have window remaining,
      // allow next block to be either this task again or alternate
      if (item.scheduledMinutes >= item.neededMinutes) {
        queueIndex++;
      }

      // Check if we should insert a rest break before the next block
      const hasMoreTasks = queueIndex < taskWorkQueue.length && (taskWorkQueue[queueIndex].neededMinutes - taskWorkQueue[queueIndex].scheduledMinutes > 0);
      if (currentMinute + breakDuration <= endLimitMinute && hasMoreTasks && breakStyle !== 'none') {
        const breakStart = this.minutesToTimeString(currentMinute);
        currentMinute += breakDuration;
        const breakEnd = this.minutesToTimeString(currentMinute);
        allocatedBreakMinutes += breakDuration;

        timeline.push({
          id: 'break_' + Math.random().toString(36).substr(2, 6),
          type: 'break',
          title: this.getRandomBreakActivity(),
          startTime: breakStart,
          endTime: breakEnd,
          duration: breakDuration
        });
      }
    }

    // Feasibility & Deficit Analysis
    const totalDemandedWork = rankedTasks.reduce((acc, t) => {
      const est = t.estimatedTime || 45;
      const prog = t.progress || 0;
      return acc + Math.round(est * (1 - prog / 100));
    }, 0);

    const urgentDemandedWork = rankedTasks
      .filter(t => t.priority === 'urgent' || (new Date(t.deadline).getTime() - now.getTime()) <= 24 * 3600 * 1000)
      .reduce((acc, t) => acc + (t.estimatedTime || 45), 0);

    const feasibilityStatus = this.assessFeasibility({
      totalBudget,
      allocatedWorkMinutes,
      urgentDemandedWork,
      totalDemandedWork,
      tasksCoveredCount: tasksCovered.size,
      totalCandidatesCount: rankedTasks.length
    });

    return {
      timeline,
      summary: {
        startTime: safeStartTime,
        endTime: this.minutesToTimeString(currentMinute),
        totalBudget,
        allocatedWorkMinutes,
        allocatedBreakMinutes,
        tasksScheduled: tasksCovered.size,
        totalTasksAvailable: rankedTasks.length,
        feasibility: feasibilityStatus
      }
    };
  }

  /**
   * Calculate realistic feasibility assessment and student recommendations
   */
  static assessFeasibility({ totalBudget, allocatedWorkMinutes, urgentDemandedWork, totalDemandedWork, tasksCoveredCount, totalCandidatesCount }) {
    if (tasksCoveredCount === 0) {
      return {
        level: 'empty',
        message: 'No pending tasks to schedule. Take a break or add new tasks!'
      };
    }

    if (totalBudget >= totalDemandedWork) {
      return {
        level: 'success',
        message: `✨ Perfect Capacity: Your ${totalBudget}m study window easily covers all ${totalCandidatesCount} pending tasks (${totalDemandedWork}m load). You will finish with zero backlog!`
      };
    }

    if (allocatedWorkMinutes >= urgentDemandedWork) {
      return {
        level: 'success',
        message: `✅ High Feasibility: Your available time covers all impending deadlines today (${tasksCoveredCount} tasks scheduled). Lower urgency tasks remain queued for tomorrow.`
      };
    }

    const deficit = urgentDemandedWork - allocatedWorkMinutes;
    return {
      level: 'warning',
      message: `⚠️ Workload Deficit (~${deficit}m): You have ${urgentDemandedWork}m of urgent work, but only ${allocatedWorkMinutes}m of focus time scheduled. FocusFlow prioritized the highest-impact items. Consider scheduling a short 30m evening booster session!`
    };
  }

  static getRandomBreakActivity() {
    const breaks = [
      '☕ Stand Up, Hydrate & Rest Eyes',
      '🚶 Quick 5-Minute Walk & Stretch',
      '💧 Drink Fresh Water & Reset Posture',
      '🌿 Deep Breathing & Mindful Reset',
      '🍎 Healthy Brain Snack & Refresh'
    ];
    return breaks[Math.floor(Math.random() * breaks.length)];
  }

  static getCurrentTimeString() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  static minutesToTimeString(totalMinutes) {
    const normalized = totalMinutes % (24 * 60);
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    const isNextDay = totalMinutes >= 24 * 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return isNextDay ? `${timeStr} (+1d)` : timeStr;
  }

  /**
   * Export schedule to clean Markdown / Plain Text
   */
  static formatScheduleAsText(scheduleResult) {
    const { timeline, summary } = scheduleResult;
    let text = `📅 FOCUSFLOW STUDY SCHEDULE (${summary.startTime} - ${summary.endTime})\n`;
    text += `⏱️ Total Window: ${summary.totalBudget} mins (${summary.allocatedWorkMinutes}m study + ${summary.allocatedBreakMinutes}m breaks)\n`;
    text += `--------------------------------------------------\n`;

    timeline.forEach(block => {
      if (block.type === 'work') {
        text += `[${block.startTime} - ${block.endTime}] 📚 ${block.taskTitle} (${block.subject}) - ${block.partLabel}\n`;
      } else {
        text += `[${block.startTime} - ${block.endTime}] ${block.title} (${block.duration}m)\n`;
      }
    });

    text += `--------------------------------------------------\n`;
    text += `Plan generated offline via FocusFlow.\n`;
    return text;
  }
}

// Global instance
window.SmartScheduler = SmartScheduler;
