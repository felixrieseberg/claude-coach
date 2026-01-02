import type { TrainingPlan } from "../../schema/training-plan.js";

// Load plan from embedded JSON
function loadPlanData(): TrainingPlan {
  const el = document.getElementById("plan-data");
  if (!el) throw new Error("Plan data not found");
  return JSON.parse(el.textContent || "{}");
}

// Reactive state using Svelte 5's $state rune is only available in .svelte files
// So we export the raw data and let components create reactive state
export const planData = loadPlanData();

// Completed workouts stored in localStorage
const storageKey = `plan-${planData.meta.id}-completed`;

export function loadCompleted(): Record<string, boolean> {
  const saved = localStorage.getItem(storageKey);
  return saved ? JSON.parse(saved) : {};
}

export function saveCompleted(completed: Record<string, boolean>): void {
  localStorage.setItem(storageKey, JSON.stringify(completed));
}
