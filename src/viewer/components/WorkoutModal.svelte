<script lang="ts">
  import type { Workout, TrainingDay } from "../../schema/training-plan.js";
  import type { Settings } from "../stores/settings.js";
  import { formatDuration, formatDistance, formatDate, getZoneInfo } from "../lib/utils.js";

  interface Props {
    workout: Workout;
    day: TrainingDay;
    settings: Settings;
    onClose: () => void;
    onToggleComplete: (workoutId: string) => void;
  }

  let { workout, day, settings, onClose, onToggleComplete }: Props = $props();

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }

  function handleBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains("modal-overlay")) {
      onClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="modal-overlay active" onclick={handleBackdropClick} role="dialog" aria-modal="true">
  <div class="modal">
    <div class="modal-header">
      <div>
        <div class="modal-sport-badge {workout.sport}">{workout.sport.toUpperCase()}</div>
        <h2 class="modal-title">{workout.name}</h2>
        <div class="modal-date">{formatDate(day.date)}</div>
      </div>
      <button class="modal-close" onclick={onClose}>×</button>
    </div>

    <div class="modal-body">
      <div class="modal-stats">
        {#if workout.durationMinutes}
          <div class="modal-stat">
            <div class="modal-stat-value">{formatDuration(workout.durationMinutes)}</div>
            <div class="modal-stat-label">Duration</div>
          </div>
        {/if}
        {#if workout.distanceMeters}
          <div class="modal-stat">
            <div class="modal-stat-value">
              {formatDistance(workout.distanceMeters, workout.sport, settings)}
            </div>
            <div class="modal-stat-label">Distance</div>
          </div>
        {/if}
        {#if workout.primaryZone}
          <div class="modal-stat">
            <div class="modal-stat-value">
              {getZoneInfo(workout.sport, workout.primaryZone, settings)}
            </div>
            <div class="modal-stat-label">Target Zone</div>
          </div>
        {/if}
      </div>

      <div class="modal-section">
        <h4 class="modal-section-title">Description</h4>
        <p class="modal-description">{workout.description}</p>
      </div>

      {#if workout.humanReadable}
        <div class="modal-section">
          <h4 class="modal-section-title">Workout Structure</h4>
          <pre class="workout-structure">{workout.humanReadable.replace(/\\n/g, "\n")}</pre>
        </div>
      {/if}
    </div>

    <div class="modal-footer">
      <div></div>
      <button
        class="complete-btn"
        class:mark={!workout.completed}
        class:unmark={workout.completed}
        onclick={() => onToggleComplete(workout.id)}
      >
        {#if workout.completed}
          <span>↩</span> Mark Incomplete
        {:else}
          <span>✓</span> Mark Complete
        {/if}
      </button>
    </div>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(8px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    opacity: 0;
    visibility: hidden;
    transition: all var(--transition-normal);
  }

  .modal-overlay.active {
    opacity: 1;
    visibility: visible;
  }

  .modal {
    background: var(--bg-secondary);
    border-radius: 20px;
    max-width: 600px;
    width: 100%;
    max-height: 80vh;
    overflow: hidden;
    transform: scale(0.9) translateY(20px);
    transition: transform var(--transition-normal);
    border: 1px solid var(--border-medium);
  }

  .modal-overlay.active .modal {
    transform: scale(1) translateY(0);
  }

  .modal-header {
    padding: 1.5rem 2rem;
    border-bottom: 1px solid var(--border-subtle);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .modal-sport-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.8rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }

  .modal-sport-badge.swim {
    background: var(--swim-glow);
    color: var(--swim);
  }
  .modal-sport-badge.bike {
    background: var(--bike-glow);
    color: var(--bike);
  }
  .modal-sport-badge.run {
    background: var(--run-glow);
    color: var(--run);
  }
  .modal-sport-badge.strength {
    background: var(--strength-glow);
    color: var(--strength);
  }
  .modal-sport-badge.brick {
    background: var(--brick-glow);
    color: var(--brick);
  }
  .modal-sport-badge.race {
    background: var(--race-glow);
    color: var(--race);
  }
  .modal-sport-badge.rest {
    background: var(--rest-glow);
    color: var(--rest);
  }

  .modal-title {
    font-size: 1.4rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .modal-date {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-top: 0.25rem;
  }

  .modal-close {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid var(--border-medium);
    background: transparent;
    color: var(--text-muted);
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
  }

  .modal-close:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .modal-body {
    padding: 1.5rem 2rem;
    overflow-y: auto;
    max-height: calc(80vh - 200px);
  }

  .modal-stats {
    display: flex;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--border-subtle);
  }

  .modal-stat {
    text-align: center;
  }

  .modal-stat-value {
    font-family: "JetBrains Mono", monospace;
    font-size: 1.5rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .modal-stat-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
  }

  .modal-section {
    margin-bottom: 1.5rem;
  }

  .modal-section-title {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
    margin-bottom: 0.75rem;
  }

  .modal-description {
    font-size: 0.95rem;
    color: var(--text-secondary);
    line-height: 1.7;
  }

  .workout-structure {
    background: var(--bg-tertiary);
    border-radius: 12px;
    padding: 1rem;
    font-family: "JetBrains Mono", monospace;
    font-size: 0.85rem;
    line-height: 1.8;
    color: var(--text-secondary);
    white-space: pre-wrap;
    margin: 0;
  }

  .modal-footer {
    padding: 1rem 2rem;
    border-top: 1px solid var(--border-subtle);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .complete-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all var(--transition-fast);
    border: none;
  }

  .complete-btn.mark {
    background: var(--accent);
    color: var(--bg-primary);
  }

  .complete-btn.mark:hover {
    background: #fbbf24;
    transform: translateY(-2px);
  }

  .complete-btn.unmark {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    border: 1px solid var(--border-medium);
  }

  .complete-btn.unmark:hover {
    background: var(--bg-elevated);
  }
</style>
