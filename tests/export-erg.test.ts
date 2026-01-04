import { describe, it, expect } from "vitest";
import { isErgSupported, generateMrc } from "../src/viewer/lib/export/erg.js";
import type { Workout, Sport } from "../src/schema/training-plan.js";
import type { Settings } from "../src/viewer/stores/settings.js";

// Mock settings object
const mockSettings: Settings = {
  theme: "dark",
  units: { swim: "meters", bike: "kilometers", run: "kilometers" },
  firstDayOfWeek: "monday",
  run: {
    lthr: 165,
    hrZones: [],
    thresholdPace: "4:30",
    paceZones: [],
  },
  bike: {
    lthr: 160,
    hrZones: [],
    ftp: 250,
    powerZones: [],
  },
  swim: {
    css: "1:50",
    cssSeconds: 110,
    paceZones: [],
  },
};

// Helper to create a basic workout
function createWorkout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: "test-workout",
    sport: "bike",
    type: "endurance",
    name: "Test Workout",
    description: "A test workout",
    durationMinutes: 60,
    completed: false,
    ...overrides,
  };
}

describe("ERG/MRC Export", () => {
  describe("isErgSupported", () => {
    it("should return true for bike sport", () => {
      expect(isErgSupported("bike")).toBe(true);
    });

    it("should return false for run sport", () => {
      expect(isErgSupported("run")).toBe(false);
    });

    it("should return false for swim sport", () => {
      expect(isErgSupported("swim")).toBe(false);
    });

    it("should return false for strength sport", () => {
      expect(isErgSupported("strength")).toBe(false);
    });

    it("should return false for all non-bike sports", () => {
      const nonBikeSports: Sport[] = ["swim", "run", "strength", "brick", "race", "rest"];
      for (const sport of nonBikeSports) {
        expect(isErgSupported(sport)).toBe(false);
      }
    });
  });

  describe("generateMrc - headers", () => {
    it("should generate valid MRC format with correct headers", () => {
      const workout = createWorkout({
        name: "Endurance Ride",
        description: "Zone 2 base building",
      });

      const mrc = generateMrc(workout, mockSettings);

      expect(mrc).toContain("[COURSE HEADER]");
      expect(mrc).toContain("VERSION = 2");
      expect(mrc).toContain("UNITS = ENGLISH");
      expect(mrc).toContain("DESCRIPTION = Endurance Ride - Zone 2 base building");
      expect(mrc).toContain("FILE NAME = Endurance Ride");
      expect(mrc).toContain("MINUTES PERCENT");
      expect(mrc).toContain("[END COURSE HEADER]");
      expect(mrc).toContain("[COURSE DATA]");
      expect(mrc).toContain("[END COURSE DATA]");
    });

    it("should sanitize newlines in description", () => {
      const workout = createWorkout({
        name: "Multi-line",
        description: "Line 1\nLine 2\rLine 3",
      });

      const mrc = generateMrc(workout, mockSettings);
      const descriptionLine = mrc.split("\n").find((l) => l.startsWith("DESCRIPTION"));

      expect(descriptionLine).toBe("DESCRIPTION = Multi-line - Line 1 Line 2 Line 3");
      // The description line itself should not contain carriage returns or newlines
      expect(descriptionLine).not.toContain("\r");
    });

    it("should handle workout without description", () => {
      const workout = createWorkout({
        name: "Simple Ride",
        description: "",
      });

      const mrc = generateMrc(workout, mockSettings);

      // When description is empty, the code only appends " - " if description exists
      // So we just check the name is present
      expect(mrc).toContain("DESCRIPTION = Simple Ride");
      expect(mrc).toContain("FILE NAME = Simple Ride");
    });
  });

  describe("generateMrc - data points", () => {
    it("should include MINUTES PERCENT data points for simple workout", () => {
      const workout = createWorkout({
        type: "endurance",
        durationMinutes: 60,
      });

      const mrc = generateMrc(workout, mockSettings);
      const lines = mrc.split("\n");

      // Find data section
      const dataStartIdx = lines.findIndex((l) => l === "[COURSE DATA]");
      const dataEndIdx = lines.findIndex((l) => l === "[END COURSE DATA]");

      expect(dataStartIdx).toBeGreaterThan(-1);
      expect(dataEndIdx).toBeGreaterThan(dataStartIdx);

      // Extract data lines
      const dataLines = lines.slice(dataStartIdx + 1, dataEndIdx);
      expect(dataLines.length).toBeGreaterThan(0);

      // Each data line should be "minutes\tpercent" format
      for (const line of dataLines) {
        const parts = line.split("\t");
        expect(parts).toHaveLength(2);
        expect(parseFloat(parts[0])).not.toBeNaN();
        expect(parseFloat(parts[1])).not.toBeNaN();
      }
    });

    it("should start at minute 0", () => {
      const workout = createWorkout();
      const mrc = generateMrc(workout, mockSettings);
      const lines = mrc.split("\n");

      const dataStartIdx = lines.findIndex((l) => l === "[COURSE DATA]");
      const firstDataLine = lines[dataStartIdx + 1];

      expect(firstDataLine).toMatch(/^0\.00\t/);
    });

    it("should use different intensities for different workout types", () => {
      const recoveryWorkout = createWorkout({ type: "recovery", durationMinutes: 30 });
      const thresholdWorkout = createWorkout({ type: "threshold", durationMinutes: 30 });

      const recoveryMrc = generateMrc(recoveryWorkout, mockSettings);
      const thresholdMrc = generateMrc(thresholdWorkout, mockSettings);

      // Extract a main set percentage from each
      const getMainPercent = (mrc: string) => {
        const lines = mrc.split("\n");
        const dataStartIdx = lines.findIndex((l) => l === "[COURSE DATA]");
        // Skip warmup points, get a middle data point
        const midLine = lines[dataStartIdx + 3];
        return parseFloat(midLine.split("\t")[1]);
      };

      const recoveryPercent = getMainPercent(recoveryMrc);
      const thresholdPercent = getMainPercent(thresholdMrc);

      // Threshold should have higher intensity than recovery
      expect(thresholdPercent).toBeGreaterThan(recoveryPercent);
    });
  });

  describe("generateMrc - structured workouts", () => {
    it("should handle structured workouts with intervals", () => {
      const workout = createWorkout({
        structure: {
          warmup: [
            {
              type: "warmup",
              duration: { unit: "minutes", value: 10 },
              intensity: { unit: "percent_ftp", value: 50 },
            },
          ],
          main: [
            {
              type: "interval_set",
              repeats: 3,
              steps: [
                {
                  type: "work",
                  duration: { unit: "minutes", value: 5 },
                  intensity: { unit: "percent_ftp", value: 100 },
                },
                {
                  type: "recovery",
                  duration: { unit: "minutes", value: 5 },
                  intensity: { unit: "percent_ftp", value: 50 },
                },
              ],
            },
          ],
          cooldown: [
            {
              type: "cooldown",
              duration: { unit: "minutes", value: 10 },
              intensity: { unit: "percent_ftp", value: 40 },
            },
          ],
        },
      });

      const mrc = generateMrc(workout, mockSettings);
      const lines = mrc.split("\n");

      const dataStartIdx = lines.findIndex((l) => l === "[COURSE DATA]");
      const dataEndIdx = lines.findIndex((l) => l === "[END COURSE DATA]");
      const dataLines = lines.slice(dataStartIdx + 1, dataEndIdx);

      // Should have data points for:
      // warmup: 2 points (start/end)
      // 3 repeats x 2 steps x 2 points = 12 points
      // cooldown: 2 points
      expect(dataLines.length).toBeGreaterThanOrEqual(14);

      // Check warmup ends at 10 minutes
      const warmupEnd = dataLines.find((l) => l.startsWith("10.00"));
      expect(warmupEnd).toBeDefined();

      // Total workout should be 10 + 30 + 10 = 50 minutes
      const lastLine = dataLines[dataLines.length - 1];
      expect(parseFloat(lastLine.split("\t")[0])).toBeCloseTo(50, 1);
    });

    it("should handle workouts with seconds duration", () => {
      const workout = createWorkout({
        structure: {
          main: [
            {
              type: "work",
              duration: { unit: "seconds", value: 120 },
              intensity: { unit: "percent_ftp", value: 80 },
            },
          ],
        },
      });

      const mrc = generateMrc(workout, mockSettings);
      const lines = mrc.split("\n");

      const dataStartIdx = lines.findIndex((l) => l === "[COURSE DATA]");
      const dataLines = lines.slice(dataStartIdx + 1, dataStartIdx + 3);

      // 120 seconds = 2 minutes
      expect(dataLines[0]).toMatch(/^0\.00\t80$/);
      expect(dataLines[1]).toMatch(/^2\.00\t80$/);
    });

    it("should handle ramp intensities", () => {
      const workout = createWorkout({
        structure: {
          main: [
            {
              type: "warmup",
              duration: { unit: "minutes", value: 10 },
              intensity: { unit: "percent_ftp", value: 60, valueLow: 40, valueHigh: 70 },
            },
          ],
        },
      });

      const mrc = generateMrc(workout, mockSettings);
      const lines = mrc.split("\n");

      const dataStartIdx = lines.findIndex((l) => l === "[COURSE DATA]");
      const dataLines = lines.slice(dataStartIdx + 1, dataStartIdx + 3);

      // Ramp should go from 40% to 70%
      expect(dataLines[0]).toMatch(/^0\.00\t40$/);
      expect(dataLines[1]).toMatch(/^10\.00\t70$/);
    });
  });

  describe("generateMrc - error handling", () => {
    it("should throw error for run sport", () => {
      const workout = createWorkout({ sport: "run" });

      expect(() => generateMrc(workout, mockSettings)).toThrow(
        "ERG/MRC export only supports bike workouts"
      );
    });

    it("should throw error for swim sport", () => {
      const workout = createWorkout({ sport: "swim" });

      expect(() => generateMrc(workout, mockSettings)).toThrow(
        "ERG/MRC export only supports bike workouts"
      );
    });

    it("should throw error for all non-bike sports", () => {
      const nonBikeSports: Sport[] = ["swim", "run", "strength", "brick", "race", "rest"];

      for (const sport of nonBikeSports) {
        const workout = createWorkout({ sport });
        expect(() => generateMrc(workout, mockSettings)).toThrow(
          "ERG/MRC export only supports bike workouts"
        );
      }
    });
  });
});
