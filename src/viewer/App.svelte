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
    planData.weeks.forEach((week) => {
      week.days.forEach((day) => {
        day.workouts.forEach((w) => {
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
    modalState = null;
  }
</script>

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
      <h2 class="mobile-title">{planData.meta.event}</h2>
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
    {settings}
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
