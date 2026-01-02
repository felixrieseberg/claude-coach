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
  }

  let { plan, settings, filters, completed, changes, onWorkoutClick, onWorkoutMove }: Props =
    $props();

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
  {#each plan.phases as phase}
    {@const weeks = phase.endWeek - phase.startWeek + 1}
    {@const phaseName = phase.name.toLowerCase()}
    <div class="phase-segment {phaseName}" style="flex: {weeks}" data-phase={phase.name}></div>
  {/each}
</div>

<div class="weeks-container">
  {#each plan.weeks as week, index (week.weekNumber)}
    <WeekCard
      {week}
      fullWeek={buildFullWeek(week)}
      {settings}
      {today}
      {completed}
      {filterWorkout}
      {onWorkoutClick}
      onDrop={handleDrop}
      animationDelay={index * 0.05}
    />
  {/each}
</div>

<style>
  .phase-timeline {
    display: flex;
    gap: 4px;
    margin-bottom: 2rem;
    padding: 0 1rem;
  }

  .phase-segment {
    flex: 1;
    height: 6px;
    border-radius: 3px;
    position: relative;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .phase-segment:hover {
    transform: scaleY(1.5);
  }

  .phase-segment.base {
    background: var(--phase-base);
  }
  .phase-segment.build {
    background: var(--phase-build);
  }
  .phase-segment.peak {
    background: var(--phase-peak);
  }
  .phase-segment.taper {
    background: var(--phase-taper);
  }
  .phase-segment.recovery {
    background: var(--rest);
  }
  .phase-segment.survival {
    background: var(--rest);
  }
  .phase-segment.bank {
    background: var(--phase-base);
  }

  .phase-segment::after {
    content: attr(data-phase);
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    white-space: nowrap;
    opacity: 0;
    transition: opacity var(--transition-fast);
  }

  .phase-segment:hover::after {
    opacity: 1;
  }

  .weeks-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
</style>
