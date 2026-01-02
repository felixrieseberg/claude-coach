<script lang="ts">
  import type { TrainingWeek, TrainingDay, Workout } from "../../schema/training-plan.js";
  import type { Settings } from "../stores/settings.js";
  import WorkoutCard from "./WorkoutCard.svelte";
  import { parseDate } from "../lib/utils.js";

  interface Props {
    week: TrainingWeek;
    fullWeek: TrainingDay[];
    settings: Settings;
    today: string;
    completed: Record<string, boolean>;
    filterWorkout: (workout: Workout) => boolean;
    onWorkoutClick: (workout: Workout, day: TrainingDay) => void;
    onDrop: (workoutId: string, newDate: string) => void;
    animationDelay: number;
  }

  let {
    week,
    fullWeek,
    settings,
    today,
    completed,
    filterWorkout,
    onWorkoutClick,
    onDrop,
    animationDelay,
  }: Props = $props();

  let dragOverDate = $state<string | null>(null);

  const phaseName = week.phase.toLowerCase();

  function handleDragOver(e: DragEvent, date: string) {
    e.preventDefault();
    dragOverDate = date;
  }

  function handleDragLeave() {
    dragOverDate = null;
  }

  function handleDrop(e: DragEvent, date: string) {
    e.preventDefault();
    dragOverDate = null;
    const workoutId = e.dataTransfer?.getData("text/plain");
    if (workoutId) {
      onDrop(workoutId, date);
    }
  }
</script>

<div class="week-card" style="animation-delay: {animationDelay}s">
  <div class="week-header">
    <div class="week-title">
      <span class="week-number">W{week.weekNumber}</span>
      <span class="week-phase {phaseName}">{week.phase}</span>
      <span class="week-focus">{week.focus}</span>
    </div>
    <div class="week-hours"><span>{week.targetHours}</span> hrs</div>
  </div>

  <div class="days-grid">
    {#each fullWeek as day (day.date)}
      {@const isToday = day.date === today}
      {@const filteredWorkouts = day.workouts.filter(filterWorkout)}
      {@const isDragOver = dragOverDate === day.date}

      <div
        class="day-column"
        class:today={isToday}
        class:drag-over={isDragOver}
        ondragover={(e) => handleDragOver(e, day.date)}
        ondragleave={handleDragLeave}
        ondrop={(e) => handleDrop(e, day.date)}
        role="listbox"
      >
        <div class="day-header">
          <span class="day-name">{day.dayOfWeek.slice(0, 3)}</span>
          <span class="day-date">{parseDate(day.date).getDate()}</span>
        </div>

        {#if filteredWorkouts.length > 0}
          {#each filteredWorkouts as workout (workout.id)}
            <WorkoutCard
              {workout}
              {day}
              {settings}
              isCompleted={!!completed[workout.id]}
              onClick={() => onWorkoutClick(workout, day)}
            />
          {/each}
        {:else if day.workouts.length === 0}
          <div class="empty-day">Rest</div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .week-card {
    background: var(--bg-secondary);
    border-radius: 16px;
    border: 1px solid var(--border-subtle);
    overflow: hidden;
    opacity: 0;
    transform: translateY(20px);
    animation: slideUp 0.5s ease forwards;
  }

  @keyframes slideUp {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .week-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    background: var(--bg-tertiary);
    border-bottom: 1px solid var(--border-subtle);
  }

  .week-title {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .week-number {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.75rem;
    font-weight: 500;
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-secondary);
  }

  .week-phase {
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .week-phase.base {
    color: var(--phase-base);
  }
  .week-phase.build {
    color: var(--phase-build);
  }
  .week-phase.peak {
    color: var(--phase-peak);
  }
  .week-phase.taper {
    color: var(--phase-taper);
  }
  .week-phase.survival {
    color: var(--text-muted);
  }
  .week-phase.bank {
    color: var(--phase-base);
  }

  .week-focus {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .week-hours {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .week-hours span {
    color: var(--text-primary);
    font-weight: 500;
  }

  .days-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
    background: var(--border-subtle);
  }

  .day-column {
    background: var(--bg-secondary);
    min-height: 160px;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    transition: background-color 0.15s ease;
  }

  .day-column.today {
    background: var(--bg-tertiary);
  }

  .day-column.today .day-name {
    color: var(--accent);
  }

  .day-column.drag-over {
    background: var(--accent-glow);
    outline: 2px dashed var(--accent);
    outline-offset: -2px;
  }

  .day-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 0.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-subtle);
  }

  .day-name {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
  }

  .day-date {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .empty-day {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-size: 0.8rem;
    font-style: italic;
  }

  @media (max-width: 1200px) {
    .days-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  @media (max-width: 900px) {
    .days-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 700px) {
    .days-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
