/**
 * Garmin Connect Workout JSON Export
 *
 * Generates JSON files in the format used by Garmin Connect's internal API.
 * Compatible with the "Share your Garmin Connect workout" Chrome extension.
 *
 * Two output modes:
 * - Multi-step (when humanReadable text can be parsed): warmup + intervals (with
 *   RepeatGroupDTO) + cooldown
 * - Single-step fallback: one ExecutableStepDTO covering the whole duration
 */

import type { Workout, Sport, TrainingPlan } from "../../../schema/training-plan.js";
import type { Settings } from "../../stores/settings.js";

export function isGarminJsonSupported(sport: Sport): boolean {
  return sport !== "rest" && sport !== "race";
}

interface DefaultPaces {
  easy?: PaceRange;
  recovery?: PaceRange;
}

// Look up the plan's "easy" pace string from either the strict-schema zones
// (zones.run.pace.zones[].name === "Easy") or the looser shape used in some
// generated plans (zones.run.pace.paces.easy = "5:30-6:00 / km").
function extractDefaultPaces(plan?: TrainingPlan | null): DefaultPaces {
  const runPace: any = plan?.zones?.run?.pace;
  if (!runPace) return {};

  let easyText: string | undefined;
  if (runPace.paces?.easy) {
    easyText = String(runPace.paces.easy);
  } else if (Array.isArray(runPace.zones)) {
    const easyZone = runPace.zones.find((z: any) =>
      /easy|aerobic|endurance|recovery|z\s*1|z\s*2/i.test(String(z?.name ?? z?.zone ?? ""))
    );
    if (easyZone?.pace) easyText = String(easyZone.pace);
  }
  if (!easyText) return {};

  const easy = parsePaceRange(easyText);
  if (!easy) return {};

  // Recovery between intervals: ~30s/km slower than the easy slow end
  const easySlowSec = 1000 / easy.slowMps;
  const recoverySlowSec = easySlowSec + 30;
  return {
    easy,
    recovery: {
      fastMps: easy.slowMps,
      slowMps: 1000 / recoverySlowSec,
    },
  };
}

interface GarminSportType {
  sportTypeId: number;
  sportTypeKey: string;
  displayOrder: number;
}

function getGarminSport(sport: Sport): GarminSportType {
  switch (sport) {
    case "run":
      return { sportTypeId: 1, sportTypeKey: "running", displayOrder: 1 };
    case "bike":
      return { sportTypeId: 2, sportTypeKey: "cycling", displayOrder: 2 };
    case "swim":
      return { sportTypeId: 4, sportTypeKey: "swimming", displayOrder: 5 };
    case "strength":
      return { sportTypeId: 13, sportTypeKey: "strength_training", displayOrder: 9 };
    default:
      return { sportTypeId: 9, sportTypeKey: "generic", displayOrder: 13 };
  }
}

// ============================================================================
// Pace / HR / unit parsers
// ============================================================================

interface PaceRange {
  fastMps: number;
  slowMps: number;
}

interface HrRange {
  low: number;
  high: number;
}

function paceMinSecToMps(min: number, sec: number): number {
  const totalSec = min * 60 + sec;
  if (totalSec <= 0) return 0;
  return 1000 / totalSec;
}

function parsePaceRange(text: string): PaceRange | null {
  if (!text) return null;
  const range = text.match(/(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})\s*\/?\s*km/);
  if (range) {
    const a = paceMinSecToMps(parseInt(range[1], 10), parseInt(range[2], 10));
    const b = paceMinSecToMps(parseInt(range[3], 10), parseInt(range[4], 10));
    return { fastMps: Math.max(a, b), slowMps: Math.min(a, b) };
  }
  const single = text.match(/(\d{1,2}):(\d{2})\s*\/?\s*km/);
  if (single) {
    const min = parseInt(single[1], 10);
    const sec = parseInt(single[2], 10);
    const totalSec = min * 60 + sec;
    if (totalSec <= 0) return null;
    return {
      fastMps: 1000 / Math.max(totalSec - 5, 60),
      slowMps: 1000 / (totalSec + 5),
    };
  }
  return null;
}

function parseHrRange(text: string): HrRange | null {
  if (!text) return null;
  const upper = text.match(/(?:FC|HR)\s*[<≤]\s*(\d{2,3})/i);
  if (upper) {
    const high = parseInt(upper[1], 10);
    return { low: Math.max(high - 30, 80), high };
  }
  const range = text.match(/(?:FC|HR)\s*~?\s*(\d{2,3})\s*[-–]\s*(\d{2,3})/i);
  if (range) {
    return { low: parseInt(range[1], 10), high: parseInt(range[2], 10) };
  }
  return null;
}

function parseDistanceMeters(text: string): number | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(km|m)\b/i);
  if (!m) return null;
  const val = parseFloat(m[1].replace(",", "."));
  return m[2].toLowerCase() === "km" ? val * 1000 : val;
}

function parseTimeSeconds(text: string): number | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(min|minutes|s|sec|secondes|seconds)\b/i);
  if (!m) return null;
  const val = parseFloat(m[1].replace(",", "."));
  return m[2].toLowerCase().startsWith("min") ? val * 60 : val;
}

// ============================================================================
// Workout text → parsed structure
// ============================================================================

type ParsedStepType = "warmup" | "interval" | "recovery" | "cooldown";

interface ParsedStep {
  kind: "step";
  type: ParsedStepType;
  endCondition: "time" | "distance" | "lap.button";
  value?: number; // seconds for time, meters for distance
  pace?: PaceRange;
  hr?: HrRange;
}

interface ParsedRepeat {
  kind: "repeat";
  iterations: number;
  steps: ParsedStep[];
}

type ParsedItem = ParsedStep | ParsedRepeat;

interface ParsedWorkout {
  warmup?: ParsedStep;
  main: ParsedItem[];
  cooldown?: ParsedStep;
}

function parseWarmupLine(
  line: string,
  defaultHr: HrRange | null,
  defaultPace: PaceRange | null
): ParsedStep | null {
  const m = line.match(/^(?:échauffement|echauffement|warm-?up|wu)\s*:\s*(.+)$/i);
  if (!m) return null;
  const main = m[1].split("+")[0].trim();
  const dist = parseDistanceMeters(main);
  if (dist) {
    return {
      kind: "step",
      type: "warmup",
      endCondition: "distance",
      value: dist,
      pace: defaultPace ?? undefined,
      hr: defaultPace ? undefined : (defaultHr ?? undefined),
    };
  }
  const time = parseTimeSeconds(main);
  if (time) {
    return {
      kind: "step",
      type: "warmup",
      endCondition: "time",
      value: time,
      pace: defaultPace ?? undefined,
      hr: defaultPace ? undefined : (defaultHr ?? undefined),
    };
  }
  return null;
}

function parseCooldownLine(
  line: string,
  defaultHr: HrRange | null,
  defaultPace: PaceRange | null
): ParsedStep | null {
  const m = line.match(/^(?:retour\s+au\s+calme|cool-?down|cd)\s*:\s*(.+)$/i);
  if (!m) return null;
  const content = m[1];
  const dist = parseDistanceMeters(content);
  if (dist) {
    return {
      kind: "step",
      type: "cooldown",
      endCondition: "distance",
      value: dist,
      pace: defaultPace ?? undefined,
      hr: defaultPace ? undefined : (defaultHr ?? undefined),
    };
  }
  const time = parseTimeSeconds(content);
  if (time) {
    return {
      kind: "step",
      type: "cooldown",
      endCondition: "time",
      value: time,
      pace: defaultPace ?? undefined,
      hr: defaultPace ? undefined : (defaultHr ?? undefined),
    };
  }
  return null;
}

function parseIntervalLine(
  line: string,
  recoveryPace: PaceRange | null
): ParsedRepeat | ParsedStep | null {
  const cleaned = line.replace(/^(?:corps|main)\s*:\s*/i, "");

  // Pattern: "N x VALUE UNIT @ PACE [(...)] [, REC_VAL REC_UNIT]"
  const intervalRe =
    /(\d+)\s*x\s*(\d+(?:[.,]\d+)?)\s*(km|m|min|s|sec)\b\s*@?\s*([\d:.\s,/\-–km]+)?(?:\s*\([^)]*\))?(?:\s*[,;]\s*(\d+(?:[.,]\d+)?)\s*(min|s|sec))?/i;
  const m = cleaned.match(intervalRe);
  if (!m) {
    // Continuous tempo: "15 min en continu @ 4:45/km"
    const contRe =
      /(\d+(?:[.,]\d+)?)\s*(min|minutes|s|sec)\s*(?:en\s+continu|continuous|continu)?\s*@\s*([\d:.\s,/\-–km]+)/i;
    const cm = cleaned.match(contRe);
    if (cm) {
      const v = parseFloat(cm[1].replace(",", "."));
      const u = cm[2].toLowerCase();
      const seconds = u.startsWith("min") ? v * 60 : v;
      const pace = parsePaceRange(cm[3]);
      return {
        kind: "step",
        type: "interval",
        endCondition: "time",
        value: seconds,
        pace: pace ?? undefined,
      };
    }
    return null;
  }

  const iterations = parseInt(m[1], 10);
  const workVal = parseFloat(m[2].replace(",", "."));
  const workUnit = m[3].toLowerCase();
  const paceText = m[4] ?? "";
  const pace = parsePaceRange(paceText);

  let workEnd: "time" | "distance";
  let workValue: number;
  if (workUnit === "km") {
    workEnd = "distance";
    workValue = workVal * 1000;
  } else if (workUnit === "m") {
    workEnd = "distance";
    workValue = workVal;
  } else if (workUnit.startsWith("min")) {
    workEnd = "time";
    workValue = workVal * 60;
  } else {
    workEnd = "time";
    workValue = workVal;
  }

  const work: ParsedStep = {
    kind: "step",
    type: "interval",
    endCondition: workEnd,
    value: workValue,
    pace: pace ?? undefined,
  };

  const steps: ParsedStep[] = [work];

  if (m[5] && m[6]) {
    const recVal = parseFloat(m[5].replace(",", "."));
    const recUnit = m[6].toLowerCase();
    const recValue = recUnit.startsWith("min") ? recVal * 60 : recVal;
    steps.push({
      kind: "step",
      type: "recovery",
      endCondition: "time",
      value: recValue,
      pace: recoveryPace ?? undefined,
    });
  }

  return { kind: "repeat", iterations, steps };
}

function parseProgressionSegments(text: string): ParsedStep[] | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const segRe = /^[-•*]\s*(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)\s*km\s*(.*)$/i;
  const segments: ParsedStep[] = [];
  for (const line of lines) {
    const m = line.match(segRe);
    if (!m) continue;
    const a = parseFloat(m[1].replace(",", "."));
    const b = parseFloat(m[2].replace(",", "."));
    const distance = (b - a) * 1000;
    if (distance <= 0) continue;
    const rest = m[3];
    const pace = parsePaceRange(rest);
    segments.push({
      kind: "step",
      type: "interval",
      endCondition: "distance",
      value: distance,
      pace: pace ?? undefined,
    });
  }
  return segments.length >= 2 ? segments : null;
}

// Strides like "4 x 20 s lignes droites" are warm-up/cool-down accessories,
// not intervals — skip lines mentioning them
function isStridesLine(line: string): boolean {
  return /\b(lignes\s+droites?|strides?|accélérations?)\b/i.test(line);
}

// Only attempt multi-step structure parsing when the workout text has explicit
// structural markers — otherwise easy/steady runs would be misread as intervals
function hasStructureMarkers(text: string): boolean {
  return /^(?:échauffement|echauffement|warm-?up|wu|corps|main|retour\s+au\s+calme|cool-?down|cd)\s*:/im.test(
    text
  );
}

function parseWorkoutText(
  text: string,
  defaultHr: HrRange | null,
  defaults: DefaultPaces
): ParsedWorkout | null {
  if (!text) return null;

  // Try progression first (full-text scan) — these have their own format
  const progression = parseProgressionSegments(text);
  if (progression) {
    return { warmup: undefined, main: progression, cooldown: undefined };
  }

  // Bail out if no explicit structure markers — fall through to single-step
  if (!hasStructureMarkers(text)) return null;

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  let warmup: ParsedStep | undefined;
  let cooldown: ParsedStep | undefined;
  const main: ParsedItem[] = [];

  for (const line of lines) {
    if (
      isStridesLine(line) &&
      !/^(?:échauffement|echauffement|warm-?up|wu|corps|main|retour\s+au\s+calme|cool-?down|cd)\s*:/i.test(
        line
      )
    ) {
      continue;
    }
    const wu = parseWarmupLine(line, defaultHr, defaults.easy ?? null);
    if (wu) {
      warmup = wu;
      continue;
    }
    const cd = parseCooldownLine(line, defaultHr, defaults.easy ?? null);
    if (cd) {
      cooldown = cd;
      continue;
    }
    const interval = parseIntervalLine(line, defaults.recovery ?? null);
    if (interval) {
      main.push(interval);
      continue;
    }
  }

  if (!warmup && !cooldown && main.length === 0) return null;
  return { warmup, main, cooldown };
}

// ============================================================================
// Garmin step JSON builders
// ============================================================================

function getStepTypeMeta(type: ParsedStepType): { id: number; key: string; order: number } {
  switch (type) {
    case "warmup":
      return { id: 1, key: "warmup", order: 1 };
    case "cooldown":
      return { id: 2, key: "cooldown", order: 2 };
    case "recovery":
      return { id: 4, key: "recovery", order: 4 };
    default:
      return { id: 3, key: "interval", order: 3 };
  }
}

function buildExecutableStep(p: ParsedStep, stepOrder: number, childStepId: number | null): any {
  const stepType = getStepTypeMeta(p.type);

  let endCondition: any;
  let endConditionValue: number | null;
  let preferredEndConditionUnit: any;
  if (p.endCondition === "time" && p.value !== undefined) {
    endCondition = {
      conditionTypeId: 2,
      conditionTypeKey: "time",
      displayOrder: 2,
      displayable: true,
    };
    endConditionValue = p.value;
    preferredEndConditionUnit = { unitId: 3, unitKey: "second", factor: 1.0 };
  } else if (p.endCondition === "distance" && p.value !== undefined) {
    endCondition = {
      conditionTypeId: 3,
      conditionTypeKey: "distance",
      displayOrder: 3,
      displayable: true,
    };
    endConditionValue = p.value;
    preferredEndConditionUnit = { unitId: 2, unitKey: "kilometer", factor: 100000.0 };
  } else {
    endCondition = {
      conditionTypeId: 1,
      conditionTypeKey: "lap.button",
      displayOrder: 1,
      displayable: true,
    };
    endConditionValue = null;
    preferredEndConditionUnit = null;
  }

  let targetType: any = {
    workoutTargetTypeId: 1,
    workoutTargetTypeKey: "no.target",
    displayOrder: 1,
  };
  let targetValueOne: number | null = null;
  let targetValueTwo: number | null = null;
  if (p.pace) {
    targetType = { workoutTargetTypeId: 6, workoutTargetTypeKey: "pace.zone", displayOrder: 6 };
    // Round to 7 decimals — matches Garmin's native format. JS float full precision
    // (16 decimals) crashes the Garmin Connect mobile app on workout open.
    targetValueOne = Math.round(p.pace.fastMps * 1e7) / 1e7;
    targetValueTwo = Math.round(p.pace.slowMps * 1e7) / 1e7;
  } else if (p.hr) {
    targetType = {
      workoutTargetTypeId: 4,
      workoutTargetTypeKey: "heart.rate.zone",
      displayOrder: 4,
    };
    targetValueOne = p.hr.low;
    targetValueTwo = p.hr.high;
  }

  return {
    type: "ExecutableStepDTO",
    stepOrder,
    stepType: { stepTypeId: stepType.id, stepTypeKey: stepType.key, displayOrder: stepType.order },
    childStepId,
    description: null,
    endCondition,
    endConditionValue,
    preferredEndConditionUnit,
    endConditionCompare: null,
    targetType,
    targetValueOne,
    targetValueTwo,
    targetValueUnit: null,
    zoneNumber: null,
    secondaryTargetType: null,
    secondaryTargetValueOne: null,
    secondaryTargetValueTwo: null,
    secondaryTargetValueUnit: null,
    secondaryZoneNumber: null,
    endConditionZone: null,
    strokeType: { strokeTypeId: 0, strokeTypeKey: null, displayOrder: 0 },
    equipmentType: { equipmentTypeId: 0, equipmentTypeKey: null, displayOrder: 0 },
    category: null,
    exerciseName: null,
    workoutProvider: null,
    providerExerciseSourceId: null,
    weightValue: null,
    weightUnit: { unitId: 8, unitKey: "kilogram", factor: 1000.0 },
  };
}

function buildRepeatGroup(r: ParsedRepeat, stepOrder: number, childStepId: number): any {
  const childSteps = r.steps.map((s, i) => buildExecutableStep(s, stepOrder + 1 + i, childStepId));
  return {
    type: "RepeatGroupDTO",
    stepOrder,
    stepType: { stepTypeId: 6, stepTypeKey: "repeat", displayOrder: 6 },
    childStepId,
    description: null,
    numberOfIterations: r.iterations,
    smartRepeat: false,
    endCondition: {
      conditionTypeId: 7,
      conditionTypeKey: "iterations",
      displayOrder: 7,
      displayable: false,
    },
    endConditionValue: r.iterations,
    preferredEndConditionUnit: null,
    endConditionCompare: null,
    targetType: { workoutTargetTypeId: 1, workoutTargetTypeKey: "no.target", displayOrder: 1 },
    targetValueOne: null,
    targetValueTwo: null,
    targetValueUnit: null,
    zoneNumber: null,
    secondaryTargetType: null,
    secondaryTargetValueOne: null,
    secondaryTargetValueTwo: null,
    secondaryTargetValueUnit: null,
    secondaryZoneNumber: null,
    endConditionZone: null,
    strokeType: { strokeTypeId: 0, strokeTypeKey: null, displayOrder: 0 },
    equipmentType: { equipmentTypeId: 0, equipmentTypeKey: null, displayOrder: 0 },
    category: null,
    exerciseName: null,
    workoutProvider: null,
    providerExerciseSourceId: null,
    weightValue: null,
    weightUnit: { unitId: 8, unitKey: "kilogram", factor: 1000.0 },
    workoutSteps: childSteps,
  };
}

function buildSteps(parsed: ParsedWorkout): any[] {
  const steps: any[] = [];
  let stepOrder = 1;
  let childStepIdCounter = 1;

  if (parsed.warmup) {
    steps.push(buildExecutableStep(parsed.warmup, stepOrder, null));
    stepOrder++;
  }

  for (const item of parsed.main) {
    if (item.kind === "repeat") {
      const childStepId = childStepIdCounter++;
      steps.push(buildRepeatGroup(item, stepOrder, childStepId));
      stepOrder += 1 + item.steps.length;
    } else {
      steps.push(buildExecutableStep(item, stepOrder, null));
      stepOrder++;
    }
  }

  if (parsed.cooldown) {
    steps.push(buildExecutableStep(parsed.cooldown, stepOrder, null));
    stepOrder++;
  }

  return steps;
}

// ============================================================================
// Single-step fallback (when parser can't extract structure)
// ============================================================================

function buildSingleStep(workout: Workout): any {
  const totalSeconds = (workout.durationMinutes ?? 0) * 60;
  const distanceMeters = workout.distanceMeters ?? null;

  // Workout types where the goal is time-on-feet at an intensity (tempo, threshold)
  // → use time. Otherwise (easy, long, steady, recovery, race) → use distance when
  // available so the watch and Garmin Connect UI show "X km", not "0 km" with a
  // time-derived step.
  const timePriorityTypes = new Set(["tempo", "threshold", "intervals", "vo2max", "fartlek"]);

  let endCondition: "time" | "distance" | "lap.button";
  let value: number | undefined;
  if (distanceMeters && distanceMeters > 0 && !timePriorityTypes.has(workout.type as string)) {
    endCondition = "distance";
    value = distanceMeters;
  } else if (totalSeconds > 0) {
    endCondition = "time";
    value = totalSeconds;
  } else if (distanceMeters && distanceMeters > 0) {
    endCondition = "distance";
    value = distanceMeters;
  } else {
    endCondition = "lap.button";
  }

  const text = `${workout.humanReadable ?? ""}\n${workout.description ?? ""}`;
  const pace = workout.sport === "run" ? parsePaceRange(text) : null;
  const hr = parseHrRange(text);

  return buildExecutableStep(
    {
      kind: "step",
      type: "interval",
      endCondition,
      value,
      pace: pace ?? undefined,
      hr: pace ? undefined : (hr ?? undefined),
    },
    1,
    null
  );
}

// ============================================================================
// Main entry
// ============================================================================

export function generateGarminJson(
  workout: Workout,
  _settings: Settings,
  plan?: TrainingPlan | null
): string {
  const sport = getGarminSport(workout.sport);
  const text = `${workout.humanReadable ?? ""}\n${workout.description ?? ""}`;
  const defaultHr = parseHrRange(text);
  const defaults = extractDefaultPaces(plan);

  let steps: any[];
  if (workout.sport === "run" || workout.sport === "bike") {
    const parsed = parseWorkoutText(text, defaultHr, defaults);
    steps =
      parsed && (parsed.warmup || parsed.cooldown || parsed.main.length > 0)
        ? buildSteps(parsed)
        : [buildSingleStep(workout)];
  } else {
    steps = [buildSingleStep(workout)];
  }

  const totalSeconds = (workout.durationMinutes ?? 0) * 60;
  const distanceMeters = workout.distanceMeters ?? null;
  // Strip emoji + control chars from name (Garmin Connect mobile chokes on them).
  const safeName = (workout.name ?? "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

  // Average training speed: rough m/s estimate from total distance and duration.
  // Real Garmin workouts include this — mobile app may use it for display.
  const avgTrainingSpeed =
    distanceMeters && totalSeconds ? Math.round((distanceMeters / totalSeconds) * 1e7) / 1e7 : null;

  const payload = {
    workoutName: safeName,
    description: null,
    updatedDate: null,
    createdDate: null,
    sportType: sport,
    subSportType: "GENERIC",
    trainingPlanId: null,
    author: null,
    sharedWithUsers: null,
    estimatedDurationInSecs: totalSeconds || null,
    estimatedDistanceInMeters: distanceMeters,
    workoutSegments: [
      {
        segmentOrder: 1,
        sportType: sport,
        poolLengthUnit: null,
        poolLength: null,
        avgTrainingSpeed: null,
        estimatedDurationInSecs: null,
        estimatedDistanceInMeters: null,
        estimatedDistanceUnit: null,
        estimateType: null,
        description: null,
        workoutSteps: steps,
      },
    ],
    poolLength: null,
    poolLengthUnit: null,
    locale: null,
    workoutProvider: null,
    workoutSourceId: null,
    uploadTimestamp: null,
    atpPlanId: null,
    consumer: null,
    consumerName: null,
    consumerImageURL: null,
    consumerWebsiteURL: null,
    workoutNameI18nKey: null,
    descriptionI18nKey: null,
    avgTrainingSpeed,
    estimateType: distanceMeters ? "DISTANCE_ESTIMATED" : null,
    estimatedDistanceUnit: { unitId: null, unitKey: null, factor: null },
    workoutThumbnailUrl: null,
    isSessionTransitionEnabled: null,
    shared: false,
  };

  return JSON.stringify(payload, null, 2);
}
