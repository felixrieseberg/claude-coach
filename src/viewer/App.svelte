<script lang="ts">
  import "./styles.css";
  import Sidebar from "./components/Sidebar.svelte";
  import WeeksContainer from "./components/WeeksContainer.svelte";
  import WorkoutModal from "./components/WorkoutModal.svelte";
  import SettingsModal from "./components/SettingsModal.svelte";
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
  let selectedWorkout = $state<{ workout: Workout; day: TrainingDay } | null>(null);

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
    selectedWorkout = { workout, day };
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

  function handleWorkoutEdit(workoutId: string, edits: Partial<Workout>) {
    changes.edited[workoutId] = { ...(changes.edited[workoutId] || {}), ...edits };
    changes = { ...changes };
    saveChanges(changes);
  }

  function handleWorkoutDelete(workoutId: string) {
    if (!changes.deleted.includes(workoutId)) {
      changes.deleted = [...changes.deleted, workoutId];
      changes = { ...changes };
      saveChanges(changes);
    }
  }

  function handleWorkoutRestore(workoutId: string) {
    changes.deleted = changes.deleted.filter((id) => id !== workoutId);
    changes = { ...changes };
    saveChanges(changes);
  }

  function handleWorkoutAdd(date: string, workout: Omit<Workout, "id">) {
    const id = generateWorkoutId();
    const fullWorkout: Workout = { ...workout, id } as Workout;
    changes.added[id] = { date, workout: fullWorkout };
    changes = { ...changes };
    saveChanges(changes);
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
    />
  </main>
</div>

{#if selectedWorkout}
  <WorkoutModal
    workout={selectedWorkout.workout}
    day={selectedWorkout.day}
    {settings}
    onClose={() => (selectedWorkout = null)}
    onToggleComplete={handleToggleComplete}
  />
{/if}

{#if settingsOpen}
  <SettingsModal
    {settings}
    onClose={() => (settingsOpen = false)}
    onChange={handleSettingsChange}
  />
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
