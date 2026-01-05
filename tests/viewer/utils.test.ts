import { describe, it, expect } from "vitest";
import {
  parseDate,
  formatDate,
  formatEventDate,
  formatDateISO,
  getOrderedDays,
  getDaysToEvent,
} from "../../src/viewer/lib/utils.js";

describe("Date Utilities", () => {
  describe("parseDate", () => {
    it("parses ISO date string to local midnight", () => {
      const date = parseDate("2025-01-15");
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(0); // January is 0
      expect(date.getDate()).toBe(15);
      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);
    });

    it("handles different months correctly", () => {
      expect(parseDate("2025-06-01").getMonth()).toBe(5); // June
      expect(parseDate("2025-12-31").getMonth()).toBe(11); // December
    });

    it("returns current date for empty string", () => {
      const today = new Date();
      const result = parseDate("");
      expect(result.getFullYear()).toBe(today.getFullYear());
    });

    it("does not shift dates due to timezone (the bug we fixed)", () => {
      // This was the bug: new Date("2025-02-03") parses as UTC midnight,
      // which in western timezones becomes Feb 2nd local time.
      // parseDate should always return the correct local date.
      const testDates = ["2025-01-01", "2025-02-03", "2025-06-15", "2025-12-31"];

      for (const dateStr of testDates) {
        const parsed = parseDate(dateStr);
        const [year, month, day] = dateStr.split("-").map(Number);
        expect(parsed.getFullYear()).toBe(year);
        expect(parsed.getMonth()).toBe(month - 1);
        expect(parsed.getDate()).toBe(day);
      }
    });
  });

  describe("formatDateISO", () => {
    it("formats date as YYYY-MM-DD", () => {
      const date = new Date(2025, 0, 15); // Jan 15, 2025
      expect(formatDateISO(date)).toBe("2025-01-15");
    });

    it("pads single-digit months and days", () => {
      const date = new Date(2025, 0, 5); // Jan 5, 2025
      expect(formatDateISO(date)).toBe("2025-01-05");
    });

    it("round-trips with parseDate", () => {
      const original = "2025-06-15";
      const parsed = parseDate(original);
      const formatted = formatDateISO(parsed);
      expect(formatted).toBe(original);
    });
  });

  describe("formatDate", () => {
    it("formats date with weekday, month, and day", () => {
      // Jan 15, 2025 is a Wednesday
      const formatted = formatDate("2025-01-15");
      expect(formatted).toContain("Wednesday");
      expect(formatted).toContain("Jan");
      expect(formatted).toContain("15");
    });

    it("uses parseDate internally (timezone-safe)", () => {
      // Feb 3, 2025 is a Monday - this should not shift to Sunday
      const formatted = formatDate("2025-02-03");
      expect(formatted).toContain("Monday");
      expect(formatted).toContain("3");
    });
  });

  describe("formatEventDate", () => {
    it("formats date with full weekday, month, day, and year", () => {
      const formatted = formatEventDate("2025-06-15");
      expect(formatted).toContain("Sunday");
      expect(formatted).toContain("June");
      expect(formatted).toContain("15");
      expect(formatted).toContain("2025");
    });

    it("uses parseDate internally (timezone-safe)", () => {
      // March 29, 2025 is a Saturday
      const formatted = formatEventDate("2025-03-29");
      expect(formatted).toContain("Saturday");
      expect(formatted).toContain("29");
    });
  });

  describe("getOrderedDays", () => {
    it("returns Monday-first order when firstDayOfWeek is monday", () => {
      const days = getOrderedDays("monday");
      expect(days[0]).toBe("Monday");
      expect(days[6]).toBe("Sunday");
    });

    it("returns Sunday-first order when firstDayOfWeek is sunday", () => {
      const days = getOrderedDays("sunday");
      expect(days[0]).toBe("Sunday");
      expect(days[6]).toBe("Saturday");
    });
  });

  describe("getDaysToEvent", () => {
    it("returns positive days for future events", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const dateStr = formatDateISO(futureDate);
      const days = getDaysToEvent(dateStr);
      expect(days).toBeGreaterThanOrEqual(29);
      expect(days).toBeLessThanOrEqual(31);
    });

    it("returns 0 for past events", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      const dateStr = formatDateISO(pastDate);
      const days = getDaysToEvent(dateStr);
      expect(days).toBe(0);
    });
  });
});

describe("Date-DayOfWeek Consistency", () => {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  it("verifies known date-dayOfWeek pairs", () => {
    const testCases = [
      { date: "2025-01-06", expectedDay: "Monday" },
      { date: "2025-02-03", expectedDay: "Monday" },
      { date: "2025-03-29", expectedDay: "Saturday" },
      { date: "2025-06-15", expectedDay: "Sunday" },
      { date: "2025-12-25", expectedDay: "Thursday" },
    ];

    for (const { date, expectedDay } of testCases) {
      const parsed = parseDate(date);
      const actualDay = dayNames[parsed.getDay()];
      expect(actualDay).toBe(expectedDay);
    }
  });

  it("generates correct dayOfWeek for a full week starting Monday", () => {
    // Week of Jan 6-12, 2025
    const weekDates = [
      { date: "2025-01-06", expected: "Monday" },
      { date: "2025-01-07", expected: "Tuesday" },
      { date: "2025-01-08", expected: "Wednesday" },
      { date: "2025-01-09", expected: "Thursday" },
      { date: "2025-01-10", expected: "Friday" },
      { date: "2025-01-11", expected: "Saturday" },
      { date: "2025-01-12", expected: "Sunday" },
    ];

    for (const { date, expected } of weekDates) {
      const parsed = parseDate(date);
      const actualDay = dayNames[parsed.getDay()];
      expect(actualDay).toBe(expected);
    }
  });
});
