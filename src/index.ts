/**
 * Claude Coach - Training Plan Generator
 *
 * Public API for validating and working with training plans.
 */

// Schema validation
export {
  // Validation functions
  validatePlan,
  validatePlanOrThrow,
  formatValidationErrors,
  getJsonSchema,
  // Main schema
  TrainingPlanSchema,
  // Component schemas (for partial validation)
  WorkoutSchema,
  TrainingWeekSchema,
  TrainingDaySchema,
  TrainingPhaseSchema,
  AthleteAssessmentSchema,
  AthleteZonesSchema,
  RaceStrategySchema,
  UnitPreferencesSchema,
  PlanMetaSchema,
  // Types
  type TrainingPlan,
  type Workout,
  type TrainingWeek,
  type TrainingDay,
  type TrainingPhase,
  type AthleteAssessment,
  type AthleteZones,
  type RaceStrategy,
  type UnitPreferences,
  type ValidationResult,
  type ValidationError,
} from "./schema/training-plan.schema.js";

// Re-export TypeScript interface types for backwards compatibility
export type {
  Sport,
  WorkoutType,
  IntensityUnit,
  DurationUnit,
  StepType,
  SwimDistanceUnit,
  LandDistanceUnit,
  FirstDayOfWeek,
  IntensityTarget,
  DurationTarget,
  WorkoutStep,
  IntervalSet,
  StructuredWorkout,
  WeekSummary,
  HeartRateZones,
  PowerZones,
  SwimZones,
  PaceZones,
} from "./schema/training-plan.js";
