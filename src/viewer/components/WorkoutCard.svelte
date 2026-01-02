<script lang="ts">
  import type { Workout, TrainingDay } from "../../schema/training-plan.js";
  import type { Settings } from "../stores/settings.js";
  import { formatDuration } from "../lib/utils.js";

  interface Props {
    workout: Workout;
    day: TrainingDay;
    settings: Settings;
    isCompleted: boolean;
    onClick: () => void;
  }

  let { workout, day, settings, isCompleted, onClick }: Props = $props();

  let isDragging = $state(false);

  function handleDragStart(e: DragEvent) {
    isDragging = true;
    e.dataTransfer!.setData("text/plain", workout.id);
    e.dataTransfer!.effectAllowed = "move";
  }

  function handleDragEnd() {
    isDragging = false;
  }
</script>

<button
  class="workout-card {workout.sport}"
  class:completed={isCompleted}
  class:dragging={isDragging}
  draggable="true"
  ondragstart={handleDragStart}
  ondragend={handleDragEnd}
  onclick={onClick}
>
  <div class="workout-sport">{workout.sport}</div>
  <div class="workout-name">{workout.name}</div>
  {#if workout.durationMinutes}
    <div class="workout-duration">{formatDuration(workout.durationMinutes)}</div>
  {/if}
</button>

<style>
  .workout-card {
    width: 100%;
    text-align: left;
    padding: 0.6rem 0.75rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all var(--transition-fast);
    border: 1px solid transparent;
    position: relative;
    overflow: hidden;
  }

  .workout-card::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
  }

  .workout-card.swim {
    background: var(--swim-glow);
  }
  .workout-card.swim::before {
    background: var(--swim);
  }
  .workout-card.bike {
    background: var(--bike-glow);
  }
  .workout-card.bike::before {
    background: var(--bike);
  }
  .workout-card.run {
    background: var(--run-glow);
  }
  .workout-card.run::before {
    background: var(--run);
  }
  .workout-card.strength {
    background: var(--strength-glow);
  }
  .workout-card.strength::before {
    background: var(--strength);
  }
  .workout-card.brick {
    background: var(--brick-glow);
  }
  .workout-card.brick::before {
    background: var(--brick);
  }
  .workout-card.race {
    background: var(--race-glow);
  }
  .workout-card.race::before {
    background: var(--race);
  }
  .workout-card.rest {
    background: var(--rest-glow);
  }
  .workout-card.rest::before {
    background: var(--rest);
  }

  .workout-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  .workout-card.dragging {
    opacity: 0.5;
    transform: scale(0.95);
    cursor: grabbing;
  }

  .workout-card:not(.dragging) {
    cursor: grab;
  }

  .workout-card.completed {
    opacity: 0.6;
  }

  .workout-card.completed::after {
    content: "✓";
    position: absolute;
    top: 0.4rem;
    right: 0.5rem;
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  .workout-sport {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 0.2rem;
  }

  .workout-card.swim .workout-sport {
    color: var(--swim);
  }
  .workout-card.bike .workout-sport {
    color: var(--bike);
  }
  .workout-card.run .workout-sport {
    color: var(--run);
  }
  .workout-card.strength .workout-sport {
    color: var(--strength);
  }
  .workout-card.brick .workout-sport {
    color: var(--brick);
  }
  .workout-card.race .workout-sport {
    color: var(--race);
  }
  .workout-card.rest .workout-sport {
    color: var(--rest);
  }

  .workout-name {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--text-primary);
    line-height: 1.3;
  }

  .workout-duration {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.7rem;
    color: var(--text-muted);
    margin-top: 0.3rem;
  }
</style>
