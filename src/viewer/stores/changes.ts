import { planData } from "./plan.js";
import type { Workout } from "../../schema/training-plan.js";

/**
 * Tracks all user modifications to the plan.
 * These are stored as overlays on top of the original plan data.
 */
export interface PlanChanges {
  // Workouts moved to different dates: workoutId -> newDate (ISO string)
  moved: Record<string, string>;

  // Workouts with edited properties: workoutId -> partial workout overrides
  edited: Record<string, Partial<Workout>>;

  // Workouts that have been deleted (hidden)
  deleted: string[];

  // New workouts added by user: generated ID -> { date, workout }
  added: Record<string, { date: string; workout: Workout }>;
}

const storageKey = `plan-${planData.meta.id}-changes`;

export function emptyChanges(): PlanChanges {
  return {
    moved: {},
    edited: {},
    deleted: [],
    added: {},
  };
}

export function loadChanges(): PlanChanges {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return emptyChanges();

  try {
    const parsed = JSON.parse(saved);
    return {
      moved: parsed.moved || {},
      edited: parsed.edited || {},
      deleted: parsed.deleted || [],
      added: parsed.added || {},
    };
  } catch {
    return emptyChanges();
  }
}

export function saveChanges(changes: PlanChanges): void {
  localStorage.setItem(storageKey, JSON.stringify(changes));
}

// Helper to generate unique IDs for new workouts
export function generateWorkoutId(): string {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Get the effective date for a workout (considering moves)
export function getWorkoutDate(
  workoutId: string,
  originalDate: string,
  changes: PlanChanges
): string {
  return changes.moved[workoutId] || originalDate;
}

// Get the effective workout data (considering edits)
export function getEffectiveWorkout(workout: Workout, changes: PlanChanges): Workout {
  const edits = changes.edited[workout.id];
  if (!edits) return workout;
  return { ...workout, ...edits };
}

// Check if a workout is deleted
export function isWorkoutDeleted(workoutId: string, changes: PlanChanges): boolean {
  return changes.deleted.includes(workoutId);
}
