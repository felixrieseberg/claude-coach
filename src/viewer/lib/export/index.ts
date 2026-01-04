/**
 * Training Plan Export
 *
 * Unified export interface for generating workout files client-side.
 * Supports:
 * - ZWO (Zwift workouts) - bike/run only
 * - FIT (Garmin workouts) - all sports
 * - MRC (ERG/MRC) - bike only, for indoor trainers
 * - ICS (iCalendar) - full plan calendar events
 */

import type { Workout, TrainingPlan, TrainingDay, Sport } from "../../../schema/training-plan.js";
import type { Settings } from "../../stores/settings.js";
import { generateZwo, isZwoSupported } from "./zwo.js";
import { generateFit, isFitSupported } from "./fit.js";
import { generateMrc, isErgSupported } from "./erg.js";
import { generateIcs } from "./ics.js";
import JSZip from "jszip";

export type ExportFormat = "zwo" | "fit" | "mrc" | "ics";

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

  if (isErgSupported(sport)) {
    formats.push("mrc");
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

      case "mrc": {
        if (!isErgSupported(workout.sport)) {
          return {
            success: false,
            filename: "",
            error: `MRC export only supports bike workouts`,
          };
        }
        const mrcContent = generateMrc(workout, settings);
        const filename = `${safeName}.mrc`;
        downloadFile(mrcContent, filename, "text/plain");
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
 * Generate workout file content without triggering a download
 */
async function generateWorkoutContent(
  workout: Workout,
  format: "zwo" | "fit" | "mrc",
  settings: Settings
): Promise<{ content: string | Uint8Array; filename: string } | null> {
  const safeName = sanitizeFilename(workout.name);

  try {
    switch (format) {
      case "zwo": {
        if (!isZwoSupported(workout.sport)) return null;
        const content = generateZwo(workout, settings);
        return { content, filename: `${safeName}.zwo` };
      }
      case "fit": {
        if (!isFitSupported(workout.sport)) return null;
        const content = await generateFit(workout, settings);
        return { content, filename: `${safeName}.fit` };
      }
      case "mrc": {
        if (!isErgSupported(workout.sport)) return null;
        const content = generateMrc(workout, settings);
        return { content, filename: `${safeName}.mrc` };
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Export all workouts in the plan to a single ZIP file
 * Contains ZWO/FIT/MRC files based on the selected format
 */
export async function exportAllWorkouts(
  plan: TrainingPlan,
  format: "zwo" | "fit" | "mrc",
  settings: Settings
): Promise<{ exported: number; skipped: number; errors: string[] }> {
  const errors: string[] = [];
  let exported = 0;
  let skipped = 0;

  const zip = new JSZip();

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
        if (format === "mrc" && !isErgSupported(workout.sport)) {
          skipped++;
          continue;
        }

        try {
          const result = await generateWorkoutContent(workout, format, settings);
          if (result) {
            zip.file(result.filename, result.content);
            exported++;
          } else {
            skipped++;
          }
        } catch (error) {
          errors.push(
            `${workout.name}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }
    }
  }

  // Only create and download the ZIP if there are files to export
  if (exported > 0) {
    const zipContent = await zip.generateAsync({ type: "uint8array" });
    const planName = sanitizeFilename(plan.meta.event);
    const zipFilename = `${planName}_workouts_${format}.zip`;
    downloadFile(zipContent, zipFilename, "application/zip");
  }

  return { exported, skipped, errors };
}

// Re-export format-specific helpers
export { isZwoSupported } from "./zwo.js";
export { isFitSupported, isFitSdkAvailable } from "./fit.js";
export { isErgSupported } from "./erg.js";
