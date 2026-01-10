/**
 * Training Plan Zod Schema
 *
 * Runtime validation schema that mirrors the TypeScript interfaces.
 * Use this to validate JSON plans before rendering to HTML.
 */

import { z } from "zod";

// ============================================================================
// Core Types
// ============================================================================

export const SportSchema = z.enum(["swim", "bike", "run", "strength", "brick", "race", "rest"]);

// Workout types - flexible to support various training methodologies
// Common types: rest, recovery, easy, endurance, tempo, threshold, intervals,
// vo2max, sprint, speed, race, brick, strength, technique, openwater, hills, long
export const WorkoutTypeSchema = z.string();

export const IntensityUnitSchema = z.enum([
  "percent_ftp",
  "percent_lthr",
  "hr_zone",
  "pace_zone",
  "rpe",
  "css_offset",
]);

export const DurationUnitSchema = z.enum([
  "seconds",
  "minutes",
  "hours",
  "meters",
  "kilometers",
  "miles",
  "yards",
  "laps",
]);

export const StepTypeSchema = z.enum([
  "warmup",
  "work",
  "recovery",
  "rest",
  "cooldown",
  "interval_set",
]);

// Unit system preferences
export const SwimDistanceUnitSchema = z.enum(["meters", "yards"]);
export const LandDistanceUnitSchema = z.enum(["kilometers", "miles"]);
export const FirstDayOfWeekSchema = z.enum(["monday", "sunday"]);

export const UnitPreferencesSchema = z.object({
  swim: SwimDistanceUnitSchema,
  bike: LandDistanceUnitSchema,
  run: LandDistanceUnitSchema,
  firstDayOfWeek: FirstDayOfWeekSchema,
});

// ============================================================================
// Workout Structure (for Zwift/Garmin export)
// ============================================================================

export const IntensityTargetSchema = z.object({
  unit: IntensityUnitSchema,
  value: z.number(),
  valueLow: z.number().optional(),
  valueHigh: z.number().optional(),
  description: z.string().optional(),
});

export const DurationTargetSchema = z.object({
  unit: DurationUnitSchema,
  value: z.number(),
});

export const CadenceSchema = z.object({
  low: z.number(),
  high: z.number(),
});

export const WorkoutStepSchema = z.object({
  type: StepTypeSchema,
  name: z.string().optional(),
  duration: DurationTargetSchema,
  intensity: IntensityTargetSchema,
  cadence: CadenceSchema.optional(),
  notes: z.string().optional(),
});

export const IntervalSetSchema = z.object({
  type: z.literal("interval_set"),
  name: z.string().optional(),
  repeats: z.number().int().positive(),
  steps: z.array(WorkoutStepSchema),
});

export const StructuredWorkoutSchema = z.object({
  warmup: z.array(WorkoutStepSchema).optional(),
  main: z.array(z.union([WorkoutStepSchema, IntervalSetSchema])),
  cooldown: z.array(WorkoutStepSchema).optional(),
  totalDuration: DurationTargetSchema.optional(),
  estimatedTSS: z.number().optional(),
  estimatedIF: z.number().optional(),
});

// ============================================================================
// Daily Workout
// ============================================================================

export const HRRangeSchema = z.object({
  low: z.number(),
  high: z.number(),
});

export const PowerRangeSchema = z.union([
  z.object({
    low: z.number(),
    high: z.number(),
  }),
  z.string(), // Sometimes just a string like "200W"
]);

export const PaceRangeSchema = z.object({
  low: z.string(),
  high: z.string(),
});

export const WorkoutSchema = z.object({
  id: z.string(),
  sport: SportSchema,
  type: WorkoutTypeSchema,
  name: z.string(),
  description: z.string().optional(), // Optional - humanReadable can serve same purpose

  // Duration
  durationMinutes: z.number().optional(),
  distanceMeters: z.number().optional(),
  distanceKm: z.number().optional(), // Alternative for bike/run

  // Intensity summary
  primaryZone: z.string().optional(),
  targetHR: HRRangeSchema.optional(),
  targetPower: PowerRangeSchema.optional(),
  targetPace: PaceRangeSchema.optional(),
  rpe: z.number().min(1).max(10).optional(),

  // Structured workout for device export
  structure: StructuredWorkoutSchema.optional(),

  // Human-readable workout text
  humanReadable: z.string().optional(),

  // Tracking
  completed: z.boolean(),
  completedAt: z.string().optional(),
  actualDuration: z.number().optional(),
  actualDistance: z.number().optional(),
  notes: z.string().optional(),
});

// ============================================================================
// Training Week
// ============================================================================

export const TrainingDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in ISO format: YYYY-MM-DD"),
  dayOfWeek: z.string(),
  workouts: z.array(WorkoutSchema),
});

export const SportSummarySchema = z.object({
  sessions: z.number(),
  hours: z.number().optional(), // Sometimes missing for race day
  km: z.union([z.number(), z.string()]).optional(), // Sometimes a string
  meters: z.union([z.number(), z.string()]).optional(), // For swim
});

export const WeekSummarySchema = z.object({
  totalHours: z.number(),
  totalTSS: z.number().optional(),
  // Partial record - only sports with sessions are included
  bySport: z.record(z.string(), SportSummarySchema).optional(),
});

export const TrainingWeekSchema = z.object({
  weekNumber: z.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in ISO format: YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in ISO format: YYYY-MM-DD"),
  phase: z.string(),
  focus: z.string(),
  targetHours: z.number(),
  days: z.array(TrainingDaySchema),
  summary: WeekSummarySchema,
  isRecoveryWeek: z.boolean(),
});

// ============================================================================
// Training Zones
// ============================================================================

export const HeartRateZoneSchema = z.object({
  zone: z.number().int(),
  name: z.string(),
  percentLow: z.number().optional(),
  percentHigh: z.number().optional(),
  hrLow: z.number(),
  hrHigh: z.number(),
});

export const HeartRateZonesSchema = z.object({
  lthr: z.number(),
  zones: z.array(HeartRateZoneSchema),
});

export const PowerZoneSchema = z.object({
  zone: z.number().int(),
  name: z.string(),
  percentLow: z.number(),
  percentHigh: z.number(),
  wattsLow: z.number(),
  wattsHigh: z.number(),
});

export const PowerZonesSchema = z.object({
  ftp: z.number(),
  zones: z.array(PowerZoneSchema),
});

export const SwimZoneSchema = z.object({
  zone: z.number().int(),
  name: z.string(),
  paceOffset: z.number(),
  pace: z.string(),
});

export const SwimZonesSchema = z.object({
  css: z.string(),
  cssSeconds: z.number(),
  zones: z.array(SwimZoneSchema),
});

export const PaceZoneSchema = z.object({
  zone: z.union([z.number(), z.string()]), // Can be number (1, 2, 3) or string ("E", "M", "T")
  name: z.string(),
  pace: z.string(),
  paceOffset: z.number().optional(), // Offset from threshold
  paceSeconds: z.number().optional(), // Absolute pace in seconds
});

export const PaceZonesSchema = z.object({
  // Support both naming conventions
  threshold: z.string().optional(),
  thresholdPace: z.string().optional(),
  thresholdSeconds: z.number().optional(),
  thresholdPaceSeconds: z.number().optional(),
  zones: z.array(PaceZoneSchema).optional(), // Optional - some plans don't have zones defined
});

export const AthleteZonesSchema = z.object({
  run: z
    .object({
      hr: HeartRateZonesSchema.optional(),
      pace: PaceZonesSchema.optional(),
    })
    .optional(),
  bike: z
    .object({
      hr: HeartRateZonesSchema.optional(),
      power: PowerZonesSchema.optional(),
    })
    .optional(),
  swim: SwimZonesSchema.optional(),
  maxHR: z.number().optional(),
  restingHR: z.number().optional(),
  weight: z.number().optional(),
});

// ============================================================================
// Athlete Assessment
// ============================================================================

// Foundation level - flexible to support various descriptors
export const FoundationLevelSchema = z.string();

export const FoundationSchema = z.object({
  raceHistory: z.array(z.string()),
  peakTrainingLoad: z.number(),
  foundationLevel: FoundationLevelSchema,
  yearsInSport: z.number(),
});

export const WeeklyVolumeSchema = z.object({
  total: z.number(),
  swim: z.number().optional(),
  bike: z.number().optional(),
  run: z.number().optional(),
});

export const LongestSessionsSchema = z.object({
  swim: z.number().optional(),
  bike: z.number().optional(),
  run: z.number().optional(),
});

export const CurrentFormSchema = z.object({
  weeklyVolume: WeeklyVolumeSchema,
  longestSessions: LongestSessionsSchema,
  consistency: z.number(),
  timeSincePeakFitness: z.string().optional(),
  reasonForTimeOff: z.string().optional(),
});

export const SportEvidenceSchema = z.object({
  sport: SportSchema,
  evidence: z.string(),
});

export const AthleteAssessmentSchema = z.object({
  foundation: FoundationSchema,
  currentForm: CurrentFormSchema,
  strengths: z.array(SportEvidenceSchema),
  limiters: z.array(SportEvidenceSchema),
  constraints: z.array(z.string()),
});

// ============================================================================
// Training Phases
// ============================================================================

export const WeeklyHoursRangeSchema = z.object({
  low: z.number(),
  high: z.number(),
});

export const TrainingPhaseSchema = z.object({
  name: z.string(),
  startWeek: z.number().int().positive(),
  endWeek: z.number().int().positive(),
  focus: z.string(),
  weeklyHoursRange: WeeklyHoursRangeSchema,
  keyWorkouts: z.array(z.string()),
  physiologicalGoals: z.array(z.string()),
});

// ============================================================================
// Race Strategy
// ============================================================================

export const EventDistancesSchema = z.object({
  swim: z.number().optional(),
  bike: z.number().optional(),
  run: z.number().optional(),
});

export const RaceEventSchema = z.object({
  name: z.string(),
  date: z.string(),
  type: z.string(),
  distances: EventDistancesSchema.optional(),
});

// Pacing schemas - very flexible to support various race formats
export const SwimPacingSchema = z.record(z.string(), z.any());
export const BikePacingSchema = z.record(z.string(), z.any());
export const RunPacingSchema = z.record(z.string(), z.any());
export const RacePacingSchema = z.record(z.string(), z.any());

// Nutrition - flexible to support simple or complex structures
export const RaceNutritionSchema = z.record(z.string(), z.any());

// Taper - flexible structure
export const TaperSchema = z.record(z.string(), z.any());

// Race day - flexible structure (can have strings or objects)
export const RaceDaySchema = z.record(z.string(), z.any());

// Race strategy - flexible to support various race formats
export const RaceStrategySchema = z.record(z.string(), z.any());

// ============================================================================
// Plan Metadata
// ============================================================================

export const PlanMetaSchema = z.object({
  id: z.string(),
  athlete: z.string(),
  event: z.string(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in ISO format: YYYY-MM-DD"),
  planStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in ISO format: YYYY-MM-DD"),
  planEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in ISO format: YYYY-MM-DD"),
  createdAt: z.string(),
  updatedAt: z.string(),
  totalWeeks: z.number().int().positive(),
  generatedBy: z.string(),
});

// ============================================================================
// Complete Training Plan
// ============================================================================

export const TrainingPlanSchema = z.object({
  version: z.literal("1.0"),
  meta: PlanMetaSchema,
  preferences: UnitPreferencesSchema,
  assessment: AthleteAssessmentSchema,
  zones: AthleteZonesSchema,
  phases: z.array(TrainingPhaseSchema),
  weeks: z.array(TrainingWeekSchema),
  raceStrategy: RaceStrategySchema,
});

// ============================================================================
// Validation Functions
// ============================================================================

export type ValidationResult =
  | { success: true; data: z.infer<typeof TrainingPlanSchema> }
  | { success: false; errors: ValidationError[] };

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

/**
 * Validate a training plan JSON against the schema.
 * Returns a result object with either the validated data or an array of errors.
 */
export function validatePlan(data: unknown): ValidationResult {
  const result = TrainingPlanSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: ValidationError[] = result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));

  return { success: false, errors };
}

/**
 * Validate a training plan and throw an error if invalid.
 * Use this when you want to halt execution on validation failure.
 */
export function validatePlanOrThrow(data: unknown): z.infer<typeof TrainingPlanSchema> {
  return TrainingPlanSchema.parse(data);
}

/**
 * Format validation errors into a human-readable string.
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return "No errors";

  const lines = errors.map((e, i) => {
    const path = e.path || "(root)";
    return `  ${i + 1}. ${path}: ${e.message}`;
  });

  return `Validation failed with ${errors.length} error(s):\n${lines.join("\n")}`;
}

/**
 * Get the JSON Schema representation of the training plan schema.
 * Useful for documentation and external validation tools.
 */
export function getJsonSchema(): object {
  // Note: For full JSON Schema generation, consider using zod-to-json-schema
  // This returns a simplified representation
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "TrainingPlan",
    description: "Claude Coach training plan schema v1.0",
    type: "object",
    required: [
      "version",
      "meta",
      "preferences",
      "assessment",
      "zones",
      "phases",
      "weeks",
      "raceStrategy",
    ],
    properties: {
      version: { const: "1.0" },
      meta: { $ref: "#/definitions/PlanMeta" },
      preferences: { $ref: "#/definitions/UnitPreferences" },
      assessment: { $ref: "#/definitions/AthleteAssessment" },
      zones: { $ref: "#/definitions/AthleteZones" },
      phases: { type: "array", items: { $ref: "#/definitions/TrainingPhase" } },
      weeks: { type: "array", items: { $ref: "#/definitions/TrainingWeek" } },
      raceStrategy: { $ref: "#/definitions/RaceStrategy" },
    },
  };
}

// Re-export types inferred from schemas
export type TrainingPlan = z.infer<typeof TrainingPlanSchema>;
export type Workout = z.infer<typeof WorkoutSchema>;
export type TrainingWeek = z.infer<typeof TrainingWeekSchema>;
export type TrainingDay = z.infer<typeof TrainingDaySchema>;
export type TrainingPhase = z.infer<typeof TrainingPhaseSchema>;
export type AthleteAssessment = z.infer<typeof AthleteAssessmentSchema>;
export type AthleteZones = z.infer<typeof AthleteZonesSchema>;
export type RaceStrategy = z.infer<typeof RaceStrategySchema>;
export type UnitPreferences = z.infer<typeof UnitPreferencesSchema>;
