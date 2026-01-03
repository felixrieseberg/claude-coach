<script lang="ts">
  import type { TrainingPlan, Sport } from "../../schema/training-plan.js";
  import type { Settings } from "../stores/settings.js";
  import { formatEventDate, getDaysToEvent, getSportIcon } from "../lib/utils.js";
  import { exportPlanToCalendar, exportAllWorkouts } from "../lib/export/index.js";

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

  const availableSports = $derived(
    Object.entries(stats().sportHours)
      .filter(([_, h]) => h > 0)
      .map(([sport]) => sport)
  );

  function toggleSportFilter(sport: string) {
    if (filters.sport === sport) {
      onFilterChange({ ...filters, sport: "all" });
    } else {
      onFilterChange({ ...filters, sport });
    }
  }

  function setStatusFilter(status: string) {
    onFilterChange({ ...filters, status });
  }

  // Export state
  let showExportMenu = $state(false);
  let exportStatus = $state<{ message: string; isError: boolean } | null>(null);

  function handleExportCalendar() {
    showExportMenu = false;
    exportStatus = { message: "Exporting calendar...", isError: false };

    const result = exportPlanToCalendar(plan);
    if (result.success) {
      exportStatus = { message: `Downloaded ${result.filename}`, isError: false };
    } else {
      exportStatus = { message: result.error || "Export failed", isError: true };
    }

    setTimeout(() => {
      exportStatus = null;
    }, 3000);
  }

  async function handleExportAllWorkouts(format: "zwo" | "fit") {
    showExportMenu = false;
    exportStatus = { message: `Exporting ${format.toUpperCase()} files...`, isError: false };

    const result = await exportAllWorkouts(plan, format, settings);
    if (result.errors.length === 0) {
      exportStatus = {
        message: `Exported ${result.exported} workouts (${result.skipped} skipped)`,
        isError: false,
      };
    } else {
      exportStatus = {
        message: `Exported ${result.exported}, ${result.errors.length} errors`,
        isError: true,
      };
    }

    setTimeout(() => {
      exportStatus = null;
    }, 4000);
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
    <div class="sport-stats-header">
      <h3>Filter by Sport</h3>
      {#if filters.sport !== "all"}
        <button class="clear-filter" onclick={() => onFilterChange({ ...filters, sport: "all" })}>
          Clear
        </button>
      {/if}
    </div>
    {#each availableSports as sport}
      <button
        class="sport-stat {sport}"
        class:active={filters.sport === sport}
        onclick={() => toggleSportFilter(sport)}
      >
        <div class="sport-icon {sport}">{getSportIcon(sport as Sport)}</div>
        <div class="sport-info">
          <div class="sport-name">{sport.charAt(0).toUpperCase() + sport.slice(1)}</div>
          <div class="sport-hours">{stats().sportHours[sport].toFixed(1)} hours</div>
        </div>
        {#if filters.sport === sport}
          <div class="check-icon">✓</div>
        {/if}
      </button>
    {/each}
  </div>

  <div class="filters-section">
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

  <div class="export-section">
    <div class="export-header">
      <h3>Export Plan</h3>
      {#if exportStatus}
        <div class="export-status" class:error={exportStatus.isError}>
          {exportStatus.message}
        </div>
      {/if}
    </div>
    <div class="export-buttons">
      <button class="export-btn" onclick={handleExportCalendar}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        Calendar (.ics)
      </button>
      <div class="export-dropdown">
        <button class="export-btn" onclick={() => (showExportMenu = !showExportMenu)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          All Workouts
        </button>
        {#if showExportMenu}
          <div class="export-menu">
            <button class="export-option" onclick={() => handleExportAllWorkouts("zwo")}>
              <span class="export-icon">Z</span>
              <div>
                <div class="export-name">Zwift (.zwo)</div>
                <div class="export-desc">Bike & run workouts</div>
              </div>
            </button>
            <button class="export-option" onclick={() => handleExportAllWorkouts("fit")}>
              <span class="export-icon">G</span>
              <div>
                <div class="export-name">Garmin (.fit)</div>
                <div class="export-desc">All workout types</div>
              </div>
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <button class="settings-btn" onclick={onSettingsClick}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path
        d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
      />
      <circle cx="12" cy="12" r="3" />
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
    gap: 0.5rem;
  }

  .sport-stats-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.25rem;
  }

  .sport-stats-header h3 {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
  }

  .clear-filter {
    font-size: 0.7rem;
    color: var(--accent);
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 500;
  }

  .clear-filter:hover {
    text-decoration: underline;
  }

  .sport-stat {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: var(--bg-tertiary);
    border-radius: 10px;
    border: 1px solid var(--border-subtle);
    cursor: pointer;
    transition: all var(--transition-fast);
    width: 100%;
    text-align: left;
  }

  .sport-stat:hover {
    border-color: var(--border-medium);
    transform: translateX(4px);
  }

  .sport-stat.active {
    border-color: var(--text-muted);
  }

  .sport-stat.active.swim {
    border-color: var(--swim);
    background: var(--swim-glow);
  }
  .sport-stat.active.bike {
    border-color: var(--bike);
    background: var(--bike-glow);
  }
  .sport-stat.active.run {
    border-color: var(--run);
    background: var(--run-glow);
  }
  .sport-stat.active.strength {
    border-color: var(--strength);
    background: var(--strength-glow);
  }
  .sport-stat.active.brick {
    border-color: var(--brick);
    background: var(--brick-glow);
  }
  .sport-stat.active.race {
    border-color: var(--race);
    background: var(--race-glow);
  }

  .sport-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    flex-shrink: 0;
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

  .check-icon {
    color: var(--accent);
    font-weight: 600;
    font-size: 0.9rem;
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

  /* Export Section */
  .export-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .export-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .export-header h3 {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
  }

  .export-status {
    font-size: 0.7rem;
    color: var(--accent);
    padding: 0.25rem 0.5rem;
    background: var(--accent-glow);
    border-radius: 4px;
  }

  .export-status.error {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }

  .export-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .export-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.6rem 0.75rem;
    border-radius: 8px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-medium);
    color: var(--text-secondary);
    font-size: 0.75rem;
    font-weight: 500;
    transition: all var(--transition-fast);
  }

  .export-btn:hover {
    background: var(--bg-elevated);
    color: var(--text-primary);
    border-color: var(--accent);
  }

  .export-btn svg {
    width: 14px;
    height: 14px;
  }

  .export-dropdown {
    position: relative;
    flex: 1;
  }

  .export-menu {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 0;
    right: 0;
    background: var(--bg-secondary);
    border: 1px solid var(--border-medium);
    border-radius: 10px;
    padding: 0.5rem;
    z-index: 10;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  .export-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.6rem;
    border: none;
    background: transparent;
    color: var(--text-primary);
    border-radius: 6px;
    cursor: pointer;
    transition: background var(--transition-fast);
    text-align: left;
  }

  .export-option:hover {
    background: var(--bg-tertiary);
  }

  .export-icon {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: var(--bg-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.75rem;
    color: var(--accent);
    flex-shrink: 0;
  }

  .export-name {
    font-size: 0.8rem;
    font-weight: 500;
  }

  .export-desc {
    font-size: 0.7rem;
    color: var(--text-muted);
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
