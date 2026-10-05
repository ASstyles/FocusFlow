# ⏱️ FocusFlow — Modern Offline Student Productivity App

**FocusFlow** is a completely offline, zero-dependency, private student productivity web application engineered to eliminate academic paralysis and optimize daily study schedules.

---

## 🚀 Key Features

### 1. 🎯 "What Should I Do Now?" Intelligent Ranking Engine
- **Multi-Factor Algorithmic Focus Score (0 - 100)** computed locally in real time:
  - **Urgency Vector (0 - 40 pts)**: Penalizes overdue tasks and scales urgency based on time remaining until deadline.
  - **Priority Weight (0 - 30 pts)**: Urgent (30), High (22), Medium (14), Low (6).
  - **Energy & Cognitive Load Matching (0 - 20 pts)**:
    - *⚡ High Focus*: Promotes challenging problem sets & deep work during peak mental hours.
    - *☕ Moderate*: Balances steady coursework.
    - *🌙 Low Energy / Drained*: Surfaces quick wins (reading, light quizzes) to avoid procrastination.
  - **Available Time Window Fit (0 - 10 pts)**: Rewards tasks that fit neatly into your current study session (e.g. 15m, 30m, 45m, 60m).
  - **Momentum Bonus (+5 pts)**: Boosts tasks already >40% complete to clear mental overhead.
- **Top Recommendation Hero Banner**:
  - Highlights the single most impactful task to work on right now.
  - Explains **"Why FocusFlow selected this now"** with transparent, human-readable rationale pills.
  - One-click **"Start 25m Focus Block"** directly launches the Pomodoro Focus Room.
- **Strategy Modes**:
  - 🎯 *Balanced Smart AI*
  - 🔥 *Deadline Crunch* (Pure urgency weighting)
  - ⚡ *Quick Wins First* (Fastest dopamine & completion)
  - 🧠 *High Cognitive First* (Deep work projects)

### 2. 📅 Smart Study Scheduler (Deadline Resource Allocator)
- **Time Resource Packing Algorithm**:
  - Input your session start time and available study hours (e.g., 2 hours, 3 hours).
  - Choose your rest strategy (*Pomodoro 25/5*, *Deep Blocks 50/10*, *Flow 75/15*, or *Continuous Crunch*).
  - FocusFlow packs your ranked tasks into a visual timeline with work intervals and rest breaks.
  - **Capacity & Feasibility Analyzer**: Alerts you if pending urgent tasks exceed your available hours with clear deficit calculations.
  - One-click **"Copy Plan"** to clipboard or **"Start Session"** to begin following the schedule.

### 3. 📊 Academic Command Center (Dashboard & Analytics)
- **Real-time Stat Cards**: Tasks completed, remaining pending study hours, urgent deadlines (<24h), total focus hours logged.
- **Subject Workload Donut Chart**: Native SVG chart visualizing time load across CS, Math, Chemistry, History, etc.
- **Upcoming Deadlines Radar**: Displays impending deadlines sorted by nearest delivery date with countdown chips.
- **7-Day Study & Focus Activity Bar Chart**: Shows daily focus minutes logged.
- **Workload Matrix (Eisenhower Map)**: 4-quadrant breakdown by urgency and difficulty.

### 4. 🧘 Deep Work Focus Room
- **Pomodoro & Stopwatch Modes**: 25m Pomodoro, 50m Deep Work, 5m/15m breaks, or open study stopwatch.
- **Circular SVG Progress Timer**: Smooth animated ring with start/pause/reset.
- **100% Offline Procedural Sound Generator (Web Audio API)**:
  - 🌧️ *Gentle Rain* (filtered raindrop impulses)
  - 📻 *Brown Noise* (deep library rumble for blocking noise)
  - 🌊 *Ocean Waves* (LFO-modulated pink noise)
  - 🧠 *40Hz Gamma Focus Frequency* (scientifically studied attention frequency)
  - 🔔 *Warm Meditation Bell Chime* on completion.
- **Active Task Micro-Checklist**: Add and tick off sub-steps as you work.
- **Distraction-Free Fullscreen Mode**.

### 5. 🔒 100% Offline & Private Local Storage
- Zero external APIs, zero Firebase, zero authentication.
- Automatically persists all tasks, focus sessions, and settings in your browser's `localStorage`.
- Full **Export (JSON)** and **Import (JSON)** for local backups.
- Includes pre-seeded demo student tasks on first load.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| <kbd>N</kbd> | Open New Task modal |
| <kbd>Space</kbd> | Start / Pause Focus Timer |
| <kbd>F</kbd> | Jump to Focus Room |
| <kbd>/</kbd> | Focus Search Bar in All Tasks |
| <kbd>Esc</kbd> | Close any active modal |

---

## 💻 How to Run

FocusFlow is a pure client-side application. You can run it in any of these ways:

1. **Directly open in browser**:
   Double click [`index.html`](file:///c:/Users/avira/OneDrive/Desktop/FocusFlow/index.html) in your file manager.
2. **Via local web server**:
   ```bash
   python -m http.server 3000
   ```
   Open `http://localhost:3000` in your browser.
