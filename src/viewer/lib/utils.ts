import type { Settings, HrZone } from "../stores/settings.js";
import type { Sport } from "../../schema/training-plan.js";

const METERS_PER_YARD = 0.9144;
const KM_PER_MILE = 1.60934;

export function formatDuration(minutes: number | undefined): string {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) {
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${m}m`;
}

export function formatDistance(
  meters: number | undefined,
  sport: Sport,
  settings: Settings
): string {
  if (!meters) return "";

  if (sport === "swim") {
    if (settings.units.swim === "yards") {
      const yards = meters / METERS_PER_YARD;
      return `${Math.round(yards)}yd`;
    }
    return `${Math.round(meters)}m`;
  }

  if (sport === "bike" || sport === "run") {
    const unit = settings.units[sport];
    if (unit === "miles") {
      const miles = meters / 1000 / KM_PER_MILE;
      return miles >= 10 ? `${Math.round(miles)}mi` : `${miles.toFixed(1)}mi`;
    }
    const km = meters / 1000;
    return km >= 10 ? `${Math.round(km)}km` : `${km.toFixed(1)}km`;
  }

  return `${Math.round(meters)}m`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function getZoneInfo(sport: Sport, zoneStr: string | undefined, settings: Settings): string {
  if (!zoneStr) return "";

  const match = zoneStr.match(/(?:Zone\s*)?(\d)(?:\s*-\s*(\d))?/i);
  if (!match) return zoneStr;

  const z1 = parseInt(match[1]);
  const z2 = match[2] ? parseInt(match[2]) : z1;

  let info = zoneStr;

  if (sport === "run" || sport === "bike") {
    const hrZones = settings[sport]?.hrZones;
    if (hrZones && hrZones[z1 - 1]) {
      const low = hrZones[z1 - 1].low;
      const high = z2 !== z1 && hrZones[z2 - 1] ? hrZones[z2 - 1].high : hrZones[z1 - 1].high;
      info += ` (${low}-${high} bpm)`;
    }
  }

  return info;
}

export function getDaysToEvent(eventDate: string): number {
  const daysLeft = Math.ceil(
    (new Date(eventDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.max(0, daysLeft);
}

export function getOrderedDays(firstDayOfWeek: "monday" | "sunday"): string[] {
  if (firstDayOfWeek === "monday") {
    return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  }
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
}

export function getTodayISO(): string {
  return formatDateISO(new Date());
}

// Format date as YYYY-MM-DD without timezone conversion
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Parse ISO date string to Date object (at midnight local time)
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function getSportColor(sport: Sport): string {
  const colors: Record<Sport, string> = {
    swim: "var(--swim)",
    bike: "var(--bike)",
    run: "var(--run)",
    strength: "var(--strength)",
    brick: "var(--brick)",
    race: "var(--race)",
    rest: "var(--rest)",
  };
  return colors[sport] || "var(--text-muted)";
}

export function getSportIcon(sport: Sport): string {
  const icons: Record<Sport, string> = {
    swim: "\u{1F3CA}",
    bike: "\u{1F6B4}",
    run: "\u{1F3C3}",
    strength: "\u{1F4AA}",
    brick: "\u{1F525}",
    race: "\u{1F3C6}",
    rest: "\u{1F6CC}",
  };
  return icons[sport] || "";
}
