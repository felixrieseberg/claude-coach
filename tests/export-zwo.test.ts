import { describe, it, expect } from "vitest";
import { isZwoSupported, generateZwo } from "../src/viewer/lib/export/zwo.js";
import type { Workout, Sport } from "../src/schema/training-plan.js";
import type { Settings } from "../src/viewer/stores/settings.js";

// Mock Settings object
const mockSettings: Settings = {
  theme: "dark",
  units: { swim: "meters", bike: "kilometers", run: "kilometers" },
  firstDayOfWeek: "monday",
  run: {
    lthr: 165,
    hrZones: [
      { zone: 1, name: "Recovery", low: 0, high: 134 },
      { zone: 2, name: "Aerobic", low: 134, high: 147 },
      { zone: 3, name: "Tempo", low: 147, high: 156 },
      { zone: 4, name: "Threshold", low: 156, high: 165 },
      { zone: 5, name: "VO2max", low: 165, high: 180 },
    ],
    thresholdPace: "4:30",
    paceZones: [
      { zone: "E", name: "Easy", pace: "5:20" },
      { zone: "M", name: "Marathon", pace: "4:50" },
      { zone: "T", name: "Threshold", pace: "4:30" },
      { zone: "I", name: "Interval", pace: "4:00" },
      { zone: "R", name: "Repetition", pace: "3:40" },
    ],
  },
  bike: {
    lthr: 160,
    hrZones: [
      { zone: 1, name: "Recovery", low: 0, high: 130 },
      { zone: 2, name: "Aerobic", low: 130, high: 142 },
      { zone: 3, name: "Tempo", low: 142, high: 151 },
      { zone: 4, name: "Threshold", low: 151, high: 160 },
      { zone: 5, name: "VO2max", low: 160, high: 175 },
    ],
    ftp: 200,
    powerZones: [
      { zone: 1, name: "Active Recovery", low: 0, high: 110 },
      { zone: 2, name: "Endurance", low: 110, high: 150 },
      { zone: 3, name: "Tempo", low: 150, high: 180 },
      { zone: 4, name: "Threshold", low: 180, high: 210 },
      { zone: 5, name: "VO2max", low: 210, high: 240 },
    ],
  },
  swim: {
    css: "1:50",
    cssSeconds: 110,
    paceZones: [
      { zone: 1, name: "Recovery", offset: 20, pace: "2:10" },
      { zone: 2, name: "Aerobic", offset: 10, pace: "2:00" },
      { zone: 3, name: "Tempo", offset: 5, pace: "1:55" },
      { zone: 4, name: "Threshold", offset: 0, pace: "1:50" },
      { zone: 5, name: "VO2max", offset: -5, pace: "1:45" },
    ],
  },
};

// Helper to create a minimal workout
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

describe("ZWO Export", () => {
  describe("isZwoSupported", () => {
    it("should return true for bike sport", () => {
      expect(isZwoSupported("bike")).toBe(true);
    });

    it("should return true for run sport", () => {
      expect(isZwoSupported("run")).toBe(true);
    });

    it("should return false for swim sport", () => {
      expect(isZwoSupported("swim")).toBe(false);
    });

    it("should return false for strength sport", () => {
      expect(isZwoSupported("strength")).toBe(false);
    });

    it("should return false for brick sport", () => {
      expect(isZwoSupported("brick")).toBe(false);
    });

    it("should return false for race sport", () => {
      expect(isZwoSupported("race")).toBe(false);
    });

    it("should return false for rest sport", () => {
      expect(isZwoSupported("rest")).toBe(false);
    });
  });

  describe("generateZwo - basic structure", () => {
    it("should generate valid XML with correct structure for a simple bike workout", () => {
      const workout = createWorkout({
        name: "Endurance Ride",
        description: "Easy aerobic ride",
        sport: "bike",
        type: "endurance",
        durationMinutes: 60,
      });

      const xml = generateZwo(workout, mockSettings);

      // Check XML declaration
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');

      // Check root element
      expect(xml).toContain("<workout_file>");
      expect(xml).toContain("</workout_file>");

      // Check metadata
      expect(xml).toContain("<author>Claude Coach</author>");
      expect(xml).toContain("<name>Endurance Ride</name>");
      expect(xml).toContain("<description>Easy aerobic ride</description>");
      expect(xml).toContain("<sportType>bike</sportType>");

      // Check workout container
      expect(xml).toContain("<workout>");
      expect(xml).toContain("</workout>");
    });

    it("should generate valid XML for a simple run workout", () => {
      const workout = createWorkout({
        name: "Easy Run",
        description: "Recovery run",
        sport: "run",
        type: "recovery",
        durationMinutes: 45,
      });

      const xml = generateZwo(workout, mockSettings);

      expect(xml).toContain("<sportType>run</sportType>");
      expect(xml).toContain("<name>Easy Run</name>");
    });

    it("should generate warmup, main, and cooldown segments for simple workout", () => {
      const workout = createWorkout({
        durationMinutes: 60,
      });

      const xml = generateZwo(workout, mockSettings);

      // Should have Warmup element
      expect(xml).toMatch(/<Warmup\s+Duration="/);

      // Should have SteadyState for main set
      expect(xml).toMatch(/<SteadyState\s+Duration="/);

      // Should have Cooldown element
      expect(xml).toMatch(/<Cooldown\s+Duration="/);
    });

    it("should set correct power levels based on workout type", () => {
      const tempoWorkout = createWorkout({
        type: "tempo",
        durationMinutes: 60,
      });

      const xml = generateZwo(tempoWorkout, mockSettings);

      // Tempo should have Power="0.80" for main set
      expect(xml).toContain('Power="0.80"');
    });
  });

  describe("generateZwo - structured workouts", () => {
    it("should handle structured workouts with warmup, main, and cooldown", () => {
      const workout = createWorkout({
        name: "Structured Intervals",
        sport: "bike",
        structure: {
          warmup: [
            {
              type: "warmup",
              name: "Easy spin",
              duration: { unit: "minutes", value: 10 },
              intensity: { unit: "percent_ftp", value: 65, valueLow: 50, valueHigh: 65 },
            },
          ],
          main: [
            {
              type: "work",
              name: "Steady state",
              duration: { unit: "minutes", value: 20 },
              intensity: { unit: "percent_ftp", value: 75 },
            },
          ],
          cooldown: [
            {
              type: "cooldown",
              name: "Easy spin down",
              duration: { unit: "minutes", value: 5 },
              intensity: { unit: "percent_ftp", value: 50, valueLow: 40, valueHigh: 50 },
            },
          ],
        },
      });

      const xml = generateZwo(workout, mockSettings);

      // Check warmup - should have Duration of 600 seconds (10 min)
      expect(xml).toMatch(/<Warmup\s+Duration="600"/);

      // Check main set steady state - should have Duration of 1200 seconds (20 min)
      expect(xml).toMatch(/<SteadyState\s+Duration="1200"\s+Power="0\.75"/);

      // Check cooldown - should have Duration of 300 seconds (5 min)
      expect(xml).toMatch(/<Cooldown\s+Duration="300"/);
    });

    it("should handle interval sets with work and recovery", () => {
      const workout = createWorkout({
        name: "Interval Session",
        sport: "bike",
        structure: {
          warmup: [
            {
              type: "warmup",
              name: "Warmup",
              duration: { unit: "minutes", value: 10 },
              intensity: { unit: "percent_ftp", value: 60, valueLow: 40, valueHigh: 60 },
            },
          ],
          main: [
            {
              type: "interval_set",
              name: "VO2max intervals",
              repeats: 5,
              steps: [
                {
                  type: "work",
                  duration: { unit: "minutes", value: 3 },
                  intensity: { unit: "percent_ftp", value: 110 },
                },
                {
                  type: "recovery",
                  duration: { unit: "minutes", value: 3 },
                  intensity: { unit: "percent_ftp", value: 50 },
                },
              ],
            },
          ],
          cooldown: [
            {
              type: "cooldown",
              name: "Cooldown",
              duration: { unit: "minutes", value: 10 },
              intensity: { unit: "percent_ftp", value: 50, valueLow: 40, valueHigh: 50 },
            },
          ],
        },
      });

      const xml = generateZwo(workout, mockSettings);

      // Check for IntervalsT element with correct attributes
      // 5 repeats, 3 min on (180s), 3 min off (180s), 110% power on, 50% off
      expect(xml).toMatch(
        /<IntervalsT\s+Repeat="5"\s+OnDuration="180"\s+OffDuration="180"\s+OnPower="1\.10"\s+OffPower="0\.50"/
      );
    });

    it("should include cadence when specified in workout steps", () => {
      const workout = createWorkout({
        name: "Cadence Workout",
        sport: "bike",
        structure: {
          main: [
            {
              type: "work",
              name: "High cadence",
              duration: { unit: "minutes", value: 10 },
              intensity: { unit: "percent_ftp", value: 80 },
              cadence: { low: 100, high: 110 },
            },
          ],
        },
      });

      const xml = generateZwo(workout, mockSettings);

      // Should have cadence attributes
      expect(xml).toMatch(/CadenceLow="100"\s+CadenceHigh="110"/);
    });
  });

  describe("generateZwo - error handling", () => {
    it("should throw error for unsupported sports", () => {
      const swimWorkout = createWorkout({
        sport: "swim",
        name: "Pool Swim",
      });

      expect(() => generateZwo(swimWorkout, mockSettings)).toThrow(
        "ZWO export not supported for swim workouts"
      );
    });

    it("should throw error for strength workouts", () => {
      const strengthWorkout = createWorkout({
        sport: "strength",
        name: "Strength Session",
      });

      expect(() => generateZwo(strengthWorkout, mockSettings)).toThrow(
        "ZWO export not supported for strength workouts"
      );
    });

    it("should throw error for brick workouts", () => {
      const brickWorkout = createWorkout({
        sport: "brick",
        name: "Brick Session",
      });

      expect(() => generateZwo(brickWorkout, mockSettings)).toThrow(
        "ZWO export not supported for brick workouts"
      );
    });
  });

  describe("generateZwo - XML escaping", () => {
    it("should escape ampersand in workout name", () => {
      const workout = createWorkout({
        name: "Tempo & Threshold",
        description: "Mixed intensity",
      });

      const xml = generateZwo(workout, mockSettings);

      expect(xml).toContain("<name>Tempo &amp; Threshold</name>");
      expect(xml).not.toContain("<name>Tempo & Threshold</name>");
    });

    it("should escape less than sign in workout name", () => {
      const workout = createWorkout({
        name: "Zone <3 Recovery",
        description: "Easy ride",
      });

      const xml = generateZwo(workout, mockSettings);

      expect(xml).toContain("<name>Zone &lt;3 Recovery</name>");
    });

    it("should escape greater than sign in description", () => {
      const workout = createWorkout({
        name: "Hard Ride",
        description: "Power > 300W",
      });

      const xml = generateZwo(workout, mockSettings);

      expect(xml).toContain("Power &gt; 300W");
    });

    it("should escape double quotes in workout name", () => {
      const workout = createWorkout({
        name: 'The "Monster" Ride',
        description: "Very hard",
      });

      const xml = generateZwo(workout, mockSettings);

      expect(xml).toContain("<name>The &quot;Monster&quot; Ride</name>");
    });

    it("should escape single quotes (apostrophes) in description", () => {
      const workout = createWorkout({
        name: "Easy Ride",
        description: "Don't go too hard",
      });

      const xml = generateZwo(workout, mockSettings);

      expect(xml).toContain("Don&apos;t go too hard");
    });

    it("should escape multiple special characters", () => {
      const workout = createWorkout({
        name: 'Tom\'s <Fast> & "Furious" Ride',
        description: 'Power > 250W & HR < 170 "zone 4"',
      });

      const xml = generateZwo(workout, mockSettings);

      expect(xml).toContain("<name>Tom&apos;s &lt;Fast&gt; &amp; &quot;Furious&quot; Ride</name>");
      expect(xml).toContain("Power &gt; 250W &amp; HR &lt; 170 &quot;zone 4&quot;");
    });

    it("should handle humanReadable content with special characters", () => {
      const workout = createWorkout({
        name: "Intervals",
        description: "Hard session",
        humanReadable: "5x3min @ >105% FTP\nRest: <50% FTP",
      });

      const xml = generateZwo(workout, mockSettings);

      // humanReadable is appended to description
      expect(xml).toContain("5x3min @ &gt;105% FTP");
      expect(xml).toContain("Rest: &lt;50% FTP");
    });
  });

  describe("generateZwo - duration conversions", () => {
    it("should convert minutes to seconds correctly", () => {
      const workout = createWorkout({
        structure: {
          main: [
            {
              type: "work",
              duration: { unit: "minutes", value: 15 },
              intensity: { unit: "percent_ftp", value: 80 },
            },
          ],
        },
      });

      const xml = generateZwo(workout, mockSettings);

      // 15 minutes = 900 seconds
      expect(xml).toContain('Duration="900"');
    });

    it("should convert hours to seconds correctly", () => {
      const workout = createWorkout({
        structure: {
          main: [
            {
              type: "work",
              duration: { unit: "hours", value: 1 },
              intensity: { unit: "percent_ftp", value: 65 },
            },
          ],
        },
      });

      const xml = generateZwo(workout, mockSettings);

      // 1 hour = 3600 seconds
      expect(xml).toContain('Duration="3600"');
    });

    it("should handle seconds directly", () => {
      const workout = createWorkout({
        structure: {
          main: [
            {
              type: "work",
              duration: { unit: "seconds", value: 30 },
              intensity: { unit: "percent_ftp", value: 120 },
            },
          ],
        },
      });

      const xml = generateZwo(workout, mockSettings);

      expect(xml).toContain('Duration="30"');
    });
  });

  describe("generateZwo - intensity conversions", () => {
    it("should convert percentage intensity to decimal", () => {
      const workout = createWorkout({
        structure: {
          main: [
            {
              type: "work",
              duration: { unit: "minutes", value: 10 },
              intensity: { unit: "percent_ftp", value: 95 },
            },
          ],
        },
      });

      const xml = generateZwo(workout, mockSettings);

      // 95% FTP = 0.95
      expect(xml).toContain('Power="0.95"');
    });

    it("should handle intensity values over 100%", () => {
      const workout = createWorkout({
        structure: {
          main: [
            {
              type: "work",
              duration: { unit: "minutes", value: 3 },
              intensity: { unit: "percent_ftp", value: 120 },
            },
          ],
        },
      });

      const xml = generateZwo(workout, mockSettings);

      // 120% FTP = 1.20
      expect(xml).toContain('Power="1.20"');
    });
  });
});
