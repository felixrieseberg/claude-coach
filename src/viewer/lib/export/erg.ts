/**
 * ERG/MRC Export
 *
 * Generates ERG/MRC workout files for indoor cycling trainers.
 * Widely supported by TrainerRoad, Zwift, PerfPRO, Golden Cheetah, and others.
 *
 * - ERG format: Uses absolute watts
 * - MRC format: Uses percentage of FTP (more portable)
 *
 * We generate MRC format since it scales to each user's FTP.
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
 * Check if a sport is supported by ERG/MRC export
 * Only cycling workouts make sense for trainer files
 */
export function isErgSupported(sport: Sport): boolean {
  return sport === "bike";
}

/**
 * Convert intensity to percentage of FTP
 */
function intensityToPercent(intensity: number): number {
  // Intensity is stored as percentage (e.g., 75 for 75%)
  return intensity;
}

/**
 * Generate data points from structured workout
 * Returns array of [minutes, percent] tuples
 */
function generateDataPoints(structure: StructuredWorkout): [number, number][] {
  const points: [number, number][] = [];
  let currentMinute = 0;

  const addStep = (step: WorkoutStep) => {
    const percent = intensityToPercent(step.intensity?.value ?? 50);
    const durationMinutes = getDurationMinutes(step);

    // Add start point
    points.push([currentMinute, percent]);

    // Warmup/cooldown steps with a range are ramps; on other steps the range is a
    // target band around `value`, so they stay flat.
    const isRamp = step.type === "warmup" || step.type === "cooldown";
    if (
      isRamp &&
      step.intensity?.valueLow !== undefined &&
      step.intensity?.valueHigh !== undefined
    ) {
      // Warmups ramp up (low -> high); cooldowns ramp down (high -> low)
      const isCooldown = step.type === "cooldown";
      const startPercent = intensityToPercent(
        isCooldown ? step.intensity.valueHigh : step.intensity.valueLow
      );
      const endPercent = intensityToPercent(
        isCooldown ? step.intensity.valueLow : step.intensity.valueHigh
      );
      points[points.length - 1] = [currentMinute, startPercent];
      currentMinute += durationMinutes;
      points.push([currentMinute, endPercent]);
    } else {
      currentMinute += durationMinutes;
      // Add end point at same intensity (creates flat segment)
      points.push([currentMinute, percent]);
    }
  };

  const getDurationMinutes = (step: WorkoutStep): number => {
    const unit = step.duration?.unit ?? "minutes";
    const value = step.duration?.value ?? 0;
    switch (unit) {
      case "seconds":
        return value / 60;
      case "minutes":
        return value;
      case "hours":
        return value * 60;
      default:
        // For distance-based, estimate ~30km/h average
        if (unit === "meters") {
          return (value / 1000 / 30) * 60;
        }
        if (unit === "kilometers") {
          return (value / 30) * 60;
        }
        return value;
    }
  };

  // Process warmup
  if (structure.warmup) {
    for (const step of structure.warmup) {
      addStep(step);
    }
  }

  // Process main set
  for (const item of structure.main ?? []) {
    if (item.type === "interval_set" || "repeats" in item) {
      const intervalSet = item as IntervalSet;
      for (let i = 0; i < (intervalSet.repeats ?? 1); i++) {
        for (const step of intervalSet.steps ?? []) {
          addStep(step);
        }
      }
    } else {
      addStep(item as WorkoutStep);
    }
  }

  // Process cooldown
  if (structure.cooldown) {
    for (const step of structure.cooldown) {
      addStep(step);
    }
  }

  return points;
}

/**
 * Generate simple data points when no structure is provided
 */
function generateSimpleDataPoints(workout: Workout): [number, number][] {
  const totalMinutes = workout.durationMinutes || 60;
  const points: [number, number][] = [];

  // Determine main intensity based on workout type
  let mainPercent = 65;
  switch (workout.type) {
    case "recovery":
      mainPercent = 55;
      break;
    case "endurance":
      mainPercent = 65;
      break;
    case "tempo":
      mainPercent = 80;
      break;
    case "threshold":
      mainPercent = 95;
      break;
    case "vo2max":
      mainPercent = 110;
      break;
    case "intervals":
      mainPercent = 85;
      break;
  }

  // Warmup (10% of total, ramp from 40% to 65%)
  const warmupMinutes = Math.min(15, Math.max(5, Math.round(totalMinutes * 0.1)));
  points.push([0, 40]);
  points.push([warmupMinutes, 65]);

  // Main set
  const cooldownMinutes = Math.min(10, Math.max(5, Math.round(totalMinutes * 0.1)));
  const mainMinutes = totalMinutes - warmupMinutes - cooldownMinutes;
  points.push([warmupMinutes, mainPercent]);
  points.push([warmupMinutes + mainMinutes, mainPercent]);

  // Cooldown (ramp from 60% to 40%)
  points.push([warmupMinutes + mainMinutes, 60]);
  points.push([totalMinutes, 40]);

  return points;
}

/**
 * Generate a complete MRC file for a workout
 */
export function generateMrc(workout: Workout, _settings: Settings): string {
  if (!isErgSupported(workout.sport)) {
    throw new Error(`ERG/MRC export only supports bike workouts`);
  }

  const dataPoints = workout.structure
    ? generateDataPoints(workout.structure)
    : generateSimpleDataPoints(workout);

  // Build description from workout info
  let description = workout.name;
  if (workout.description) {
    description += ` - ${workout.description}`;
  }

  const lines = [
    "[COURSE HEADER]",
    `VERSION = 2`,
    `UNITS = ENGLISH`,
    `DESCRIPTION = ${description.replace(/[\r\n]/g, " ")}`,
    `FILE NAME = ${workout.name}`,
    `MINUTES PERCENT`,
    "[END COURSE HEADER]",
    "[COURSE DATA]",
  ];

  // Add data points
  for (const [minutes, percent] of dataPoints) {
    lines.push(`${minutes.toFixed(2)}\t${percent.toFixed(0)}`);
  }

  lines.push("[END COURSE DATA]");

  return lines.join("\n");
}

/**
 * Generate ERG file (absolute watts) - requires FTP
 */
export function generateErg(workout: Workout, settings: Settings): string {
  if (!isErgSupported(workout.sport)) {
    throw new Error(`ERG/MRC export only supports bike workouts`);
  }

  const ftp = settings.bike?.ftp || 200; // Default to 200W if not set
  const dataPoints = workout.structure
    ? generateDataPoints(workout.structure)
    : generateSimpleDataPoints(workout);

  let description = workout.name;
  if (workout.description) {
    description += ` - ${workout.description}`;
  }

  const lines = [
    "[COURSE HEADER]",
    `VERSION = 2`,
    `UNITS = ENGLISH`,
    `DESCRIPTION = ${description.replace(/[\r\n]/g, " ")}`,
    `FILE NAME = ${workout.name}`,
    `FTP = ${ftp}`,
    `MINUTES WATTS`,
    "[END COURSE HEADER]",
    "[COURSE DATA]",
  ];

  // Add data points converted to watts
  for (const [minutes, percent] of dataPoints) {
    const watts = Math.round((percent / 100) * ftp);
    lines.push(`${minutes.toFixed(2)}\t${watts}`);
  }

  lines.push("[END COURSE DATA]");

  return lines.join("\n");
}
