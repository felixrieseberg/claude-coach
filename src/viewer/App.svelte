<script lang="ts">
  import "./styles.css";
  import Sidebar from "./components/Sidebar.svelte";
  import WeeksContainer from "./components/WeeksContainer.svelte";
  import WorkoutModal from "./components/WorkoutModal.svelte";
  import SettingsModal from "./components/SettingsModal.svelte";
  import ImportHelpModal from "./components/ImportHelpModal.svelte";
  import { planData, loadCompleted, saveCompleted } from "./stores/plan.js";
  import { loadSettings, saveSettings, type Settings } from "./stores/settings.js";
  import {
    loadChanges,
    saveChanges,
    type PlanChanges,
    generateWorkoutId,
  } from "./stores/changes.js";
  import type { Workout, TrainingDay } from "../schema/training-plan.js";

  // Reactive state
  let settings = $state(loadSettings());
  let completed = $state(loadCompleted());
  let changes = $state(loadChanges());
  let filters = $state({ sport: "all", status: "all" });
  let sidebarOpen = $state(false);
  let settingsOpen = $state(false);
  let importHelpOpen = $state(false);

  // First-change banner state
  const bannerKey = `plan-${planData.meta.id}-banner-dismissed`;
  let showBanner = $state(false);

  function triggerBanner() {
    if (localStorage.getItem(bannerKey) !== "true") {
      showBanner = true;
    }
  }

  function dismissBanner() {
    showBanner = false;
    localStorage.setItem(bannerKey, "true");
  }

  // Workout modal state
  type ModalState =
    | { mode: "view"; workout: Workout; day: TrainingDay }
    | { mode: "create"; day: TrainingDay }
    | null;

  let modalState = $state<ModalState>(null);

  // Apply theme to document
  $effect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  });

  // Apply completed state to plan workouts
  $effect(() => {
    planData.weeks?.forEach((week) => {
      week.days?.forEach((day) => {
        day.workouts?.forEach((w) => {
          w.completed = !!completed[w.id];
        });
      });
    });
  });

  function handleSettingsChange(newSettings: Settings) {
    settings = newSettings;
    saveSettings(newSettings);
  }

  function handleToggleComplete(workoutId: string) {
    if (completed[workoutId]) {
      delete completed[workoutId];
      completed = { ...completed };
    } else {
      completed = { ...completed, [workoutId]: true };
    }
    saveCompleted(completed);
    triggerBanner();
  }

  function handleWorkoutClick(workout: Workout, day: TrainingDay) {
    modalState = { mode: "view", workout, day };
  }

  function handleAddWorkout(day: TrainingDay) {
    modalState = { mode: "create", day };
  }

  function handleCloseModal() {
    modalState = null;
  }

  // Change handlers
  function handleWorkoutMove(workoutId: string, originalDate: string, newDate: string) {
    if (originalDate === newDate) {
      // Moving back to original - remove the move
      delete changes.moved[workoutId];
    } else {
      changes.moved[workoutId] = newDate;
    }
    changes = { ...changes };
    saveChanges(changes);
    triggerBanner();
  }

  function handleWorkoutSave(updates: Partial<Workout>) {
    if (!modalState) return;

    if (modalState.mode === "create") {
      // Create new workout
      const id = generateWorkoutId();
      const fullWorkout: Workout = {
        id,
        sport: updates.sport || "run",
        type: updates.type || "endurance",
        name: updates.name || "Workout",
        description: updates.description || "",
        durationMinutes: updates.durationMinutes,
        distanceMeters: updates.distanceMeters,
        primaryZone: updates.primaryZone,
        humanReadable: updates.humanReadable,
        completed: false,
      };
      changes.added[id] = { date: modalState.day.date, workout: fullWorkout };
      changes = { ...changes };
      saveChanges(changes);
      triggerBanner();
      modalState = null;
    } else {
      // Edit existing workout
      const workoutId = modalState.workout.id;

      // Check if it's a user-added workout
      if (changes.added[workoutId]) {
        // Update the added workout directly
        changes.added[workoutId].workout = {
          ...changes.added[workoutId].workout,
          ...updates,
        };
      } else {
        // Store edits as overlay
        changes.edited[workoutId] = { ...(changes.edited[workoutId] || {}), ...updates };
      }
      changes = { ...changes };
      saveChanges(changes);
      triggerBanner();

      // Update the modal state with the new workout data
      modalState = {
        ...modalState,
        workout: { ...modalState.workout, ...updates },
      };
    }
  }

  function handleWorkoutDelete(workoutId: string) {
    // Check if it's a user-added workout
    if (changes.added[workoutId]) {
      // Remove from added
      delete changes.added[workoutId];
    } else {
      // Mark as deleted
      if (!changes.deleted.includes(workoutId)) {
        changes.deleted = [...changes.deleted, workoutId];
      }
    }
    changes = { ...changes };
    saveChanges(changes);
    triggerBanner();
    modalState = null;
  }
</script>

{#if showBanner}
  <div class="local-storage-banner">
    <div class="banner-content">
      <span class="banner-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      </span>
      <p>
        Your changes are saved locally in this browser only. To back up or transfer your data,
        <button
          class="banner-link"
          onclick={() => {
            dismissBanner();
            settingsOpen = true;
          }}
        >
          export it from Settings
        </button>.
      </p>
      <button class="banner-close" onclick={dismissBanner} aria-label="Dismiss">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
{/if}

<div class="app">
  <Sidebar
    plan={planData}
    {settings}
    {filters}
    {completed}
    bind:open={sidebarOpen}
    onFilterChange={(f) => (filters = f)}
    onSettingsClick={() => (settingsOpen = true)}
    onImportHelpClick={() => (importHelpOpen = true)}
  />

  <main class="main-content">
    <div class="mobile-header">
      <button class="menu-toggle" onclick={() => (sidebarOpen = !sidebarOpen)}>☰</button>
      <h2 class="mobile-title">{planData.meta?.event ?? "Training Plan"}</h2>
    </div>

    <WeeksContainer
      plan={planData}
      {settings}
      {filters}
      {completed}
      {changes}
      onWorkoutClick={handleWorkoutClick}
      onWorkoutMove={handleWorkoutMove}
      onAddWorkout={handleAddWorkout}
    />
  </main>
</div>

{#if modalState}
  <WorkoutModal
    workout={modalState.mode === "view" ? modalState.workout : null}
    day={modalState.day}
    mode={modalState.mode}
    isCompleted={modalState.mode === "view" && !!completed[modalState.workout.id]}
    {settings}
    plan={planData}
    onClose={handleCloseModal}
    onToggleComplete={handleToggleComplete}
    onSave={handleWorkoutSave}
    onDelete={handleWorkoutDelete}
    onImportHelpClick={() => (importHelpOpen = true)}
  />
{/if}

{#if settingsOpen}
  <SettingsModal
    {settings}
    onClose={() => (settingsOpen = false)}
    onChange={handleSettingsChange}
    onOpenImportHelp={() => (importHelpOpen = true)}
  />
{/if}

{#if importHelpOpen}
  <ImportHelpModal onClose={() => (importHelpOpen = false)} />
{/if}

<style>
  .local-storage-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-medium);
    padding: 0.75rem 1rem;
    animation: slideDown 0.3s ease-out;
  }

  @keyframes slideDown {
    from {
      transform: translateY(-100%);
    }
    to {
      transform: translateY(0);
    }
  }

  .banner-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .banner-icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    color: var(--accent);
  }

  .banner-icon svg {
    width: 100%;
    height: 100%;
  }

  .banner-content p {
    flex: 1;
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .banner-link {
    background: none;
    border: none;
    color: var(--accent);
    font: inherit;
    cursor: pointer;
    text-decoration: underline;
    padding: 0;
  }

  .banner-link:hover {
    color: var(--text-primary);
  }

  .banner-close {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 1px solid var(--border-medium);
    background: transparent;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .banner-close:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .banner-close svg {
    width: 14px;
    height: 14px;
  }

  .main-content {
    flex: 1;
    margin-left: var(--sidebar-width);
    padding: 2rem;
  }

  .mobile-header {
    display: none;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-subtle);
  }

  .menu-toggle {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-medium);
    color: var(--text-primary);
    font-size: 1.2rem;
  }

  .mobile-title {
    font-size: 1.1rem;
    font-weight: 600;
  }

  @media (max-width: 700px) {
    .main-content {
      margin-left: 0;
      padding: 1rem;
    }

    .mobile-header {
      display: flex;
    }
  }
</style>
