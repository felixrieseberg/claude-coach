/**
 * Training Plan Export
 *
 * Unified export interface for generating workout files client-side.
 * Supports:
 * - ZWO (Zwift workouts) - bike/run only
 * - FIT (Garmin workouts) - all sports
 * - ICS (iCalendar) - full plan calendar events
 */

import type { Workout, TrainingPlan, TrainingDay, Sport } from "../../../schema/training-plan.js";
import type { Settings } from "../../stores/settings.js";
import { generateZwo, isZwoSupported } from "./zwo.js";
import { generateFit, isFitSupported } from "./fit.js";
import { generateIcs } from "./ics.js";

export type ExportFormat = "zwo" | "fit" | "ics";

export interface ExportResult {
  success: boolean;
  filename: string;
  error?: string;
}

/**
 * Trigger a file download in the browser
 */
export function downloadFile(
  content: string | Uint8Array,
  filename: string,
  mimeType: string
): void {
  const blob =
    content instanceof Uint8Array
      ? new Blob([new Uint8Array(content)], { type: mimeType })
      : new Blob([content], { type: mimeType });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Sanitize filename to be safe across platforms
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, "") // Remove invalid chars
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .substring(0, 100); // Limit length
}

/**
 * Get available export formats for a workout based on its sport
 */
export function getAvailableFormats(sport: Sport): ExportFormat[] {
  const formats: ExportFormat[] = [];

  if (isZwoSupported(sport)) {
    formats.push("zwo");
  }

  if (isFitSupported(sport)) {
    formats.push("fit");
  }

  return formats;
}

/**
 * Export a single workout to the specified format
 */
export async function exportWorkout(
  workout: Workout,
  format: ExportFormat,
  settings: Settings
): Promise<ExportResult> {
  const safeName = sanitizeFilename(workout.name);

  try {
    switch (format) {
      case "zwo": {
        if (!isZwoSupported(workout.sport)) {
          return {
            success: false,
            filename: "",
            error: `Zwift export only supports bike and run workouts`,
          };
        }
        const zwoContent = generateZwo(workout, settings);
        const filename = `${safeName}.zwo`;
        downloadFile(zwoContent, filename, "application/xml");
        return { success: true, filename };
      }

      case "fit": {
        if (!isFitSupported(workout.sport)) {
          return {
            success: false,
            filename: "",
            error: `FIT export not supported for ${workout.sport} workouts`,
          };
        }
        const fitContent = await generateFit(workout, settings);
        const filename = `${safeName}.fit`;
        downloadFile(fitContent, filename, "application/vnd.ant.fit");
        return { success: true, filename };
      }

      default:
        return {
          success: false,
          filename: "",
          error: `Unknown format: ${format}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      filename: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Export the full training plan to iCalendar format
 */
export function exportPlanToCalendar(plan: TrainingPlan): ExportResult {
  try {
    const icsContent = generateIcs(plan);
    const safeName = sanitizeFilename(plan.meta.event);
    const filename = `${safeName}_training_plan.ics`;
    downloadFile(icsContent, filename, "text/calendar");
    return { success: true, filename };
  } catch (error) {
    return {
      success: false,
      filename: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Export all workouts in the plan to ZWO/FIT files (as a batch download)
 * For each workout, generates the appropriate file format
 */
export async function exportAllWorkouts(
  plan: TrainingPlan,
  format: "zwo" | "fit",
  settings: Settings
): Promise<{ exported: number; skipped: number; errors: string[] }> {
  const errors: string[] = [];
  let exported = 0;
  let skipped = 0;

  for (const week of plan.weeks) {
    for (const day of week.days) {
      for (const workout of day.workouts) {
        // Skip rest days
        if (workout.sport === "rest") {
          skipped++;
          continue;
        }

        // Check format support
        if (format === "zwo" && !isZwoSupported(workout.sport)) {
          skipped++;
          continue;
        }
        if (format === "fit" && !isFitSupported(workout.sport)) {
          skipped++;
          continue;
        }

        const result = await exportWorkout(workout, format, settings);
        if (result.success) {
          exported++;
        } else {
          errors.push(`${workout.name}: ${result.error}`);
        }

        // Small delay to avoid overwhelming the browser
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  return { exported, skipped, errors };
}

// Re-export format-specific helpers
export { isZwoSupported } from "./zwo.js";
export { isFitSupported, isFitSdkAvailable } from "./fit.js";
