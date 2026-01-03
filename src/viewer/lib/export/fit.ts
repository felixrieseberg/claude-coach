/**
 * FIT (Garmin) Workout Export
 *
 * Generates Garmin FIT workout files that can be uploaded to Garmin Connect.
 * Uses the official @garmin/fitsdk package for binary FIT encoding.
 *
 * How to import to Garmin:
 * - Upload to Garmin Connect (connect.garmin.com) -> Training -> Workouts -> Import
 * - The workout will sync to compatible Garmin devices
 */

import type {
  Workout,
  Sport,
  StructuredWorkout,
  WorkoutStep,
  IntervalSet,
} from "../../../schema/training-plan.js";
import type { Settings } from "../../stores/settings.js";
import { Encoder, Profile } from "@garmin/fitsdk";

/**
 * Check if the FIT SDK is available at runtime
 * Always returns true since the SDK is now bundled
 */
export async function isFitSdkAvailable(): Promise<boolean> {
  return true;
}

/**
 * Check if a sport is supported by FIT export
 */
export function isFitSupported(sport: Sport): boolean {
  // FIT supports most sports, excluding rest and race-specific
  return sport !== "rest" && sport !== "race";
}

/**
 * Map our sport types to FIT sport enum values
 */
function getFitSport(sport: Sport): string {
  switch (sport) {
    case "swim":
      return "swimming";
    case "bike":
      return "cycling";
    case "run":
      return "running";
    case "strength":
      return "training";
    case "brick":
      return "multisport";
    default:
      return "generic";
  }
}

/**
 * Map our sport types to FIT sub_sport enum values
 */
function getFitSubSport(sport: Sport): string {
  switch (sport) {
    case "swim":
      return "lap_swimming";
    case "bike":
      return "road";
    case "run":
      return "road";
    case "strength":
      return "strength_training";
    case "brick":
      return "triathlon";
    default:
      return "generic";
  }
}

/**
 * Get workout step intensity/duration type based on step type
 */
function getStepIntensity(stepType: string): string {
  switch (stepType) {
    case "warmup":
      return "warmup";
    case "cooldown":
      return "cooldown";
    case "rest":
      return "rest";
    case "recovery":
      return "recovery";
    case "work":
      return "active";
    default:
      return "active";
  }
}

/**
 * Convert duration to FIT workout step duration
 */
function getDurationValue(value: number, unit: string): number {
  switch (unit) {
    case "seconds":
      return value * 1000; // FIT uses milliseconds
    case "minutes":
      return value * 60 * 1000;
    case "hours":
      return value * 3600 * 1000;
    case "meters":
      return value * 100; // FIT uses centimeters
    case "kilometers":
      return value * 100000;
    case "miles":
      return value * 160934; // cm per mile
    default:
      return value * 1000;
  }
}

/**
 * Get duration type for FIT
 */
function getDurationType(unit: string): string {
  switch (unit) {
    case "seconds":
    case "minutes":
    case "hours":
      return "time";
    case "meters":
    case "kilometers":
    case "miles":
      return "distance";
    default:
      return "time";
  }
}

/**
 * Generate workout steps from structured workout
 */
function generateStepsFromStructure(structure: StructuredWorkout): {
  steps: any[];
  totalSteps: number;
} {
  const steps: any[] = [];
  let stepIndex = 0;

  // Helper to add a step
  const addStep = (step: WorkoutStep, isPartOfRepeat = false) => {
    const durationType = getDurationType(step.duration.unit);
    const durationValue = getDurationValue(step.duration.value, step.duration.unit);

    const fitStep: any = {
      messageIndex: stepIndex,
      workoutStepName: step.name || "",
      intensity: getStepIntensity(step.type),
      durationType: durationType,
      durationValue: durationValue,
      notes: step.notes || "",
    };

    // Add target based on intensity unit
    if (step.intensity) {
      switch (step.intensity.unit) {
        case "percent_ftp":
          fitStep.targetType = "power";
          fitStep.targetValue = 0;
          fitStep.customTargetValueLow = step.intensity.valueLow || step.intensity.value - 5;
          fitStep.customTargetValueHigh = step.intensity.valueHigh || step.intensity.value + 5;
          break;
        case "percent_lthr":
        case "hr_zone":
          fitStep.targetType = "heart_rate";
          fitStep.targetValue = 0;
          // HR zone values need to be actual BPM if available
          if (step.intensity.valueLow !== undefined && step.intensity.valueHigh !== undefined) {
            fitStep.customTargetValueLow = step.intensity.valueLow;
            fitStep.customTargetValueHigh = step.intensity.valueHigh;
          } else {
            // Use zone as target value (1-5)
            fitStep.targetValue = step.intensity.value;
          }
          break;
        case "rpe":
          // No direct RPE support in FIT, use open target
          fitStep.targetType = "open";
          break;
        default:
          fitStep.targetType = "open";
      }
    } else {
      fitStep.targetType = "open";
    }

    // Add cadence target if present
    if (step.cadence) {
      fitStep.customTargetCadenceLow = step.cadence.low;
      fitStep.customTargetCadenceHigh = step.cadence.high;
    }

    steps.push(fitStep);
    stepIndex++;
    return stepIndex - 1;
  };

  // Helper to add interval set
  const addIntervalSet = (intervalSet: IntervalSet) => {
    // For FIT, we need to add a repeat step that references the child steps
    const repeatStepIndex = stepIndex;
    stepIndex++; // Reserve index for repeat step

    // Add the child steps
    const childStepIndices: number[] = [];
    for (const childStep of intervalSet.steps) {
      childStepIndices.push(addStep(childStep, true));
    }

    // Create the repeat step
    const repeatStep: any = {
      messageIndex: repeatStepIndex,
      workoutStepName: intervalSet.name || "Intervals",
      durationType: "repeat_until_steps_cmplt",
      durationValue: intervalSet.repeats,
      targetType: "open",
      intensity: "interval",
    };

    // Insert repeat step at correct position
    steps.splice(repeatStepIndex, 0, repeatStep);
    stepIndex++; // Adjust for inserted repeat step
  };

  // Process warmup
  if (structure.warmup) {
    for (const step of structure.warmup) {
      addStep(step);
    }
  }

  // Process main set
  for (const item of structure.main) {
    if ("repeats" in item) {
      addIntervalSet(item as IntervalSet);
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

  return { steps, totalSteps: steps.length };
}

/**
 * Generate simple workout steps when no structure is provided
 */
function generateSimpleSteps(workout: Workout): { steps: any[]; totalSteps: number } {
  const steps: any[] = [];
  const totalMinutes = workout.durationMinutes || 60;

  // Warmup (10% of total, 5-15 min)
  const warmupMinutes = Math.min(15, Math.max(5, Math.round(totalMinutes * 0.1)));
  steps.push({
    messageIndex: 0,
    workoutStepName: "Warm Up",
    intensity: "warmup",
    durationType: "time",
    durationValue: warmupMinutes * 60 * 1000,
    targetType: "open",
  });

  // Main (80% of total)
  const cooldownMinutes = Math.min(10, Math.max(5, Math.round(totalMinutes * 0.1)));
  const mainMinutes = totalMinutes - warmupMinutes - cooldownMinutes;

  let mainIntensity = "active";
  if (workout.type === "recovery") mainIntensity = "recovery";
  else if (workout.type === "rest") mainIntensity = "rest";
  else if (workout.type === "intervals" || workout.type === "vo2max") mainIntensity = "interval";

  steps.push({
    messageIndex: 1,
    workoutStepName: "Main Set",
    intensity: mainIntensity,
    durationType: "time",
    durationValue: mainMinutes * 60 * 1000,
    targetType: "open",
    notes: workout.description || "",
  });

  // Cooldown (10% of total, 5-10 min)
  steps.push({
    messageIndex: 2,
    workoutStepName: "Cool Down",
    intensity: "cooldown",
    durationType: "time",
    durationValue: cooldownMinutes * 60 * 1000,
    targetType: "open",
  });

  return { steps, totalSteps: 3 };
}

/**
 * Generate a complete FIT workout file
 */
export async function generateFit(workout: Workout, _settings: Settings): Promise<Uint8Array> {
  if (!isFitSupported(workout.sport)) {
    throw new Error(`FIT export not supported for ${workout.sport} workouts`);
  }

  const encoder = new Encoder();

  // File ID message (required)
  encoder.onMesg(Profile.MesgNum.FILE_ID, {
    type: "workout",
    manufacturer: "development",
    product: 1,
    serialNumber: Math.floor(Math.random() * 1000000),
    timeCreated: new Date(),
  });

  // Generate steps
  const { steps, totalSteps } = workout.structure
    ? generateStepsFromStructure(workout.structure)
    : generateSimpleSteps(workout);

  // Workout message
  encoder.onMesg(Profile.MesgNum.WORKOUT, {
    workoutName: workout.name,
    sport: getFitSport(workout.sport),
    subSport: getFitSubSport(workout.sport),
    numValidSteps: totalSteps,
  });

  // Write workout steps
  for (const step of steps) {
    encoder.onMesg(Profile.MesgNum.WORKOUT_STEP, step);
  }

  // Finalize and return
  return encoder.close();
}
