import { describe, it, expect } from "vitest";
import { Decoder, Stream } from "@garmin/fitsdk";
import { generateFit, isFitSupported } from "../../src/viewer/lib/export/fit.js";
import type { Workout } from "../../src/schema/training-plan.js";
import type { Settings } from "../../src/viewer/stores/settings.js";

const mockSettings: Settings = {
  theme: "dark",
  units: { swim: "meters", bike: "kilometers", run: "kilometers" },
  firstDayOfWeek: "monday",
  run: { lthr: 170, hrZones: [], thresholdPace: "4:30", paceZones: [] },
  bike: { lthr: 160, hrZones: [], ftp: 250, powerZones: [] },
  swim: { css: "1:50", cssSeconds: 110, paceZones: [] },
};

function createWorkout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: "test-workout",
    sport: "run",
    type: "endurance",
    name: "Test Workout",
    description: "A test workout",
    durationMinutes: 25,
    completed: false,
    ...overrides,
  };
}

function decode(bytes: Uint8Array) {
  const decoder = new Decoder(Stream.fromByteArray(Array.from(bytes)));
  const { messages, errors } = decoder.read();
  expect(errors).toEqual([]);
  return messages;
}

describe("FIT Export", () => {
  it("supports bike, run, swim, strength and brick but not rest or race", () => {
    expect(isFitSupported("bike")).toBe(true);
    expect(isFitSupported("run")).toBe(true);
    expect(isFitSupported("swim")).toBe(true);
    expect(isFitSupported("strength")).toBe(true);
    expect(isFitSupported("brick")).toBe(true);
    expect(isFitSupported("rest")).toBe(false);
    expect(isFitSupported("race")).toBe(false);
  });

  it("encodes a simple workout without structure for each supported sport", async () => {
    for (const sport of ["bike", "run", "swim", "strength", "brick"] as const) {
      const bytes = await generateFit(
        createWorkout({ sport, name: `${sport} session` }),
        mockSettings
      );
      const messages = decode(bytes);
      expect(messages.workoutMesgs[0].wktName).toBe(`${sport} session`);
      expect(messages.workoutMesgs[0].numValidSteps).toBe(3);
      expect(messages.workoutStepMesgs).toHaveLength(3);
    }
  });

  it("encodes a structured walk/run session as steps plus a repeat step", async () => {
    // Mirrors the worked example in skill/reference/workout-structure.md (issue #8):
    // 5 min walk, 4x (2 min run / 2 min walk), 4 min walk
    const workout = createWorkout({
      name: "Walk/Run Intervals",
      structure: {
        warmup: [
          {
            type: "warmup",
            name: "Easy walk",
            duration: { unit: "minutes", value: 5 },
            intensity: { unit: "percent_lthr", value: 60, valueLow: 50, valueHigh: 60 },
          },
        ],
        main: [
          {
            type: "interval_set",
            name: "Run/walk",
            repeats: 4,
            steps: [
              {
                type: "work",
                name: "Run",
                duration: { unit: "minutes", value: 2 },
                intensity: { unit: "percent_lthr", value: 85 },
              },
              {
                type: "recovery",
                name: "Walk",
                duration: { unit: "minutes", value: 2 },
                intensity: { unit: "percent_lthr", value: 60 },
              },
            ],
          },
        ],
        cooldown: [
          {
            type: "cooldown",
            name: "Easy walk",
            duration: { unit: "minutes", value: 4 },
            intensity: { unit: "percent_lthr", value: 60, valueLow: 50, valueHigh: 60 },
          },
        ],
      },
    });

    const messages = decode(await generateFit(workout, mockSettings));

    expect(messages.workoutMesgs[0]).toMatchObject({
      wktName: "Walk/Run Intervals",
      sport: "running",
      numValidSteps: 5,
    });

    const steps = messages.workoutStepMesgs;
    expect(steps.map((s: any) => [s.messageIndex, s.wktStepName, s.durationType])).toEqual([
      [0, "Easy walk", "time"],
      [1, "Run", "time"],
      [2, "Walk", "time"],
      [3, "Run/walk", "repeatUntilStepsCmplt"],
      [4, "Easy walk", "time"],
    ]);

    // Repeat step points back at the first child step and carries the repeat count
    expect(steps[3]).toMatchObject({ durationStep: 1, repeatSteps: 4 });

    // Time durations are in seconds once decoded
    expect(steps[0].durationTime).toBe(300);
    expect(steps[1].durationTime).toBe(120);
    expect(steps[4].durationTime).toBe(240);

    // percent_lthr is converted to a bpm range (FIT custom HR values are bpm + 100)
    // 85% of 170 bpm +/- 3% -> 139..150 bpm
    expect(steps[1]).toMatchObject({
      targetType: "heartRate",
      customTargetHeartRateLow: 239,
      customTargetHeartRateHigh: 250,
    });
    // Explicit range: 50-60% of 170 -> 85..102 bpm
    expect(steps[0]).toMatchObject({
      customTargetHeartRateLow: 185,
      customTargetHeartRateHigh: 202,
    });
  });

  it("encodes percent_ftp targets for structured bike intervals", async () => {
    const workout = createWorkout({
      sport: "bike",
      name: "Tempo Intervals",
      structure: {
        main: [
          {
            type: "interval_set",
            name: "Tempo blocks",
            repeats: 3,
            steps: [
              {
                type: "work",
                name: "Tempo",
                duration: { unit: "minutes", value: 8 },
                intensity: { unit: "percent_ftp", value: 85 },
                cadence: { low: 85, high: 95 },
              },
              {
                type: "recovery",
                name: "Easy spin",
                duration: { unit: "minutes", value: 4 },
                intensity: { unit: "percent_ftp", value: 55 },
              },
            ],
          },
        ],
      },
    });

    const steps = decode(await generateFit(workout, mockSettings)).workoutStepMesgs;
    expect(steps).toHaveLength(3);
    expect(steps[0]).toMatchObject({
      targetType: "power",
      customTargetPowerLow: 80,
      customTargetPowerHigh: 90,
      secondaryTargetType: "cadence",
      secondaryCustomTargetCadenceLow: 85,
      secondaryCustomTargetCadenceHigh: 95,
    });
    expect(steps[2]).toMatchObject({
      durationType: "repeatUntilStepsCmplt",
      durationStep: 0,
      repeatSteps: 3,
    });
  });

  it("uses an open target for run reps above threshold and trims long notes", async () => {
    const workout = createWorkout({
      structure: {
        main: [
          {
            type: "work",
            name: "Stride",
            duration: { unit: "seconds", value: 20 },
            intensity: { unit: "percent_lthr", value: 115 },
            notes: "Quick, light steps. ".repeat(20),
          },
        ],
      },
    });

    const steps = decode(await generateFit(workout, mockSettings)).workoutStepMesgs;
    expect(steps).toHaveLength(1);
    expect(steps[0].targetType).toBe("open");
    expect(steps[0].notes.length).toBeGreaterThan(0);
    expect(steps[0].notes.length).toBeLessThanOrEqual(200);
  });
});
