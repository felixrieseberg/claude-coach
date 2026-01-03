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
  const duration = durationToSeconds(step.duration.value, step.duration.unit);
  const startPower = intensityToDecimal(step.intensity.valueLow || step.intensity.value * 0.6);
  const endPower = intensityToDecimal(step.intensity.valueHigh || step.intensity.value);

  return `    <Warmup Duration="${duration}" PowerLow="${startPower.toFixed(2)}" PowerHigh="${endPower.toFixed(2)}"/>`;
}

/**
 * Generate a cooldown segment
 */
function generateCooldown(step: WorkoutStep): string {
  const duration = durationToSeconds(step.duration.value, step.duration.unit);
  const startPower = intensityToDecimal(step.intensity.valueHigh || step.intensity.value);
  const endPower = intensityToDecimal(step.intensity.valueLow || step.intensity.value * 0.5);

  return `    <Cooldown Duration="${duration}" PowerLow="${endPower.toFixed(2)}" PowerHigh="${startPower.toFixed(2)}"/>`;
}

/**
 * Generate a steady state segment
 */
function generateSteadyState(step: WorkoutStep, isRamp = false): string {
  const duration = durationToSeconds(step.duration.value, step.duration.unit);
  const power = intensityToDecimal(step.intensity.value);

  let cadenceAttr = "";
  if (step.cadence) {
    cadenceAttr = ` Cadence="${step.cadence.low}"`;
    if (step.cadence.high !== step.cadence.low) {
      cadenceAttr = ` CadenceLow="${step.cadence.low}" CadenceHigh="${step.cadence.high}"`;
    }
  }

  if (isRamp && step.intensity.valueLow !== undefined && step.intensity.valueHigh !== undefined) {
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
  const workStep = intervalSet.steps.find((s) => s.type === "work");
  const recoveryStep = intervalSet.steps.find((s) => s.type === "recovery" || s.type === "rest");

  if (!workStep) {
    // Just generate steady states if no work step found
    return intervalSet.steps.map((s) => generateSteadyState(s)).join("\n");
  }

  const onDuration = durationToSeconds(workStep.duration.value, workStep.duration.unit);
  const onPower = intensityToDecimal(workStep.intensity.value);

  const offDuration = recoveryStep
    ? durationToSeconds(recoveryStep.duration.value, recoveryStep.duration.unit)
    : 60; // Default 60s recovery
  const offPower = recoveryStep ? intensityToDecimal(recoveryStep.intensity.value) : 0.5; // Default 50% recovery

  let cadenceAttr = "";
  if (workStep.cadence) {
    cadenceAttr = ` Cadence="${workStep.cadence.low}"`;
  }

  return `    <IntervalsT Repeat="${intervalSet.repeats}" OnDuration="${onDuration}" OffDuration="${offDuration}" OnPower="${onPower.toFixed(2)}" OffPower="${offPower.toFixed(2)}"${cadenceAttr}/>`;
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
    : generateSimpleWorkout(workout);

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
