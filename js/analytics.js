/**
 * FocusFlow - Native SVG Analytics & Charts Engine
 * 100% offline, zero external dependencies or CDN libraries.
 */

class AnalyticsEngine {
  /**
   * Colors for subjects
   */
  static getSubjectColor(subject) {
    const s = (subject || '').toLowerCase().trim();
    if (s.includes('comp') || s.includes('cs') || s.includes('code') || s.includes('data')) return '#3b82f6';
    if (s.includes('math') || s.includes('calc') || s.includes('algebra') || s.includes('stat')) return '#8b5cf6';
    if (s.includes('chem')) return '#10b981';
    if (s.includes('phys')) return '#f59e0b';
    if (s.includes('lit') || s.includes('eng') || s.includes('write')) return '#ec4899';
    if (s.includes('bio')) return '#14b8a6';
    if (s.includes('hist') || s.includes('law')) return '#eab308';
    if (s.includes('econ') || s.includes('bus')) return '#06b6d4';
    return '#64748b';
  }

  /**
   * Render SVG Donut Chart for Subject Distribution
   */
  static renderSubjectDonut(tasks, containerId, legendId) {
    const container = document.getElementById(containerId);
    const legend = document.getElementById(legendId);
    const subjectCountBadge = document.getElementById('dashSubjectCount');
    if (!container || !legend) return;

    if (!tasks || tasks.length === 0) {
      container.innerHTML = `<div class="text-muted text-xs" style="text-align:center; padding-top: 50px;">No task data</div>`;
      legend.innerHTML = '';
      if (subjectCountBadge) subjectCountBadge.textContent = '0 Subjects';
      return;
    }

    // Group tasks by subject
    const subjectMap = {};
    let totalMinutes = 0;

    tasks.forEach(t => {
      const subj = t.subject ? t.subject.trim() : 'General';
      const est = Math.max(10, t.estimatedTime || 30);
      if (!subjectMap[subj]) {
        subjectMap[subj] = { count: 0, minutes: 0, color: this.getSubjectColor(subj) };
      }
      subjectMap[subj].count++;
      subjectMap[subj].minutes += est;
      totalMinutes += est;
    });

    const entries = Object.entries(subjectMap).sort((a, b) => b[1].minutes - a[1].minutes);
    if (subjectCountBadge) {
      subjectCountBadge.textContent = `${entries.length} Subject${entries.length === 1 ? '' : 's'}`;
    }

    const safeTotalMinutes = Math.max(1, totalMinutes);
    const radius = 55;
    const strokeWidth = 22;
    const circumference = 2 * Math.PI * radius;

    let currentOffset = 0;
    let svgPaths = '';

    entries.forEach(([subj, data]) => {
      const percent = data.minutes / safeTotalMinutes;
      const strokeDash = Math.max(2, percent * circumference);
      const strokeGap = Math.max(0, circumference - strokeDash);

      svgPaths += `
        <circle cx="75" cy="75" r="${radius}"
          fill="none"
          stroke="${data.color}"
          stroke-width="${strokeWidth}"
          stroke-dasharray="${strokeDash} ${strokeGap}"
          stroke-dashoffset="${-currentOffset}"
          class="donut-segment">
          <title>${subj}: ${data.minutes}m (${Math.round(percent * 100)}%)</title>
        </circle>
      `;
      currentOffset += strokeDash;
    });

    const totalHours = (totalMinutes / 60).toFixed(1);

    container.innerHTML = `
      <svg viewBox="0 0 150 150" style="transform: rotate(-90deg); width: 100%; height: 100%;">
        <circle cx="75" cy="75" r="${radius}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="${strokeWidth}" />
        ${svgPaths}
      </svg>
      <div style="position: absolute; top:0; left:0; width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none;">
        <span style="font-size: 1.15rem; font-weight:800; color: #fff;">${totalHours}h</span>
        <span style="font-size: 0.65rem; color: var(--text-muted); text-transform:uppercase;">Total Load</span>
      </div>
    `;
    container.style.position = 'relative';

    // Populate Legend
    legend.innerHTML = entries.map(([subj, data]) => {
      const percent = Math.round((data.minutes / safeTotalMinutes) * 100);
      return `
        <div class="legend-item">
          <div class="legend-left">
            <span class="legend-color-box" style="background-color: ${data.color}"></span>
            <span class="legend-name">${subj}</span>
          </div>
          <span class="text-muted text-xs">${percent}% (${data.count} tasks)</span>
        </div>
      `;
    }).join('');
  }

  /**
   * Render 7-Day Study Activity SVG Bar Chart
   */
  static render7DayBarChart(sessions, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Generate past 7 days list
    const days = [];
    const now = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const isoDate = d.toISOString().slice(0, 10);
      days.push({
        date: isoDate,
        label: dayNames[d.getDay()],
        isToday: i === 0,
        minutes: 0,
        sessionsCount: 0
      });
    }

    // Aggregate sessions
    (sessions || []).forEach(s => {
      const match = days.find(d => d.date === s.date);
      if (match) {
        match.minutes += (s.minutes || 0);
        match.sessionsCount++;
      }
    });

    const maxMinutes = Math.max(...days.map(d => d.minutes), 60); // min scale 60m
    const chartHeight = 160;
    const chartWidth = 560;
    const barWidth = 38;
    const gap = (chartWidth - (barWidth * 7)) / 8;

    let barsSVG = '';

    days.forEach((day, idx) => {
      const x = gap + idx * (barWidth + gap);
      const barHeight = Math.max(4, (day.minutes / maxMinutes) * chartHeight);
      const y = chartHeight - barHeight + 20;
      const isHigh = day.minutes >= 90;
      const fillColor = day.isToday
        ? 'url(#todayGradient)'
        : (isHigh ? '#6366f1' : '#334155');

      barsSVG += `
        <g class="barchart-bar-group" tabindex="0">
          <title>${day.date}: ${day.minutes} mins (${day.sessionsCount} sessions)</title>
          <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="6" fill="${fillColor}" />
          ${day.minutes > 0 ? `<text x="${x + barWidth / 2}" y="${y - 6}" text-anchor="middle" font-size="11" fill="var(--text-secondary)" font-family="monospace">${day.minutes}m</text>` : ''}
          <text x="${x + barWidth / 2}" y="${chartHeight + 36}" text-anchor="middle" font-size="12" font-weight="${day.isToday ? '700' : '500'}" fill="${day.isToday ? 'var(--accent-primary)' : 'var(--text-muted)'}">${day.label}</text>
        </g>
      `;
    });

    container.innerHTML = `
      <svg viewBox="0 0 ${chartWidth} ${chartHeight + 50}" style="width: 100%; height: 100%;">
        <defs>
          <linearGradient id="todayGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#8b5cf6" />
            <stop offset="100%" stop-color="#6366f1" />
          </linearGradient>
        </defs>
        <!-- Horizontal grid lines -->
        <line x1="10" y1="${chartHeight + 20}" x2="${chartWidth - 10}" y2="${chartHeight + 20}" stroke="var(--border-subtle)" stroke-width="1" />
        <line x1="10" y1="${chartHeight / 2 + 20}" x2="${chartWidth - 10}" y2="${chartHeight / 2 + 20}" stroke="var(--border-subtle)" stroke-width="1" stroke-dasharray="4 4" />
        ${barsSVG}
      </svg>
    `;
  }

  /**
   * Render Eisenhower Urgency & Difficulty Matrix & Top Summary Metrics
   */
  static renderMatrix(tasks) {
    const q1List = document.getElementById('q1TaskList');
    const q2List = document.getElementById('q2TaskList');
    const q3List = document.getElementById('q3TaskList');
    const q4List = document.getElementById('q4TaskList');

    const q1Count = document.getElementById('q1Count');
    const q2Count = document.getElementById('q2Count');
    const q3Count = document.getElementById('q3Count');
    const q4Count = document.getElementById('q4Count');

    if (!q1List) return;

    const allTasks = tasks || [];
    const now = new Date();
    const activeTasks = allTasks.filter(t => !t.completed);

    const q1 = []; // Urgent & High Difficulty
    const q2 = []; // Urgent & Low Difficulty
    const q3 = []; // Not Urgent & High Difficulty
    const q4 = []; // Not Urgent & Low Difficulty

    activeTasks.forEach(task => {
      const deadlineDate = new Date(task.deadline);
      const ms = !isNaN(deadlineDate.getTime()) ? deadlineDate.getTime() - now.getTime() : 72 * 3600 * 1000;
      const isUrgent = task.priority === 'urgent' || task.priority === 'high' || ms <= 48 * 3600 * 1000;
      const isHighDiff = task.difficulty === 'deep_work' || task.difficulty === 'challenging';

      if (isUrgent && isHighDiff) q1.push(task);
      else if (isUrgent && !isHighDiff) q2.push(task);
      else if (!isUrgent && isHighDiff) q3.push(task);
      else q4.push(task);
    });

    const renderList = (el, countEl, items) => {
      countEl.textContent = items.length;
      if (items.length === 0) {
        el.innerHTML = `<span class="text-muted text-xs" style="padding: 0.5rem;">None currently active</span>`;
        return;
      }
      el.innerHTML = items.map(t => `
        <div class="quadrant-task-mini">
          <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80%;">${t.title}</span>
          <span class="badge-mini">${t.estimatedTime || 30}m</span>
        </div>
      `).join('');
    };

    renderList(q1List, q1Count, q1);
    renderList(q2List, q2Count, q2);
    renderList(q3List, q3Count, q3);
    renderList(q4List, q4Count, q4);

    // Productivity Metrics
    const completedTasks = allTasks.filter(t => t.completed);
    let onTimeCount = 0;
    completedTasks.forEach(t => {
      if (t.completedAt && t.deadline) {
        if (new Date(t.completedAt) <= new Date(t.deadline)) onTimeCount++;
      } else {
        onTimeCount++;
      }
    });

    // 1. On-Time Completion Rate
    const onTimeRateEl = document.getElementById('analyticsOnTimeRate');
    if (onTimeRateEl) {
      const rate = completedTasks.length ? Math.round((onTimeCount / completedTasks.length) * 100) : 100;
      onTimeRateEl.textContent = `${rate}%`;
    }

    // 2. Average Session Length
    const sessions = window.storage ? window.storage.getFocusSessions() : [];
    const avgSessionEl = document.getElementById('analyticsAvgSession');
    if (avgSessionEl) {
      if (sessions.length > 0) {
        const totalSessionMins = sessions.reduce((acc, s) => acc + (s.minutes || 0), 0);
        const avg = Math.round(totalSessionMins / sessions.length);
        avgSessionEl.textContent = `${avg}m`;
      } else {
        avgSessionEl.textContent = '25m';
      }
    }

    // 3. Deep Work Ratio
    const deepWorkCount = allTasks.filter(t => t.difficulty === 'deep_work' || t.difficulty === 'challenging').length;
    const deepRatioEl = document.getElementById('analyticsDeepWorkRatio');
    if (deepRatioEl) {
      const ratio = allTasks.length ? Math.round((deepWorkCount / allTasks.length) * 100) : 40;
      deepRatioEl.textContent = `${ratio}%`;
    }

    // 4. Streak
    const streakEl = document.getElementById('analyticsStreakVal');
    if (streakEl && window.storage) {
      streakEl.textContent = `${window.storage.getStreak()} Days`;
    }
  }
}

// Global instance
window.AnalyticsEngine = AnalyticsEngine;
