import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Parse a date string in YYYY-MM-DD format to get the actual day of week
 */
function getActualDayOfWeek(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return dayNames[date.getDay()];
}

describe("Demo Plan Validation", () => {
  const demosDir = join(__dirname, "../../website/demos");
  const planFiles = readdirSync(demosDir).filter((f) => f.endsWith("-plan.json"));

  for (const planFile of planFiles) {
    describe(planFile, () => {
      const planPath = join(demosDir, planFile);
      const plan = JSON.parse(readFileSync(planPath, "utf-8"));

      it("has all weeks with 7 days", () => {
        for (const week of plan.weeks || []) {
          expect(week.days?.length).toBe(7);
        }
      });

      it("has correct date-dayOfWeek mappings for all days", () => {
        const errors: string[] = [];

        for (const week of plan.weeks || []) {
          for (const day of week.days || []) {
            const actualDay = getActualDayOfWeek(day.date);
            if (actualDay !== day.dayOfWeek) {
              errors.push(
                `Week ${week.weekNumber}: ${day.date} is ${actualDay}, not ${day.dayOfWeek}`
              );
            }
          }
        }

        expect(errors).toEqual([]);
      });

      it("has weeks starting on Monday or Sunday", () => {
        const firstDayOfWeek = plan.preferences?.firstDayOfWeek || "monday";
        const expectedFirstDay = firstDayOfWeek === "monday" ? "Monday" : "Sunday";

        for (const week of plan.weeks || []) {
          const firstDay = week.days?.[0];
          if (firstDay) {
            expect(firstDay.dayOfWeek).toBe(expectedFirstDay);
          }
        }
      });

      it("has consecutive dates within each week", () => {
        for (const week of plan.weeks || []) {
          const days = week.days || [];
          for (let i = 1; i < days.length; i++) {
            const [prevY, prevM, prevD] = days[i - 1].date.split("-").map(Number);
            const [currY, currM, currD] = days[i].date.split("-").map(Number);

            // Create dates at noon to avoid DST issues
            const prevDate = new Date(prevY, prevM - 1, prevD);
            const currDate = new Date(currY, currM - 1, currD);

            // Add one day to prev and compare
            const nextDay = new Date(prevDate);
            nextDay.setDate(nextDay.getDate() + 1);

            expect(currDate.getTime()).toBe(nextDay.getTime());
          }
        }
      });

      it("has planStartDate matching first workout date", () => {
        const firstWeek = plan.weeks?.[0];
        const firstDay = firstWeek?.days?.[0];
        if (firstDay && plan.meta?.planStartDate) {
          expect(firstDay.date).toBe(plan.meta.planStartDate);
        }
      });
    });
  }
});
