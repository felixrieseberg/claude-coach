<script lang="ts">
  import type { TrainingPlan, Sport } from "../../schema/training-plan.js";
  import type { Settings } from "../stores/settings.js";
  import { formatEventDate, getDaysToEvent, getSportIcon } from "../lib/utils.js";

  interface Props {
    plan: TrainingPlan;
    settings: Settings;
    filters: { sport: string; status: string };
    completed: Record<string, boolean>;
    open: boolean;
    onFilterChange: (filters: { sport: string; status: string }) => void;
    onSettingsClick: () => void;
  }

  let {
    plan,
    settings,
    filters,
    completed,
    open = $bindable(),
    onFilterChange,
    onSettingsClick,
  }: Props = $props();

  // Calculate stats
  const stats = $derived(() => {
    let totalWorkouts = 0;
    let completedCount = 0;
    let totalMinutes = 0;
    const sportHours: Record<string, number> = {
      swim: 0,
      bike: 0,
      run: 0,
      strength: 0,
      brick: 0,
      race: 0,
    };

    plan.weeks.forEach((week) => {
      week.days.forEach((day) => {
        day.workouts.forEach((w) => {
          if (w.sport !== "rest") {
            totalWorkouts++;
            if (completed[w.id]) completedCount++;
            if (w.durationMinutes) {
              totalMinutes += w.durationMinutes;
              if (sportHours[w.sport] !== undefined) {
                sportHours[w.sport] += w.durationMinutes / 60;
              }
            }
          }
        });
      });
    });

    return {
      totalWorkouts,
      completedCount,
      totalHours: Math.round(totalMinutes / 60),
      sportHours,
      progress: totalWorkouts > 0 ? Math.round((completedCount / totalWorkouts) * 100) : 0,
    };
  });

  const progressOffset = $derived(377 - (stats().progress / 100) * 377);
  const daysToEvent = $derived(getDaysToEvent(plan.meta.eventDate));

  function setSportFilter(sport: string) {
    onFilterChange({ ...filters, sport });
  }

  function setStatusFilter(status: string) {
    onFilterChange({ ...filters, status });
  }
</script>

<aside class="sidebar" class:open>
  <div class="event-header">
    <h1 class="event-name">{plan.meta.event}</h1>
    <div class="event-date">{formatEventDate(plan.meta.eventDate)}</div>
    <div class="athlete-name">{plan.meta.athlete}</div>
  </div>

  <div class="progress-section">
    <div class="progress-ring-container">
      <svg class="progress-ring" width="140" height="140">
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color: var(--accent)" />
            <stop offset="100%" style="stop-color: var(--run)" />
          </linearGradient>
        </defs>
        <circle class="progress-ring-bg" cx="70" cy="70" r="60" />
        <circle
          class="progress-ring-fill"
          cx="70"
          cy="70"
          r="60"
          style="stroke-dashoffset: {progressOffset}"
        />
      </svg>
      <div class="progress-text">
        <div class="progress-percent">{stats().progress}%</div>
        <div class="progress-label">Complete</div>
      </div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">{plan.meta.totalWeeks}</div>
      <div class="stat-label">Weeks</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{stats().totalHours}</div>
      <div class="stat-label">Hours</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{stats().totalWorkouts}</div>
      <div class="stat-label">Workouts</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{daysToEvent}</div>
      <div class="stat-label">Days Left</div>
    </div>
  </div>

  <div class="sport-stats">
    {#each Object.entries(stats().sportHours).filter(([_, h]) => h > 0) as [sport, hours]}
      <div class="sport-stat">
        <div class="sport-icon {sport}">{getSportIcon(sport as Sport)}</div>
        <div class="sport-info">
          <div class="sport-name">{sport.charAt(0).toUpperCase() + sport.slice(1)}</div>
          <div class="sport-hours">{hours.toFixed(1)} hours</div>
        </div>
      </div>
    {/each}
  </div>

  <div class="filters-section">
    <h3>Filter by Sport</h3>
    <div class="filter-group">
      <button
        class="filter-chip"
        class:active={filters.sport === "all"}
        onclick={() => setSportFilter("all")}
      >
        All
      </button>
      {#each ["swim", "bike", "run", "brick", "strength", "race"] as sport}
        <button
          class="filter-chip {sport}"
          class:active={filters.sport === sport}
          onclick={() => setSportFilter(sport)}
        >
          {sport.charAt(0).toUpperCase() + sport.slice(1)}
        </button>
      {/each}
    </div>

    <h3>Filter by Status</h3>
    <div class="filter-group">
      {#each [["all", "All"], ["pending", "Pending"], ["completed", "Completed"]] as [value, label]}
        <button
          class="filter-chip"
          class:active={filters.status === value}
          onclick={() => setStatusFilter(value)}
        >
          {label}
        </button>
      {/each}
    </div>
  </div>

  <button class="settings-btn" onclick={onSettingsClick}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="3" />
      <path
        d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
      />
    </svg>
    Settings
  </button>
</aside>

<style>
  .sidebar {
    width: var(--sidebar-width);
    background: var(--bg-secondary);
    border-right: 1px solid var(--border-subtle);
    padding: 2rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    overflow-y: auto;
    z-index: 100;
  }

  .event-header {
    text-align: center;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--border-subtle);
  }

  .event-name {
    font-family: "Playfair Display", serif;
    font-size: 1.8rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, var(--text-primary), var(--text-secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0.5rem;
  }

  .event-date {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.85rem;
    color: var(--accent);
    font-weight: 500;
    letter-spacing: 0.05em;
  }

  .athlete-name {
    font-size: 0.9rem;
    color: var(--text-muted);
    margin-top: 0.5rem;
  }

  /* Progress Ring */
  .progress-section {
    text-align: center;
  }

  .progress-ring-container {
    position: relative;
    width: 140px;
    height: 140px;
    margin: 0 auto 1rem;
  }

  .progress-ring {
    transform: rotate(-90deg);
  }

  .progress-ring-bg {
    fill: none;
    stroke: var(--bg-tertiary);
    stroke-width: 8;
  }

  .progress-ring-fill {
    fill: none;
    stroke: url(#progressGradient);
    stroke-width: 8;
    stroke-linecap: round;
    stroke-dasharray: 377;
    transition: stroke-dashoffset 1s ease-out;
  }

  .progress-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
  }

  .progress-percent {
    font-family: "JetBrains Mono", monospace;
    font-size: 2rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .progress-label {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  /* Stats Grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .stat-card {
    background: var(--bg-tertiary);
    border-radius: 12px;
    padding: 1rem;
    text-align: center;
    border: 1px solid var(--border-subtle);
    transition: all var(--transition-normal);
  }

  .stat-card:hover {
    border-color: var(--border-medium);
    transform: translateY(-2px);
  }

  .stat-value {
    font-family: "JetBrains Mono", monospace;
    font-size: 1.4rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .stat-label {
    font-size: 0.7rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-top: 0.25rem;
  }

  /* Sport Stats */
  .sport-stats {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .sport-stat {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: var(--bg-tertiary);
    border-radius: 10px;
    border: 1px solid var(--border-subtle);
  }

  .sport-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
  }

  .sport-icon.swim {
    background: var(--swim-glow);
  }
  .sport-icon.bike {
    background: var(--bike-glow);
  }
  .sport-icon.run {
    background: var(--run-glow);
  }
  .sport-icon.strength {
    background: var(--strength-glow);
  }
  .sport-icon.brick {
    background: var(--brick-glow);
  }
  .sport-icon.race {
    background: var(--race-glow);
  }

  .sport-info {
    flex: 1;
  }

  .sport-name {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .sport-hours {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  /* Filters */
  .filters-section h3 {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
    margin-bottom: 0.75rem;
  }

  .filter-group {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .filter-chip {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
    font-weight: 500;
    border-radius: 20px;
    border: 1px solid var(--border-medium);
    background: transparent;
    color: var(--text-secondary);
    transition: all var(--transition-fast);
  }

  .filter-chip:hover {
    border-color: var(--text-muted);
    color: var(--text-primary);
  }

  .filter-chip.active {
    background: var(--text-primary);
    color: var(--bg-primary);
    border-color: var(--text-primary);
  }

  .filter-chip.swim.active {
    background: var(--swim);
    border-color: var(--swim);
  }
  .filter-chip.bike.active {
    background: var(--bike);
    border-color: var(--bike);
  }
  .filter-chip.run.active {
    background: var(--run);
    border-color: var(--run);
  }
  .filter-chip.strength.active {
    background: var(--strength);
    border-color: var(--strength);
  }
  .filter-chip.brick.active {
    background: var(--brick);
    border-color: var(--brick);
  }
  .filter-chip.race.active {
    background: var(--race);
    border-color: var(--race);
    color: var(--bg-primary);
  }

  /* Settings Button */
  .settings-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem 1rem;
    border-radius: 10px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-medium);
    color: var(--text-secondary);
    font-size: 0.85rem;
    font-weight: 500;
    transition: all var(--transition-fast);
    margin-top: auto;
  }

  .settings-btn:hover {
    background: var(--bg-elevated);
    color: var(--text-primary);
    border-color: var(--text-muted);
  }

  .settings-btn svg {
    width: 18px;
    height: 18px;
  }

  /* Mobile */
  @media (max-width: 700px) {
    .sidebar {
      left: -100%;
      transition: left var(--transition-normal);
    }

    .sidebar.open {
      left: 0;
    }
  }
</style>
