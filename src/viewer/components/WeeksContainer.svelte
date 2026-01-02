<script lang="ts">
  import type {
    TrainingPlan,
    TrainingWeek,
    TrainingDay,
    Workout,
  } from "../../schema/training-plan.js";
  import type { Settings } from "../stores/settings.js";
  import type { PlanChanges } from "../stores/changes.js";
  import { getEffectiveWorkout, isWorkoutDeleted } from "../stores/changes.js";
  import WeekCard from "./WeekCard.svelte";
  import { getOrderedDays, getTodayISO, parseDate, formatDateISO } from "../lib/utils.js";

  interface Props {
    plan: TrainingPlan;
    settings: Settings;
    filters: { sport: string; status: string };
    completed: Record<string, boolean>;
    changes: PlanChanges;
    onWorkoutClick: (workout: Workout, day: TrainingDay) => void;
    onWorkoutMove: (workoutId: string, originalDate: string, newDate: string) => void;
    onAddWorkout: (day: TrainingDay) => void;
  }

  let {
    plan,
    settings,
    filters,
    completed,
    changes,
    onWorkoutClick,
    onWorkoutMove,
    onAddWorkout,
  }: Props = $props();

  const today = getTodayISO();

  // Build a map of all original workout dates
  function getOriginalDateMap(): Record<string, string> {
    const map: Record<string, string> = {};
    plan.weeks.forEach((week) => {
      week.days.forEach((day) => {
        day.workouts.forEach((w) => {
          map[w.id] = day.date;
        });
      });
    });
    return map;
  }

  // Get effective date for a workout (original or moved)
  function getEffectiveDate(workoutId: string, originalDate: string): string {
    return changes.moved[workoutId] || originalDate;
  }

  // Build a full 7-day week with workouts in their effective positions
  function buildFullWeek(weekData: TrainingWeek): TrainingDay[] {
    const orderedDayNames = getOrderedDays(settings.firstDayOfWeek);
    const dayNameOrder = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    // Create a map from day name to the plan's day data
    const planDaysByName: Record<string, TrainingDay> = {};
    weekData.days.forEach((day) => {
      planDaysByName[day.dayOfWeek] = day;
    });

    // Use the first plan day as reference to calculate missing dates
    const refDay = weekData.days[0];
    const refDate = parseDate(refDay.date);
    const refDayIndex = dayNameOrder.indexOf(refDay.dayOfWeek);

    function getDateForDayName(dayName: string): string {
      const targetDayIndex = dayNameOrder.indexOf(dayName);
      let offset = targetDayIndex - refDayIndex;
      // Keep offset in range -6 to +6 for same week
      if (offset < -3) offset += 7;
      if (offset > 3) offset -= 7;
      const date = new Date(refDate);
      date.setDate(date.getDate() + offset);
      return formatDateISO(date);
    }

    // Build array of all 7 dates in this week
    const allWeekDates: string[] = orderedDayNames.map((dayName) => {
      const planDay = planDaysByName[dayName];
      return planDay ? planDay.date : getDateForDayName(dayName);
    });

    // Collect workouts by their effective date (respecting moves)
    const workoutsByDate: Record<string, Workout[]> = {};
    allWeekDates.forEach((d) => (workoutsByDate[d] = []));

    // Add original plan workouts (respecting moves)
    plan.weeks.forEach((week) => {
      week.days.forEach((day) => {
        day.workouts.forEach((workout) => {
          if (isWorkoutDeleted(workout.id, changes)) return;

          const effectiveDate = getEffectiveDate(workout.id, day.date);
          if (allWeekDates.includes(effectiveDate)) {
            const effectiveWorkout = getEffectiveWorkout(workout, changes);
            workoutsByDate[effectiveDate].push(effectiveWorkout);
          }
        });
      });
    });

    // Add user-created workouts
    Object.entries(changes.added).forEach(([id, { date, workout }]) => {
      if (allWeekDates.includes(date) && !isWorkoutDeleted(id, changes)) {
        workoutsByDate[date].push(workout);
      }
    });

    // Build full week in the correct display order
    return orderedDayNames.map((dayName, idx) => {
      const date = allWeekDates[idx];
      return {
        date,
        dayOfWeek: dayName,
        workouts: workoutsByDate[date] || [],
      };
    });
  }

  function filterWorkout(workout: Workout): boolean {
    if (filters.sport !== "all" && workout.sport !== filters.sport) {
      return false;
    }
    if (filters.status === "completed" && !completed[workout.id]) {
      return false;
    }
    if (filters.status === "pending" && completed[workout.id]) {
      return false;
    }
    return true;
  }

  // Get the original date for a workout (needed for move tracking)
  function getOriginalDate(workoutId: string): string {
    // Check if it's a user-added workout
    if (changes.added[workoutId]) {
      return changes.added[workoutId].date;
    }
    // Find in original plan
    for (const week of plan.weeks) {
      for (const day of week.days) {
        for (const workout of day.workouts) {
          if (workout.id === workoutId) {
            return day.date;
          }
        }
      }
    }
    return "";
  }

  function handleDrop(workoutId: string, newDate: string) {
    const originalDate = getOriginalDate(workoutId);
    onWorkoutMove(workoutId, originalDate, newDate);
  }
</script>

<div class="phase-timeline">
  {#each plan.phases as phase, idx}
    {@const weeks = phase.endWeek - phase.startWeek + 1}
    {@const phaseName = phase.name.toLowerCase()}
    <button
      class="phase-segment {phaseName}"
      style="flex: {weeks}"
      onclick={() => {
        const weekCard = document.querySelector(`[data-week="${phase.startWeek}"]`);
        weekCard?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    >
      <span class="phase-label">{phase.name}</span>
    </button>
  {/each}
</div>

<div class="weeks-container">
  {#each plan.weeks as week, index (week.weekNumber)}
    <div data-week={week.weekNumber}>
      <WeekCard
        {week}
        fullWeek={buildFullWeek(week)}
        {settings}
        {today}
        {completed}
        {filterWorkout}
        {onWorkoutClick}
        onDrop={handleDrop}
        {onAddWorkout}
        animationDelay={index * 0.05}
      />
    </div>
  {/each}
</div>

<style>
  .phase-timeline {
    display: flex;
    gap: 4px;
    margin-bottom: 1.5rem;
    padding: 0 1rem;
  }

  .phase-segment {
    flex: 1;
    height: 28px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, #64748b, #475569); /* fallback */
  }

  .phase-segment:hover {
    filter: brightness(1.2);
  }

  .phase-segment:active {
    transform: scale(0.98);
  }

  .phase-label {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(255, 255, 255, 0.9);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .phase-segment.base {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
  }
  .phase-segment.build {
    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  }
  .phase-segment.peak {
    background: linear-gradient(135deg, #ec4899, #db2777);
  }
  .phase-segment.taper {
    background: linear-gradient(135deg, #14b8a6, #0d9488);
  }
  .phase-segment.recovery {
    background: linear-gradient(135deg, #6b7280, #4b5563);
  }
  .phase-segment.rebuild {
    background: linear-gradient(135deg, #f97316, #ea580c);
  }
  .phase-segment.survival {
    background: linear-gradient(135deg, #f59e0b, #d97706);
  }
  .phase-segment.bank {
    background: linear-gradient(135deg, #10b981, #059669);
  }

  .weeks-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
</style>
