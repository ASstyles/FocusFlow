/**
 * FocusFlow - Algorithmic "What Should I Do Now?" Ranking Engine
 * Computes multi-factor Focus Scores (0 - 100) and human-readable rationales.
 */

class RankingEngine {
  /**
   * Main rank method
   * @param {Array} tasks - list of task objects
   * @param {Object} context - { availableTime, energy, strategy }
   * @returns {Array} sorted tasks with .focusScore and .rationale
   */
  static rankTasks(tasks, context = {}) {
    const {
      availableTime = 'all',
      energy = 'moderate',
      strategy = 'smart'
    } = context;

    const now = new Date();

    // Only rank incomplete tasks
    const activeTasks = (tasks || []).filter(t => !t.completed && (t.progress || 0) < 100);

    if (activeTasks.length === 0) {
      return [];
    }

    const scoredTasks = activeTasks.map(task => {
      const metrics = this.calculateTaskScore(task, now, { availableTime, energy, strategy });
      return {
        ...task,
        focusScore: metrics.totalScore,
        scoreBreakdown: metrics.breakdown,
        rationale: metrics.rationale,
        urgencyLabel: metrics.urgencyLabel,
        isOverdue: metrics.isOverdue
      };
    });

    // Sort descending by focusScore
    scoredTasks.sort((a, b) => b.focusScore - a.focusScore);

    return scoredTasks;
  }

  /**
   * Compute scores and rationale for a single task
   */
  static calculateTaskScore(task, now, { availableTime, energy, strategy }) {
    const deadlineDate = new Date(task.deadline);
    let hoursUntilDeadline = 72;
    let isOverdue = false;

    if (!isNaN(deadlineDate.getTime())) {
      const msUntilDeadline = deadlineDate.getTime() - now.getTime();
      hoursUntilDeadline = msUntilDeadline / (1000 * 60 * 60);
      isOverdue = hoursUntilDeadline < 0;
    }

    // 1. Urgency Component (0 - 40 pts)
    let urgencyScore = 0;
    let urgencyLabel = '';

    if (isOverdue) {
      urgencyScore = 40;
      urgencyLabel = 'Overdue by ' + this.formatDuration(Math.abs(hoursUntilDeadline));
    } else if (hoursUntilDeadline <= 6) {
      urgencyScore = 38;
      urgencyLabel = `Due in ${Math.max(1, Math.ceil(hoursUntilDeadline))}h`;
    } else if (hoursUntilDeadline <= 12) {
      urgencyScore = 35;
      urgencyLabel = `Due in ${Math.ceil(hoursUntilDeadline)}h`;
    } else if (hoursUntilDeadline <= 24) {
      urgencyScore = 30;
      urgencyLabel = `Due in ${Math.ceil(hoursUntilDeadline)}h`;
    } else if (hoursUntilDeadline <= 48) {
      urgencyScore = 24;
      urgencyLabel = `Due tomorrow`;
    } else if (hoursUntilDeadline <= 72) {
      urgencyScore = 18;
      urgencyLabel = `Due in 3 days`;
    } else if (hoursUntilDeadline <= 168) { // 7 days
      urgencyScore = 12;
      urgencyLabel = `Due this week`;
    } else {
      urgencyScore = 5;
      urgencyLabel = `Due in ${Math.ceil(hoursUntilDeadline / 24)} days`;
    }

    // 2. Priority Component (0 - 30 pts)
    const priorityWeights = {
      urgent: 30,
      high: 22,
      medium: 14,
      low: 6
    };
    const priorityScore = priorityWeights[task.priority] || 14;

    // 3. Difficulty & Energy Alignment Component (0 - 20 pts)
    let energyFitScore = 10;
    const diff = task.difficulty || 'moderate';

    if (energy === 'auto' || energy === 'high') {
      // Peak cognitive energy: reward hard challenges
      if (diff === 'deep_work') energyFitScore = 20;
      else if (diff === 'challenging') energyFitScore = 18;
      else if (diff === 'moderate') energyFitScore = 12;
      else if (diff === 'quick_win') energyFitScore = 8;
    } else if (energy === 'low') {
      // Low cognitive energy: reward quick wins to prevent avoidance
      if (diff === 'quick_win') energyFitScore = 20;
      else if (diff === 'moderate') energyFitScore = 12;
      else if (diff === 'challenging') energyFitScore = 4;
      else if (diff === 'deep_work') energyFitScore = 0;
    } else {
      // Moderate steady energy
      if (diff === 'moderate') energyFitScore = 20;
      else if (diff === 'quick_win') energyFitScore = 16;
      else if (diff === 'challenging') energyFitScore = 14;
      else if (diff === 'deep_work') energyFitScore = 8;
    }

    // 4. Available Time Window Fit (0 - 10 pts)
    let timeFitScore = 7;
    const est = task.estimatedTime || 45;

    if (availableTime !== 'all') {
      const avail = parseInt(availableTime, 10);
      if (est <= avail) {
        if (est >= avail * 0.6) {
          timeFitScore = 10; // Perfect fit
        } else {
          timeFitScore = 8;
        }
      } else {
        // Exceeds available time
        if (est <= avail * 1.4) {
          timeFitScore = 3;
        } else {
          timeFitScore = 0;
        }
      }
    }

    // 5. Momentum Bonus (+5 pts if already partially done)
    let momentumScore = 0;
    if (task.progress >= 40 && task.progress < 100) {
      momentumScore = 5;
    }

    // Apply Strategy Multipliers
    let totalScore = 0;
    if (strategy === 'crunch') {
      // Pure deadline & priority mode
      totalScore = Math.round(urgencyScore * 1.6 + priorityScore * 1.1 + momentumScore);
    } else if (strategy === 'quickWins') {
      // Lowest difficulty and fastest tasks
      const quickMultiplier = diff === 'quick_win' ? 30 : (diff === 'moderate' ? 18 : 6);
      const timeBonus = est <= 30 ? 20 : (est <= 60 ? 10 : 0);
      totalScore = Math.round(quickMultiplier + timeBonus + urgencyScore * 0.7 + priorityScore * 0.5);
    } else if (strategy === 'deepWork') {
      // Heaviest cognitive load first
      const deepMultiplier = diff === 'deep_work' ? 35 : (diff === 'challenging' ? 25 : 10);
      totalScore = Math.round(deepMultiplier + urgencyScore * 0.8 + priorityScore * 0.8);
    } else {
      // Balanced Smart AI mode
      totalScore = Math.round(urgencyScore + priorityScore + energyFitScore + timeFitScore + momentumScore);
    }

    // Guard against NaN and clamp between 5 and 99
    if (isNaN(totalScore)) totalScore = 50;
    totalScore = Math.max(5, Math.min(99, totalScore));

    // Formulate human-readable rationale
    const rationale = this.generateRationale(task, {
      isOverdue,
      hoursUntilDeadline,
      priority: task.priority,
      difficulty: diff,
      energy,
      availableTime,
      progress: task.progress,
      estimatedTime: est
    });

    return {
      totalScore,
      isOverdue,
      urgencyLabel,
      breakdown: {
        urgency: urgencyScore,
        priority: priorityScore,
        energyFit: energyFitScore,
        timeFit: timeFitScore,
        momentum: momentumScore
      },
      rationale
    };
  }

  /**
   * Generate clear, motivating explanations
   */
  static generateRationale(task, ctx) {
    const reasons = [];

    if (ctx.isOverdue) {
      reasons.push('⚠️ Past due date - critical to resolve immediately');
    } else if (ctx.hoursUntilDeadline <= 12) {
      reasons.push(`⏰ Impending deadline (in ${Math.max(1, Math.ceil(ctx.hoursUntilDeadline))} hours)`);
    } else if (ctx.hoursUntilDeadline <= 24) {
      reasons.push('📅 Due within the next 24 hours');
    }

    if (ctx.priority === 'urgent') {
      reasons.push('🔥 Urgent high-stake priority');
    } else if (ctx.priority === 'high') {
      reasons.push('⚡ High academic impact');
    }

    if (ctx.energy === 'low' && ctx.difficulty === 'quick_win') {
      reasons.push('🌱 Light cognitive load - perfect low-friction start for low energy');
    } else if ((ctx.energy === 'auto' || ctx.energy === 'high') && (ctx.difficulty === 'deep_work' || ctx.difficulty === 'challenging')) {
      reasons.push('🧠 Heavy cognitive challenge aligned with your peak focus hours');
    }

    if (ctx.availableTime !== 'all') {
      const avail = parseInt(ctx.availableTime, 10);
      if (ctx.estimatedTime <= avail) {
        reasons.push(`⏱️ Fits neatly into your ${avail}m study window (${ctx.estimatedTime}m est.)`);
      }
    }

    if (ctx.progress >= 50) {
      reasons.push(`🚀 Already ${ctx.progress}% complete - quick momentum to finish off`);
    }

    if (reasons.length === 0) {
      reasons.push('🎯 Optimal balanced priority based on course load');
    }

    return reasons.slice(0, 3);
  }

  static formatDuration(hours) {
    if (hours < 1) {
      return `${Math.max(1, Math.round(hours * 60))}m`;
    }
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remH = Math.round(hours % 24);
      return remH > 0 ? `${days}d ${remH}h` : `${days}d`;
    }
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
}

// Global instance
window.RankingEngine = RankingEngine;
