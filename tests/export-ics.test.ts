import { describe, it, expect } from "vitest";
import { generateIcs } from "../src/viewer/lib/export/ics.js";
import type { TrainingPlan } from "../src/schema/training-plan.js";

/**
 * Create a minimal mock TrainingPlan for testing
 */
function createMockPlan(overrides: Partial<TrainingPlan> = {}): TrainingPlan {
  return {
    version: "1.0",
    meta: {
      id: "test-plan",
      athlete: "Test Athlete",
      event: "Test Marathon",
      eventDate: "2025-06-15",
      planStartDate: "2025-01-01",
      planEndDate: "2025-06-15",
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
      totalWeeks: 24,
      generatedBy: "Claude Coach",
    },
    preferences: {
      swim: "meters",
      bike: "kilometers",
      run: "kilometers",
      firstDayOfWeek: "monday",
    },
    assessment: {
      foundation: {
        raceHistory: [],
        peakTrainingLoad: 10,
        foundationLevel: "intermediate",
        yearsInSport: 3,
      },
      currentForm: {
        weeklyVolume: { total: 8 },
        longestSessions: {},
        consistency: 5,
      },
      strengths: [],
      limiters: [],
      constraints: [],
    },
    zones: {},
    phases: [],
    weeks: [],
    raceStrategy: {
      event: {
        name: "Test Marathon",
        date: "2025-06-15",
        type: "marathon",
      },
      pacing: {},
      nutrition: {
        preRace: "",
        during: {
          carbsPerHour: 60,
          fluidPerHour: "500ml",
          products: [],
        },
        notes: "",
      },
      taper: {
        startDate: "2025-06-01",
        volumeReduction: 40,
        notes: "",
      },
      raceDay: {},
    },
    ...overrides,
  };
}

describe("ICS Export", () => {
  describe("generateIcs", () => {
    it("generates valid iCalendar format with correct headers", () => {
      const plan = createMockPlan();
      const ics = generateIcs(plan);

      // Check required iCalendar headers
      expect(ics).toContain("BEGIN:VCALENDAR");
      expect(ics).toContain("VERSION:2.0");
      expect(ics).toContain("PRODID:-//Claude Coach//Training Plan//EN");
      expect(ics).toContain("CALSCALE:GREGORIAN");
      expect(ics).toContain("METHOD:PUBLISH");
      expect(ics).toContain("END:VCALENDAR");

      // Check calendar name and description
      expect(ics).toContain("X-WR-CALNAME:Test Marathon Training");
      expect(ics).toContain("X-WR-CALDESC:Training plan for Test Marathon on 2025-06-15");

      // Check line endings are CRLF as per RFC 5545
      expect(ics).toContain("\r\n");
    });

    it("creates VEVENT for each workout in the plan", () => {
      const plan = createMockPlan({
        weeks: [
          {
            weekNumber: 1,
            startDate: "2025-01-06",
            endDate: "2025-01-12",
            phase: "Base",
            focus: "Aerobic foundation",
            targetHours: 8,
            isRecoveryWeek: false,
            summary: { totalHours: 8, bySport: {} },
            days: [
              {
                date: "2025-01-06",
                dayOfWeek: "Monday",
                workouts: [
                  {
                    id: "w1-mon-run",
                    sport: "run",
                    type: "endurance",
                    name: "Easy Run",
                    description: "Zone 2 easy run",
                    durationMinutes: 45,
                    primaryZone: "Zone 2",
                    completed: false,
                  },
                ],
              },
              {
                date: "2025-01-07",
                dayOfWeek: "Tuesday",
                workouts: [
                  {
                    id: "w1-tue-swim",
                    sport: "swim",
                    type: "technique",
                    name: "Technique Swim",
                    description: "Focus on form",
                    durationMinutes: 60,
                    completed: false,
                  },
                ],
              },
            ],
          },
        ],
      });

      const ics = generateIcs(plan);

      // Count VEVENT blocks (should be 2 workouts + 1 race day = 3)
      const veventCount = (ics.match(/BEGIN:VEVENT/g) || []).length;
      expect(veventCount).toBe(3);

      // Check workout events are present
      expect(ics).toContain("SUMMARY:\u{1F3C3} Run: Easy Run");
      expect(ics).toContain("SUMMARY:\u{1F3CA} Swim: Technique Swim");

      // Check dates are formatted correctly (YYYYMMDD)
      expect(ics).toContain("DTSTART;VALUE=DATE:20250106");
      expect(ics).toContain("DTSTART;VALUE=DATE:20250107");

      // Check UIDs are unique
      expect(ics).toContain("UID:w1-mon-run-2025-01-06@claude-coach");
      expect(ics).toContain("UID:w1-tue-swim-2025-01-07@claude-coach");
    });

    it("properly escapes special characters (commas, semicolons, newlines)", () => {
      const plan = createMockPlan({
        meta: {
          id: "test-plan",
          athlete: "Test Athlete",
          event: "Triathlon; Sprint, Olympic",
          eventDate: "2025-06-15",
          planStartDate: "2025-01-01",
          planEndDate: "2025-06-15",
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:00:00Z",
          totalWeeks: 24,
          generatedBy: "Claude Coach",
        },
        weeks: [
          {
            weekNumber: 1,
            startDate: "2025-01-06",
            endDate: "2025-01-12",
            phase: "Base",
            focus: "Build",
            targetHours: 8,
            isRecoveryWeek: false,
            summary: { totalHours: 8, bySport: {} },
            days: [
              {
                date: "2025-01-06",
                dayOfWeek: "Monday",
                workouts: [
                  {
                    id: "w1-mon",
                    sport: "run",
                    type: "intervals",
                    name: "Intervals; Hard, Fast",
                    description: "Run hard\nThen recover",
                    durationMinutes: 60,
                    completed: false,
                  },
                ],
              },
            ],
          },
        ],
      });

      const ics = generateIcs(plan);

      // Check semicolons are escaped
      expect(ics).toContain("Intervals\\; Hard\\, Fast");

      // Check commas are escaped in calendar name
      expect(ics).toContain("X-WR-CALNAME:Triathlon\\; Sprint\\, Olympic Training");

      // Check newlines in description are escaped
      expect(ics).toContain("Run hard\\nThen recover");
    });

    it("includes race day event", () => {
      const plan = createMockPlan({
        meta: {
          id: "test-plan",
          athlete: "Test Athlete",
          event: "Boston Marathon",
          eventDate: "2025-04-21",
          planStartDate: "2025-01-01",
          planEndDate: "2025-04-21",
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:00:00Z",
          totalWeeks: 16,
          generatedBy: "Claude Coach",
        },
      });

      const ics = generateIcs(plan);

      // Check race day event
      expect(ics).toContain("UID:race-day@claude-coach");
      expect(ics).toContain("DTSTART;VALUE=DATE:20250421");
      expect(ics).toContain("SUMMARY:\u{1F3C6} RACE DAY: Boston Marathon");
      expect(ics).toContain("DESCRIPTION:Race day for Boston Marathon!");

      // Race day should block time (OPAQUE)
      expect(ics).toContain("TRANSP:OPAQUE");
    });

    it("skips rest days without names", () => {
      const plan = createMockPlan({
        weeks: [
          {
            weekNumber: 1,
            startDate: "2025-01-06",
            endDate: "2025-01-12",
            phase: "Base",
            focus: "Recovery",
            targetHours: 6,
            isRecoveryWeek: true,
            summary: { totalHours: 6, bySport: {} },
            days: [
              {
                date: "2025-01-06",
                dayOfWeek: "Monday",
                workouts: [
                  {
                    id: "w1-mon-run",
                    sport: "run",
                    type: "endurance",
                    name: "Easy Run",
                    description: "Zone 2",
                    durationMinutes: 30,
                    completed: false,
                  },
                ],
              },
              {
                date: "2025-01-07",
                dayOfWeek: "Tuesday",
                workouts: [
                  {
                    // Rest day without a name - should be skipped
                    id: "w1-tue-rest",
                    sport: "rest",
                    type: "rest",
                    name: "",
                    description: "",
                    completed: false,
                  },
                ],
              },
              {
                date: "2025-01-08",
                dayOfWeek: "Wednesday",
                workouts: [
                  {
                    // Active recovery with a name - should be included
                    id: "w1-wed-rest",
                    sport: "rest",
                    type: "recovery",
                    name: "Active Recovery",
                    description: "Light stretching",
                    completed: false,
                  },
                ],
              },
            ],
          },
        ],
      });

      const ics = generateIcs(plan);

      // Count VEVENT blocks (1 run + 1 active recovery + 1 race day = 3)
      const veventCount = (ics.match(/BEGIN:VEVENT/g) || []).length;
      expect(veventCount).toBe(3);

      // The nameless rest day should not appear
      expect(ics).not.toContain("UID:w1-tue-rest");

      // But the named rest day should appear
      expect(ics).toContain("UID:w1-wed-rest");
      expect(ics).toContain("Active Recovery");
    });

    it("includes workout details in description", () => {
      const plan = createMockPlan({
        weeks: [
          {
            weekNumber: 1,
            startDate: "2025-01-06",
            endDate: "2025-01-12",
            phase: "Base",
            focus: "Build",
            targetHours: 10,
            isRecoveryWeek: false,
            summary: { totalHours: 10, bySport: {} },
            days: [
              {
                date: "2025-01-06",
                dayOfWeek: "Monday",
                workouts: [
                  {
                    id: "w1-mon-bike",
                    sport: "bike",
                    type: "endurance",
                    name: "Long Ride",
                    description: "Aerobic endurance ride",
                    durationMinutes: 120,
                    primaryZone: "Zone 2",
                    humanReadable: "Warm-up: 15min easy\nMain: 90min Z2\nCool-down: 15min easy",
                    completed: false,
                  },
                ],
              },
            ],
          },
        ],
      });

      const ics = generateIcs(plan);

      // Check description contains workout details
      expect(ics).toContain("Aerobic endurance ride");
      expect(ics).toContain("Duration: 2h");
      expect(ics).toContain("Target Zone: Zone 2");
      expect(ics).toContain("Workout Structure:");
    });

    it("sets workouts as transparent (free) time", () => {
      const plan = createMockPlan({
        weeks: [
          {
            weekNumber: 1,
            startDate: "2025-01-06",
            endDate: "2025-01-12",
            phase: "Base",
            focus: "Build",
            targetHours: 8,
            isRecoveryWeek: false,
            summary: { totalHours: 8, bySport: {} },
            days: [
              {
                date: "2025-01-06",
                dayOfWeek: "Monday",
                workouts: [
                  {
                    id: "w1-mon",
                    sport: "run",
                    type: "endurance",
                    name: "Easy Run",
                    description: "",
                    durationMinutes: 45,
                    completed: false,
                  },
                ],
              },
            ],
          },
        ],
      });

      const ics = generateIcs(plan);

      // Workouts should be transparent (don't block calendar)
      // There should be TRANSP:TRANSPARENT for the workout
      const lines = ics.split("\r\n");
      let foundWorkoutTransp = false;
      let inWorkoutEvent = false;

      for (const line of lines) {
        if (line.includes("UID:w1-mon")) {
          inWorkoutEvent = true;
        }
        if (inWorkoutEvent && line === "TRANSP:TRANSPARENT") {
          foundWorkoutTransp = true;
          break;
        }
        if (inWorkoutEvent && line === "END:VEVENT") {
          break;
        }
      }

      expect(foundWorkoutTransp).toBe(true);
    });
  });
});
