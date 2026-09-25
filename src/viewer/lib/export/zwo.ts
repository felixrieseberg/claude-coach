/**
 * ZWO (Zwift Workout) Export
 *
 * Generates Zwift workout files in XML format.
 * Only supports bike and run workouts.
 *
 * How to import to Zwift:
 * - Desktop: Save to Documents/Zwift/Workouts/[userID]/
 * - iOS/iPad: Open Zwift on desktop first (syncs to cloud), then iOS downloads it
 * - Alternative: Save to iCloud at Documents/Zwift/Workouts/[userID]/
 */

import type {
  Workout,
  Sport,
  StructuredWorkout,
  WorkoutStep,
  IntervalSet,
} from "../../../schema/training-plan.js";
import type { Settings } from "../../stores/settings.js";

/**
 * Check if a sport is supported by Zwift export
 */
export function isZwoSupported(sport: Sport): boolean {
  return sport === "bike" || sport === "run";
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Convert intensity percentage to Zwift decimal format
 * (e.g., 75% FTP -> 0.75)
 */
function intensityToDecimal(intensity: number): number {
  // Intensity is stored as percentage (e.g., 75 for 75%)
  // Zwift expects decimal (0.75)
  return intensity / 100;
}

/**
 * Convert duration to seconds
 */
function durationToSeconds(value: number, unit: string): number {
  switch (unit) {
    case "seconds":
      return value;
    case "minutes":
      return value * 60;
    case "hours":
      return value * 3600;
    default:
      // For distance-based durations, estimate using typical speeds
      // This is a rough approximation
      return value; // Return as-is if not time-based
  }
}

/**
 * Get workout type for ZWO (bike or run)
 */
function getZwoSportType(sport: Sport): "bike" | "run" {
  return sport === "run" ? "run" : "bike";
}

/**
 * Generate a warmup segment
 */
function generateWarmup(step: WorkoutStep): string {
  const duration = durationToSeconds(step.duration?.value ?? 0, step.duration?.unit ?? "minutes");
  const intensityValue = step.intensity?.value ?? 50;
  const startPower = intensityToDecimal(step.intensity?.valueLow ?? intensityValue * 0.6);
  const endPower = intensityToDecimal(step.intensity?.valueHigh ?? intensityValue);

  return `    <Warmup Duration="${duration}" PowerLow="${startPower.toFixed(2)}" PowerHigh="${endPower.toFixed(2)}"/>`;
}

/**
 * Generate a cooldown segment
 */
function generateCooldown(step: WorkoutStep): string {
  const duration = durationToSeconds(step.duration?.value ?? 0, step.duration?.unit ?? "minutes");
  const intensityValue = step.intensity?.value ?? 50;
  const startPower = intensityToDecimal(step.intensity?.valueHigh ?? intensityValue);
  const endPower = intensityToDecimal(step.intensity?.valueLow ?? intensityValue * 0.5);

  return `    <Cooldown Duration="${duration}" PowerLow="${endPower.toFixed(2)}" PowerHigh="${startPower.toFixed(2)}"/>`;
}

/**
 * Generate a steady state segment
 */
function generateSteadyState(step: WorkoutStep, isRamp = false): string {
  const duration = durationToSeconds(step.duration?.value ?? 0, step.duration?.unit ?? "minutes");
  const power = intensityToDecimal(step.intensity?.value ?? 50);

  let cadenceAttr = "";
  if (step.cadence) {
    cadenceAttr = ` Cadence="${step.cadence.low ?? 90}"`;
    if (step.cadence.high !== step.cadence.low) {
      cadenceAttr = ` CadenceLow="${step.cadence.low ?? 90}" CadenceHigh="${step.cadence.high ?? 100}"`;
    }
  }

  if (isRamp && step.intensity?.valueLow !== undefined && step.intensity?.valueHigh !== undefined) {
    const powerLow = intensityToDecimal(step.intensity.valueLow);
    const powerHigh = intensityToDecimal(step.intensity.valueHigh);
    return `    <Ramp Duration="${duration}" PowerLow="${powerLow.toFixed(2)}" PowerHigh="${powerHigh.toFixed(2)}"${cadenceAttr}/>`;
  }

  return `    <SteadyState Duration="${duration}" Power="${power.toFixed(2)}"${cadenceAttr}/>`;
}

/**
 * Generate an interval set (IntervalsT in ZWO)
 */
function generateIntervalSet(intervalSet: IntervalSet): string {
  // Find work and recovery steps
  const steps = intervalSet.steps ?? [];
  const workStep = steps.find((s) => s.type === "work");
  const recoveryStep = steps.find((s) => s.type === "recovery" || s.type === "rest");

  if (!workStep) {
    // Just generate steady states if no work step found
    return steps.map((s) => generateSteadyState(s)).join("\n");
  }

  const onDuration = durationToSeconds(
    workStep.duration?.value ?? 0,
    workStep.duration?.unit ?? "minutes"
  );
  const onPower = intensityToDecimal(workStep.intensity?.value ?? 100);

  const offDuration = recoveryStep
    ? durationToSeconds(recoveryStep.duration?.value ?? 0, recoveryStep.duration?.unit ?? "minutes")
    : 60; // Default 60s recovery
  const offPower = recoveryStep ? intensityToDecimal(recoveryStep.intensity?.value ?? 50) : 0.5; // Default 50% recovery

  let cadenceAttr = "";
  if (workStep.cadence) {
    cadenceAttr = ` Cadence="${workStep.cadence.low ?? 90}"`;
  }

  return `    <IntervalsT Repeat="${intervalSet.repeats ?? 1}" OnDuration="${onDuration}" OffDuration="${offDuration}" OnPower="${onPower.toFixed(2)}" OffPower="${offPower.toFixed(2)}"${cadenceAttr}/>`;
}

/**
 * Generate workout segments from structured workout
 */
function generateSegmentsFromStructure(structure: StructuredWorkout): string[] {
  const segments: string[] = [];

  // Warmup
  if (structure.warmup && structure.warmup.length > 0) {
    for (const step of structure.warmup) {
      if (step.type === "warmup") {
        segments.push(generateWarmup(step));
      } else {
        segments.push(generateSteadyState(step));
      }
    }
  }

  // Main set
  for (const item of structure.main) {
    if ("repeats" in item) {
      // Interval set
      segments.push(generateIntervalSet(item as IntervalSet));
    } else {
      // Single step
      const step = item as WorkoutStep;
      segments.push(generateSteadyState(step));
    }
  }

  // Cooldown
  if (structure.cooldown && structure.cooldown.length > 0) {
    for (const step of structure.cooldown) {
      if (step.type === "cooldown") {
        segments.push(generateCooldown(step));
      } else {
        segments.push(generateSteadyState(step));
      }
    }
  }

  return segments;
}

/**
 * Parse a humanReadable workout description into ZWO segments.
 *
 * Recognises common patterns produced by Claude Coach:
 *   Warm-up: 15min Z2
 *   Main: 4 x 10min at ... (Z3, 180-213W) at 65-75rpm, 5min Z1 recovery
 *   Cool-down: 10min Z1
 *   Alternate 10min Z3 ... with 10min Z2 ...
 *   Include 5 x 30s at Z5 with 3min easy between
 *
 * Returns null when the text doesn't contain parseable intervals so the
 * caller can fall back to generateSimpleWorkout().
 */
function parseHumanReadableToZwo(workout: Workout, settings: Settings): string[] | null {
  const hr = workout.humanReadable;
  if (!hr) return null;

  const ftp = settings.bike.ftp || 200;

  const lines = hr.split("\n").map((l) => l.trim()).filter(Boolean);
  const segments: string[] = [];

  /** Map a zone number to a Zwift power decimal */
  function zoneToPower(z: number): number {
    const map: Record<number, number> = { 1: 0.50, 2: 0.65, 3: 0.83, 4: 0.95, 5: 1.03, 6: 1.13 };
    return map[z] ?? 0.65;
  }

  /** Best-effort extraction of a power fraction from a free-text fragment */
  function parsePower(text: string, fallback: number): number {
    // Explicit watts range  →  mid-point / FTP
    const mw = text.match(/(\d+)\s*-\s*(\d+)\s*W/);
    if (mw) return (parseInt(mw[1]) + parseInt(mw[2])) / 2 / ftp;
    // Single watts value
    const sw = text.match(/(\d+)\s*W\b/);
    if (sw) return parseInt(sw[1]) / ftp;
    // Percentage of FTP
    const mp = text.match(/(\d+)\s*%\s*FTP/);
    if (mp) return parseInt(mp[1]) / 100;
    // Zone reference
    const mz = text.match(/Z(\d)/);
    if (mz) return zoneToPower(parseInt(mz[1]));
    return fallback;
  }

  /** Extract cadence from text */
  function parseCadence(text: string): string {
    const m = text.match(/(\d+)\s*(?:-\s*(\d+)\s*)?rpm/i);
    if (!m) return "";
    return ` Cadence="${m[1]}"`;
  }

  /** Parse a duration string like "10min", "30s", "2h" into seconds */
  function parseDuration(val: string, unit: string): number {
    const v = parseFloat(val);
    const u = unit.toLowerCase();
    if (u === "h") return v * 3600;
    if (u === "s" || u === "sec") return v;
    return v * 60; // min, m
  }

  for (const line of lines) {
    // ── Warm-up ──
    const wm = line.match(/^Warm-?up:\s*(\d+)\s*min/i);
    if (wm) {
      const dur = parseInt(wm[1]) * 60;
      const pow = parsePower(line, 0.65);
      segments.push(
        `    <Warmup Duration="${dur}" PowerLow="0.40" PowerHigh="${pow.toFixed(2)}"/>`
      );
      continue;
    }

    // ── Cool-down ──
    const cm = line.match(/^Cool-?down:\s*(\d+)\s*min/i);
    if (cm) {
      const dur = parseInt(cm[1]) * 60;
      const pow = parsePower(line, 0.50);
      segments.push(
        `    <Cooldown Duration="${dur}" PowerLow="${Math.max(0.35, pow - 0.15).toFixed(2)}" PowerHigh="${pow.toFixed(2)}"/>`
      );
      continue;
    }

    // ── Intervals:  N x DUR  ... recovery/rest/easy/between ──
    const im = line.match(
      /(?:^Main:\s*|^Finish:\s*|^Include\s+|^Then:\s*|^\d+\s*x\s|^-\s*|.*?:\s*)?(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*(min|m|s|sec|h)/i
    );
    if (im) {
      const reps = parseInt(im[1]);
      const onDur = parseDuration(im[2], im[3]);
      const onPow = parsePower(line, 0.83);
      const cadAttr = parseCadence(line);

      // Look for recovery duration
      const recM =
        line.match(/(\d+)\s*min\s*(?:Z\d\s*)?(?:recovery|rest|easy|between)/i) ??
        line.match(/with\s+(\d+)\s*min/i);
      const offDur = recM ? parseInt(recM[1]) * 60 : Math.min(onDur, 5 * 60);
      const offPow = recM ? parsePower(recM[0], 0.50) : 0.50;

      segments.push(
        `    <IntervalsT Repeat="${reps}" OnDuration="${onDur}" OffDuration="${offDur}" OnPower="${onPow.toFixed(2)}" OffPower="${offPow.toFixed(2)}"${cadAttr}/>`
      );
      continue;
    }

    // ── Alternating blocks: "Alternate 10min Z3 ... with 10min Z2 ..." ──
    const altM = line.match(/[Aa]lternate\s+(\d+)\s*min\s+.*?(\d+)\s*min/);
    if (altM) {
      const dur1 = parseInt(altM[1]) * 60;
      const dur2 = parseInt(altM[2]) * 60;
      const parts = line.split(/with\s+/i);
      const pow1 = parsePower(parts[0] ?? "", 0.83);
      const pow2 = parsePower(parts[1] ?? parts[0] ?? "", 0.65);
      const cadAttr = parseCadence(line);

      // Scan all lines for total duration (e.g. "2h continuous climbing")
      let totalSec = 3600;
      for (const pl of lines) {
        const tm = pl.match(/(\d+(?:\.\d+)?)\s*h\s*(?:continuous|climbing|simulation)/i);
        if (tm) { totalSec = parseFloat(tm[1]) * 3600; break; }
      }
      const reps = Math.max(1, Math.round(totalSec / (dur1 + dur2)));

      segments.push(
        `    <IntervalsT Repeat="${reps}" OnDuration="${dur1}" OffDuration="${dur2}" OnPower="${pow1.toFixed(2)}" OffPower="${pow2.toFixed(2)}"${cadAttr}/>`
      );
      continue;
    }
  }

  return segments.length > 0 ? segments : null;
}

/**
 * Generate a simple workout when no structure is provided
 * Creates warmup -> main -> cooldown based on duration
 */
function generateSimpleWorkout(workout: Workout): string[] {
  const segments: string[] = [];
  const totalMinutes = workout.durationMinutes || 60;

  // 10% warmup (min 5 min, max 15 min)
  const warmupMinutes = Math.min(15, Math.max(5, Math.round(totalMinutes * 0.1)));
  segments.push(`    <Warmup Duration="${warmupMinutes * 60}" PowerLow="0.40" PowerHigh="0.65"/>`);

  // Main set based on workout type
  let mainPower = 0.65; // Default endurance
  switch (workout.type) {
    case "recovery":
      mainPower = 0.55;
      break;
    case "endurance":
      mainPower = 0.65;
      break;
    case "tempo":
      mainPower = 0.8;
      break;
    case "threshold":
      mainPower = 0.95;
      break;
    case "vo2max":
      mainPower = 1.1;
      break;
    case "intervals":
      mainPower = 0.85;
      break;
    case "long":
      mainPower = 0.65;
      break;
  }

  // 10% cooldown (min 5 min, max 10 min)
  const cooldownMinutes = Math.min(10, Math.max(5, Math.round(totalMinutes * 0.1)));
  const mainMinutes = totalMinutes - warmupMinutes - cooldownMinutes;

  segments.push(
    `    <SteadyState Duration="${mainMinutes * 60}" Power="${mainPower.toFixed(2)}"/>`
  );

  segments.push(
    `    <Cooldown Duration="${cooldownMinutes * 60}" PowerLow="0.40" PowerHigh="0.60"/>`
  );

  return segments;
}

/**
 * Generate a complete ZWO file for a workout
 */
export function generateZwo(workout: Workout, _settings: Settings): string {
  if (!isZwoSupported(workout.sport)) {
    throw new Error(`ZWO export not supported for ${workout.sport} workouts`);
  }

  const sportType = getZwoSportType(workout.sport);
  const segments = workout.structure
    ? generateSegmentsFromStructure(workout.structure)
    : (parseHumanReadableToZwo(workout, _settings) ?? generateSimpleWorkout(workout));

  // Clean up description for XML
  const description = escapeXml(
    (workout.description || "") +
      (workout.humanReadable ? `\n\n${workout.humanReadable.replace(/\\n/g, "\n")}` : "")
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<workout_file>
  <author>Claude Coach</author>
  <name>${escapeXml(workout.name)}</name>
  <description>${description}</description>
  <sportType>${sportType}</sportType>
  <workout>
${segments.join("\n")}
  </workout>
</workout_file>`;

  return xml;
}
